import React from 'react';
import { Sparkles } from 'lucide-react';

// Core UI Workspace Layout Components
import VideoUpload from './components/VideoUpload';
import VideoPlayer from './components/VideoPlayer';
import LanguageSelector from './components/LanguageSelector';
import CaptionEditor from './components/CaptionEditor';

// Modular Progress Meter Component
import ProgressBar from './components/ProgressBar';

// Custom State Hook Extraction
import useVideoWorkspace from './hooks/useVideoWorkspace';

export default function App() {
  // Destructure the correct 4-bar progress tracking variables from your hook
  const {
    videoFile,
    videoUrl,
    baseFilename,
    currentLang,
    captionLines,
    loading,
    message,
    aiGenerated,
    uploadProgress,
    ffmpegProgress,
    isExtracting,
    transcribeProgress,
    translateProgress,
    isAiLoading,
    isBurning,
    burnInProgress,
    burnInStage,
    burnInDownloadUrl,
    handleFileUpload,
    handleStartAIEngine,
    switchLanguage,
    handleTextChange,
    saveCaptionEdits,
    startBurnIn
  } = useVideoWorkspace();

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#090d16', color: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      
      {/* 🎬 HEADER BRANDING BLOCK */}
      <header style={{ borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800' }}>
          <Sparkles color="#38bdf8" fill="#38bdf8" size={24} /> AI Subtitle Studio
        </h1>
      </header>

      {/* 🔔 GLOBAL SYSTEM EVENT ALERT NOTIFICATION BANNER */}
      {message && (
        <div style={{ background: '#111827', borderLeft: '4px solid #38bdf8', padding: '14px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px' }}>
          {message}
        </div>
      )}

      {/* 🎛️ CORE INTERACTIVE WORKSPACE LAYOUT GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: videoUrl ? '1fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Media Feed and Core Status Monitors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!videoUrl ? (
            <VideoUpload onFileUpload={handleFileUpload} uploadProgress={uploadProgress} />
          ) : (
            <>
              {/* Local File Media Canvas Player Component */}
              <VideoPlayer videoUrl={videoUrl} videoName={videoFile?.name} />
              
              {/* 📊 BAR 1: Persistent Network Upload */}
              {uploadProgress > 0 && (
                <ProgressBar 
                  title="1. File Upload Status" 
                  percentage={uploadProgress} 
                  activeColor="#38bdf8" 
                  isComplete={uploadProgress === 100}
                />
              )}

              {/* 📊 BAR 2: Independent Hardware FFmpeg Extraction */}
              {(isExtracting || ffmpegProgress > 0) && (
                <ProgressBar 
                  title="2. FFmpeg Audio Extraction" 
                  percentage={ffmpegProgress} 
                  activeColor="#a855f7" 
                  isComplete={ffmpegProgress === 100}
                />
              )}

              {/* 📊 BAR 3: Real Whisper Neural Transcription Progress */}
              {(isAiLoading || transcribeProgress > 0) && (
                <ProgressBar 
                  title="3. AI Vocal Transcription Engine" 
                  percentage={transcribeProgress} 
                  activeColor="#eab308" 
                  isComplete={transcribeProgress === 100}
                />
              )}

              {/* 📊 BAR 4: Contextual Translation Script Progress */}
              {(isAiLoading || translateProgress > 0) && currentLang !== 'en' && (
                <ProgressBar 
                  title="4. Language Translation Engine Matrix" 
                  percentage={translateProgress} 
                  activeColor="#ec4899" 
                  isComplete={translateProgress === 100}
                />
              )}

              {/* Configurations Control Block Panel */}
              {!aiGenerated && !isExtracting && !loading && (
                <LanguageSelector 
                  onStartAI={handleStartAIEngine} 
                  loading={isAiLoading} 
                />
              )}
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Subtitle Translation Workspace Editor Grid */}
        {aiGenerated && baseFilename && (
          <div style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', background: '#111827', borderRadius: '8px', border: '1px solid #1e293b', padding: '4px' }}>
            <CaptionEditor 
              currentLang={currentLang}
              onLangChange={switchLanguage}
              onSave={saveCaptionEdits}
              captionLines={captionLines}
              onTextChange={handleTextChange}
              isSwitching={isAiLoading}
              onStartBurnIn={startBurnIn}
              isBurning={isBurning}
              burnInProgress={burnInProgress}
              burnInStage={burnInStage}
              burnInDownloadUrl={burnInDownloadUrl}
            />
          </div>
        )}

      </div>
    </div>
  );
}