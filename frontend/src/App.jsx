import React, { useState } from 'react';
import axios from 'axios';
import { FileVideo } from 'lucide-react';

// Import our brand new custom components!
import VideoUpload from './components/VideoUpload';
import VideoPlayer from './components/VideoPlayer';
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setLoading(true);
    setMessage('Processing video track... AI models are running transcription & translation...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData);
      setBaseFilename(response.data.base_filename);
      setMessage('Subtitles successfully generated!');
      fetchCaptions(response.data.base_filename, 'en');
    } catch (err) {
      setMessage(`Error processing file: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaptions = async (filename, lang) => {
    try {
      const response = await axios.get(`${API_BASE}/captions/${filename}/${lang}`);
      setCaptionLines(response.data.captions);
      setCurrentLang(lang);
    } catch (err) {
      setMessage('Error reading caption timeline files.');
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
      setMessage('Saving updates to file storage...');
      const response = await axios.put(`${API_BASE}/captions/${baseFilename}/${currentLang}`, {
        captions: captionLines
      });
      setMessage(response.data.message);
    } catch (err) {
      setMessage('Failed to persist modifications.');
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileVideo color="#38bdf8" /> Multi-Language Caption Workspace
        </h1>
      </header>

      {message && (
        <div style={{ background: '#1e293b', borderLeft: '4px solid #38bdf8', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: videoUrl ? '1fr 1fr' : '1fr', gap: '24px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!videoUrl ? (
            <VideoUpload onFileUpload={handleFileUpload} />
          ) : (
            <VideoPlayer videoUrl={videoUrl} videoName={videoFile?.name} />
          )}
        </div>

        {baseFilename && (
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