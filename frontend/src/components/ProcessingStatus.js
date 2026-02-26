import React, { useState, useEffect } from 'react';

function ProcessingStatus({ jobId, statusMessage }) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing...');

  useEffect(() => {
    if (statusMessage) {
      const match = statusMessage.match(/(\d+)%/);
      if (match) setProgress(parseInt(match[1]));
      if (statusMessage.includes('downloading')) setCurrentStep('Downloading video content...');
      else if (statusMessage.includes('analyzing')) setCurrentStep('Analyzing for viral moments...');
      else if (statusMessage.includes('generating')) setCurrentStep('Creating clips...');
      else if (statusMessage.includes('completed')) {
        setCurrentStep('Completed!');
        setProgress(100);
      }
    }
  }, [statusMessage]);

  const steps = [
    { name: 'Analyzing', threshold: 10 },
    { name: 'Downloading', threshold: 40 },
    { name: 'Processing', threshold: 70 },
    { name: 'Generating', threshold: 90 },
    { name: 'Complete', threshold: 100 }
  ];

  const currentStepIndex = steps.findIndex(s => progress <= s.threshold);
  const activeStep = currentStepIndex === -1 ? steps.length - 1 : currentStepIndex;

  return (
    <div className="card">
      <h2 className="card-title"><span className="loading-spinner" style={{ display: 'inline-block', marginRight: '10px' }}></span>Processing Your Video</h2>
      <div className="progress-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="status-text">{statusMessage || 'Starting...'}</div>
      </div>
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          {steps.map((step, index) => (
            <div key={step.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, opacity: index <= activeStep ? 1 : 0.3 }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: index <= activeStep ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', marginBottom: '8px', transition: 'all 0.3s ease' }}>
                {index < activeStep ? '✓' : index + 1}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>{step.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px', textAlign: 'center' }}>
        <h4 style={{ marginBottom: '10px', color: '#555' }}>⏱️ What's happening?</h4>
        <p style={{ color: '#666', lineHeight: '1.6' }}>
          {activeStep === 0 && 'We\'re analyzing the video structure and identifying potential viral moments using AI.'}
          {activeStep === 1 && 'Downloading the video content from YouTube with bot guard evasion.'}
          {activeStep === 2 && 'Processing audio peaks, scene changes, and engagement patterns.'}
          {activeStep === 3 && 'Creating high-quality MP4 clips with optimized settings for social media.'}
          {activeStep === 4 && 'All done! Your viral clips are ready to download.'}
        </p>
      </div>
      <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '10px', borderLeft: '4px solid #ffc107' }}>
        <p style={{ color: '#856404', fontSize: '0.9rem' }}><strong>⚠️ Note:</strong> Processing time depends on video length. A 10-minute video typically takes 2-3 minutes to process.</p>
      </div>
    </div>
  );
}

export default ProcessingStatus;
