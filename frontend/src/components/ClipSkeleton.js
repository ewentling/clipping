import React from 'react';

function ClipSkeleton({ count = 3 }) {
  return (
    <div className="clips-grid" aria-busy="true" aria-label="Loading clips">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-thumbnail" />
          <div className="skeleton-content">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-meta" />
            <div className="skeleton skeleton-btn" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ClipSkeleton;
