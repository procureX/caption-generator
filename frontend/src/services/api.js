import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

export const apiService = {
  uploadVideo: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_BASE}/upload`, formData, {
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (onProgress) onProgress(percentCompleted);
      }
    });
    return response.data;
  },

  trackAudioProgress: (filename, onMessage, onError) => {
    const eventSource = new EventSource(`${API_BASE}/extract-audio-progress/${filename}`);
    eventSource.onmessage = (event) => onMessage(parseInt(event.data, 10), eventSource);
    eventSource.onerror = () => { eventSource.close(); if (onError) onError(); };
    return eventSource;
  },

  /**
   * Reads raw chunk data chunks from the post response stream
   */
  generateCaptionsStream: async (filename, lang, onEvent, onComplete, onError) => {
    try {
      const response = await fetch(`${API_BASE}/generate/${filename}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Hold onto partial chunks

        for (const line of lines) {
          if (!line.trim()) continue;
          
          const eventMatch = line.match(/^event:\s*(.+)$/m);
          const dataMatch = line.match(/^data:\s*(.+)$/m);
          
          if (eventMatch && dataMatch) {
            onEvent(eventMatch[1], dataMatch[1]);
          }
        }
      }
      onComplete();
    } catch (err) {
      if (onError) onError(err);
    }
  },

  getCaptions: async (filename, lang) => {
    const response = await axios.get(`${API_BASE}/captions/${filename}/${lang}`);
    return response.data.captions;
  },

  updateCaptions: async (filename, lang, captions) => {
    const response = await axios.put(`${API_BASE}/captions/${filename}/${lang}`, { captions });
    return response.data;
  }
};