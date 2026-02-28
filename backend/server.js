const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

dotenv.config()

const clipRoutes = require('./routes/clipRoutes');
const videoRoutes = require('./routes/videoRoutes');;

const app = express();
const PORT = process.env.PORT || 3230;

// Allow specific origins; falls back to localhost for dev
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3230'];

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
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://img.youtube.com; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'"
  );
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
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
  typeof url === 'string' && url.length <= 500 && (YOUTUBE_URL_RE.test(url) || VIDEO_ID_RE.test(url));

// Validate clipId / jobId (UUID or alphanumeric)
const isValidId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id);

// Demo storage for generated clips/jobs
const demoClipFile = path.join(__dirname, 'assets', 'sample-clip.mp4');
const clipStore = new Map(); // clipId -> clip metadata
const jobs = new Map(); // jobId -> { status, progress, clips }

const demoClipTemplates = [
  { title: 'High-energy opener', type: 'hook', duration: 32, score: 0.86, startTime: 12, endTime: 44, reason: 'Great hook and pacing' },
  { title: 'Punchy quote', type: 'clip', duration: 28, score: 0.74, startTime: 95, endTime: 123, reason: 'Strong, shareable quote' },
  { title: 'Emotional moment', type: 'clip', duration: 35, score: 0.69, startTime: 210, endTime: 245, reason: 'Audience reaction spike' },
  { title: 'Key takeaway', type: 'clip', duration: 30, score: 0.64, startTime: 300, endTime: 330, reason: 'Clear, actionable advice' },
  { title: 'Mic drop ending', type: 'clip', duration: 22, score: 0.81, startTime: 355, endTime: 377, reason: 'Memorable closing line' }
];

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildClipsForJob = (jobId, count) => {
  const selected = demoClipTemplates.slice(0, Math.max(1, Math.min(count, demoClipTemplates.length)));
  return selected.map((clip, idx) => {
    const clipId = `${jobId}-clip-${idx + 1}`;
    const fullClip = { ...clip, clipId };
    clipStore.set(clipId, fullClip);
    return fullClip;
  });
};

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Clipnotic Clipping API'
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
    const clips = buildClipsForJob(jobId, parsedNum);
    const job = { status: 'completed', progress: 100, clips };
    jobs.set(jobId, job);
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
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  res.json({ success: true, job });
});

app.get('/api/clips/download/:clipId', (req, res) => {
  const { clipId } = req.params;
  if (!isValidId(clipId)) {
    return res.status(400).json({ success: false, error: 'Invalid clip ID' });
  }
  if (!clipStore.has(clipId)) {
    return res.status(404).json({ success: false, error: 'Clip not found' });
  }
  if (!fs.existsSync(demoClipFile)) {
    return res.status(500).json({ success: false, error: 'Demo clip missing on server' });
  }
  res.type('video/mp4');
  res.setHeader('Content-Disposition', `inline; filename="${clipId}.mp4"`);
  res.sendFile(demoClipFile);
});

app.get('/api/clips/thumbnail/:clipId', (req, res) => {
  const { clipId } = req.params;
  if (!isValidId(clipId)) {
    return res.status(400).json({ success: false, error: 'Invalid clip ID' });
  }
  if (!clipStore.has(clipId)) {
    return res.status(404).json({ success: false, error: 'Clip not found' });
  }
  const svg = `
    <svg width="640" height="360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Clip thumbnail">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" rx="24" fill="url(#grad)" />
      <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="32" fill="#fff" font-weight="700">Clip Preview</text>
      <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" fill="#f1f5f9">${escapeXml(clipId)}</text>
    </svg>
  `;
  res.type('image/svg+xml').send(svg.trim());
});

app.get('/api/clips/list', (req, res) => {
  res.json({ success: true, clips: Array.from(clipStore.values()) });
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

app.use('/api/clips', clipRoutes);
app.use('/api/videos', videoRoutes);

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
  console.log(`🚀 Clipnotic Clipping API running on port ${PORT}`);
});

module.exports = app;
