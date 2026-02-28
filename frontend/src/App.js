import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { API_BASE_URL, endpoints } from './config';
import VideoInput from './components/VideoInput';
import ClipGallery from './components/ClipGallery';
import ProcessingStatus from './components/ProcessingStatus';
import ClipSkeleton from './components/ClipSkeleton';

function App() {
  const [currentJob, setCurrentJob] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [clips, setClips] = useState([]);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [apiOnline, setApiOnline] = useState(null);
  const [isLoadingClips, setIsLoadingClips] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [retryFn, setRetryFn] = useState(null);
  const [recentUrlCount, setRecentUrlCount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentVideoUrls') || '[]').length;
    } catch {
      return 0;
    }
  });
  const pollRef = useRef(null);
  const clipsRef = useRef(null);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === '?' && !e.target.matches('input, textarea, select')) {
        setShowHelp(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && !e.target.matches('input, textarea, select') && clips.length > 0) {
        e.preventDefault();
        document.querySelector('[data-action="download-all"]')?.click();
      }
      if (e.key === 'Escape') {
        setShowHelp(false);
        setShowConfirm(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [clips.length]);

  useEffect(() => {
    checkApiHealth();
    loadExistingClips();
    // Cleanup poll on unmount
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const checkApiHealth = async () => {
    try {
      await axios.get(`${API_BASE_URL}${endpoints.health}`);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
      toast.error('Backend API is not running. Please start the server.');
    }
  };

  const loadExistingClips = async () => {
    setIsLoadingClips(true);
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoints.list}`);
      if (response.data.success) {
        setClips(response.data.clips);
      }
    } catch {
      // No existing clips is fine
    } finally {
      setIsLoadingClips(false);
    }
  };

  const handleVideoSubmit = async (videoUrl) => {
    setError(null);
    setIsProcessing(true);
    setStatusMessage('Analyzing video...');
    const toastId = toast.loading('Analyzing video...');
    try {
      const analyzeResponse = await axios.post(`${API_BASE_URL}${endpoints.analyze}`, { videoUrl });
      if (!analyzeResponse.data.success) throw new Error(analyzeResponse.data.error);
      setVideoInfo(analyzeResponse.data.videoInfo);
      setStatusMessage('Video analyzed successfully!');
      toast.success('Video analyzed successfully!', { id: toastId });
      setIsProcessing(false);
      return analyzeResponse.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      toast.error(msg, { id: toastId });
      setIsProcessing(false);
      throw err;
    }
  };

  const handleGenerateClips = async (options) => {
    if (!videoInfo) return;
    setIsProcessing(true);
    setStatusMessage('Starting clip generation...');
    setError(null);
    const toastId = toast.loading('Starting clip generation...');
    try {
      const generateResponse = await axios.post(`${API_BASE_URL}${endpoints.generate}`, {
        videoUrl: options.videoUrl,
        numClips: options.numClips || 5,
        videoInfo
      });
      if (!generateResponse.data.success) throw new Error(generateResponse.data.error);
      const jobId = generateResponse.data.jobId;
      setCurrentJob({ id: jobId, status: 'processing' });
      toast.loading('Processing clips...', { id: toastId });
      await pollJobStatus(jobId, toastId);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      toast.error(msg, { id: toastId });
      setIsProcessing(false);
    }
  };

  const pollJobStatus = useCallback(async (jobId, toastId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoints.status(jobId)}`);
        if (response.data.success) {
          const job = response.data.job;
          setStatusMessage(`${job.status}... ${job.progress}%`);
          if (job.status === 'completed') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setCurrentJob(null);
            setIsProcessing(false);
            setClips(job.clips);
            toast.success('Clips generated successfully!', { id: toastId });
            await loadExistingClips();
            setTimeout(() => clipsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
          } else if (job.status === 'failed') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setCurrentJob(null);
            setIsProcessing(false);
            const msg = job.error || 'Failed to generate clips';
            setError(msg);
            toast.error(msg, { id: toastId });
          }
        }
      } catch {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setIsProcessing(false);
        const msg = 'Lost connection to server';
        setError(msg);
        toast.error(msg, { id: toastId });
      }
    }, 2000);
    // Timeout after 10 minutes
    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setIsProcessing(false);
        toast.error('Processing took too long. Please try again.');
      }
    }, 600000);
  }, []);

  const sanitizeFileName = (name) => {
    if (!name) return '';
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
  };

  const handleDownload = async (clipId, fileName) => {
    const toastId = toast.loading('Preparing download...');
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoints.download(clipId)}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeName = sanitizeFileName(fileName) || clipId;
      link.setAttribute('download', `${safeName}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started!', { id: toastId });
    } catch {
      toast.error('Failed to download clip', { id: toastId });
    }
  };

  const handleCancel = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setCurrentJob(null);
    setIsProcessing(false);
    setStatusMessage('');
    toast('Stopped status updates. Processing continues in the background.');
  };

  const handleClearClips = () => {
    if (clips.length > 0) {
      setShowConfirm(true);
    } else {
      doClear();
    }
  };

  const doClear = () => {
    setClips([]);
    setVideoInfo(null);
    setError(null);
    setShowConfirm(false);
    toast.success('Cleared!');
  };

  return (
    <div className="app-container">
      <a href="#clip-gallery" className="skip-link">Skip to clip gallery</a>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <header className="header">
        <div className="header-status" aria-live="polite" aria-label="API status">
          <span className={`status-dot${apiOnline === false ? ' offline' : ''}`} />
          {apiOnline === null ? 'Connecting...' : apiOnline ? 'API Online' : 'API Offline'}
        </div>
        <h1>
          🎬 Clipnotic
          {clips.length > 0 && (
            <span style={{ fontSize: '1rem', background: '#10b981', color: 'white', borderRadius: '20px', padding: '2px 10px', marginLeft: '12px', fontWeight: 600, verticalAlign: 'middle' }} aria-label={`${clips.length} clips generated`}>
              {clips.length} clips
            </span>
          )}
        </h1>
        <p>AI-Powered Viral Video Clipping - Turn long videos into shareable clips</p>
        <div className="header-actions" role="group" aria-label="Header actions">
          <button
            className="dark-mode-btn"
            onClick={() => setDarkMode(d => !d)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button
            className="dark-mode-btn"
            onClick={handleClearClips}
            aria-label="Clear all clips"
          >
            🗑️ Clear
          </button>
          <button
            className="dark-mode-btn"
            onClick={() => setShowHelp(h => !h)}
            aria-label="Show keyboard shortcuts"
          >
            ⌨️ Help
          </button>
        </div>
      </header>
      <main className="main-content" role="main">
        {error && (
          <div className="alert alert-error" role="alert">
            <span>⚠️</span>
            <span>
              {error.includes('429') || error.toLowerCase().includes('rate limit')
                ? 'Too many requests – please wait a moment before trying again.'
                : error}
            </span>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              {retryFn && (
                <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => { setError(null); retryFn(); }}>
                  🔄 Retry
                </button>
              )}
              <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => { setError(null); setRetryFn(null); }}>
                Dismiss
              </button>
            </div>
          </div>
        )}
        <VideoInput
          onSubmit={handleVideoSubmit}
          onGenerate={handleGenerateClips}
          videoInfo={videoInfo}
          isProcessing={isProcessing}
          onClear={handleClearClips}
          onRecentUpdate={setRecentUrlCount}
        />
        {currentJob && (
          <ProcessingStatus
            jobId={currentJob.id}
            statusMessage={statusMessage}
            onCancel={handleCancel}
            onJumpToGallery={() => clipsRef.current?.scrollIntoView({ behavior: 'smooth' })}
          />
        )}
        <div ref={clipsRef}>
          {isLoadingClips && <ClipSkeleton count={3} />}
          {!isLoadingClips && clips.length > 0 && (
            <ClipGallery clips={clips} onDownload={handleDownload} />
          )}
        </div>
        {clips.length === 0 && !isProcessing && !isLoadingClips && (
          <div className="empty-state">
            <div className="empty-state-icon">🎬</div>
            <h3>Ready to create viral clips?</h3>
            {recentUrlCount > 0 ? (
              <p>You have {recentUrlCount} recent video{recentUrlCount !== 1 ? 's' : ''}. Pick one above to generate clips in a few minutes.</p>
            ) : (
              <p>Paste any YouTube video URL above and our AI will find the best moments</p>
            )}
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: '🎯 AI Detection', desc: 'Finds viral moments automatically' },
                { label: '⚡ Fast Processing', desc: '2-3 min for 10-min videos' },
                { label: '📱 Social Ready', desc: 'TikTok, Reels & Shorts' },
              ].map(f => (
                <div key={f.label} style={{ background: 'rgba(255,255,255,0.12)', padding: '12px 16px', borderRadius: '10px', minWidth: '140px', backdropFilter: 'blur(4px)' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>{f.label}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{f.desc}</div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '16px', fontSize: '0.82rem', opacity: 0.65 }}>
              Press <kbd style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>?</kbd> for keyboard shortcuts
            </p>
          </div>
        )}
      </main>

      {/* Confirm clear dialog */}
      {showConfirm && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirm clear">
          <div className="confirm-box">
            <h3>Clear Clips?</h3>
            <p>This will remove all {clips.length} clip{clips.length !== 1 ? 's' : ''} from view. Downloaded files are not affected.</p>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={doClear}>Yes, Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Help overlay */}
      {showHelp && (
        <div className="help-overlay" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
          <div className="help-box">
            <h3>⌨️ Keyboard Shortcuts</h3>
            <div className="shortcut-row">
              <span className="shortcut-key">?</span>
              <span className="shortcut-desc">Toggle this help panel</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Esc</span>
              <span className="shortcut-desc">Close modals / dialogs</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Space</span>
              <span className="shortcut-desc">Play/Pause video preview</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Ctrl/⌘ + D</span>
              <span className="shortcut-desc">Download all clips</span>
            </div>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setShowHelp(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
