const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

dotenv.config()

const videoRoutes = require('./routes/videoRoutes');

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
const hasDemoClip = fs.existsSync(demoClipFile);
const clipStore = new Map(); // clipId -> clip metadata
const jobs = new Map(); // jobId -> { status, progress, clips }
const MAX_CLIPSTORE_SIZE = 1000;
const MAX_JOBS_SIZE = 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CLIP_DURATION = 15;
const DEFAULT_VIDEO_URL = process.env.DEMO_VIDEO_URL || 'https://example.com/demo-video';

const pruneMap = (map, maxSize, shouldSkip = () => false) => {
  if (!map || typeof map.size !== 'number' || map.size <= maxSize) return;
  const toRemove = map.size - maxSize;
  const iterator = map.keys();
  let removed = 0;
  while (removed < toRemove) {
    const key = iterator.next().value;
    if (key === undefined) break;
    if (shouldSkip(key, map.get(key))) continue;
    map.delete(key);
    removed += 1;
  }
};

const cleanupTimer = setInterval(() => {
  pruneMap(clipStore, MAX_CLIPSTORE_SIZE);
  pruneMap(jobs, MAX_JOBS_SIZE, (_key, job) => job && job.status === 'processing');
}, CLEANUP_INTERVAL_MS);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

const demoClipTemplates = [
  {
    title: 'High-energy opener',
    type: 'hook',
    duration: 32,
    score: 0.86,
    startTime: 12,
    endTime: 44,
    reason: 'Great hook and pacing',
    caption: 'You need to hear this opener — instant hook for any audience. #Clipnotic #ViralClips #Shorts',
    description: 'A high-energy introduction that instantly captures attention and sets the pace for the rest of the clip.',
    hashtags: ['#Clipnotic', '#ViralClips', '#Shorts']
  },
  {
    title: 'Punchy quote',
    type: 'clip',
    duration: 28,
    score: 0.74,
    startTime: 95,
    endTime: 123,
    reason: 'Strong, shareable quote',
    caption: 'Save this quote — perfect for Reels and Shorts. #Clipnotic #Shareable',
    description: 'A concise, memorable quote that works great for social sharing and quick inspiration.',
    hashtags: ['#Clipnotic', '#Shareable', '#Viral']
  },
  {
    title: 'Emotional moment',
    type: 'clip',
    duration: 35,
    score: 0.69,
    startTime: 210,
    endTime: 245,
    reason: 'Audience reaction spike',
    caption: 'The moment everyone feels — emotional and authentic. #FeelIt #Shorts',
    description: 'An emotional highlight with strong audience reactions, ideal for engagement.',
    hashtags: ['#FeelIt', '#Emotional', '#Shorts']
  },
  {
    title: 'Key takeaway',
    type: 'clip',
    duration: 30,
    score: 0.64,
    startTime: 300,
    endTime: 330,
    reason: 'Clear, actionable advice',
    caption: 'Actionable advice you can apply today. #Takeaway #Action',
    description: 'A crisp, actionable insight that delivers immediate value to viewers.',
    hashtags: ['#Takeaway', '#Action', '#Clipnotic']
  },
  {
    title: 'Mic drop ending',
    type: 'clip',
    duration: 22,
    score: 0.81,
    startTime: 355,
    endTime: 377,
    reason: 'Memorable closing line',
    caption: 'Closing with a mic drop — leave them wanting more. #MicDrop #Viral',
    description: 'A memorable closing that reinforces the main message and drives shares.',
    hashtags: ['#MicDrop', '#Viral', '#Closer']
  }
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
    const socialBundle = `${clip.title} — ${clip.caption || ''}`.trim();
    const fullClip = {
      ...clip,
      clipId,
      caption: clip.caption,
      description: clip.description,
      hashtags: clip.hashtags || ['#Clipnotic', '#Shorts'],
      thumbnailText: clip.title,
      shareText: socialBundle,
      videoUrl: DEFAULT_VIDEO_URL
    };
    clipStore.set(clipId, fullClip);
    return fullClip;
  });
};

const formatSrtTime = (seconds) => {
  const totalMs = Math.max(0, Math.floor(seconds * 1000));
  const ms = String(totalMs % 1000).padStart(3, '0');
  const totalSeconds = Math.floor(totalMs / 1000);
  const ss = String(totalSeconds % 60).padStart(2, '0');
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = String(totalMinutes % 60).padStart(2, '0');
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  return `${hh}:${mm}:${ss},${ms}`;
};

const calculateClipEndTime = (clip) => {
  if (clip.endTime != null) return clip.endTime;
  const start = clip.startTime || 0;
  const duration = clip.duration || DEFAULT_CLIP_DURATION;
  return start + duration;
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
    const job = { status: 'processing', progress: 0, clips: [] };
    jobs.set(jobId, job);
    console.log(`Starting clip generation for ${videoUrl}, clips: ${parsedNum}`);

    const generationTimer = setTimeout(() => {
      if (!jobs.has(jobId)) return;
      try {
        const clips = buildClipsForJob(jobId, parsedNum);
        jobs.set(jobId, { status: 'completed', progress: 100, clips });
        console.log(`Completed clip generation for job ${jobId}`);
      } catch (error) {
        console.error(`Error generating clips for job ${jobId}:`, error);
        jobs.set(jobId, { status: 'failed', progress: 100, clips: [], error: 'Failed to generate clips' });
      }
    }, 1000);
    if (generationTimer.unref) {
      generationTimer.unref();
    }

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
  if (!hasDemoClip) {
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
  const clip = clipStore.get(clipId);
  const svg = `
    <svg width="640" height="360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Clip thumbnail">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" rx="24" fill="url(#grad)" />
      <text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" fill="#fff" font-weight="700">${escapeXml(clip.thumbnailText || 'Clip')}</text>
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" fill="#f1f5f9">${escapeXml(clipId)}</text>
    </svg>
  `;
  res.type('image/svg+xml').send(svg.trim());
});

app.get('/api/clips/list', (req, res) => {
  res.json({ success: true, clips: Array.from(clipStore.values()) });
});

app.get('/api/clips/metadata/:clipId', (req, res) => {
  const { clipId } = req.params;
  if (!isValidId(clipId)) {
    return res.status(400).json({ success: false, error: 'Invalid clip ID' });
  }
  const clip = clipStore.get(clipId);
  if (!clip) {
    return res.status(404).json({ success: false, error: 'Clip not found' });
  }
  const payload = {
    ...clip,
    downloadUrl: `/api/clips/download/${clipId}`,
    captionUrl: `/api/clips/caption/${clipId}`,
    thumbnailUrl: `/api/clips/thumbnail/${clipId}`
  };
  res.json({ success: true, clip: payload });
});

app.get('/api/clips/caption/:clipId', (req, res) => {
  const { clipId } = req.params;
  if (!isValidId(clipId)) {
    return res.status(400).json({ success: false, error: 'Invalid clip ID' });
  }
  const clip = clipStore.get(clipId);
  if (!clip) {
    return res.status(404).json({ success: false, error: 'Clip not found' });
  }
  const start = formatSrtTime(clip.startTime || 0);
  const end = formatSrtTime(calculateClipEndTime(clip));
  const lines = [
    '1',
    `${start} --> ${end}`,
    clip.caption || clip.title || 'Clip',
    (clip.hashtags || []).join(' '),
    ''
  ].join('\n');
  res.setHeader('Content-Type', 'application/x-subrip');
  res.setHeader('Content-Disposition', `attachment; filename="${clipId}.srt"`);
  res.send(lines);
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
