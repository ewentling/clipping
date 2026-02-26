const express = require('express');
const router = express.Router();

const YOUTUBE_URL_RE = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)[\w-]{11}/;
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const isValidYouTubeUrl = (url) =>
  typeof url === 'string' && url.length <= 500 && (YOUTUBE_URL_RE.test(url) || VIDEO_ID_RE.test(url));

router.get('/info', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || !isValidYouTubeUrl(url)) {
      return res.status(400).json({ success: false, error: 'Valid YouTube URL required' });
    }
    res.json({
      success: true,
      info: {
        title: 'Video Info',
        duration: 300,
        uploader: 'Channel',
        viewCount: 10000,
        description: '',
        tags: [],
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/validate', (req, res) => {
  const { url } = req.query;
  const valid = isValidYouTubeUrl(url);
  res.json({ success: true, valid });
});

module.exports = router;
