import os
import srt
import re
import time
from deep_translator import GoogleTranslator

# Reuse one GoogleTranslator instance per target language instead of
# constructing a new one for every single subtitle line.
_translator_cache = {}

def _get_translator(target_lang: str) -> GoogleTranslator:
    if target_lang not in _translator_cache:
        _translator_cache[target_lang] = GoogleTranslator(source="en", target=target_lang)
    return _translator_cache[target_lang]

def translate_text_mock(text: str, target_lang: str) -> str:
    """
    Translates a single subtitle line into `target_lang` using Google Translate
    via the free deep-translator library (no API key required).

    Name kept as `translate_text_mock` so main.py doesn't need to change its import.
    """
    cleaned_text = text.strip()
    if not cleaned_text:
        return cleaned_text

    try:
        translator = _get_translator(target_lang)
        result = translator.translate(cleaned_text)
        time.sleep(0.1)  # small pause between requests to avoid rate-limiting
        return result
    except Exception as e:
        # Don't let one failed line (e.g. a transient network hiccup or rate limit)
        # kill the whole subtitle file — fall back to the original English text
        # for that line, but make the failure visible in the server console.
        print(f"⚠️ Translation failed for '{cleaned_text[:50]}...': {e}")
        return cleaned_text

def translate_srt_file(english_srt_path: str, target_language: str, output_srt_path: str, on_progress=None):
    """
    Parses an SRT file and translates it line-by-line while calculating 
    precise progress percentages for the frontend stream.
    """
    if not os.path.exists(english_srt_path):
        raise FileNotFoundError(f"Source SRT block missing at: {english_srt_path}")

    # Read the original source file
    with open(english_srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Parse SRT blocks
    subtitles = list(srt.parse(content))
    total_lines = len(subtitles)

    if total_lines == 0:
        if on_progress:
            on_progress(100)
        with open(output_srt_path, "w", encoding="utf-8") as f:
            f.write("")
        return

    translated_subtitles = []

    # Process and translate each line
    for index, subtitle in enumerate(subtitles):
        translated_text = translate_text_mock(subtitle.content, target_language)
        
        translated_subtitles.append(srt.Subtitle(
            index=subtitle.index,
            start=subtitle.start,
            end=subtitle.end,
            content=translated_text
        ))

        # Real-time progress callback
        if on_progress:
            current_percentage = min(int(((index + 1) / total_lines) * 100), 100)
            on_progress(current_percentage)

    # Use utf-8-sig to include the Byte Order Mark (BOM).
    # This forces subtitle players and editors to treat the Urdu text 
    # correctly as UTF-8, preventing rendering glitches.
    with open(output_srt_path, "w", encoding="utf-8-sig") as f:
        f.write(srt.compose(translated_subtitles))