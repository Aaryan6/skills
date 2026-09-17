#!/usr/bin/env node
// x-fetch.js — pull posts (text + media) from an x.com URL with headless Playwright. Windows / macOS / Linux.
//
//   node x-fetch.js <url | --query "text"> [--scrolls N] [--out file.json] [--full]
//                   [--download DIR] [--profile] [--headed] [--quiet]
//   node x-fetch.js --login            # one-time: opens a headed window to log in to X
//
// URL kinds: /i/trending/<id>  /search?q=…  /<user>/status/<id>  /<user>  (profile timeline)
// --full      open every post page to get untruncated text ("Show more") + full thread head
// --download  save images (orig res) + best mp4 into DIR as <handle>_<id>_<n>.<ext>
// --profile   use the persistent logged-in profile (needed for search, profiles, >~8 posts)
// Output: JSON on stdout (unless --quiet) and written to --out (default ./x-fetch.json)

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0; };
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : d; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !['--scrolls', '--out', '--download', '--query'].includes(argv[i - 1]));

const LOGIN = flag('--login');
const QUERY = opt('--query', null);
let url = positional[0] || (QUERY ? `https://x.com/search?q=${encodeURIComponent(QUERY)}&src=typed_query&f=live` : null);
const SCROLLS = Number(opt('--scrolls', 6));
const OUT = opt('--out', path.resolve('x-fetch.json'));
const FULL = flag('--full');
const DL = opt('--download', null);
const PROFILE = flag('--profile') || LOGIN || (url && /\/search\?|^https:\/\/x\.com\/[A-Za-z0-9_]+\/?$/.test(url));
const HEADED = flag('--headed') || LOGIN;
const QUIET = flag('--quiet');

if (!LOGIN && !url) { console.error('usage: x-fetch.js <url|--query "text"> [--scrolls N] [--out f] [--full] [--download DIR] [--profile] [--headed]'); process.exit(2); }
if (url && !/^https?:/.test(url)) url = 'https://x.com/' + url.replace(/^\/+/, '');
if (url) url = url.replace(/^https?:\/\/(www\.)?(twitter|x)\.com/, 'https://x.com');

// ---------- playwright + chromium resolution ----------
function npmGlobalRoot() {
  try { return require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; }
}
function resolvePlaywright() {
  // 1. whatever `require` can see (local node_modules / NODE_PATH)  2. the global npm root on this OS
  //    (Windows: %APPDATA%\npm\node_modules; macOS/Linux: `npm root -g`)  3. the playwright-core bundled in @playwright/mcp
  const roots = [process.env.APPDATA && path.join(process.env.APPDATA, 'npm/node_modules'), npmGlobalRoot(),
    '/usr/local/lib/node_modules', '/opt/homebrew/lib/node_modules', path.join(os.homedir(), '.npm-global/lib/node_modules')].filter(Boolean);
  const cands = ['playwright', 'playwright-core'];
  for (const r of roots) cands.push(path.join(r, 'playwright'), path.join(r, 'playwright-core'), path.join(r, '@playwright/mcp/node_modules/playwright-core'));
  for (const c of cands) { try { return require(c); } catch {} }
  throw new Error('playwright not found — npm i -g playwright-core && npx playwright install chromium');
}
function browsersRoot() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== '0') return process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || os.homedir(), 'ms-playwright');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library/Caches/ms-playwright');
  return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'ms-playwright');
}
// Per-OS executable layouts inside <browsersRoot>/chromium-<rev>/ (newer "Chrome for Testing" first, older Chromium second).
const CHROMIUM_EXES = {
  win32: ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe'],
  darwin: [`chrome-mac-${process.arch === 'arm64' ? 'arm64' : 'x64'}/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'],
  linux: ['chrome-linux64/chrome', 'chrome-linux/chrome'],
};
function resolveChromium(chromium) {
  // If the playwright build we loaded already has its matching browser installed, let it pick the path itself.
  try { if (fs.existsSync(chromium.executablePath())) return undefined; } catch {}
  const root = browsersRoot();
  if (!fs.existsSync(root)) return undefined;
  const dirs = fs.readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split('-')[1] - +a.split('-')[1]);
  for (const d of dirs) for (const rel of CHROMIUM_EXES[process.platform] || CHROMIUM_EXES.linux) {
    const exe = path.join(root, d, rel);
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}
const { chromium } = resolvePlaywright();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const PROFILE_DIR = path.join(__dirname, '..', '.profile');

// ---------- page helpers ----------
const EXTRACT = () => {
  const out = [];
  // On a /user/status/id page the focal article has no link to itself — identify it by URL + handle line.
  const selfM = location.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
  const selfPath = selfM ? `/${selfM[1]}/status/${selfM[2]}` : null;
  for (const art of document.querySelectorAll('article')) {
    const links = [...art.querySelectorAll('a[href*="/status/"]')].map(a => a.getAttribute('href'));
    const firstLines = art.innerText.split('\n').slice(0, 4).map(s => s.trim());
    const ownHandle = (firstLines.find(l => /^@\w+$/.test(l)) || '').slice(1);
    const statusLinks = links.filter(h => /^\/[^/]+\/status\/\d+$/.test(h) && !h.startsWith('/i/'));
    let main = statusLinks.find(h => h.split('/')[1].toLowerCase() === ownHandle.toLowerCase());
    if (!main && selfPath && ownHandle.toLowerCase() === selfM[1].toLowerCase() && !out.some(o => o.id === selfM[2])) main = selfPath;
    if (!main) main = statusLinks[0];
    if (!main) continue;
    const [, handle, id] = main.match(/^\/([^/]+)\/status\/(\d+)$/);

    // Logged-in DOM has data-testid; logged-out DOM does not. Prefer testids, fall back to text layout.
    const tt = art.querySelector('[data-testid="tweetText"]');
    const un = art.querySelector('[data-testid="User-Name"]');
    let name = null, age = null, text = '', stats = {};
    if (tt || un) {
      const u = un ? un.innerText.split('\n').map(s => s.trim()).filter(Boolean) : [];
      name = u[0] || null; age = u.find(s => /^\d+[smhd]$|^[A-Z][a-z]{2} \d+/.test(s)) || null;
      text = tt ? tt.innerText : '';
      for (const k of ['reply', 'retweet', 'like']) {
        const b = art.querySelector(`[data-testid="${k}"]`); if (b) stats[k === 'retweet' ? 'reposts' : k === 'reply' ? 'replies' : 'likes'] = (b.getAttribute('aria-label') || '').replace(/\D.*$/, '');
      }
      const v = art.querySelector('a[href$="/analytics"]'); if (v) stats.views = (v.getAttribute('aria-label') || '').replace(/\D.*$/, '');
    } else {
      // innerText:  name / @handle / age / body… / [m:ss] / replies / reposts / likes / views
      // focal post on a status page:  name / @handle / body… / [quoted] / [m:ss] / "10:46 PM · Sep 17, 2026" / · / 36.7K / Views / replies reposts likes bookmarks
      const lines = art.innerText.split('\n');
      const hIdx = lines.findIndex(l => l.trim() === '@' + handle);
      name = hIdx > 0 ? lines[hIdx - 1].trim() : null;
      const maybeAge = (lines[hIdx + 1] || '').trim();
      const isAge = /^\d+[smhd]$|^[A-Z][a-z]{2} \d+(, \d{4})?$/.test(maybeAge);
      age = isAge ? maybeAge : null;
      let body = lines.slice(hIdx + (isAge ? 2 : 1));
      const isNum = l => /^[\d.,]+[KM]?$/.test(l.trim());
      const trimmed = () => (body[body.length - 1] || '').trim();
      const tail = [];
      while (body.length && isNum(trimmed())) tail.unshift(body.pop().trim());
      if (trimmed() === 'Views') {            // focal layout
        body.pop(); stats.views = body.pop().trim();
        if (trimmed() === '·') body.pop();
        if (/\d{4}$/.test(trimmed())) stats.date = body.pop().trim();
        [stats.replies, stats.reposts, stats.likes, stats.bookmarks] = tail;
      } else {
        [stats.replies, stats.reposts, stats.likes, stats.views] = tail;
      }
      if (body.length && /^\d+:\d\d$/.test(trimmed())) { const d = body.pop().trim(); if (d !== '00:00') stats.duration = d; }
      const qIdx = body.findIndex((l, i) => i > 0 && /^@\w+$/.test((body[i + 1] || '').trim()));
      if (qIdx > 0) body = body.slice(0, qIdx);
      text = body.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    const truncated = /Show more$/.test(text);
    text = text.replace(/\s*Show more$/, '');

    const video = art.querySelector('video');
    const poster = video?.getAttribute('poster') || null;
    const images = [...new Set([...art.querySelectorAll('img')].map(i => i.src)
      .filter(s => s.includes('pbs.twimg.com/media') && s !== poster)
      .map(s => s.replace(/name=\w+/, 'name=orig')))];
    const posterId = poster && (poster.match(/(?:amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb)\/(\d+)\//) || [])[1];
    const card = [...art.querySelectorAll('a[href^="http"]')].map(a => a.href).find(h => !/x\.com|twitter\.com|t\.co\//.test(h)) || null;
    const quoted = links.filter(h => /^\/[^/]+\/status\/\d+$/.test(h) && h !== main && !h.startsWith('/i/'))[0] || null;

    out.push({ id, url: 'https://x.com' + main, handle: '@' + handle, name, age, text, truncated, images,
      hasVideo: !!video, poster, posterId, card, quoted: quoted ? 'https://x.com' + quoted : null, stats });
  }
  return out;
};

const HEADER = () => {
  const title = document.title.replace(/ \/ X$/, '');
  const body = document.body.innerText;
  const m = body.match(/Last updated ([^\n]*)\n\n([\s\S]*?)\n\nThis story is a summary/);
  const login = /Sign in to X|Log in to X|Something went wrong/.test(body) && !document.querySelector('article');
  return { title, updated: m ? m[1] : null, summary: m ? m[2].trim() : null, loginWall: login };
};

function attachVideos(posts, videos) {
  const best = id => videos[id].slice().sort((a, b) => b.w * b.h - a.w * a.h)[0].url;
  const used = new Set();
  for (const p of posts) { if (p.posterId && videos[p.posterId]) { p.video = best(p.posterId); used.add(p.posterId); } delete p.posterId; }
  for (const p of posts) {
    if (!p.hasVideo || p.video) continue;
    const twin = posts.find(q => q !== p && q.video && q.poster === p.poster);
    if (twin) { p.video = twin.video; continue; }
    const left = Object.keys(videos).find(id => !used.has(id));
    if (left) { p.video = best(left); used.add(left); }
  }
  for (const p of posts) if (p.hasVideo && !p.video && p.quoted) { const q = posts.find(x => x.url === p.quoted); if (q?.video) p.video = q.video; }
}

// Images: pbs.twimg.com serves originals only as format=jpg (or png for png uploads); webp&name=orig 404s.
// Videos: X is HLS/DASH only — the sniffed .mp4 is a DASH init segment, not a file. yt-dlp on the post URL
// gets the best muxed mp4; fallback muxes the sniffed m3u8 with ffmpeg.
const { execFileSync } = require('child_process');
function ffmpegPath() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return 'ffmpeg'; } catch {}
  // fall back to the ffmpeg Playwright ships (`npx playwright install ffmpeg`)
  const root = browsersRoot(), bin = process.platform === 'win32' ? 'ffmpeg-win64.exe' : process.platform === 'darwin' ? 'ffmpeg-mac' : 'ffmpeg-linux';
  if (fs.existsSync(root)) for (const d of fs.readdirSync(root)) if (/^ffmpeg-/.test(d)) { const e = path.join(root, d, bin); if (fs.existsSync(e)) return e; }
  return null;
}
async function download(posts, dir, playlists) {
  fs.mkdirSync(dir, { recursive: true });
  const seenVideo = new Set();
  for (const p of posts) {
    const base = `${p.handle.slice(1)}_${p.id}`;
    let n = 0;
    for (const u0 of p.images) {
      const file = path.join(dir, `${base}_${++n}.jpg`);
      let ok = false;
      for (const fmt of ['jpg', 'png']) {
        const u = u0.replace(/format=\w+/, 'format=' + fmt);
        try {
          const res = await fetch(u, { headers: { 'user-agent': UA, referer: 'https://x.com/' } });
          if (!res.ok) continue;
          const out = fmt === 'png' ? file.replace(/\.jpg$/, '.png') : file;
          fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
          (p.files ||= []).push(out); ok = true; break;
        } catch {}
      }
      if (!ok) (p.downloadErrors ||= []).push(`${u0}: image not found as jpg/png`);
    }
    if (p.video && !seenVideo.has(p.video)) {
      seenVideo.add(p.video);
      // a quote-post carries the quoted post's video — download it under the original post's URL/name
      const owner = posts.find(q => q.video === p.video && !q.quoted) || p;
      const vbase = `${owner.handle.slice(1)}_${owner.id}`;
      const file = path.join(dir, `${vbase}.mp4`);
      if (fs.existsSync(file)) { (p.files ||= []).push(file); continue; }
      let ok = false;
      try { execFileSync('yt-dlp', ['-q', '--no-warnings', '-f', 'bv*+ba/b', '--merge-output-format', 'mp4', '-o', file, owner.url], { stdio: 'ignore', timeout: 180000 }); ok = fs.existsSync(file); } catch {}
      if (!ok) {
        const ff = ffmpegPath();
        const mediaId = (p.video.match(/\/(\d+)\/vid\//) || [])[1];
        const pl = playlists[mediaId];
        if (ff && pl) { try { execFileSync(ff, ['-y', '-loglevel', 'error', '-i', pl, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', file], { stdio: 'ignore', timeout: 180000 }); ok = fs.existsSync(file); } catch {} }
      }
      if (ok) (p.files ||= []).push(file); else (p.downloadErrors ||= []).push(`${owner.url}: video download failed (yt-dlp + ffmpeg)`);
    }
  }
}

// ---------- main ----------
(async () => {
  const exe = resolveChromium(chromium);
  const launchOpts = { headless: !HEADED, executablePath: exe };
  const ctxOpts = { userAgent: UA, viewport: { width: 1280, height: 1000 }, locale: 'en-US' };
  let browser, ctx;
  if (PROFILE) { ctx = await chromium.launchPersistentContext(PROFILE_DIR, { ...launchOpts, ...ctxOpts }); }
  else { browser = await chromium.launch(launchOpts); ctx = await browser.newContext(ctxOpts); }
  const page = ctx.pages()[0] || await ctx.newPage();

  if (LOGIN) {
    await page.goto('https://x.com/login');
    console.error('Log in to X in the opened window. This script exits once you reach the home timeline (or after 5 min).');
    await page.waitForURL(/x\.com\/home/, { timeout: 300000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await ctx.close();
    console.error('Saved profile to ' + PROFILE_DIR);
    return;
  }

  const videos = {}, playlists = {};
  page.on('request', r => {
    const full = r.url(), u = full.split('?')[0];
    const m = u.match(/video\.twimg\.com\/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)\/vid\/.*?\/(\d+)x(\d+)\/[^/]+\.mp4$/);
    if (m) { const l = (videos[m[1]] ||= []); if (!l.some(v => v.url === u)) l.push({ url: u, w: +m[2], h: +m[3] }); }
    const pm = u.match(/video\.twimg\.com\/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)\/pl\/[^/]+\.m3u8$/);
    if (pm && !playlists[pm[1]]) playlists[pm[1]] = full;   // master playlist (keeps ?tag/variant query)
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('article', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const header = await page.evaluate(HEADER);
  const posts = new Map();
  const extract = async () => { for (const p of await page.evaluate(EXTRACT)) if (!posts.has(p.id)) posts.set(p.id, p); };
  await extract();
  for (let i = 0; i < SCROLLS; i++) {
    const before = posts.size;
    await page.mouse.wheel(0, 1800);
    await page.waitForTimeout(1500);
    await extract();
    if (posts.size === before && i > 1) break; // nothing new twice → timeline exhausted (logged-out cap)
  }
  await page.waitForTimeout(1000);

  const list = [...posts.values()];
  // --full: visit each truncated post (and every post when it's a single-status URL) for the untruncated body
  if (FULL) {
    for (const p of list) {
      if (!p.truncated) continue;
      const pg = await ctx.newPage();
      try {
        await pg.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await pg.waitForSelector('article', { timeout: 15000 }).catch(() => {});
        await pg.waitForTimeout(1500);
        const full = (await pg.evaluate(EXTRACT)).find(x => x.id === p.id);
        if (full && full.text.length >= p.text.length) { p.text = full.text; p.truncated = full.truncated; }
      } catch (e) { p.fullError = e.message; } finally { await pg.close(); }
    }
  }
  attachVideos(list, videos);
  if (DL) await download(list, path.resolve(DL), playlists);

  const result = { source: url, fetchedAt: new Date().toISOString(), ...header, count: list.length, posts: list, hlsPlaylists: playlists };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  if (!QUIET) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else console.error(`${list.length} posts → ${OUT}`);
  await ctx.close(); if (browser) await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
