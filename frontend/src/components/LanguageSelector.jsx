import React, { useState } from 'react';
import { Cpu, Globe } from 'lucide-react';

export default function LanguageSelector({ onStartAI, loading, aiProgress, aiStage }) {
  const [selectedLang, setSelectedLang] = useState('en');

  return (
    <div style={{ background: '#1e293b', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Globe size={20} color="#38bdf8" /> Configure Caption Settings
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ color: '#94a3b8', fontSize: '14px' }}>Target Language:</label>
        <select 
          value={selectedLang} 
          onChange={(e) => setSelectedLang(e.target.value)} 
          disabled={loading}
          style={{ background: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontSize: '15px' }}
        >
          <option value="en">English (Original)</option>
          <option value="es">Spanish (Español)</option>
          <option value="ur">Urdu (اردو)</option>
        </select>
      </div>

      <button 
        onClick={() => onStartAI(selectedLang)} 
        disabled={loading}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px', 
          background: loading ? '#475569' : '#22c55e', 
          color: '#fff', 
          border: 'none', 
          padding: '12px', 
          borderRadius: '4px', 
          cursor: loading ? 'not-allowed' : 'pointer', 
          fontWeight: 'bold', 
          fontSize: '16px' 
        }}
      >
        <Cpu size={18} /> {loading ? 'AI Engine Processing...' : 'Generate AI Captions'}
      </button>

      {/* Real-time multi-stage AI percentage bar */}
      {loading && aiProgress > 0 && (
        <div style={{ marginTop: '8px', background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: '#38bdf8', fontWeight: '500' }}>⚡ {aiStage}</span>
            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{aiProgress}%</span>
          </div>
          <div style={{ width: '100%', background: '#334155', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${aiProgress}%`, background: '#22c55e', height: '100%', transition: 'width 0.4s ease-out' }} />
          </div>
        </div>
      )}
    </div>
  );
}