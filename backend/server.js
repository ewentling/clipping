const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

const clips = [];
const videos = [];

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    service: 'GravityClaw Clipping API'
  });
});

app.post('/api/clips/analyze', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ success: false, error: 'Video URL required' });
    }
    
    // Simulate video analysis
    const videoInfo = {
      id: 'demo-' + Date.now(),
      title: 'Demo Video',
      uploader: 'Demo Channel',
      duration: 300,
      viewCount: 10000,
    };
    
    res.json({ success: true, videoInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/clips/generate', async (req, res) => {
  try {
    const { videoUrl, numClips = 5, videoInfo } = req.body;
    const jobId = uuidv4();
    
    console.log(`Starting clip generation for ${videoUrl}`);
    
    res.json({ success: true, jobId, message: 'Processing started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/clips/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  res.json({ success: true, job: { status: 'completed', progress: 100, clips: [] } });
});

app.get('/api/clips/download/:clipId', (req, res) => {
  res.status(200).json({ success: true, message: 'Download endpoint' });
});

app.get('/api/clips/thumbnail/:clipId', (req, res) => {
  res.status(200).json({ success: true, message: 'Thumbnail endpoint' });
});

app.get('/api/clips/list', (req, res) => {
  res.json({ success: true, clips: [] });
});

app.get('/api/videos/info', async (req, res) => {
  try {
    const { url } = req.query;
    res.json({ success: true, info: { title: 'Video Info', duration: 300 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/videos/validate', (req, res) => {
  const { url } = req.query;
  const isValid = url && url.includes('youtube.com');
  res.json({ success: true, valid: isValid });
});

app.use(express.static(path.join(__dirname, '../frontend/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: { message: err.message || 'Internal Server Error' }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 GravityClaw Clipping API running on port ${PORT}`);
});

module.exports = app;
