import React from 'react';
import { Upload } from 'lucide-react';

export default function VideoUpload({ onFileUpload }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #475569', borderRadius: '8px', padding: '60px', cursor: 'pointer', background: '#1e293b' }}>
      <Upload size={48} color="#94a3b8" style={{ marginBottom: '12px' }} />
      <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Upload Media File</span>
      <span style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Supports .mp4 or .webm clips</span>
      <input type="file" accept="video/mp4,video/webm" onChange={onFileUpload} style={{ display: 'none' }} />
    </label>
  );
}