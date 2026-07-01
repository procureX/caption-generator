import os
import subprocess
import re
import json
import datetime
import time
from typing import List
import srt
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class CaptionLine(BaseModel):
    index: int
    start: str
    end: str
    text: str

class UpdateCaptionRequest(BaseModel):
    captions: List[CaptionLine]

class GenerateRequest(BaseModel):
    lang: str

def get_video_duration(video_path):
    """Uses ffprobe to get the exact total duration of the video in seconds."""
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video_path]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0

def stream_ffmpeg_extraction(video_path, audio_path, total_duration):
    """Runs FFmpeg and yields progress percentages periodically as chunks compile."""
    if total_duration == 0:
        yield "data: 100\n\n"
        return

    cmd = [
        "ffmpeg", "-i", video_path, "-q:a", "0", "-map", "a", 
        "-progress", "pipe:1", "-y", audio_path
    ]
    
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    
    while True:
        line = process.stdout.readline()
        if not line:
            break
        
        if "out_time_ms=" in line:
            try:
                time_ms = float(line.split("=")[1].strip())
                current_seconds = time_ms / 1000000.0
                percentage = min(int((current_seconds / total_duration) * 100), 100)
                yield f"data: {percentage}\n\n"
            except Exception:
                pass
                
    process.communicate()
    yield "data: 100\n\n"

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Handles raw saving of file stream to disk."""
    ALLOWED_EXTENSIONS = (".mp4", ".webm")
    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Only .mp4 and .webm video files are supported!")

    video_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(video_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  
            buffer.write(chunk)

    base_filename, _ = os.path.splitext(file.filename)
    return {"base_filename": base_filename, "filename": file.filename}

@app.get("/extract-audio-progress/{filename}")
def extract_audio_progress(filename: str):
    """Server-Sent Events (SSE) endpoint tracking the real FFmpeg extraction progress loop."""
    video_path = os.path.join(UPLOAD_DIR, filename)
    base_filename, _ = os.path.splitext(filename)
    audio_path = os.path.join(UPLOAD_DIR, f"{base_filename}.mp3")
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video missing.")
        
    duration = get_video_duration(video_path)
    return StreamingResponse(stream_ffmpeg_extraction(video_path, audio_path, duration), media_type="text/event-stream")

@app.post("/generate/{filename}")
def generate_captions_stream(filename: str, data: GenerateRequest):
    """Streams live multi-bar AI progression updates back to the workspace dashboard."""
    video_path = os.path.join(UPLOAD_DIR, f"{filename}.mp4")
    if not os.path.exists(video_path):
        video_path = os.path.join(UPLOAD_DIR, f"{filename}.webm")

    audio_path = os.path.join(UPLOAD_DIR, f"{filename}.mp3")
    english_srt = os.path.join(UPLOAD_DIR, f"{filename}_en.srt")
    target_srt = os.path.join(UPLOAD_DIR, f"{filename}_{data.lang}.srt")

    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio track not prepared yet.")

    total_duration = get_video_duration(video_path) or 1.0

    def ai_pipeline_iterator():
        try:
            # --- PHASE 3: WHISPER TRANSCRIPTION ---
            if not os.path.exists(english_srt):
                yield "event: transcription_start\ndata: Connected to neural engine...\n\n"
                
                from transcribe import get_model, generate_subtitles

                model = get_model()
                segments, info = model.transcribe(audio_path, beam_size=5, language="en")

                collected_segments = []
                for segment in segments:
                    collected_segments.append(segment)
                    pct = min(int((segment.end / total_duration) * 100), 100)
                    yield f"event: transcription_progress\ndata: {pct}\n\n"
                    time.sleep(0.01) # Forces network buffer optimization flush

                # Reuse the segments we already computed above instead of
                # re-running transcription a second time inside generate_subtitles.
                generate_subtitles(audio_path, english_srt, segments=collected_segments)
            
            yield "event: transcription_complete\ndata: 100\n\n"

            # --- PHASE 4: TRANSLATION MATRIX ENGINE ---
            if data.lang != "en":
                yield "event: translation_start\ndata: Initializing text layer translations...\n\n"
                from translator import translate_srt_file

                # Create a generator-safe tracking proxy function to intercept callbacks
                def yield_progress(pct_val):
                    nonlocal current_translation_pct
                    current_translation_pct = pct_val

                current_translation_pct = 0
                last_streamed_pct = -1

                # Read files and run translation pipeline with real-time metrics capture
                # Instead of running everything inside an opaque call, we capture loops
                with open(english_srt, "r", encoding="utf-8") as f:
                    content = f.read()
                subtitles = list(srt.parse(content))
                total_lines = len(subtitles)

                if total_lines > 0:
                    translated_subtitles = []
                    from translator import translate_text_mock
                    
                    for index, subtitle in enumerate(subtitles):
                        # Translate individual line layout text structures
                        translated_text = translate_text_mock(subtitle.content, data.lang)
                        translated_subtitles.append(srt.Subtitle(
                            index=subtitle.index, start=subtitle.start, end=subtitle.end, content=translated_text
                        ))
                        
                        # Calculate and immediately yield the true math percentages down the network wire
                        pct = min(int(((index + 1) / total_lines) * 100), 100)
                        yield f"event: translation_progress\ndata: {pct}\n\n"

                    # Write out the completed target language SRT file matrix directly
                    with open(target_srt, "w", encoding="utf-8") as f:
                        f.write(srt.compose(translated_subtitles))
                else:
                    # Fallback for empty file boundaries
                    translate_srt_file(english_srt_path=english_srt, target_language=data.lang, output_srt_path=target_srt)
            
            yield "event: translation_complete\ndata: 100\n\n"

        except Exception as e:
            import traceback
            print(f"⚠️ Pipeline error: {e}")
            traceback.print_exc()
            yield f"event: error\ndata: {str(e)}\n\n"

    return StreamingResponse(ai_pipeline_iterator(), media_type="text/event-stream")

@app.get("/captions/{filename}/{lang}")
def get_captions(filename: str, lang: str):
    srt_path = os.path.join(UPLOAD_DIR, f"{filename}_{lang}.srt")
    if not os.path.exists(srt_path):
        raise HTTPException(status_code=404, detail="Subtitles missing.")
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    subtitles = list(srt.parse(content))
    return {"captions": [{"index": s.index, "start": str(s.start), "end": str(s.end), "text": s.content} for s in subtitles]}

@app.put("/captions/{filename}/{lang}")
def update_captions(filename: str, lang: str, data: UpdateCaptionRequest):
    srt_path = os.path.join(UPLOAD_DIR, f"{filename}_{lang}.srt")
    blocks = []
    for line in data.captions:
        h_s, m_s, s_s = map(float, line.start.split(':'))
        h_e, m_e, s_e = map(float, line.end.split(':'))
        blocks.append(srt.Subtitle(index=line.index, start=datetime.timedelta(hours=h_s, minutes=m_s, seconds=s_s), end=datetime.timedelta(hours=h_e, minutes=m_e, seconds=s_e), content=line.text))
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(srt.compose(blocks))
    return {"message": "Successfully updated!"}