import React, { useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, endpoints } from '../config';

function PreviewModal({ clip, onClose }) {
  const closeButtonRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    // Focus the close button for keyboard users
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!clip) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${clip.title || 'Clip'}`}
      onClick={onClose}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          ref={closeButtonRef}
          className="modal-close"
          onClick={onClose}
          aria-label="Close preview"
        >
          ✕ Close
        </button>
        <video
          src={`${API_BASE_URL}${endpoints.download(clip.clipId)}`}
          controls
          autoPlay
          className="modal-video"
          aria-label={clip.title || 'Clip preview video'}
        />
        {clip.title && <p className="modal-title">{clip.title}</p>}
      </div>
    </div>
  );
}

export default PreviewModal;
