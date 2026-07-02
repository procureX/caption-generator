import { useState, useEffect } from 'react';

export default function useVideoWorkspace() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [baseFilename, setBaseFilename] = useState('');
  const [currentLang, setCurrentLang] = useState('en');
  const [captionLines, setCaptionLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [message, setMessage] = useState('');
  const [aiGenerated, setAiGenerated] = useState(false);
  // Tracks which languages actually have an .srt file on disk for this video
  const [generatedLangs, setGeneratedLangs] = useState(new Set());

  // 4-Bar discrete progress metrics
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ffmpegProgress, setFfmpegProgress] = useState(0);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [translateProgress, setTranslateProgress] = useState(0);

  // Burn-in (hardcoded captions) state
  const [isBurning, setIsBurning] = useState(false);
  const [burnInProgress, setBurnInProgress] = useState(0);
  const [burnInStage, setBurnInStage] = useState('');
  const [burnInDownloadUrl, setBurnInDownloadUrl] = useState(null);

  // 1. Handle File Upload Sequence
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setLoading(true);
    setUploadProgress(1);
    setFfmpegProgress(0);
    setTranscribeProgress(0);
    setTranslateProgress(0);
    setAiGenerated(false);
    setMessage('Uploading media payload to core storage...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Direct XHR/Fetch approach to guarantee upload progress visibility
      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://localhost:8000/upload');
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload status failed on server side.'));
          }
        };
        xhr.onerror = () => reject(new Error('Network context error.'));
        xhr.send(formData);
      });

      setBaseFilename(response.base_filename);
      setIsExtracting(true);
      setMessage('Network transmission complete. Running hardware FFmpeg transcode loop...');

      // Establish SSE connection stream for audio extraction monitoring
      const audioSSE = new EventSource(`http://localhost:8000/extract-audio-progress/${response.filename}`);
      
      audioSSE.onmessage = (event) => {
        const progress = parseInt(event.data, 10);
        setFfmpegProgress(progress);
        if (progress >= 100) {
          audioSSE.close();
          setIsExtracting(false);
          setLoading(false);
          setMessage('Audio track compilation complete! Select target language parameters below.');
        }
      };

      audioSSE.onerror = () => {
        audioSSE.close();
        setIsExtracting(false);
        setLoading(false);
        setMessage('Error occurred tracking background transcode tasks.');
      };

    } catch (err) {
      console.error(err);
      setMessage(`Workflow breakdown: ${err.message}`);
      setLoading(false);
    }
  };

  // 2. Handle AI Generation Pipeline Stream (Whisper + Translation Matrix)
  const handleStartAIEngine = async (targetLanguage) => {
    if (!baseFilename) return;
    
    setIsAiLoading(true);
    setCurrentLang(targetLanguage);
    setTranscribeProgress(1);
    setTranslateProgress(0);
    setMessage('Connecting to AI Generation Engine Pipeline...');

    let pipelineFailed = false;

    try {
      // Open a native POST request via fetch to initiate, then track via an SSE channel or convert payload matching
      // Since native EventSource only does GET, we map parameter configurations safely
      const url = `http://localhost:8000/generate/${baseFilename}`;
      
      // Let's create an asynchronous fetch reader to process the streaming data smoothly
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: targetLanguage })
      });

      if (!response.ok) throw new Error('AI pipeline rejected generation parameters.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep partial line in buffer

        let currentEvent = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.replace('event:', '').trim();
          } else if (trimmed.startsWith('data:')) {
            const dataVal = trimmed.replace('data:', '').trim();

            // Process text values based on the preceding custom event types
            if (currentEvent === 'transcription_start' || currentEvent === 'translation_start') {
              setMessage(dataVal);
            } else if (currentEvent === 'transcription_progress') {
              setTranscribeProgress(parseInt(dataVal, 10));
            } else if (currentEvent === 'transcription_complete') {
              setTranscribeProgress(100);
            } else if (currentEvent === 'translation_progress') {
              setTranslateProgress(parseInt(dataVal, 10));
            } else if (currentEvent === 'translation_complete') {
              setTranslateProgress(100);
            } else if (currentEvent === 'error') {
              pipelineFailed = true;
              setMessage(`Engine breakdown: ${dataVal}`);
            }
          }
        }
      }

      if (pipelineFailed) {
        setIsAiLoading(false);
        return;
      }

      // Finalize pipeline completion states safely 🚀
      setTranscribeProgress(100);
      if (targetLanguage !== 'en') setTranslateProgress(100);
      
      setMessage('AI processing cycles successfully completed! Rendering layout matrices...');
      // Whisper always produces an English transcript regardless of target,
      // plus the target language itself (translation is skipped if target === 'en').
      setGeneratedLangs((prev) => new Set(prev).add('en').add(targetLanguage));
      await fetchCaptions(baseFilename, targetLanguage);
      setAiGenerated(true);
      setIsAiLoading(false);

    } catch (err) {
      console.error(err);
      setMessage(`AI Pipeline Interruption: ${err.message}`);
      setIsAiLoading(false);
    }
  };

  // 3. Fetch Generated Subtitle Arrays from disk
  const fetchCaptions = async (filename, lang) => {
    try {
      const res = await fetch(`http://localhost:8000/captions/${filename}/${lang}`);
      if (!res.ok) throw new Error('Requested caption block is missing from filesystem storage.');
      const data = await res.json();
      setCaptionLines(data.captions);
      setCurrentLang(lang);
    } catch (err) {
      setMessage(`Failed fetching language blocks: ${err.message}`);
    }
  };

  // 3b. Switch the caption editor's active language, generating it first if it
  // doesn't exist on disk yet (this is what the CaptionEditor dropdown should call —
  // NOT fetchCaptions directly, since a language may never have been generated).
  const switchLanguage = async (lang) => {
    if (generatedLangs.has(lang)) {
      await fetchCaptions(baseFilename, lang);
      return;
    }
    // Not generated yet — run the pipeline for this language, then fetch it.
    await handleStartAIEngine(lang);
  };

  // 4. Handle Realtime Text Edits in Form Blocks
  const handleTextChange = (index, updatedText) => {
    setCaptionLines((prev) =>
      prev.map((line) => (line.index === index ? { ...line, text: updatedText } : line))
    );
  };

  // 5. Commit Modified Captions back to server files
  const saveCaptionEdits = async () => {
    try {
      const res = await fetch(`http://localhost:8000/captions/${baseFilename}/${currentLang}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captions: captionLines })
      });
      if (!res.ok) throw new Error('Server storage rejected patch array payload update.');
      setMessage('All text layer changes successfully written back to system storage!');
    } catch (err) {
      setMessage(`Failed committing layout edits: ${err.message}`);
    }
  };

  // 6. Burn the current language's captions directly into the video via ffmpeg,
  // streaming progress over SSE, then exposing a download link for the result.
  const startBurnIn = async () => {
    if (!baseFilename || !currentLang) return;

    setIsBurning(true);
    setBurnInProgress(0);
    setBurnInStage('Connecting to render engine...');
    setBurnInDownloadUrl(null);

    let pipelineFailed = false;

    try {
      const url = `http://localhost:8000/burn-in/${encodeURIComponent(baseFilename)}/${encodeURIComponent(currentLang)}`;
      const response = await fetch(url, { method: 'POST' });

      if (!response.ok) throw new Error('Burn-in request rejected by server.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        let currentEvent = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.replace('event:', '').trim();
          } else if (trimmed.startsWith('data:')) {
            const dataVal = trimmed.replace('data:', '').trim();

            if (currentEvent === 'burn_in_progress') {
              setBurnInProgress(parseInt(dataVal, 10));
              setBurnInStage('Rendering hardcoded captions onto video...');
            } else if (currentEvent === 'burn_in_complete') {
              setBurnInProgress(100);
              setBurnInStage('Burned-in video ready!');
              setBurnInDownloadUrl(`http://localhost:8000/download-video/${dataVal}`);
            } else if (currentEvent === 'error') {
              pipelineFailed = true;
              setBurnInStage(`Burn-in failed: ${dataVal}`);
            }
          }
        }
      }

      if (pipelineFailed) {
        setMessage('Burn-in failed — check the backend console for details.');
      }
    } catch (err) {
      console.error(err);
      setBurnInStage(`Burn-in interruption: ${err.message}`);
    } finally {
      setIsBurning(false);
    }
  };

  return {
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
    generatedLangs,
    isBurning,
    burnInProgress,
    burnInStage,
    burnInDownloadUrl,
    handleFileUpload,
    handleStartAIEngine,
    fetchCaptions,
    switchLanguage,
    handleTextChange,
    saveCaptionEdits,
    startBurnIn
  };
}