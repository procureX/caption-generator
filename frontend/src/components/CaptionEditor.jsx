import React from 'react';
import { Globe, Save, Edit3 } from 'lucide-react';

export default function CaptionEditor({ currentLang, onLangChange, onSave, captionLines, onTextChange }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} color="#38bdf8" />
          <select value={currentLang} onChange={(e) => onLangChange(e.target.value)} style={{ background: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
            <option value="en">English (Original)</option>
            <option value="es">Spanish (Español)</option>
            <option value="ur">Urdu (اردو)</option>
          </select>
        </div>

        <button onClick={onSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
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
              <input type="text" value={line.text} onChange={(e) => onTextChange(index, e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px dashed #475569', color: '#f1f5f9', fontSize: '15px', padding: '4px 0', outline: 'none' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}