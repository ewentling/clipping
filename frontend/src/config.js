const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3230';

export const API_BASE_URL = REACT_APP_API_URL;
export const CAPTION_HASHTAGS = '#Clipnotic #ViralClips #Shorts';
export const EXAMPLE_VIDEO_URL = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';

export const endpoints = {
  health: '/api/health',
  analyze: '/api/clips/analyze',
  generate: '/api/clips/generate',
  status: (jobId) => `/api/clips/status/${jobId}`,
  download: (clipId) => `/api/clips/download/${clipId}`,
  list: '/api/clips/list',
  thumbnail: (clipId) => `/api/clips/thumbnail/${clipId}`,
  caption: (clipId) => `/api/clips/caption/${clipId}`,
  metadata: (clipId) => `/api/clips/metadata/${clipId}`,
  videoInfo: '/api/videos/info',
  validate: '/api/videos/validate'
};

export default API_BASE_URL;
