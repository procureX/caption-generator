import os
import subprocess
import datetime
from typing import List
import srt
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import custom processing functions from local modules
from transcribe import generate_subtitles
from translator import translate_srt_file

# Initialize the core FastAPI application instance
app = FastAPI()

# -----------------------------------------------------------------------------
# CROSS-ORIGIN RESOURCE SHARING (CORS) MIDDLEWARE CONFIGURATION
# -----------------------------------------------------------------------------
# Explicitly permit traffic from the local React/Vite development server.
# This prevents browsers from blocking frontend requests arriving from port 5173.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all standard methods: GET, POST, PUT, DELETE
    allow_headers=["*"],  # Allows all incoming metadata headers
)

# Define the local directory mapping where raw files are temporarily stored
UPLOAD_DIR = "temp_storage"


# -----------------------------------------------------------------------------
# PYDANTIC DATA STRUCTS / SCHEMAS FOR VALIDATION
# -----------------------------------------------------------------------------

# Represents a single caption object mapped to the exact .srt segment array structure
class CaptionLine(BaseModel):
    index: int
    start: str  # Expected string format from srt parser: "00:00:00,000"
    end: str    # Expected string format from srt parser: "00:00:00,000"
    text: str

# Handles inbound array validation payload for saving edited timelines
class UpdateCaptionRequest(BaseModel):
    captions: List[CaptionLine]

# Handles inbound string validation targeting an individual language selection
class GenerateRequest(BaseModel):
    lang: str


# -----------------------------------------------------------------------------
# API ENDPOINTS / ROUTING LOGIC
# -----------------------------------------------------------------------------

@app.get("/")
def read_root():
    """
    Basic sanity check endpoint to verify backend health.
    """
    return {"message": "Hello! The Caption Generator backend is running successfully on Ubuntu!"}


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Step 1: File Storage & Quick Audio Extraction
    Receives an incoming video stream chunk, writes it to the local temp disk,
    and runs FFmpeg to extract high-quality audio in seconds without triggering AI.
    """
    # Strict validation check on file extensions
    ALLOWED_EXTENSIONS = (".mp4", ".webm")
    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Only .mp4 and .webm video files are supported!")

    # Establish full system file paths
    video_path = os.path.join(UPLOAD_DIR, file.filename)
    base_filename, _ = os.path.splitext(file.filename)
    audio_path = os.path.join(UPLOAD_DIR, f"{base_filename}.mp3")

    try:
        # Stream file bytes sequentially into storage to guard system memory
        with open(video_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  
                buffer.write(chunk)

        # Run decoupled subprocess executing FFmpeg to rip audio cleanly
        # -q:a 0 sets VBR high-quality audio map
        ffmpeg_command = [
            "ffmpeg", "-i", video_path, "-q:a", "0", "-map", "a", audio_path, "-y"
        ]
        subprocess.run(ffmpeg_command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Return metadata instantly so frontend can configure the next step
        return {
            "message": "Video uploaded and audio prepped successfully!",
            "base_filename": base_filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload processing failed: {str(e)}")


@app.post("/generate/{filename}")
def generate_captions_for_language(filename: str, data: GenerateRequest):
    """
    Step 2: On-Demand AI Transcription & Targeted Translation
    Triggered when a user selects their language preference and clicks 'Generate'.
    """
    audio_path = os.path.join(UPLOAD_DIR, f"{filename}.mp3")
    english_srt = os.path.join(UPLOAD_DIR, f"{filename}_en.srt")
    target_srt = os.path.join(UPLOAD_DIR, f"{filename}_{data.lang}.srt")

    # Confirm requirements exist before proceeding to load heavy AI libraries
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file missing. Upload video first.")

    try:
        # A. Core English Baseline: Always ensure base English text exists on disk
        if not os.path.exists(english_srt):
            generate_subtitles(audio_path, english_srt)

        # B. Conditional Translation Layer: Only run if target selection is not English
        if data.lang != "en":
            translate_srt_file(english_srt_path=english_srt, target_language=data.lang, output_srt_path=target_srt)

        return {"message": f"Successfully generated {data.lang} captions!", "lang": data.lang}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")


@app.get("/captions/{filename}/{lang}")
def get_captions(filename: str, lang: str):
    """
    Workspace View Layer: Reads raw text file from disk, parses block schemas,
    and returns an ordered JSON array to populate the interactive React editor UI rows.
    """
    srt_path = os.path.join(UPLOAD_DIR, f"{filename}_{lang}.srt")
    
    if not os.path.exists(srt_path):
        raise HTTPException(status_code=404, detail="Subtitle file not found.")
        
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Standard subtitle string parser execution
    subtitles = list(srt.parse(content))
    formatted_captions = []
    
    # Restructure objects into crisp, valid dictionary entities for JSON transport
    for sub in subtitles:
        formatted_captions.append({
            "index": sub.index,
            "start": str(sub.start),
            "end": str(sub.end),
            "text": sub.content
        })
        
    return {"filename": filename, "language": lang, "captions": formatted_captions}


@app.put("/captions/{filename}/{lang}")
def update_captions(filename: str, lang: str, data: UpdateCaptionRequest):
    """
    Workspace Save Layer: Accepts full modified collection lists from React state,
    parses standard string representations back into Python delta-time objects,
    and formats them to overwrite files cleanly on the Ubuntu local drive.
    """
    srt_path = os.path.join(UPLOAD_DIR, f"{filename}_{lang}.srt")
    
    subtitle_blocks = []
    for line in data.captions:
        # Deconstruct timestamp strings back to individual float values
        h_s, m_s, s_s = map(float, line.start.split(':'))
        h_e, m_e, s_e = map(float, line.end.split(':'))
        
        # Build strict instances conforming back to internal SRT formatting libraries
        sub = srt.Subtitle(
            index=line.index,
            start=datetime.timedelta(hours=h_s, minutes=m_s, seconds=s_s),
            end=datetime.timedelta(hours=h_e, minutes=m_e, seconds=s_e),
            content=line.text
        )
        subtitle_blocks.append(sub)
        
    # Re-compose raw objects structure down to structured strings and save
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(srt.compose(subtitle_blocks))
        
    return {"message": f"Successfully updated and regenerated {lang} subtitles!"}