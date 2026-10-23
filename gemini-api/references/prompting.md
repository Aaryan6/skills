# Prompting for media

## Images
- Describe it like a photo brief: subject, action, setting, camera or framing, light, style, mood.
- Reference images: refer to them by order and say what each contributes ("Image 1: keep the person's face. Image 2: use only the room"). Say what not to copy.
- Spell out hands, props and background objects. Unstated ones get invented.
- Text in the image: put the exact words in quotes, keep them short, check spelling afterwards.
- Edits: use `--previous-interaction-id` with a short instruction ("make the sky stormy") rather than re-describing the whole scene.
- Not for charts, diagrams or UI: draw those in code.

## Video
- One subject, one action, one camera move per clip. Short clips are more reliable than long ones.
- Give a start frame with `-i first-frame.png` to fix the look, and describe the motion from that frame.
- Say what is in frame at the start and end; name any object that must appear mid-clip.
- If the model burns captions or invents props into the frame, regenerate with "no captions, no on-screen text" and an action that doesn't need props.
- Extend with `--previous-interaction-id`; change aspect ratio and resolution on flags, not in the prompt.
- Check the first second and the last frame, not only the middle.

## Speech
- Write for the ear: contractions, short sentences.
- Direct the delivery in the text ("Say cheerfully: ...") or choose a different `--voice`.
- Use `--multi-speaker` with labelled turns for dialogue.

## Music
- Genre, tempo or feel, instruments, mood, and length intent ("30-second loop, no vocals").

## Analysis and transcription
- Ask a specific question, or ask for a format ("table of speakers and timestamps").
- For long media, upload with `files upload` first.
