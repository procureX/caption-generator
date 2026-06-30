import React from 'react';

export default function VideoPlayer({ videoUrl, videoName }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: '8px', padding: '12px', overflow: 'hidden' }}>
      <video src={videoUrl} controls style={{ width: '100%', borderRadius: '4px', display: 'block' }} />
      <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>🗂️ {videoName}</p>
    </div>
  );
}