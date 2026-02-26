const express = require('express');
const router = express.Router();

router.get('/info', async (req, res) => {
  try {
    const { url } = req.query;
    res.json({ success: true, info: { title: 'Video', duration: 300 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/validate', (req, res) => {
  const { url } = req.query;
  const isValid = url && (url.includes('youtube.com') || url.includes('youtu.be'));
  res.json({ success: true, valid: isValid });
});

module.exports = router;
