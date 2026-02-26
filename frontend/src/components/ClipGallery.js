import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { API_BASE_URL, endpoints } from '../config';
import PreviewModal from './PreviewModal';

function ClipGallery({ clips, onDownload }) {
  const [previewClip, setPreviewClip] = useState(null);
  const [sortBy, setSortBy] = useState('score');
  const [filterType, setFilterType] = useState('all');

  const sortedFilteredClips = useMemo(() => {
    let result = [...clips];
    if (filterType !== 'all') {
      result = result.filter(c => (c.type || 'clip') === filterType);
    }
    if (sortBy === 'score') {
      result.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sortBy === 'duration') {
      result.sort((a, b) => (parseFloat(a.duration) || 0) - (parseFloat(b.duration) || 0));
    } else if (sortBy === 'index') {
      // Original order preserved
    }
    return result;
  }, [clips, sortBy, filterType]);

  const uniqueTypes = useMemo(() => {
    const types = [...new Set(clips.map(c => c.type || 'clip'))];
    return types;
  }, [clips]);

  const formatDuration = (seconds) => {
    const secs = parseFloat(seconds);
    if (isNaN(secs)) return '--';
    if (secs < 60) return `${secs.toFixed(1)}s`;
    const mins = Math.floor(secs / 60);
    const remainingSecs = (secs % 60).toFixed(1);
    return `${mins}:${remainingSecs.padStart(4, '0')}`;
  };

  const formatTimestamp = (seconds) => {
    if (seconds == null) return null;
    const s = parseFloat(seconds);
    if (isNaN(s)) return null;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
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

  const handleCopyLink = async (clipId) => {
    const url = `${API_BASE_URL}${endpoints.download(clipId)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success('Link copied!');
    }
  };

  return (
    <div className="card">
      {previewClip && (
        <PreviewModal clip={previewClip} onClose={() => setPreviewClip(null)} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          <span>✨</span>Your Viral Clips ({clips.length})
        </h2>
        <button
          className="btn btn-success"
          onClick={() => clips.forEach(clip => onDownload(clip.clipId))}
          aria-label="Download all clips"
        >
          <span>⬇️</span>Download All
        </button>
      </div>

      {/* Filters & Sort */}
      <div className="clip-filters" role="toolbar" aria-label="Filter and sort clips">
        <label htmlFor="sort-select">Sort:</label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          aria-label="Sort clips by"
        >
          <option value="score">Viral Score ↓</option>
          <option value="duration">Duration ↑</option>
          <option value="index">Original Order</option>
        </select>
        <label htmlFor="filter-select" style={{ marginLeft: '10px' }}>Type:</label>
        <select
          id="filter-select"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          aria-label="Filter clips by type"
        >
          <option value="all">All Types</option>
          {uniqueTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {filterType !== 'all' && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing {sortedFilteredClips.length} of {clips.length}
          </span>
        )}
      </div>

      <div className="clips-grid" role="list" aria-label="Generated clips">
        <AnimatePresence>
          {sortedFilteredClips.map((clip, index) => (
            <motion.div
              key={clip.clipId}
              className="clip-card"
              role="listitem"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
              layout
            >
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
                    style={{ background: getViralScoreColor(clip.score || 0) }}
                    aria-label={`Viral score: ${((clip.score || 0) * 100).toFixed(0)}%`}
                  >
                    {((clip.score || 0) * 100).toFixed(0)}% Viral
                  </span>
                </div>
                {/* Timestamps */}
                {(clip.startTime != null || clip.endTime != null) && (
                  <div className="clip-timestamps" aria-label="Clip timing">
                    {clip.startTime != null && <span>▶ {formatTimestamp(clip.startTime)}</span>}
                    {clip.endTime != null && <span>⏹ {formatTimestamp(clip.endTime)}</span>}
                  </div>
                )}
                {clip.reason && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px', fontStyle: 'italic' }}>
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
                {/* Share / Copy row */}
                <div className="share-buttons">
                  <button
                    className="btn-share btn-copy"
                    onClick={() => handleCopyLink(clip.clipId)}
                    aria-label="Copy download link to clipboard"
                  >
                    📋 Copy Link
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {sortedFilteredClips.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px 0' }}>
          No clips match the current filter.
        </p>
      )}

      <div style={{ marginTop: '30px', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: 'white', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '10px' }}>📱 Ready for Social Media!</h3>
        <p style={{ opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
          These clips are optimized for TikTok, Instagram Reels, YouTube Shorts, and Twitter. Download and start posting to maximize your reach!
        </p>
      </div>
    </div>
  );
}

export default ClipGallery;
