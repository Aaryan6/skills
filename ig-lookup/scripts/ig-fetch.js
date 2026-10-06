#!/usr/bin/env node
// ig-fetch: Instagram reels → JSON (views, caption, likes, comments, date, duration), optional download + transcript.
// Usage: node ig-fetch.js <url|@user|user> [--top N] [--all] [--meta N] [--download DIR] [--transcribe] [--sheets]
//                         [--out FILE] [--quiet] [--headed] [--no-profile]
//        node ig-fetch.js --login
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const VALUE_FLAGS = ['--top', '--meta', '--download', '--out', '--scrolls'];
const positional = argv.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]));
const QUIET = flag('--quiet');
const log = (...a) => { if (!QUIET) console.error('[ig]', ...a); };

const PROFILE_DIR = path.join(__dirname, '..', '.profile');

// ---------- url → target ----------
function parseTarget(s) {
  if (!s) return null;
  s = s.trim().replace(/^@/, '');
  if (!/^https?:/.test(s)) {
    if (/^[\w.]+$/.test(s)) return { kind: 'profile', user: s };
    s = 'https://www.instagram.com/' + s.replace(/^\/+/, '');
  }
  const u = new URL(s.replace(/^https?:\/\/(m\.)?instagram\.com/, 'https://www.instagram.com'));
  const p = u.pathname.split('/').filter(Boolean);
  let m;
  if ((m = u.pathname.match(/\/(?:reel|p|tv)\/([\w-]+)/))) return { kind: 'reel', id: m[1] };
  if (p[0] === 'reels' && p[1]) return { kind: 'reel', id: p[1] };
  if (p[0] === 'explore' && p[1] === 'tags' && p[2]) return { kind: 'tag', tag: p[2] };
  if (p[0] === 'popular' && p[1]) return { kind: 'tag', tag: p[1] };
  if (p[0] === 'stories' && p[1]) return { kind: 'profile', user: p[1] };
  if (p[0]) return { kind: 'profile', user: p[0] };
  throw new Error('unrecognised Instagram URL: ' + s);
}
const target = flag('--login') ? { kind: 'login' } : parseTarget(positional[0]);
if (!target) {
  console.error('usage: ig-fetch.js <instagram url | username> [--top N] [--all] [--meta N] [--download DIR] [--transcribe] [--sheets] [--out FILE]');
  process.exit(1);
}

// ---------- playwright + chromium resolution (same as x-lookup) ----------
function npmGlobalRoot() {
  try { return require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; }
}
function resolvePlaywright() {
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
const CHROMIUM_EXES = {
  win32: ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe'],
  darwin: [`chrome-mac-${process.arch === 'arm64' ? 'arm64' : 'x64'}/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'],
  linux: ['chrome-linux64/chrome', 'chrome-linux/chrome'],
};
function resolveChromium(chromium) {
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
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

// ---------- helpers ----------
const toNum = s => { const m = (s || '').replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i); if (!m) return null; return Math.round(+m[1] * ({ K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reelUrl = id => `https://www.instagram.com/reel/${id}/`;
const have = cmd => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0;

// Collect reel tiles from a grid page (profile /reels/ or hashtag page), scrolling until nothing new appears.
async function scrapeGrid(page, url, maxScrolls) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('a[href*="/reel/"], a[href*="/p/"]', { timeout: 20000 }).catch(() => {});
  await sleep(2500);
  const seen = new Map();
  let stale = 0;
  for (let i = 0; i < maxScrolls && stale < 6; i++) {
    const tiles = await page.evaluate(() => [...document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]')]
      .map(a => ({ href: a.getAttribute('href'), t: a.innerText.trim() })));
    const before = seen.size;
    for (const { href, t } of tiles) {
      const m = href.match(/\/(?:reel|p)\/([\w-]+)\/?(?:\?|$)/);
      if (!m || href.includes('/c/') || seen.has(m[1])) continue;
      const viewsText = t.split('\n')[0] || null;
      seen.set(m[1], { id: m[1], url: reelUrl(m[1]), viewsText, views: toNum(viewsText) });
    }
    stale = seen.size === before ? stale + 1 : 0;
    await page.mouse.wheel(0, 3000);
    await sleep(1600);
  }
  const head = await page.evaluate(() => ({
    title: document.title,
    og: document.querySelector('meta[property="og:description"]')?.content || null,
    loginWall: !!document.querySelector('input[name="username"]') || /accounts\/login/.test(location.pathname),
  }));
  return { head, reels: [...seen.values()] };
}

// Per-reel metadata via yt-dlp (works logged out).
function reelMeta(id) {
  try {
    const out = execFileSync('yt-dlp', ['-j', '--no-warnings', '--skip-download', reelUrl(id)], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).toString();
    const j = JSON.parse(out);
    return {
      handle: j.channel || j.uploader_id || null, name: j.uploader || null,
      caption: j.description || '', likes: j.like_count ?? null, comments: j.comment_count ?? null,
      date: j.timestamp ? new Date(j.timestamp * 1000).toISOString().slice(0, 10) : null,
      duration: j.duration ? Math.round(j.duration) : null, width: j.width || null, height: j.height || null,
      thumbnail: j.thumbnail || null,
    };
  } catch (e) { return { error: 'yt-dlp metadata failed' }; }
}

function download(id, dir) {
  const file = path.join(dir, `${id}.mp4`);
  if (fs.existsSync(file)) return file;
  try {
    execFileSync('yt-dlp', ['-q', '--no-warnings', '-f', 'best[ext=mp4]/best', '-o', file, reelUrl(id)], { stdio: ['ignore', 'ignore', 'pipe'] });
    return fs.existsSync(file) ? file : null;
  } catch { return null; }
}

function probeDuration(file) {
  try { return Math.round(parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString())) || null; } catch { return null; }
}

function contactSheet(file) {
  try {
    const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString()) || 30;
    const out = file.replace(/\.mp4$/, '.jpg');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', `fps=${(12 / dur).toFixed(4)},scale=270:-1,tile=6x2`, '-frames:v', '1', out]);
    return out;
  } catch { return null; }
}

// One-time login: visible Chromium, wait for the sessionid cookie, keep the profile.
async function login() {
  const { chromium } = resolvePlaywright();
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { headless: false, executablePath: resolveChromium(chromium), viewport: null });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://www.instagram.com/accounts/login/');
  console.error('[ig] Log in in the browser window. It closes by itself once you are in (10 min limit).');
  for (let i = 0; i < 600; i++) {
    const ck = await ctx.cookies('https://www.instagram.com').catch(() => []);
    if (ck.some(c => c.name === 'sessionid' && c.value)) { await sleep(4000); console.error('[ig] Logged in. Session saved to', PROFILE_DIR); break; }
    await sleep(1000);
  }
  await ctx.close();
}

// ---------- main ----------
(async () => {
  if (target.kind === 'login') return login();
  const result = { source: positional[0], kind: target.kind, fetchedAt: new Date().toISOString() };
  let reels = [];

  if (target.kind === 'reel') {
    reels = [{ id: target.id, url: reelUrl(target.id), viewsText: null, views: null }];
  } else {
    const { chromium } = resolvePlaywright();
    const useProfile = !flag('--no-profile') && fs.existsSync(PROFILE_DIR);
    const launchOpts = { headless: !flag('--headed'), executablePath: resolveChromium(chromium) };
    let ctx, browser;
    if (useProfile) ctx = await chromium.launchPersistentContext(PROFILE_DIR, { ...launchOpts, userAgent: UA, viewport: { width: 1280, height: 1000 } });
    else { browser = await chromium.launch(launchOpts); ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 1000 } }); }
    const page = ctx.pages()[0] || await ctx.newPage();
    const url = target.kind === 'profile' ? `https://www.instagram.com/${target.user}/reels/` : `https://www.instagram.com/explore/tags/${target.tag}/`;
    const maxScrolls = flag('--all') ? 200 : +opt('--scrolls', 8);
    log(`${useProfile ? 'logged-in' : 'logged-out'} → ${url}`);
    const g = await scrapeGrid(page, url, maxScrolls);
    await ctx.close(); if (browser) await browser.close();
    Object.assign(result, { title: g.head.title, header: g.head.og, loggedIn: useProfile, loginWall: g.head.loginWall });
    if (target.kind === 'profile') result.user = target.user; else result.tag = target.tag;
    reels = g.reels;
    result.totalSeen = reels.length;
    if (!useProfile && reels.length <= 12) result.note = 'logged out: Instagram only serves the latest ~12 reels. Run --login once for full history.';
    if (reels.some(r => r.views != null)) {
      reels.sort((a, b) => (b.views || 0) - (a.views || 0));
      const sorted = reels.map(r => r.views || 0).sort((a, b) => a - b);
      result.medianViews = sorted[Math.floor(sorted.length / 2)];
    }
    log(`${reels.length} reels`);
  }

  // How many reels get metadata / downloads: --top N limits the list, --meta N limits metadata (default: top 10).
  const top = +opt('--top', 0);
  if (top) reels = reels.slice(0, top);
  const metaN = target.kind === 'reel' ? 1 : +opt('--meta', Math.min(10, reels.length));
  const dlDir = opt('--download', null) || (flag('--transcribe') || flag('--sheets') ? path.join(os.tmpdir(), 'ig-lookup') : null);
  if (dlDir) fs.mkdirSync(dlDir, { recursive: true });

  const needYtdlp = metaN > 0 || dlDir;
  if (needYtdlp && !have('yt-dlp')) { log('yt-dlp not on PATH — skipping metadata/downloads'); }
  else {
    for (let i = 0; i < reels.length; i++) {
      const r = reels[i];
      if (i < metaN) { log(`meta ${i + 1}/${metaN} ${r.id}`); Object.assign(r, reelMeta(r.id)); await sleep(700); }
      if (dlDir && i < metaN) {
        const f = download(r.id, dlDir);
        r.file = f;
        if (f && !r.duration) r.duration = probeDuration(f);
        if (f && flag('--sheets')) r.sheet = contactSheet(f);
      }
    }
  }

  if (flag('--transcribe') && dlDir) {
    const files = reels.filter(r => r.file).map(r => r.file);
    if (files.length) {
      log(`transcribing ${files.length} file(s)…`);
      const py = process.platform === 'win32' ? 'python' : 'python3';
      const r = spawnSync(py, ['-I', path.join(__dirname, 'transcribe.py'), ...files], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, maxBuffer: 64 << 20 });
      try {
        const tx = JSON.parse(r.stdout);
        for (const reel of reels) if (reel.file && tx[reel.file]) reel.transcript = tx[reel.file];
      } catch { log('transcription failed:', (r.stderr || '').slice(-400)); }
    }
  }

  result.count = reels.length;
  result.reels = reels;
  const json = JSON.stringify(result, null, 1);
  const out = opt('--out', null);
  if (out) { fs.writeFileSync(out, json); log('wrote', out); } else process.stdout.write(json + '\n');
})().catch(e => { console.error('[ig] error:', e.message); process.exit(1); });
