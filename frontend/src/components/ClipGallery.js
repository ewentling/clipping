import React, { useState } from 'react';
import { API_BASE_URL, endpoints } from '../config';
import PreviewModal from './PreviewModal';

function ClipGallery({ clips, onDownload }) {
  const [previewClip, setPreviewClip] = useState(null);

  const formatDuration = (seconds) => {
    const secs = parseFloat(seconds);
    if (secs < 60) return `${secs.toFixed(1)}s`;
    const mins = Math.floor(secs / 60);
    const remainingSecs = (secs % 60).toFixed(1);
    return `${mins}:${remainingSecs.padStart(4, '0')}`;
  };

  const getClipTypeIcon = (type) => {
    switch (type) {
      case 'hook': return '🎣';
      case 'energy_peak': return '⚡';
      case 'scene_change': return '🎬';
      default: return '��';
    }
  };

  const getViralScoreColor = (score) => {
    if (score >= 0.8) return '#10b981';
    if (score >= 0.6) return '#f59e0b';
    return '#6b7280';
  };

  return (
    <div className="card">
      {previewClip && (
        <PreviewModal clip={previewClip} onClose={() => setPreviewClip(null)} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}><span>✨</span>Your Viral Clips ({clips.length})</h2>
        <button
          className="btn btn-success"
          onClick={() => clips.forEach(clip => onDownload(clip.clipId))}
          aria-label="Download all clips"
        >
          <span>⬇️</span>Download All
        </button>
      </div>
      <div className="clips-grid" role="list" aria-label="Generated clips">
        {clips.map((clip, index) => (
          <div key={clip.clipId} className="clip-card" role="listitem">
            <img
              src={`${API_BASE_URL}${endpoints.thumbnail(clip.clipId)}`}
              alt={clip.title || `Clip ${index + 1} thumbnail`}
              className="clip-thumbnail"
              onError={(e) => { e.target.src = `https://img.youtube.com/vi/default/hqdefault.jpg`; }}
            />
            <div className="clip-info">
              <h4>{clip.title || `Viral Clip #${index + 1}`}</h4>
              <div className="clip-meta">
                <span aria-label={`Type: ${clip.type || 'clip'}, Duration: ${formatDuration(clip.duration)}`}>
                  {getClipTypeIcon(clip.type || 'clip')} {formatDuration(clip.duration)}
                </span>
                <span
                  className="clip-score"
                  style={{ background: getViralScoreColor(clip.score) }}
                  aria-label={`Viral score: ${(clip.score * 100).toFixed(0)}%`}
                >
                  {(clip.score * 100).toFixed(0)}% Viral
                </span>
              </div>
              {clip.reason && (
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px', fontStyle: 'italic' }}>
                  "{clip.reason}"
                </p>
              )}
              <div className="clip-actions">
                <button
                  className="btn-preview"
                  onClick={() => setPreviewClip(clip)}
                  aria-label={`Preview ${clip.title || `Clip ${index + 1}`}`}
                >
                  ▶️ Preview
                </button>
                <button
                  className="btn-download"
                  onClick={() => onDownload(clip.clipId)}
                  aria-label={`Download ${clip.title || `Clip ${index + 1}`}`}
                >
                  ⬇️ Download
                </button>
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
