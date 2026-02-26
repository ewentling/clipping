import React, { useState } from 'react';

function VideoInput({ onSubmit, onGenerate, videoInfo, isProcessing, onClear }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [numClips, setNumClips] = useState(5);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const validateYouTubeUrl = (url) => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      setValidationError('Please enter a video URL');
      return;
    }
    if (!validateYouTubeUrl(videoUrl)) {
      setValidationError('Please enter a valid YouTube URL');
      return;
    }
    setValidationError(null);
    setIsValidating(true);
    try {
      await onSubmit(videoUrl);
    } catch (err) {
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
    return num.toString();
  };

  return (
    <div className="card">
      <h2 className="card-title"><span>📺</span>{videoInfo ? 'Video Analyzed' : 'Add YouTube Video'}</h2>
      {!videoInfo ? (
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input type="text" placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} disabled={isProcessing} />
            <button type="submit" className="btn btn-primary" disabled={isProcessing || isValidating || !videoUrl.trim()}>
              {isValidating ? <><span className="loading-spinner"></span>Analyzing...</> : <><span>🔍</span>Analyze</>}
            </button>
          </div>
          {validationError && (<div className="alert alert-error" style={{ marginBottom: 0 }}><span>⚠️</span><span>{validationError}</span></div>)}
          <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '10px' }}>
            <h4 style={{ marginBottom: '10px', color: '#555' }}>✨ Features:</h4>
            <ul style={{ paddingLeft: '20px', color: '#666', lineHeight: '1.8' }}>
              <li>AI-powered viral moment detection</li>
              <li>Automatic scene analysis & audio energy detection</li>
              <li>30-60 second optimized clips for TikTok, Reels & Shorts</li>
              <li>Bypasses YouTube bot guards with smart downloading</li>
              <li>High-quality MP4 output with thumbnails</li>
            </ul>
          </div>
        </form>
      ) : (
        <div>
          <div className="video-info">
            <img src={getThumbnailUrl(extractVideoId(videoUrl))} alt={videoInfo.title} className="video-thumbnail" onError={(e) => { e.target.src = `https://img.youtube.com/vi/${videoInfo.id}/hqdefault.jpg`; }} />
            <div className="video-details">
              <h3>{videoInfo.title}</h3>
              <div className="video-meta">
                <span className="meta-item"><span>👤</span>{videoInfo.uploader}</span>
                <span className="meta-item"><span>⏱️</span>{formatDuration(videoInfo.duration)}</span>
                <span className="meta-item"><span>👁️</span>{formatNumber(videoInfo.viewCount || 0)} views</span>
              </div>
            </div>
          </div>
          <div className="options-group">
            <div className="option-item">
              <label>Number of Clips:</label>
              <select value={numClips} onChange={(e) => setNumClips(Number(e.target.value))} disabled={isProcessing}>
                <option value={3}>3 clips</option>
                <option value={5}>5 clips</option>
                <option value={7}>7 clips</option>
                <option value={10}>10 clips</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-primary" onClick={handleGenerateClick} disabled={isProcessing} style={{ flex: 1, justifyContent: 'center' }}>
              {isProcessing ? <><span className="loading-spinner"></span>Processing...</> : <><span>✂️</span>Generate {numClips} Viral Clips</>}
            </button>
            <button className="btn btn-secondary" onClick={onClear} disabled={isProcessing}><span>🔄</span>New Video</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoInput;
