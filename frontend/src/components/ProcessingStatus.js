import React, { useState, useEffect, useRef } from 'react';

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;

function ProcessingStatus({ jobId, statusMessage, onCancel, onJumpToGallery }) {
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef(performance.now());

  const steps = [
    { name: 'Analyzing', threshold: 10, description: "We're analyzing the video structure and identifying potential viral moments using AI." },
    { name: 'Downloading', threshold: 40, description: 'Downloading the video content from YouTube with bot guard evasion.' },
    { name: 'Processing', threshold: 70, description: 'Processing audio peaks, scene changes, and engagement patterns.' },
    { name: 'Generating', threshold: 90, description: 'Creating high-quality MP4 clips with optimized settings for social media.' },
    { name: 'Complete', threshold: 100, description: 'All done! Your viral clips are ready to download.' }
  ];

  useEffect(() => {
    if (statusMessage) {
      const match = statusMessage.match(/(\d+)%/);
      if (match) setProgress(parseInt(match[1], 10));
      else if (statusMessage.toLowerCase().includes('completed')) setProgress(100);
    }
  }, [statusMessage]);

  useEffect(() => {
    startTimeRef.current = performance.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((performance.now() - startTimeRef.current) / MILLISECONDS_PER_SECOND);
      setElapsedSeconds(elapsed);
    }, MILLISECONDS_PER_SECOND);
    return () => clearInterval(timer);
  }, [jobId]);

  const formatElapsed = (seconds) => {
    const mins = Math.floor(seconds / SECONDS_PER_MINUTE);
    const secs = seconds % SECONDS_PER_MINUTE;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const activeStep = steps.findIndex(s => progress <= s.threshold);
  const currentStep = activeStep === -1 ? steps.length - 1 : activeStep;
  const nextStep = currentStep < steps.length - 1 ? steps[currentStep + 1] : null;

  return (
    <div className="card" role="status" aria-live="polite" aria-label="Processing status">
      <h2 className="card-title">
        <span className="loading-spinner" style={{ display: 'inline-block', marginRight: '10px' }} aria-hidden="true" />
        Processing Your Video
      </h2>

      {/* Progress bar */}
      <div className="progress-container">
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Processing progress: ${progress}%`}
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="status-text">{statusMessage || 'Starting...'}</div>
        <div className="status-meta">
          Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.name}
          {nextStep && ` • Next: ${nextStep.name}`} • Elapsed: {formatElapsed(elapsedSeconds)}
        </div>
      </div>

      {/* Steps with connecting lines */}
      <div style={{ marginTop: '30px' }}>
        <div className="steps-row" role="list" aria-label="Processing steps">
          {steps.map((step, index) => {
            const isDone = index < currentStep;
            const isActive = index === currentStep;
            return (
              <div
                key={step.name}
                className="step-item"
                role="listitem"
                aria-current={isActive ? 'step' : undefined}
                style={{ opacity: index <= currentStep ? 1 : 0.35, transition: 'opacity 0.4s ease' }}
              >
                <div
                  className={`step-circle ${index <= currentStep ? 'active' : 'inactive'}`}
                  aria-label={`Step ${index + 1}: ${step.name}${isDone ? ' (done)' : isActive ? ' (current)' : ''}`}
                >
                  {isDone ? '✓' : index + 1}
                </div>
                <span className="step-label">{step.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* What's happening */}
      <div style={{ marginTop: '24px', padding: '20px', background: 'var(--status-bg)', borderRadius: '10px', textAlign: 'center' }}>
        <h4 style={{ marginBottom: '10px', color: 'var(--text-muted)' }}>⏱️ What's happening?</h4>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          {steps[currentStep]?.description}
        </p>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: 'var(--note-bg)', borderRadius: '10px', borderLeft: '4px solid var(--note-border)' }}>
        <p style={{ color: 'var(--note-color)', fontSize: '0.9rem' }}>
          <strong>⚠️ Note:</strong> Processing time depends on video length. A 10-minute video typically takes 2-3 minutes to process.
        </p>
      </div>

      {onCancel && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancel} aria-label="Cancel processing">
            ✕ Cancel Processing
          </button>
        </div>
      )}
      {onJumpToGallery && progress >= 50 && (
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <button className="btn btn-secondary" onClick={onJumpToGallery} aria-label="Jump to clip gallery">
            👀 Jump to Gallery
          </button>
        </div>
      )}
    </div>
  );
}

export default ProcessingStatus;
