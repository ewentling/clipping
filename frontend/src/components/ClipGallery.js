import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { API_BASE_URL, CAPTION_HASHTAGS, endpoints } from '../config';
import { copyText } from '../utils/clipboard';
import PreviewModal from './PreviewModal';

const TITLE_LIMIT = 150;
// Delay between downloads to avoid browser blocking.
const DOWNLOAD_DELAY_MS = 600;
const detailStyle = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' };
const MAX_FILENAME_LENGTH = 60;
const MIN_PRINTABLE_ASCII = 32;
const RESERVED_FILENAME_WORDS = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

const sanitizeFileName = (name) => {
  if (!name) return '';
  let safeName = name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\.+|\.+$/g, '')
    .trim();
  safeName = Array.from(safeName).filter((char) => char.charCodeAt(0) >= MIN_PRINTABLE_ASCII).join('');
  safeName = safeName.trim();
  if (!safeName) return '';
  const lastDot = safeName.lastIndexOf('.');
  const baseName = lastDot > 0 ? safeName.slice(0, lastDot) : safeName;
  if (RESERVED_FILENAME_WORDS.has(baseName.toUpperCase())) {
    safeName = `${safeName}-clip`;
  }
  return safeName.slice(0, MAX_FILENAME_LENGTH);
};

function ClipGallery({ clips, onDownload }) {
  const [previewClip, setPreviewClip] = useState(null);
  const [sortBy, setSortBy] = useState('score');
  const [filterType, setFilterType] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [editingTitle, setEditingTitle] = useState(null); // clipId being edited
  const [editTitleValue, setEditTitleValue] = useState('');
  const [localTitles, setLocalTitles] = useState({});
  const [batchProgress, setBatchProgress] = useState(null); // { done, total, currentClip }
  const shouldReduceMotion = useReducedMotion();
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clipFavorites') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('clipFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const sortedFilteredClips = useMemo(() => {
    let result = [...clips];
    if (showFavoritesOnly) {
      result = result.filter(c => favorites[c.clipId]);
    }
    if (filterType !== 'all') {
      result = result.filter(c => (c.type || 'clip') === filterType);
    }
    if (searchTerm.trim()) {
      const normalized = searchTerm.trim().toLowerCase();
      result = result.filter(c => {
        const title = (localTitles[c.clipId] || c.title || '').toLowerCase();
        return title.includes(normalized);
      });
    }
    if (minScore > 0) {
      result = result.filter(c => ((c.score || 0) * 100) >= minScore);
    }
    if (sortBy === 'score') {
      result.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sortBy === 'duration') {
      result.sort((a, b) => (parseFloat(a.duration) || 0) - (parseFloat(b.duration) || 0));
    } else if (sortBy === 'title') {
      result.sort((a, b) => {
        const titleA = (localTitles[a.clipId] || a.title || '').toLowerCase();
        const titleB = (localTitles[b.clipId] || b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else if (sortBy === 'start') {
      const val = (v) => (parseFloat(v ?? 0) || 0);
      result.sort((a, b) => val(a.startTime) - val(b.startTime));
    }
    return result;
  }, [clips, sortBy, filterType, favorites, showFavoritesOnly, searchTerm, minScore, localTitles]);

  const uniqueTypes = useMemo(() => {
    return [...new Set(clips.map(c => c.type || 'clip'))];
  }, [clips]);

  const totalDuration = useMemo(() => {
    return sortedFilteredClips.reduce((sum, clip) => sum + (parseFloat(clip.duration) || 0), 0);
  }, [sortedFilteredClips]);

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

  const getScoreTooltip = (score) => {
    if (score >= 0.8) return 'High viral potential';
    if (score >= 0.6) return 'Good engagement';
    return 'Exploratory pick';
  };

  const handleCopyLink = async (clipId) => {
    const url = `${API_BASE_URL}${endpoints.download(clipId)}`;
    const copied = await copyText(url);
    if (copied === 'success') toast.success('Link copied to clipboard!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy link');
  };

  const handleShareTwitter = (clip) => {
    const title = localTitles[clip.clipId] || clip.title || 'Viral Clip';
    const text = encodeURIComponent(`Check out this viral clip: ${title} `);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareWhatsApp = (clip, index) => {
    const text = encodeURIComponent(`${getDisplayTitle(clip, index)}\n${getDescriptionText(clip)}\n${API_BASE_URL}${endpoints.download(clip.clipId)}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareEmail = (clip, index) => {
    const subject = encodeURIComponent(`Clip: ${getDisplayTitle(clip, index)}`);
    const body = encodeURIComponent([
      getDescriptionText(clip),
      getCaptionText(clip),
      getHashtags(clip),
      `${API_BASE_URL}${endpoints.download(clip.clipId)}`
    ].join('\n\n'));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
  };

  const toggleFavorite = (clipId) => {
    setFavorites(prev => ({ ...prev, [clipId]: !prev[clipId] }));
  };

  const getCaptionText = (clip) => {
    const title = localTitles[clip.clipId] || clip.title || 'Viral Clip';
    if (clip.caption) return clip.caption;
    return `${title}\n\n${CAPTION_HASHTAGS}`;
  };

  const getDescriptionText = (clip) => {
    return clip.description || 'Engaging social-ready highlight.';
  };

  const getHashtags = (clip) => {
    if (Array.isArray(clip.hashtags) && clip.hashtags.length > 0) return clip.hashtags.join(' ');
    return CAPTION_HASHTAGS;
  };

  const handleCopyCaption = async (clip) => {
    const caption = getCaptionText(clip);
    const copied = await copyText(caption);
    if (copied === 'success') toast.success('Caption copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy caption');
  };

  const handleCopyHashtags = async (clip) => {
    const copied = await copyText(getHashtags(clip || {}));
    if (copied === 'success') toast.success('Hashtags copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy hashtags');
  };

  const handleCopyInfo = async (clip, index) => {
    const title = getDisplayTitle(clip, index);
    const info = [
      title,
      `Type: ${clip.type || 'clip'}`,
      `Duration: ${formatDuration(clip.duration)}`,
      `Score: ${((clip.score || 0) * 100).toFixed(0)}%`,
      `Description: ${getDescriptionText(clip)}`
    ].join('\n');
    const copied = await copyText(info);
    if (copied === 'success') toast.success('Clip info copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy clip info');
  };

  const handleCopyDescription = async (clip) => {
    const copied = await copyText(getDescriptionText(clip));
    if (copied === 'success') toast.success('Description copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy description');
  };

  const handleCopyCaptionPlusTags = async (clip) => {
    const copied = await copyText([getCaptionText(clip), getHashtags(clip)].join('\n\n'));
    if (copied === 'success') toast.success('Caption + hashtags copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy caption + hashtags');
  };

  const handleCopyMetadata = async (clip, index) => {
    const payload = {
      title: getDisplayTitle(clip, index),
      caption: getCaptionText(clip),
      description: getDescriptionText(clip),
      hashtags: getHashtags(clip),
      downloadUrl: `${API_BASE_URL}${endpoints.download(clip.clipId)}`,
      thumbnailUrl: `${API_BASE_URL}${endpoints.thumbnail(clip.clipId)}`,
      videoUrl: clip.videoUrl || ''
    };
    const copied = await copyText(JSON.stringify(payload, null, 2));
    if (copied === 'success') toast.success('Metadata copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy metadata');
  };

  const handleCopyMetadataLink = async (clip) => {
    const copied = await copyText(`${API_BASE_URL}${endpoints.metadata(clip.clipId)}`);
    if (copied === 'success') toast.success('Metadata link copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy metadata link');
  };

  const handleOpenClip = (clipId) => {
    const url = `${API_BASE_URL}${endpoints.download(clipId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadCaption = async (clip) => {
    const toastId = toast.loading('Preparing captions...');
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoints.caption(clip.clipId)}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${clip.clipId}.srt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Captions downloaded', { id: toastId });
    } catch {
      toast.error('Failed to download captions', { id: toastId });
    }
  };

  const handleCopyCaptionCurl = async (clip) => {
    const cmd = `curl -L "${API_BASE_URL}${endpoints.caption(clip.clipId)}" -o "${clip.clipId}.srt"`;
    const copied = await copyText(cmd);
    if (copied === 'success') toast.success('Caption download command copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy command');
  };

  const getFileExtensionFromContentType = (contentType) => {
    const lookup = {
      'image/svg+xml': 'svg',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg'
    };
    if (lookup[contentType]) return lookup[contentType];
    const lowered = (contentType || '').toLowerCase();
    if (lowered.includes('svg')) return 'svg';
    if (lowered.includes('png')) return 'png';
    if (lowered.includes('jpeg') || lowered.includes('jpg')) return 'jpg';
    return 'img';
  };

  const handleDownloadThumbnail = async (clip) => {
    const toastId = toast.loading('Preparing thumbnail...');
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoints.thumbnail(clip.clipId)}`, { responseType: 'blob' });
      const blob = response.data;
      const contentType = blob.type || 'image/svg+xml';
      const ext = getFileExtensionFromContentType(contentType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${clip.clipId}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Thumbnail downloaded', { id: toastId });
    } catch {
      toast.error('Failed to download thumbnail', { id: toastId });
    }
  };

  const handleCopyThumbnailLink = async (clip) => {
    const copied = await copyText(`${API_BASE_URL}${endpoints.thumbnail(clip.clipId)}`);
    if (copied === 'success') toast.success('Thumbnail link copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy thumbnail link');
  };

  const handleDownloadMetadata = async (clip, index) => {
    const toastId = toast.loading('Preparing metadata...');
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoints.metadata(clip.clipId)}`);
      const blob = new Blob([JSON.stringify(response.data.clip || response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = sanitizeFileName(getDownloadFileName(clip, index)) || clip.clipId;
      link.setAttribute('download', `${safeName}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Metadata downloaded', { id: toastId });
    } catch {
      toast.error('Failed to download metadata', { id: toastId });
    }
  };

  const handleCopyDownloadCurl = async (clip) => {
    const cmd = `curl -L "${API_BASE_URL}${endpoints.download(clip.clipId)}" -o "${clip.clipId}.mp4"`;
    const copied = await copyText(cmd);
    if (copied === 'success') toast.success('Download command copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy command');
  };

  const handleShareLinkedIn = (clip) => {
    const url = encodeURIComponent(`${API_BASE_URL}${endpoints.download(clip.clipId)}`);
    const text = encodeURIComponent(getDescriptionText(clip));
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareReddit = (clip, index) => {
    const url = encodeURIComponent(`${API_BASE_URL}${endpoints.download(clip.clipId)}`);
    const title = encodeURIComponent(getDisplayTitle(clip, index));
    window.open(`https://www.reddit.com/submit?url=${url}&title=${title}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopySocialBundle = async (clip, index) => {
    const bundle = [
      getDisplayTitle(clip, index),
      getDescriptionText(clip),
      getCaptionText(clip),
      getHashtags(clip),
      `${API_BASE_URL}${endpoints.download(clip.clipId)}`
    ].join('\n\n');
    const copied = await copyText(bundle);
    if (copied === 'success') toast.success('Social bundle copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy social bundle');
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
    setBatchProgress({ done: 0, total, currentClip: null });
    for (let i = 0; i < clips.length; i++) {
      const clipTitle = getDisplayTitle(clips[i], i);
      const fileName = getDownloadFileName(clips[i], i);
      setBatchProgress({ done: i, total, currentClip: clipTitle });
      await onDownload(clips[i].clipId, fileName);
      setBatchProgress({ done: i + 1, total, currentClip: clipTitle });
      // Small delay between downloads to avoid browser blocking
      if (i < clips.length - 1) await new Promise(r => setTimeout(r, DOWNLOAD_DELAY_MS));
    }
    setBatchProgress(null);
    toast.success(`Downloaded all ${total} clips!`);
  };

  const getDisplayTitle = (clip, index) =>
    localTitles[clip.clipId] || clip.title || `Viral Clip #${index + 1}`;

  const getDownloadFileName = (clip, index) => {
    const displayTitle = getDisplayTitle(clip, index);
    return displayTitle.trim() || clip.clipId;
  };

  const getTimestampRange = (clip) => {
    const hasStart = clip.startTime != null;
    const hasEnd = clip.endTime != null;
    const computedEnd = hasEnd
      ? clip.endTime
      : (clip.startTime != null && clip.duration != null
        ? Number(clip.startTime) + Number(clip.duration)
        : null);
    const start = formatTimestamp(hasStart ? clip.startTime : null);
    const end = formatTimestamp(computedEnd);
    if (!start && !end) return 'Timestamps unavailable';
    return `Start: ${start || '--'} • End: ${end || '--'}`;
  };

  const handleCopyTimestamps = async (clip) => {
    const copied = await copyText(getTimestampRange(clip));
    if (copied === 'success') toast.success('Timestamps copied!');
    else if (copied === 'denied') toast.error('Clipboard permission denied');
    else toast.error('Unable to copy timestamps');
  };

  const handleOpenAtSourceTime = (clip) => {
    if (!clip.videoUrl) return;
    const startParam = Math.max(0, Math.floor(Number(clip.startTime ?? 0)));
    const isYouTube = /youtu\.be|youtube\.com/.test(clip.videoUrl);
    const url = isYouTube
      ? `${clip.videoUrl}${clip.videoUrl.includes('?') ? '&' : '?'}t=${startParam}`
      : clip.videoUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getMotionProps = useCallback((index) => (
    shouldReduceMotion
      ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, scale: 1 },
        transition: { duration: 0 }
      }
      : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.3, delay: index * 0.06 }
      }
  ), [shouldReduceMotion]);

  const isFiltered = filterType !== 'all' || sortBy !== 'score' || showFavoritesOnly || searchTerm.trim() || minScore > 0;
  const resetFilters = () => {
    setFilterType('all');
    setSortBy('score');
    setShowFavoritesOnly(false);
    setSearchTerm('');
    setMinScore(0);
  };

  return (
    <div className="card" id="clip-gallery">
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
              Downloading {batchProgress.done}/{batchProgress.total}
              {batchProgress.currentClip ? ` • ${batchProgress.currentClip}...` : '...'}
            </span>
          )}
          <button
            className="btn btn-success"
            onClick={handleBatchDownload}
            disabled={!!batchProgress}
            aria-label={batchProgress ? `Downloading ${batchProgress.done} of ${batchProgress.total}` : 'Download all clips'}
            data-action="download-all"
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
          <option value="title">Title A-Z</option>
          <option value="start">Start Time ↑</option>
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
        <label htmlFor="search-input" style={{ marginLeft: '10px' }}>Search:</label>
        <input
          id="search-input"
          className="clip-search"
          type="search"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search titles"
          aria-label="Search clips by title"
        />
        <label htmlFor="score-range" style={{ marginLeft: '10px' }}>Min Score:</label>
        <input
          id="score-range"
          type="range"
          min="0"
          max="100"
          step="5"
          value={minScore}
          onChange={e => setMinScore(Number(e.target.value))}
          aria-label="Minimum viral score"
        />
        <span className="score-value" aria-hidden="true">{minScore}%</span>
        <label className="favorite-toggle">
          <input
            type="checkbox"
            checked={showFavoritesOnly}
            onChange={(e) => setShowFavoritesOnly(e.target.checked)}
          />
          ⭐ Favorites
        </label>
        {isFiltered && (
          <span className="filter-status">
            Showing {sortedFilteredClips.length} of {clips.length}
            {filterType !== 'all' && ` • Filtered by ${filterType}`}
            {showFavoritesOnly && ' • Favorites only'}
            {searchTerm.trim() && ` • Matching "${searchTerm.trim()}"`}
            {minScore > 0 && ` • Score ≥ ${minScore}%`}
            {sortBy !== 'score' && ` • Sorted by ${sortBy === 'duration' ? 'duration' : sortBy === 'title' ? 'title' : sortBy === 'start' ? 'start time' : 'original'}`}
            {sortedFilteredClips.length > 0 && ` • Total ${formatDuration(totalDuration)}`}
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
                {...getMotionProps(index)}
                layout={!shouldReduceMotion}
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
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="text"
                        value={editTitleValue}
                        maxLength={TITLE_LIMIT}
                        onChange={e => setEditTitleValue(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveTitle(clip.clipId);
                          if (e.key === 'Escape') setEditingTitle(null);
                        }}
                        autoFocus
                        aria-label={`Edit clip title (max ${TITLE_LIMIT} characters)`}
                        aria-describedby={`title-count-${clip.clipId}`}
                        style={{ flex: 1, padding: '4px 8px', border: '1px solid #667eea', borderRadius: '4px', fontSize: '0.9rem', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                      />
                      <button onClick={() => saveTitle(clip.clipId)} style={{ padding: '4px 8px', border: 'none', borderRadius: '4px', background: '#667eea', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }} aria-label="Save title">✓</button>
                      <button onClick={() => setEditingTitle(null)} style={{ padding: '4px 8px', border: 'none', borderRadius: '4px', background: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }} aria-label="Cancel edit">✕</button>
                    </div>
                    <div id={`title-count-${clip.clipId}`} className="title-counter" aria-live="polite">
                      {editTitleValue.length}/{TITLE_LIMIT} characters
                    </div>
                  </div>
                ) : (
                  <div className="clip-title-row">
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
                    <button
                      type="button"
                      className="btn-favorite"
                      onClick={() => toggleFavorite(clip.clipId)}
                      aria-label={favorites[clip.clipId] ? 'Remove from favorites' : 'Add to favorites'}
                      aria-pressed={!!favorites[clip.clipId]}
                    >
                      {favorites[clip.clipId] ? '⭐' : '☆'}
                    </button>
                  </div>
                )}
                <div className="clip-meta">
                  <span aria-label={`Type: ${clip.type || 'clip'}, Duration: ${formatDuration(clip.duration)}`}>
                    {getClipTypeIcon(clip.type || 'clip')} {formatDuration(clip.duration)}
                  </span>
                  <span
                    className="clip-score"
                    style={{ background: getViralScoreColor(clip.score || 0) }}
                    aria-label={`Viral score: ${((clip.score || 0) * 100).toFixed(0)}%`}
                    data-tooltip={getScoreTooltip(clip.score || 0)}
                    tabIndex={0}
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
                <div style={{ ...detailStyle, color: 'var(--text-primary)' }}>
                  <strong>Caption:</strong> {getCaptionText(clip)}
                </div>
                <div style={{ ...detailStyle, marginBottom: '12px' }}>
                  <strong>Description:</strong> {getDescriptionText(clip)}
                </div>
                <div style={{ ...detailStyle, marginBottom: '12px' }}>
                  <strong>Timing:</strong> {getTimestampRange(clip)}
                </div>
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
                    onClick={() => onDownload(clip.clipId, getDownloadFileName(clip, index))}
                    aria-label={`Download ${getDisplayTitle(clip, index)}`}
                  >
                    ⬇️ Download
                  </button>
                  <button
                    className="btn-preview"
                    onClick={() => handleDownloadCaption(clip)}
                    aria-label={`Download captions for ${getDisplayTitle(clip, index)}`}
                  >
                    💬 Captions
                  </button>
                  <button
                    className="btn-preview"
                    onClick={() => handleOpenClip(clip.clipId)}
                    aria-label={`Open ${getDisplayTitle(clip, index)} in a new tab`}
                  >
                    🧭 Open
                  </button>
                  {clip.videoUrl && (
                    <button
                      className="btn-preview"
                      onClick={() => handleOpenAtSourceTime(clip)}
                      aria-label={`Open source video at ${formatTimestamp(clip.startTime) || 'start'}`}
                    >
                      ⏯️ Jump
                    </button>
                  )}
                  <button
                    className="btn-preview"
                    onClick={() => handleDownloadThumbnail(clip)}
                    aria-label={`Download thumbnail for ${getDisplayTitle(clip, index)}`}
                  >
                    🖼️ Thumbnail
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
                    onClick={() => handleCopyThumbnailLink(clip)}
                    aria-label="Copy thumbnail link"
                  >
                    🖼️ Link
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleCopySocialBundle(clip, index)}
                    aria-label="Copy social bundle"
                  >
                    📦 Bundle
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleCopyCaptionPlusTags(clip)}
                    aria-label="Copy caption and hashtags"
                  >
                    🎯 Caption+Tags
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleCopyMetadataLink(clip)}
                    aria-label="Copy metadata link"
                  >
                    🔗 Meta URL
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
                  <button
                    className="btn-share"
                    onClick={() => handleCopyDescription(clip)}
                    aria-label="Copy clip description"
                  >
                    📝 Description
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleCopyHashtags(clip)}
                    aria-label="Copy hashtags"
                  >
                    #️⃣ Hashtags
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleCopyTimestamps(clip)}
                    aria-label="Copy clip timestamps"
                  >
                    ⏱️ Timestamps
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleCopyMetadata(clip, index)}
                    aria-label="Copy clip metadata"
                  >
                    🧾 Metadata
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleCopyInfo(clip, index)}
                    aria-label="Copy clip info"
                  >
                    ℹ️ Info
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleDownloadMetadata(clip, index)}
                    aria-label="Download metadata JSON"
                  >
                    💾 JSON
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleCopyDownloadCurl(clip)}
                    aria-label="Copy curl download command"
                  >
                    🧰 curl MP4
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleCopyCaptionCurl(clip)}
                    aria-label="Copy curl caption command"
                  >
                    🧰 curl SRT
                  </button>
                  <button
                    className="btn-share"
                    style={{ background: '#0a66c2', color: 'white' }}
                    onClick={() => handleShareLinkedIn(clip)}
                    aria-label="Share to LinkedIn"
                  >
                    💼 LinkedIn
                  </button>
                  <button
                    className="btn-share"
                    style={{ background: '#25d366', color: 'white' }}
                    onClick={() => handleShareWhatsApp(clip, index)}
                    aria-label="Share to WhatsApp"
                  >
                    📱 WhatsApp
                  </button>
                  <button
                    className="btn-share"
                    style={{ background: '#ff4500', color: 'white' }}
                    onClick={() => handleShareReddit(clip, index)}
                    aria-label="Share to Reddit"
                  >
                    👽 Reddit
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => handleShareEmail(clip, index)}
                    aria-label="Share via email"
                  >
                    ✉️ Email
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
