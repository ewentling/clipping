import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { API_BASE_URL, endpoints } from '../config';
import PreviewModal from './PreviewModal';

function ClipGallery({ clips, onDownload }) {
  const [previewClip, setPreviewClip] = useState(null);
  const [sortBy, setSortBy] = useState('score');
  const [filterType, setFilterType] = useState('all');
  const [editingTitle, setEditingTitle] = useState(null); // clipId being edited
  const [editTitleValue, setEditTitleValue] = useState('');
  const [localTitles, setLocalTitles] = useState({});
  const [batchProgress, setBatchProgress] = useState(null); // { done, total }

  const sortedFilteredClips = useMemo(() => {
    let result = [...clips];
    if (filterType !== 'all') {
      result = result.filter(c => (c.type || 'clip') === filterType);
    }
    if (sortBy === 'score') {
      result.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sortBy === 'duration') {
      result.sort((a, b) => (parseFloat(a.duration) || 0) - (parseFloat(b.duration) || 0));
    }
    return result;
  }, [clips, sortBy, filterType]);

  const uniqueTypes = useMemo(() => {
    return [...new Set(clips.map(c => c.type || 'clip'))];
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

  const getConfidenceLabel = (score) => {
    if (score >= 0.8) return { label: 'High', icon: '✓' };
    if (score >= 0.6) return { label: 'Medium', icon: '◐' };
    return { label: 'Exploratory', icon: '◇' };
  };

  const handleCopyLink = async (clipId) => {
    const url = `${API_BASE_URL}${endpoints.download(clipId)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch {
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

  const handleShareTwitter = (clip) => {
    const title = localTitles[clip.clipId] || clip.title || 'Viral Clip';
    const text = encodeURIComponent(`Check out this viral clip: ${title} `);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyCaption = async (clip) => {
    const title = localTitles[clip.clipId] || clip.title || 'Viral Clip';
    const caption = `${title}\n\n#Clipnotic #ViralClips #Shorts`;
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Caption copied!');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = caption;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success('Caption copied!');
    }
  };

  const startEditTitle = (clip) => {
    setEditingTitle(clip.clipId);
    setEditTitleValue(localTitles[clip.clipId] || clip.title || '');
  };

  const saveTitle = (clipId) => {
    if (editTitleValue.trim()) {
      setLocalTitles(prev => ({ ...prev, [clipId]: editTitleValue.trim() }));
      toast.success('Title updated!');
    }
    setEditingTitle(null);
  };

  const handleBatchDownload = async () => {
    const total = clips.length;
    setBatchProgress({ done: 0, total });
    for (let i = 0; i < clips.length; i++) {
      await onDownload(clips[i].clipId);
      setBatchProgress({ done: i + 1, total });
      // Small delay between downloads to avoid browser blocking
      if (i < clips.length - 1) await new Promise(r => setTimeout(r, 600));
    }
    setBatchProgress(null);
    toast.success(`Downloaded all ${total} clips!`);
  };

  const getDisplayTitle = (clip, index) =>
    localTitles[clip.clipId] || clip.title || `Viral Clip #${index + 1}`;

  const isFiltered = filterType !== 'all' || sortBy !== 'score';
  const resetFilters = () => {
    setFilterType('all');
    setSortBy('score');
  };

  return (
    <div className="card">
      {previewClip && (
        <PreviewModal clip={previewClip} onClose={() => setPreviewClip(null)} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          <span>✨</span>Your Viral Clips ({clips.length})
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {batchProgress && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Downloading {batchProgress.done}/{batchProgress.total}...
            </span>
          )}
          <button
            className="btn btn-success"
            onClick={handleBatchDownload}
            disabled={!!batchProgress}
            aria-label={batchProgress ? `Downloading ${batchProgress.done} of ${batchProgress.total}` : 'Download all clips'}
          >
            {batchProgress
              ? <><span className="loading-spinner" aria-hidden="true" />{batchProgress.done}/{batchProgress.total}</>
              : <><span>⬇️</span>Download All</>}
          </button>
        </div>
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
        {(filterType !== 'all' || sortBy !== 'score') && (
          <span className="filter-status">
            Showing {sortedFilteredClips.length} of {clips.length}
            {filterType !== 'all' && ` • Filtered by ${filterType}`}
            {sortBy !== 'score' && ` • Sorted by ${sortBy === 'duration' ? 'duration' : 'original'}`}
            {isFiltered && (
              <button type="button" className="btn-link" onClick={resetFilters}>
                Reset
              </button>
            )}
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
                alt={getDisplayTitle(clip, index) + ' thumbnail'}
                className="clip-thumbnail"
                onError={(e) => { e.target.src = `https://img.youtube.com/vi/default/hqdefault.jpg`; }}
              />
              <div className="clip-info">
                {/* Inline editable title */}
                {editingTitle === clip.clipId ? (
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={editTitleValue}
                      onChange={e => setEditTitleValue(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveTitle(clip.clipId);
                        if (e.key === 'Escape') setEditingTitle(null);
                      }}
                      autoFocus
                      aria-label="Edit clip title"
                      style={{ flex: 1, padding: '4px 8px', border: '1px solid #667eea', borderRadius: '4px', fontSize: '0.9rem', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                    />
                    <button onClick={() => saveTitle(clip.clipId)} style={{ padding: '4px 8px', border: 'none', borderRadius: '4px', background: '#667eea', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }} aria-label="Save title">✓</button>
                    <button onClick={() => setEditingTitle(null)} style={{ padding: '4px 8px', border: 'none', borderRadius: '4px', background: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }} aria-label="Cancel edit">✕</button>
                  </div>
                ) : (
                  <h4
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => startEditTitle(clip)}
                    title="Click to edit title"
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && startEditTitle(clip)}
                    aria-label={`Edit title: ${getDisplayTitle(clip, index)}`}
                  >
                    {getDisplayTitle(clip, index)}
                    <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 400 }}>✏️</span>
                  </h4>
                )}
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
                  <span className="clip-confidence">
                    {getConfidenceLabel(clip.score || 0).icon} {getConfidenceLabel(clip.score || 0).label}
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
                    aria-label={`Preview ${getDisplayTitle(clip, index)}`}
                  >
                    ▶️ Preview
                  </button>
                  <button
                    className="btn-download"
                    onClick={() => onDownload(clip.clipId)}
                    aria-label={`Download ${getDisplayTitle(clip, index)}`}
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
                  <button
                    className="btn-share"
                    style={{ background: '#1da1f2', color: 'white' }}
                    onClick={() => handleShareTwitter(clip)}
                    aria-label="Share to Twitter/X"
                  >
                    🐦 Tweet
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleCopyCaption(clip)}
                    aria-label="Copy clip caption"
                  >
                    ✨ Caption
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
