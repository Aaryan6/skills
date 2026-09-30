"""Final encode with a background music bed ducked under the voiceover.

    python add_music.py <project-dir> [--music assets/music.mp3] [--start 0] [--bed -19] [--music-from 0] [--out out/<slug>.mp4]

Reads out/raw.mp4 (the hyperframes render: voice + sfx), assets/music.mp3 and assets/voice.wav.
The music is trimmed from --start to the reel's length, faded in/out, levelled to --bed LUFS (-19 lands ~9 dB under the voice after a gentle duck:
clearly audible on a phone speaker; -24 or lower gets lost), then
sidechain-compressed by the voice alone (sfx don't pump it), mixed under the render and normalised
to -14 LUFS / -1.5 dBTP. Video gets the same grain-friendly x264 settings as the plain encode.
--music-from <s> keeps the first s seconds dry and brings the bed in at that second.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return float(json.loads(out)["format"]["duration"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--music", default="assets/music.mp3")
    ap.add_argument("--start", type=float, default=0.0, help="offset into the music track (s)")
    ap.add_argument("--bed", type=float, default=-19.0, help="music loudness before ducking (LUFS)")
    ap.add_argument("--music-from", type=float, default=0.0, help="reel second the bed comes in")
    ap.add_argument("--out")
    a = ap.parse_args()

    root = Path(a.project).resolve()
    raw, music, voice = root / "out/raw.mp4", root / a.music, root / "assets/voice.wav"
    for p in (raw, music, voice):
        if not p.exists():
            sys.exit(f"missing {p}")
    out = Path(a.out) if a.out else root / "out" / f"{root.name}.mp4"
    if not out.is_absolute():
        out = root / out
    end = duration(raw)
    span = end - a.music_from
    if duration(music) - a.start < span:
        sys.exit(f"music is shorter than the reel ({span:.1f}s) from --start {a.start}")
    delay = int(round(a.music_from * 1000))

    fmt = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"
    fc = (
        f"[1:a]{fmt},atrim=start={a.start}:duration={span},asetpts=PTS-STARTPTS,"
        f"loudnorm=I={a.bed}:TP=-3:LRA=7,{fmt},"
        f"afade=t=in:d=0.4,afade=t=out:st={span - 1.8:.2f}:d=1.8,adelay={delay}|{delay}[m];"
        f"[2:a]{fmt},apad[k];"
        f"[m][k]sidechaincompress=threshold=0.03:ratio=3:attack=30:release=400:makeup=1[md];"
        f"[0:a]{fmt}[r];"
        f"[r][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]"
    )
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-i", str(music), "-i", str(voice),
           "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
           "-c:v", "libx264", "-crf", "26", "-tune", "grain", "-maxrate", "12M", "-bufsize", "24M", "-preset", "slow",
           "-c:a", "aac", "-b:a", "192k", str(out)]
    subprocess.run(cmd, check=True)
    print(f"{out}  ({end:.1f}s, track from {a.start}s, bed enters at {a.music_from}s, {a.bed} LUFS, ducked under the voice)")


if __name__ == "__main__":
    main()
