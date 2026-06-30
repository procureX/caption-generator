import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Save, Globe, FileVideo, Edit3 } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [baseFilename, setBaseFilename] = useState('');
  const [currentLang, setCurrentLang] = useState('en');
  const [captionLines, setCaptionLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 1. Send the file to the FastAPI upload endpoint
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file)); // Create local link so video tag can play it instantly
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

  // 2. Fetch the text blocks when a language dropdown option updates
  const fetchCaptions = async (filename, lang) => {
    try {
      const response = await axios.get(`${API_BASE}/captions/${filename}/${lang}`);
      setCaptionLines(response.data.captions);
      setCurrentLang(lang);
    } catch (err) {
      setMessage('Error reading caption timeline files.');
    }
  };

  // 3. Keep text changes tracked directly inside React local state array elements
  const handleTextChange = (index, newText) => {
    const updated = [...captionLines];
    updated[index].text = newText;
    setCaptionLines(updated);
  };

  // 4. Fire the updated JSON array back over to the PUT server endpoint to write over disk
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
        
        {/* LEFT COLUMN: Upload Mechanism & HTML5 Video Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!videoUrl ? (
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #475569', borderRadius: '8px', padding: '60px', cursor: 'pointer', background: '#1e293b' }}>
              <Upload size={48} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Upload Media File</span>
              <span style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Supports .mp4 or .webm clips</span>
              <input type="file" accept="video/mp4,video/webm" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          ) : (
            <div style={{ background: '#1e293b', borderRadius: '8px', padding: '12px', overflow: 'hidden' }}>
              <video src={videoUrl} controls style={{ width: '100%', borderRadius: '4px', display: 'block' }} />
              <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>🗂️ {videoFile?.name}</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Dashboard Transcription Sync Lists & Editor Forms */}
        {baseFilename && (
          <div style={{ background: '#1e293b', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={18} color="#38bdf8" />
                <select value={currentLang} onChange={(e) => fetchCaptions(baseFilename, e.target.value)} style={{ background: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                  <option value="en">English (Original)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="ur">Urdu (اردو)</option>
                </select>
              </div>

              <button onClick={saveCaptionEdits} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                <Save size={16} /> Save Timeline Edits
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {captionLines.map((line, index) => (
                <div key={line.index} style={{ background: '#0f172a', borderRadius: '6px', padding: '12px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', marginBottom: '6px' }}>
                    <span># {line.index}</span>
                    <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{line.start.split('.')[0]} → {line.end.split('.')[0]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Edit3 size={14} color="#475569" />
                    <input type="text" value={line.text} onChange={(e) => handleTextChange(index, e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px dashed #475569', color: '#f1f5f9', fontSize: '15px', padding: '4px 0', outline: 'none' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}