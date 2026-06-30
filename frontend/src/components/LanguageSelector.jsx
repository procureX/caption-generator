import React, { useState } from 'react';
import { Cpu, Globe } from 'lucide-react';

export default function LanguageSelector({ onStartAI, loading }) {
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
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#22c55e', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: '0.2s' }}
      >
        <Cpu size={18} /> {loading ? 'AI Engine Running...' : 'Generate AI Captions'}
      </button>
    </div>
  );
}