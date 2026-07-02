import React, { useState } from 'react';
import { Globe, Save, Edit3, ChevronDown, ChevronUp, ListVideo, Flame, Download, Loader } from 'lucide-react';
import { LANGUAGES } from '../constants/languages';

export default function CaptionEditor({
  currentLang,
  onLangChange,
  onSave,
  captionLines,
  onTextChange,
  isSwitching,
  onStartBurnIn,
  isBurning,
  burnInProgress,
  burnInStage,
  burnInDownloadUrl,
}) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  return (
    <div style={{ background: '#1e293b', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} color="#38bdf8" />
          <select value={currentLang} onChange={(e) => onLangChange(e.target.value)} disabled={isSwitching} style={{ background: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '6px 12px', borderRadius: '4px', cursor: isSwitching ? 'not-allowed' : 'pointer' }}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>

        <button onClick={onSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Save size={16} /> Save Timeline Edits
        </button>
      </div>

      {/* Burn-in Captions section */}
      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f1f5f9', fontSize: '14px', fontWeight: '600' }}>
            <Flame size={16} color="#fb923c" /> Burn Captions Into Video
          </div>
          <button
            onClick={onStartBurnIn}
            disabled={isBurning}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isBurning ? '#475569' : '#ea580c', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: isBurning ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}
          >
            {isBurning ? <Loader size={14} className="spin" /> : <Flame size={14} />}
            {isBurning ? 'Burning In...' : 'Burn In Captions'}
          </button>
        </div>

        {isBurning && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ color: '#fb923c', fontWeight: '500' }}>🔥 {burnInStage || 'Rendering hardcoded captions onto video...'}</span>
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{burnInProgress}%</span>
            </div>
            <div style={{ width: '100%', background: '#334155', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${burnInProgress}%`, background: '#ea580c', height: '100%', transition: 'width 0.3s ease-out' }} />
            </div>
          </div>
        )}

        {burnInDownloadUrl && !isBurning && (
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <video
              src={burnInDownloadUrl}
              controls
              style={{ width: '100%', borderRadius: '4px', display: 'block', background: '#000' }}
            />
            <a
              href={burnInDownloadUrl}
              download
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#166534', color: '#fff', textDecoration: 'none', padding: '10px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}
            >
              <Download size={16} /> Download Burned Video
            </a>
          </div>
        )}
      </div>

      {/* Collapsible toggle - caption list stays hidden until the user opens this */}
      <button
        onClick={() => setIsTimelineOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '12px 14px',
          color: '#f1f5f9',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: isTimelineOpen ? '12px' : '0',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListVideo size={16} color="#38bdf8" />
          Caption Timeline ({captionLines.length} lines)
        </span>
        {isTimelineOpen ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
      </button>

      {isTimelineOpen && (
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
      )}
    </div>
  );
}
