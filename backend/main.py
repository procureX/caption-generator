import os
import subprocess
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import srt
import datetime

from transcribe import generate_subtitles
from translator import translate_srt_file

app = FastAPI()

# Tell backend to explicitly permit traffic from local React development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],  # Permits GET, POST, PUT, DELETE
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_storage"

# A Pydantic Model to represent an individual caption block cleanly
class CaptionLine(BaseModel):
    index: int
    start: str  # Format: "00:00:00"
    end: str    # Format: "00:00:00"
    text: str

# A Pydantic Model to receive a list of updated caption blocks
class UpdateCaptionRequest(BaseModel):
    captions: List[CaptionLine]


@app.get("/")
def read_root():
    return {"message": "Hello! The Caption Generator backend is running successfully on Ubuntu!"}


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    ALLOWED_EXTENSIONS = (".mp4", ".webm")
    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Only .mp4 and .webm video files are supported!")

    video_path = os.path.join(UPLOAD_DIR, file.filename)
    base_filename, _ = os.path.splitext(file.filename)
    audio_path = os.path.join(UPLOAD_DIR, f"{base_filename}.mp3")
    
    english_srt = os.path.join(UPLOAD_DIR, f"{base_filename}_en.srt")
    spanish_srt = os.path.join(UPLOAD_DIR, f"{base_filename}_es.srt")
    urdu_srt = os.path.join(UPLOAD_DIR, f"{base_filename}_ur.srt")

    try:
        with open(video_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  
                buffer.write(chunk)

        ffmpeg_command = [
            "ffmpeg", "-i", video_path, "-q:a", "0", "-map", "a", audio_path, "-y"
        ]
        subprocess.run(ffmpeg_command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        generate_subtitles(audio_path, english_srt)
        translate_srt_file(english_srt_path=english_srt, target_language='es', output_srt_path=spanish_srt)
        translate_srt_file(english_srt_path=english_srt, target_language='ur', output_srt_path=urdu_srt)

        return {
            "message": "Success! Video processed, and multi-language subtitles generated.",
            "video_file": video_path,
            "base_filename": base_filename,  # We return this so the frontend knows what file to edit later
            "captions": {
                "english": english_srt,
                "spanish": spanish_srt,
                "urdu": urdu_srt
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Something went wrong: {str(e)}")


# 🔥 NEW: Endpoint to read an .srt file and format it into clean text blocks for editing
@app.get("/captions/{filename}/{lang}")
def get_captions(filename: str, lang: str):
    srt_path = os.path.join(UPLOAD_DIR, f"{filename}_{lang}.srt")
    
    if not os.path.exists(srt_path):
        raise HTTPException(status_code=404, detail="Subtitle file not found.")
        
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    subtitles = list(srt.parse(content))
    formatted_captions = []
    
    for sub in subtitles:
        formatted_captions.append({
            "index": sub.index,
            "start": str(sub.start),
            "end": str(sub.end),
            "text": sub.content
        })
        
    return {"filename": filename, "language": lang, "captions": formatted_captions}


# 🔥 NEW: Endpoint to receive edited text blocks and save them back over the file
@app.put("/captions/{filename}/{lang}")
def update_captions(filename: str, lang: str, data: UpdateCaptionRequest):
    srt_path = os.path.join(UPLOAD_DIR, f"{filename}_{lang}.srt")
    
    subtitle_blocks = []
    for line in data.captions:
        # Convert the incoming text time format back into standard Python time intervals
        h_s, m_s, s_s = map(float, line.start.split(':'))
        h_e, m_e, s_e = map(float, line.end.split(':'))
        
        sub = srt.Subtitle(
            index=line.index,
            start=datetime.timedelta(hours=h_s, minutes=m_s, seconds=s_s),
            end=datetime.timedelta(hours=h_e, minutes=m_e, seconds=s_e),
            content=line.text
        )
        subtitle_blocks.append(sub)
        
    # Write the compiled changes directly over the old file
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(srt.compose(subtitle_blocks))
        
    return {"message": f"Successfully updated and regenerated {lang} subtitles!"}