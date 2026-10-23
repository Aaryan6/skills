# Command reference

Run `gemini-api <command> --help` for the full list; these are the common calls.

## image
```bash
gemini-api image "a lighthouse at sunset, film photo" --aspect-ratio 16:9 --image-size 2K --out out/lighthouse.png
gemini-api image "same scene, stormy sky" --previous-interaction-id <id>      # edit the last result
gemini-api image "put this logo on a mug" -i logo.png --out out/mug.png      # reference image(s)
```
Flags: `--aspect-ratio` (1:1, 2:3, 3:2, 3:4, 9:16, 16:9 ...), `--image-size` (512, 1K, 2K, 4K), `-i` (repeatable), `--output-mime-type`, `-m` (for example gemini-3-pro-image, nano-banana-pro-preview).

## video
```bash
gemini-api video "ocean waves at dawn" --aspect-ratio 9:16 --resolution 1080p --out clips/waves.mp4
gemini-api video "she turns and waves" -i first-frame.png --out clips/wave.mp4
gemini-api video "now pan to the left" --previous-interaction-id <id>         # extend or edit
gemini-api video "a timelapse of a city at night" --async                     # returns an id
gemini-api video --resume <id>
```
Flags: `--aspect-ratio`, `--resolution` (360p, 720p default, 1080p, 4k), `--poll-interval`, `--poll-timeout`.

## tts
```bash
gemini-api tts "Welcome to the show" --voice Kore --out voice.wav
gemini-api tts -f script.txt --voice Puck --language en-US --out voice.wav
gemini-api tts "Alice: hi. Bob: hello." --multi-speaker "Alice=Kore,Bob=Puck"
```
Voices include Kore (default), Puck, Zephyr, Charon, Fenrir, Aoede. Output is 24 kHz mono WAV.

## music
```bash
gemini-api music "upbeat synthwave with a driving bassline" --out track.mp3
```
Models: lyria-3.5 (default), lyria-3-pro-preview, lyria-3-clip-preview.

## analyze
```bash
gemini-api analyze -i report.pdf "Summarize the key findings"
gemini-api analyze -i https://youtu.be/<id> "What happens at 1:00?"
gemini-api analyze -i a.png -i b.png "What changed between these?"
```
`--system` steers the answer. Default question: "Describe this file in detail."

## transcribe
```bash
gemini-api transcribe -i interview.mp3 --format srt --out interview.srt
gemini-api transcribe -i call.wav --format json --no-speakers
```
Formats: md (default), text, json, srt. Speakers and timestamps are on by default.

## generate
```bash
gemini-api generate "Explain DNS in two sentences" --stream=false
gemini-api generate -i notes.txt --system "You are a copy editor" "Tighten this"
```
Continue a conversation with `--previous-interaction-id`. For a JSON payload use `--body @request.json`; print the schema with `--schema`.

## files
```bash
gemini-api files upload big-video.mp4        # then use -i files/<id>
gemini-api files list
gemini-api files delete files/<id>
```

## agent (managed background agents)
```bash
gemini-api agent run --help                                               # read the flags first
gemini-api agent status <interaction-id> --stream=false --output-format json
gemini-api agent cancel <interaction-id>
```
Agent ids and interaction ids are different resources: `agent status` takes an interaction id, `agent get` takes an agent id.

## Global
`--output-format json|toon|text`, `--jq`, `--dry-run`, `--usage`, `--raw-response`, `--help-global`.
