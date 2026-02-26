import React from 'react';
import { API_BASE_URL, endpoints } from '../config';

function ClipGallery({ clips, onDownload }) {
  const formatDuration = (seconds) => {
    const secs = parseFloat(seconds);
    if (secs < 60) return `${secs.toFixed(1)}s`;
    const mins = Math.floor(secs / 60);
    const remainingSecs = (secs % 60).toFixed(1);
    return `${mins}:${remainingSecs.padStart(2, '0')}`;
  };

  const getClipTypeIcon = (type) => {
    switch (type) {
      case 'hook': return '🎣';
      case 'energy_peak': return '⚡';
      case 'scene_change': return '🎬';
      default: return '📹';
    }
  };

  const getViralScoreColor = (score) => {
    if (score >= 0.8) return '#10b981';
    if (score >= 0.6) return '#f59e0b';
    return '#6b7280';
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}><span>✨</span>Your Viral Clips ({clips.length})</h2>
        <button className="btn btn-success" onClick={() => clips.forEach(clip => onDownload(clip.clipId))}><span>⬇️</span>Download All</button>
      </div>
      <div className="clips-grid">
        {clips.map((clip, index) => (
          <div key={clip.clipId} className="clip-card">
            <img src={`${API_BASE_URL}${endpoints.thumbnail(clip.clipId)}`} alt={clip.title || `Clip ${index + 1}`} className="clip-thumbnail" onError={(e) => { e.target.src = 'https://via.placeholder.com/320x180?text=Clip+Preview'; }} />
            <div className="clip-info">
              <h4>{clip.title || `Viral Clip #${index + 1}`}</h4>
              <div className="clip-meta">
                <span>{getClipTypeIcon(clip.type || 'clip')} {formatDuration(clip.duration)}</span>
                <span className="clip-score" style={{ background: getViralScoreColor(clip.score) }}>{(clip.score * 100).toFixed(0)}% Viral</span>
              </div>
              {clip.reason && (<p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px', fontStyle: 'italic' }}>"{clip.reason}"</p>)}
              <div className="clip-actions">
                <button className="btn-preview" onClick={() => { const video = document.createElement('video'); video.src = `${API_BASE_URL}${endpoints.download(clip.clipId)}`; video.controls = true; video.style.maxWidth = '100%'; const modal = document.createElement('div'); modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:1000;'; const closeBtn = document.createElement('button'); closeBtn.textContent = '✕ Close'; closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;padding:10px 20px;background:white;border:none;border-radius:5px;cursor:pointer;font-weight:bold;'; closeBtn.onclick = () => document.body.removeChild(modal); modal.appendChild(closeBtn); modal.appendChild(video); document.body.appendChild(modal); video.play(); }}>▶️ Preview</button>
                <button className="btn-download" onClick={() => onDownload(clip.clipId)}>⬇️ Download</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '30px', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: 'white', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '10px' }}>📱 Ready for Social Media!</h3>
        <p style={{ opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>These clips are optimized for TikTok, Instagram Reels, YouTube Shorts, and Twitter. Download and start posting to maximize your reach!</p>
      </div>
    </div>
  );
}

export default ClipGallery;
