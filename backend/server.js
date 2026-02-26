const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Allow specific origins; falls back to localhost for dev
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: origin not allowed'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Validate YouTube URL server-side
const YOUTUBE_URL_RE = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)[\w-]{11}/;
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

const isValidYouTubeUrl = (url) =>
  typeof url === 'string' && (YOUTUBE_URL_RE.test(url) || VIDEO_ID_RE.test(url));

// Validate clipId / jobId (UUID or alphanumeric)
const isValidId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'GravityClaw Clipping API'
  });
});

app.post('/api/clips/analyze', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl || !isValidYouTubeUrl(videoUrl)) {
      return res.status(400).json({ success: false, error: 'Valid YouTube URL required' });
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
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/clips/generate', async (req, res) => {
  try {
    const { videoUrl, numClips = 5 } = req.body;
    if (!videoUrl || !isValidYouTubeUrl(videoUrl)) {
      return res.status(400).json({ success: false, error: 'Valid YouTube URL required' });
    }
    const parsedNum = parseInt(numClips, 10);
    if (isNaN(parsedNum) || parsedNum < 1 || parsedNum > 20) {
      return res.status(400).json({ success: false, error: 'numClips must be between 1 and 20' });
    }

    const jobId = uuidv4();
    console.log(`Starting clip generation for ${videoUrl}, clips: ${parsedNum}`);
    res.json({ success: true, jobId, message: 'Processing started' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/clips/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  if (!isValidId(jobId)) {
    return res.status(400).json({ success: false, error: 'Invalid job ID' });
  }
  res.json({ success: true, job: { status: 'completed', progress: 100, clips: [] } });
});

app.get('/api/clips/download/:clipId', (req, res) => {
  const { clipId } = req.params;
  if (!isValidId(clipId)) {
    return res.status(400).json({ success: false, error: 'Invalid clip ID' });
  }
  res.status(200).json({ success: true, message: 'Download endpoint' });
});

app.get('/api/clips/thumbnail/:clipId', (req, res) => {
  const { clipId } = req.params;
  if (!isValidId(clipId)) {
    return res.status(400).json({ success: false, error: 'Invalid clip ID' });
  }
  res.status(200).json({ success: true, message: 'Thumbnail endpoint' });
});

app.get('/api/clips/list', (req, res) => {
  res.json({ success: true, clips: [] });
});

app.get('/api/videos/info', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || !isValidYouTubeUrl(url)) {
      return res.status(400).json({ success: false, error: 'Valid YouTube URL required' });
    }
    res.json({ success: true, info: { title: 'Video Info', duration: 300 } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/videos/validate', (req, res) => {
  const { url } = req.query;
  const valid = isValidYouTubeUrl(url);
  res.json({ success: true, valid });
});

app.use(express.static(path.join(__dirname, '../frontend/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ error: { message: err.message } });
  }
  res.status(err.status || 500).json({
    error: { message: 'Internal Server Error' }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 GravityClaw Clipping API running on port ${PORT}`);
});

module.exports = app;
