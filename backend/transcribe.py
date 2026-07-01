import datetime
from faster_whisper import WhisperModel
import srt

_model = None

def get_model():
    """Lazily loads and caches the Whisper model so we only pay the load cost once
    per server process, instead of re-loading it on every transcription call."""
    global _model
    if _model is None:
        print("🤖 Loading local AI Whisper Model... (this may take a moment the first time)")
        _model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _model

def generate_subtitles(audio_path: str, output_srt_path: str, segments=None):
    """
    Writes an .srt file from Whisper segments.

    If `segments` is provided (e.g. already computed by the caller while
    streaming progress), those are reused directly instead of re-running
    transcription a second time.
    """
    if segments is None:
        model = get_model()
        print("🎙️ Transcribing audio track...")
        segments, info = model.transcribe(audio_path, beam_size=5, language="en")

    subtitle_blocks = []

    # Loop over every sentence the AI detects along with its timestamps
    for index, segment in enumerate(segments, start=1):
        # Convert raw seconds into a time format subtitles can understand
        start_time = datetime.timedelta(seconds=segment.start)
        end_time = datetime.timedelta(seconds=segment.end)

        # Build an individual subtitle entry
        sub = srt.Subtitle(
            index=index,
            start=start_time,
            end=end_time,
            content=segment.text.strip()
        )
        subtitle_blocks.append(sub)
        print(f"[{start_time} -> {end_time}]: {segment.text}")

    # Compile all sentences and save them as a clean standard .srt file
    with open(output_srt_path, "w", encoding="utf-8") as f:
        f.write(srt.compose(subtitle_blocks))

    print(f"🎉 Subtitles successfully generated at: {output_srt_path}")