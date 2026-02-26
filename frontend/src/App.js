import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, endpoints } from './config';
import VideoInput from './components/VideoInput';
import ClipGallery from './components/ClipGallery';
import ProcessingStatus from './components/ProcessingStatus';

function App() {
  const [currentJob, setCurrentJob] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [clips, setClips] = useState([]);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    checkApiHealth();
    loadExistingClips();
  }, []);

  const checkApiHealth = async () => {
    try {
      await axios.get(`${API_BASE_URL}${endpoints.health}`);
      console.log('✅ API is healthy');
    } catch (err) {
      setError('Backend API is not running. Please start the server.');
    }
  };

  const loadExistingClips = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoints.list}`);
      if (response.data.success) {
        setClips(response.data.clips);
      }
    } catch (err) {
      console.log('No existing clips found');
    }
  };

  const handleVideoSubmit = async (videoUrl) => {
    setError(null);
    setIsProcessing(true);
    setStatusMessage('Analyzing video...');

    try {
      const analyzeResponse = await axios.post(`${API_BASE_URL}${endpoints.analyze}`, { videoUrl });
      if (!analyzeResponse.data.success) {
        throw new Error(analyzeResponse.data.error);
      }
      setVideoInfo(analyzeResponse.data.videoInfo);
      setStatusMessage('Video analyzed successfully!');
      return analyzeResponse.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setIsProcessing(false);
      throw err;
    }
  };

  const handleGenerateClips = async (options) => {
    if (!videoInfo) return;
    setIsProcessing(true);
    setStatusMessage('Starting clip generation...');
    setError(null);

    try {
      const generateResponse = await axios.post(`${API_BASE_URL}${endpoints.generate}`, {
        videoUrl: options.videoUrl,
        numClips: options.numClips || 5,
        videoInfo
      });
      if (!generateResponse.data.success) {
        throw new Error(generateResponse.data.error);
      }
      const jobId = generateResponse.data.jobId;
      setCurrentJob({ id: jobId, status: 'processing' });
      await pollJobStatus(jobId);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setIsProcessing(false);
    }
  };

  const pollJobStatus = async (jobId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoints.status(jobId)}`);
        if (response.data.success) {
          const job = response.data.job;
          setStatusMessage(`${job.status}... ${job.progress}%`);
          if (job.status === 'completed') {
            clearInterval(pollInterval);
            setCurrentJob(null);
            setIsProcessing(false);
            setClips(job.clips);
            setStatusMessage('Clips generated successfully!');
            await loadExistingClips();
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            setCurrentJob(null);
            setIsProcessing(false);
            setError(job.error || 'Failed to generate clips');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        clearInterval(pollInterval);
        setIsProcessing(false);
        setError('Lost connection to server');
      }
    }, 2000);
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isProcessing) {
        setError('Processing took too long. Please try again.');
        setIsProcessing(false);
      }
    }, 600000);
  };

  const handleDownload = async (clipId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoints.download(clipId)}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${clipId}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download clip');
    }
  };

  const handleClearClips = () => {
    setClips([]);
    setVideoInfo(null);
    setError(null);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>🎬 GravityClaw</h1>
        <p>AI-Powered Viral Video Clipping - Turn long videos into shareable clips</p>
      </header>
      <main className="main-content">
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span><span>{error}</span>
            <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        <VideoInput onSubmit={handleVideoSubmit} onGenerate={handleGenerateClips} videoInfo={videoInfo} isProcessing={isProcessing} onClear={handleClearClips} />
        {currentJob && <ProcessingStatus jobId={currentJob.id} statusMessage={statusMessage} />}
        {clips.length > 0 && <ClipGallery clips={clips} onDownload={handleDownload} />}
        {clips.length === 0 && !isProcessing && (
          <div className="empty-state">
            <div className="empty-state-icon">📹</div>
            <h3>No clips yet</h3>
            <p>Paste a YouTube video URL above to start creating viral clips</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
