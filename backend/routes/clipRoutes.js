const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const YOUTUBE_URL_RE = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)[\w-]{11}/;
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const isValidYouTubeUrl = (url) =>
  typeof url === 'string' && url.length <= 500 && (YOUTUBE_URL_RE.test(url) || VIDEO_ID_RE.test(url));
const isValidId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id);

// In-memory job store (replace with DB/cache in production)
const jobs = {};

router.post('/analyze', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl || !isValidYouTubeUrl(videoUrl)) {
      return res.status(400).json({ success: false, error: 'Valid YouTube URL required' });
    }

    const videoInfo = {
      id: 'video-' + Date.now(),
      title: 'Sample Video',
      uploader: 'Channel',
      duration: 300,
      viewCount: 50000,
      description: 'This is a sample video analyzed by Clipnotic.',
      tags: ['viral', 'clips', 'shorts'],
    };

    res.json({ success: true, videoInfo });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/generate', async (req, res) => {
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
    jobs[jobId] = { status: 'completed', progress: 100, clips: [] };
    console.log(`Job ${jobId}: generating ${parsedNum} clips from ${videoUrl}`);
    res.json({ success: true, jobId, message: 'Processing started' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  if (!isValidId(jobId)) {
    return res.status(400).json({ success: false, error: 'Invalid job ID' });
  }
  const job = jobs[jobId] || { status: 'completed', progress: 100, clips: [] };
  res.json({ success: true, job });
});

router.get('/download/:clipId', (req, res) => {
  const { clipId } = req.params;
  if (!isValidId(clipId)) {
    return res.status(400).json({ success: false, error: 'Invalid clip ID' });
  }
  res.status(200).json({ success: true, url: `/clips/${clipId}.mp4` });
});

router.get('/thumbnail/:clipId', (req, res) => {
  const { clipId } = req.params;
  if (!isValidId(clipId)) {
    return res.status(400).json({ success: false, error: 'Invalid clip ID' });
  }
  res.status(200).json({ success: true, url: `/thumbnails/${clipId}.jpg` });
});

router.get('/list', (req, res) => {
  res.json({ success: true, clips: [] });
});

module.exports = router;
