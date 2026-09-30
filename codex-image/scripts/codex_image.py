"""Generate one image with Codex CLI's built-in image_gen tool (uses the ChatGPT login, no API key).

Usage:
  python codex_image.py "<prompt>" -o path/to/out.png [-r ref1.png -r ref2.png] [--transparent] [--model <codex model>] [--force]

Runs `codex exec`, asks it to generate the image with the imagegen skill and save it under the given filename,
then checks the file. If Codex doesn't copy the file itself, the newest image it wrote to
~/.codex/generated_images during this run is copied instead. Prints the final path and image info.

--transparent: Codex can't output real alpha, so the image is generated on a flat magenta key background and
the key is removed with Codex's bundled remove_chroma_key.py. The raw keyed image is kept next to the log.
"""
import argparse, os, re, shutil, subprocess, sys, tempfile, time
from pathlib import Path

KEY = '#FF00FF'
CHROMA = Path.home() / '.codex' / 'skills' / '.system' / 'imagegen' / 'scripts' / 'remove_chroma_key.py'

TEMPLATE = """Use the imagegen skill with the built-in image_gen tool (not the CLI fallback, no API key).
Generate exactly ONE image{refs}.

Image prompt:
{prompt}
{extra}
When the image is generated, copy the final PNG into the current working directory as `{name}`.
Do not edit, re-encode or post-process it. Reply with only its full path."""

KEY_NOTE = f"""
Background (overrides anything above about the background): the subject sits alone on a perfectly flat,
solid, uniform pure magenta {KEY} background filling the whole canvas edge to edge. No gradient, no texture,
no vignette, no shadow, no floor, no checkerboard. Do not use magenta, pink or purple anywhere on the subject.
Keep the subject's edges crisp with its outline fully separated from the background, and leave a margin of
background around it unless the framing asks for a crop at an edge.
"""


def inspect(path):
    try:
        from PIL import Image
        im = Image.open(path)
        if 'A' not in im.getbands(): return f'{im.width}x{im.height} {im.mode} (opaque, no alpha: any "transparent" checkerboard is painted in)'
        a = im.getchannel('A'); hist = a.histogram(); n = im.width * im.height
        return f'{im.width}x{im.height} {im.mode} (alpha: {hist[0] / n:.0%} transparent, {hist[255] / n:.0%} opaque)'
    except Exception as e:
        return f'(could not inspect: {e})'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('prompt')
    ap.add_argument('-o', '--out', required=True, help='output .png path')
    ap.add_argument('-r', '--ref', action='append', default=[], help='reference image (repeatable)')
    ap.add_argument('--transparent', action='store_true', help='generate on magenta and key it out to real alpha')
    ap.add_argument('--model', help='override the Codex model for this run')
    ap.add_argument('--force', action='store_true', help='overwrite an existing output file')
    ap.add_argument('--timeout', type=int, default=900)
    a = ap.parse_args()

    out = Path(a.out).resolve()
    if out.suffix.lower() != '.png': out = out.with_suffix('.png')
    if out.exists() and not a.force: sys.exit(f'{out} already exists: pick a new name (e.g. -v2) or pass --force')
    out.parent.mkdir(parents=True, exist_ok=True)
    refs = [str(Path(r).resolve()) for r in a.ref]
    for r in refs:
        if not os.path.isfile(r): sys.exit(f'reference not found: {r}')
    if a.transparent and not CHROMA.exists(): sys.exit(f'chroma-key script missing: {CHROMA}')

    codex = shutil.which('codex')
    if not codex: sys.exit('codex CLI not found on PATH')

    # plain mkdir, not mkdtemp: on Windows mkdtemp's owner-only ACL means files the Codex sandbox user writes
    # there end up unreadable by us. A normal folder inherits the user's access, like the output folder does.
    tmp = Path(tempfile.gettempdir()) / f'codex-image-{time.strftime("%Y%m%d-%H%M%S")}-{os.getpid()}'
    tmp.mkdir(parents=True)
    last, log = tmp / 'last-message.txt', tmp / 'codex.log'
    gen = tmp / f'{out.stem}-key.png' if a.transparent else out      # where Codex writes the image
    ref_note = f', using the {len(refs)} attached image(s) as references' if refs else ''
    prompt = TEMPLATE.format(refs=ref_note, prompt=a.prompt.strip(), extra=KEY_NOTE if a.transparent else '', name=gen.name)

    # prompt goes in on stdin ('-') so Windows .cmd quoting can't mangle it; '-' must come before -i (greedy)
    cmd = [codex, 'exec', '-', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', str(gen.parent), '-o', str(last)]
    if a.model: cmd += ['-m', a.model]
    for r in refs: cmd += ['-i', r]

    gen_dir = Path.home() / '.codex' / 'generated_images'
    t0 = time.time()
    print(f'codex: generating {out.name}{" (magenta key)" if a.transparent else ""} ...', flush=True)
    with open(log, 'w', encoding='utf-8') as lf:
        try:
            p = subprocess.run(cmd, input=prompt, text=True, encoding='utf-8', stdout=lf, stderr=subprocess.STDOUT, timeout=a.timeout)
        except subprocess.TimeoutExpired:
            sys.exit(f'codex timed out after {a.timeout}s; log: {log}')
    took = time.time() - t0

    if not gen.exists():   # fall back to the newest image Codex saved during this run
        fresh = sorted((f for f in gen_dir.rglob('*.png') if f.stat().st_mtime >= t0 - 5), key=lambda f: f.stat().st_mtime) if gen_dir.exists() else []
        if fresh: shutil.copy2(fresh[-1], gen); print(f'copied from {fresh[-1]}')
    if not gen.exists():
        lines = log.read_text(encoding='utf-8', errors='replace').splitlines()
        errs = [l for l in lines if l.startswith('ERROR') or 'error' in l.lower()[:40]]
        if any(re.search(r'usage limit|rate.?limit|\b429\b|quota|insufficient|limit reached|try again (in|at)', l, re.I) for l in errs):
            print(f'CODEX_LIMIT: Codex image quota or rate limit reached. Wait for the quota to reset or use another image generator. log: {log}\n'
                  + '\n'.join(errs[-5:]), file=sys.stderr)
            sys.exit(3)
        sys.exit(f'no image produced (exit {p.returncode}). log: {log}\n' + '\n'.join(lines[-25:]))

    if a.transparent:
        k = subprocess.run([sys.executable, str(CHROMA), '--input', str(gen), '--out', str(out), '--auto-key', 'border',
                            '--soft-matte', '--despill', '--force'], capture_output=True, text=True)
        if k.returncode or not out.exists(): sys.exit(f'chroma key failed:\n{k.stdout}{k.stderr}\nraw image: {gen}')
        print(f'raw (magenta): {gen}')

    print(f'image: {out}\n{inspect(out)}\nsize: {out.stat().st_size / 1e6:.2f} MB  time: {took:.0f}s  log: {log}')
    if last.exists(): print('codex said:', last.read_text(encoding='utf-8', errors='replace').strip()[:400])


if __name__ == '__main__':
    main()
