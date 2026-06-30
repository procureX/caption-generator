import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles } from 'lucide-react';

import VideoUpload from './components/VideoUpload';
import VideoPlayer from './components/VideoPlayer';
import LanguageSelector from './components/LanguageSelector';
import CaptionEditor from './components/CaptionEditor';

const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [baseFilename, setBaseFilename] = useState('');
  const [currentLang, setCurrentLang] = useState('en');
  const [captionLines, setCaptionLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [aiGenerated, setAiGenerated] = useState(false);

  // Core Percentage States
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStage, setAiStage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false); // Dedicated state for AI progress block

  // Step 1: Upload video file
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setLoading(true);
    setAiGenerated(false);
    setUploadProgress(1); // Force bar to appear immediately
    setMessage('Initiating upload stream...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // Keep it at 99% until backend completely responds to show it's extracting audio
          setUploadProgress(percentCompleted < 100 ? percentCompleted : 99);
        }
      });
      
      setUploadProgress(100); // Successfully completed everything
      setBaseFilename(response.data.base_filename);
      setMessage('Video staged successfully! Configure target language choices below.');
    } catch (err) {
      setUploadProgress(0);
      setMessage(`System upload failure: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Run AI Generation Loop
  const handleStartAIEngine = async (targetLang) => {
    setIsAiLoading(true); // Open the AI progress bar block instantly
    setAiProgress(5);
    setAiStage('Booting translation blocks and loading system audio...');
    setMessage('Processing your request...');

    // Smooth progress simulation intervals matching application execution thresholds
    const interval = setInterval(() => {
      setAiProgress((prev) => {
        if (prev < 45) {
          setAiStage('Running faster-whisper neural processing transcription checks...');
          return prev + 3;
        }
        if (prev >= 45 && prev < 85) {
          setAiStage(targetLang === 'en' ? 'Refining timestamps and formatting timeline blocks...' : `Translating baseline elements into target language context [${targetLang}]...`);
          return prev + 2;
        }
        if (prev >= 85 && prev < 98) {
          setAiStage('Writing output .srt structures smoothly to localized disk storage...');
          return prev + 1;
        }
        return prev;
      });
    }, 400);

    try {
      await axios.post(`${API_BASE}/generate/${baseFilename}`, { lang: targetLang });
      
      clearInterval(interval);
      setAiProgress(100);
      setAiStage('Processing complete!');
      setAiGenerated(true);
      setMessage(`AI successfully processed and saved your ${targetLang.toUpperCase()} workspace tracks!`);
      
      fetchCaptions(baseFilename, targetLang);
    } catch (err) {
      clearInterval(interval);
      setAiProgress(0);
      setAiStage('');
      setMessage(`AI Engine Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const fetchCaptions = async (filename, lang) => {
    try {
      const response = await axios.get(`${API_BASE}/captions/${filename}/${lang}`);
      setCaptionLines(response.data.captions);
      setCurrentLang(lang);
    } catch (err) {
      setMessage('Error fetching requested workspace timeline objects.');
    }
  };

  const handleTextChange = (index, newText) => {
    const updated = [...captionLines];
    updated[index].text = newText;
    setCaptionLines(updated);
  };

  const saveCaptionEdits = async () => {
    if (!baseFilename) return;
    try {
      setMessage('Committing changes safely to file system...');
      const response = await axios.put(`${API_BASE}/captions/${baseFilename}/${currentLang}`, {
        captions: captionLines
      });
      setMessage(response.data.message);
    } catch (err) {
      setMessage('Error updating disk entities.');
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#090d16', color: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      <header style={{ borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', letterSpacing: '-0.5px' }}>
          <Sparkles color="#38bdf8" fill="#38bdf8" size={24} /> AI Subtitle Generator
        </h1>
      </header>

      {message && (
        <div style={{ background: '#111827', borderLeft: '4px solid #38bdf8', padding: '14px', borderRadius: '4px', marginBottom: '16px', fontSize: '15px' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: videoUrl ? '1fr 1fr' : '1fr', gap: '24px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!videoUrl ? (
            <VideoUpload onFileUpload={handleFileUpload} uploadProgress={uploadProgress} />
          ) : (
            <>
              <VideoPlayer videoUrl={videoUrl} videoName={videoFile?.name} />
              
              {/* Show file upload feedback bar under player if it is still cooking */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                    <span>Extracting audio frequencies via FFmpeg...</span>
                    <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{uploadProgress}%</span>
                  </div>
                  <div style={{ width: '100%', background: '#334155', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, background: '#38bdf8', height: '100%' }} />
                  </div>
                </div>
              )}

              {!aiGenerated && (
                <LanguageSelector 
                  onStartAI={handleStartAIEngine} 
                  loading={isAiLoading} 
                  aiProgress={aiProgress}
                  aiStage={aiStage}
                />
              )}
            </>
          )}
        </div>

        {aiGenerated && baseFilename && (
          <CaptionEditor 
            currentLang={currentLang}
            onLangChange={(lang) => fetchCaptions(baseFilename, lang)}
            onSave={saveCaptionEdits}
            captionLines={captionLines}
            onTextChange={handleTextChange}
          />
        )}

      </div>
    </div>
  );
}