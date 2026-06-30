import React, { useState } from 'react';
import { Upload } from 'lucide-react';

export default function VideoUpload({ onFileUpload, uploadProgress }) {
  const [isDragging, setIsDragging] = useState(false);

  // Toggle active highlights when user moves files over the bounding box
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  // Capture the raw dropped file elements instead of typical file click triggers
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Mock an event struct payload so it matches our existing handler
      onFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <label 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          border: isDragging ? '2px dashed #38bdf8' : '2px dashed #475569', 
          borderRadius: '8px', 
          padding: '60px', 
          cursor: 'pointer', 
          background: isDragging ? '#1e293b' : '#111827',
          transition: 'all 0.2s ease-in-out'
        }}
      >
        <Upload size={48} color={isDragging ? "#38bdf8" : "#94a3b8"} style={{ marginBottom: '12px' }} />
        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
          {isDragging ? "Drop your file here!" : "Drag & Drop Video or Browse"}
        </span>
        <span style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Supports .mp4 or .webm clips</span>
        <input type="file" accept="video/mp4,video/webm" onChange={onFileUpload} style={{ display: 'none' }} />
      </label>

      {/* Real-time file upload network status bar */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
            <span>Uploading file stream...</span>
            <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{uploadProgress}%</span>
          </div>
          <div style={{ width: '100%', background: '#334155', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${uploadProgress}%`, background: '#38bdf8', height: '100%', transition: 'width 0.1s linear' }} />
          </div>
        </div>
      )}
    </div>
  );
}