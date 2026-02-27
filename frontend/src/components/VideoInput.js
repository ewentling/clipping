import React, { useState, useEffect, useCallback, useRef } from 'react';

const RECENT_URLS_KEY = 'recentVideoUrls';
const MAX_RECENT = 5;

function VideoInput({ onSubmit, onGenerate, videoInfo, isProcessing, onClear }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [numClips, setNumClips] = useState(() => {
    const saved = localStorage.getItem('preferredNumClips');
    return saved ? parseInt(saved, 10) : 5;
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [showRecent, setShowRecent] = useState(true);
  const [recentUrls, setRecentUrls] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_URLS_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const inputRef = useRef(null);

  // Persist preferred clip count
  useEffect(() => {
    localStorage.setItem('preferredNumClips', numClips);
  }, [numClips]);

  useEffect(() => {
    if (!videoInfo) inputRef.current?.focus();
  }, [videoInfo]);

  const validateYouTubeUrl = (url) => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    return patterns.some(p => p.test(url.trim()));
  };

  const saveRecentUrl = useCallback((url) => {
    const updated = [url, ...recentUrls.filter(u => u !== url)].slice(0, MAX_RECENT);
    setRecentUrls(updated);
    localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(updated));
  }, [recentUrls]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      setValidationError('Please enter a video URL');
      return;
    }
    if (!validateYouTubeUrl(trimmed)) {
      setValidationError('Please enter a valid YouTube URL');
      return;
    }
    setValidationError(null);
    setIsValidating(true);
    try {
      await onSubmit(trimmed);
      saveRecentUrl(trimmed);
    } catch {
      // Error handled by parent
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerateClick = () => {
    if (!videoInfo) return;
    onGenerate({ videoUrl, numClips });
  };

  const extractVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return url;
  };

  const getThumbnailUrl = (videoId) => `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return (num || 0).toString();
  };

  const removeRecentUrl = (url, e) => {
    e.stopPropagation();
    const updated = recentUrls.filter(u => u !== url);
    setRecentUrls(updated);
    localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(updated));
  };

  const clearRecentUrls = () => {
    setRecentUrls([]);
    localStorage.setItem(RECENT_URLS_KEY, JSON.stringify([]));
  };

  const recommendedClips = videoInfo?.duration
    ? videoInfo.duration <= 180
      ? 3
      : videoInfo.duration <= 600
        ? 5
        : videoInfo.duration <= 1200
          ? 7
          : 10
    : null;

  const trimmedUrl = videoUrl.trim();
  const urlLength = videoUrl.length;
  const isUrlReady = trimmedUrl.length >= 10;
  const isUrlValid = isUrlReady && validateYouTubeUrl(trimmedUrl);
  const validationState = !trimmedUrl ? 'empty' : isUrlValid ? 'valid' : isUrlReady ? 'invalid' : 'typing';

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setVideoUrl(text);
        setValidationError(null);
      }
    } catch {
      setValidationError('Clipboard access is blocked');
    }
  };

  const handleClear = () => {
    setVideoUrl('');
    setValidationError(null);
  };

  return (
    <div className="card">
      <h2 className="card-title">
        <span>📺</span>{videoInfo ? 'Video Analyzed' : 'Add YouTube Video'}
      </h2>
      <div className="step-guide" role="note" aria-label="How it works">
        <strong>How it works:</strong>
        <ol className="step-guide-list">
          <li>Paste a YouTube URL</li>
          <li>Analyze the video</li>
          <li>Select clips and generate</li>
        </ol>
      </div>
      {!videoInfo ? (
        <form onSubmit={handleSubmit} aria-label="Video URL input form">
          <div className="input-group">
            <label htmlFor="video-url-input" className="sr-only">YouTube URL</label>
            <input
              id="video-url-input"
              type="url"
              inputMode="url"
              placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                if (validationError) setValidationError(null);
              }}
              ref={inputRef}
              disabled={isProcessing}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'url-error' : undefined}
              autoComplete="url"
              list="youtube-suggestions"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing || isValidating || !videoUrl.trim()}
              aria-busy={isValidating}
            >
              {isValidating
                ? <><span className="loading-spinner" aria-hidden="true" />Analyzing...</>
                : <><span aria-hidden="true">🔍</span>Analyze</>}
            </button>
          </div>
          <datalist id="youtube-suggestions">
            <option value="https://www.youtube.com/watch?v=" />
            <option value="https://youtu.be/" />
            <option value="https://www.youtube.com/shorts/" />
            <option value="https://www.youtube.com/playlist?list=" />
          </datalist>
          <div className="url-meta" aria-live="polite">
            <span className={`url-status ${validationState}`} aria-label="URL validation status">
              {validationState === 'valid' && '✅ Looks good'}
              {validationState === 'typing' && '✏️ Still typing...'}
              {validationState === 'invalid' && '❌ Invalid URL'}
            </span>
            <span className="url-count" aria-label={`URL length ${urlLength} characters`}>
              {urlLength} chars
            </span>
          </div>
          <div className="input-actions">
            <button type="button" className="btn btn-secondary" onClick={handlePaste} disabled={isProcessing}>
              📋 Paste
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleClear} disabled={isProcessing || !videoUrl}>
              🧹 Clear
            </button>
          </div>
          {validationError && (
            <div id="url-error" className="alert alert-error" style={{ marginBottom: 0 }} role="alert">
              <span aria-hidden="true">⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* Recent URLs */}
          {recentUrls.length > 0 && (
            <div className="recent-urls" aria-label="Recently used URLs">
              <div className="recent-header">
                <h5>🕐 Recent</h5>
                <div className="recent-actions">
                  <button type="button" className="btn-link" onClick={() => setShowRecent(s => !s)}>
                    {showRecent ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" className="btn-link" onClick={clearRecentUrls}>
                    Clear All
                  </button>
                </div>
              </div>
              {showRecent && recentUrls.map(url => (
                <div
                  key={url}
                  className="recent-url-item"
                  onClick={() => setVideoUrl(url)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setVideoUrl(url)}
                  aria-label={`Use recent URL: ${url}`}
                >
                  <span className="recent-url-text">{url}</span>
                  <button
                    type="button"
                    onClick={(e) => removeRecentUrl(url, e)}
                    aria-label={`Remove ${url} from recent`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '2px 4px' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '15px', background: 'var(--features-bg)', borderRadius: '10px' }}>
            <h4 style={{ marginBottom: '10px', color: 'var(--text-muted)' }}>✨ Features:</h4>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              <li>AI-powered viral moment detection</li>
              <li>Automatic scene analysis &amp; audio energy detection</li>
              <li>30-60 second optimized clips for TikTok, Reels &amp; Shorts</li>
              <li>Bypasses YouTube bot guards with smart downloading</li>
              <li>High-quality MP4 output with thumbnails</li>
            </ul>
          </div>
        </form>
      ) : (
        <div>
          <div className="video-info">
            <img
              src={getThumbnailUrl(extractVideoId(videoUrl))}
              alt={`Thumbnail for ${videoInfo.title}`}
              className="video-thumbnail"
              onError={(e) => {
                e.target.src = `https://img.youtube.com/vi/${videoInfo.id || 'default'}/hqdefault.jpg`;
              }}
            />
            <div className="video-details">
              <h3>{videoInfo.title}</h3>
              <div className="video-meta">
                <span className="meta-item"><span aria-hidden="true">👤</span>{videoInfo.uploader}</span>
                <span className="meta-item"><span aria-hidden="true">⏱️</span>{formatDuration(videoInfo.duration)}</span>
                <span className="meta-item"><span aria-hidden="true">👁️</span>{formatNumber(videoInfo.viewCount || 0)} views</span>
              </div>
              {videoInfo.description && (
                <p style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {videoInfo.description}
                </p>
              )}
              {videoInfo.tags && videoInfo.tags.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {videoInfo.tags.slice(0, 5).map(tag => (
                    <span key={tag} style={{ background: '#667eea22', color: '#667eea', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="options-group">
            <div className="option-item">
              <label htmlFor="num-clips-select">Number of Clips:</label>
              <select
                id="num-clips-select"
                value={numClips}
                onChange={(e) => setNumClips(Number(e.target.value))}
                disabled={isProcessing}
              >
                <option value={3}>3 clips</option>
                <option value={5}>5 clips</option>
                <option value={7}>7 clips</option>
                <option value={10}>10 clips</option>
              </select>
            </div>
            <div className="clip-helper">
              <div className="clip-count-preview" aria-label={`Preview for ${numClips} clips`}>
                {Array.from({ length: numClips }).map((_, i) => (
                  <span key={i} className="clip-count-dot" />
                ))}
              </div>
              <span className="clip-helper-text">
                {recommendedClips ? `Recommended: ${recommendedClips} clips for this video` : 'Recommended: 5 clips for most videos'}
              </span>
              {recommendedClips && recommendedClips !== numClips && (
                <button type="button" className="btn-link" onClick={() => setNumClips(recommendedClips)}>
                  Use recommended
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleGenerateClick}
              disabled={isProcessing}
              style={{ flex: 1, justifyContent: 'center', minWidth: '160px' }}
              aria-busy={isProcessing}
            >
              {isProcessing
                ? <><span className="loading-spinner" aria-hidden="true" />Processing...</>
                : <><span aria-hidden="true">✂️</span>Generate {numClips} Viral Clips</>}
            </button>
            <button
              className="btn btn-secondary"
              onClick={onClear}
              disabled={isProcessing}
              aria-label="Start with a new video"
            >
              <span aria-hidden="true">🔄</span>New Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoInput;
