const { exec } = require('child_process');
const http = require('http');

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function testClipping() {
  console.log('🧪 Running Clipnotic test suite...\n');

  // 1. Dependency checks
  console.log('── Checking system dependencies ──');
  exec('ffmpeg -version', (err) => {
    console.log(err ? '⚠️  FFmpeg not found – install from https://ffmpeg.org/' : '✅ FFmpeg installed');
  });
  exec('yt-dlp --version', (err) => {
    console.log(err ? '⚠️  yt-dlp not found – run: pip install yt-dlp' : '✅ yt-dlp installed');
  });

  await new Promise(r => setTimeout(r, 500));

  // 2. API endpoint check (only if server is running)
  console.log('\n── Checking API endpoints (requires server on :3230) ──');
  try {
    const health = await httpGet('http://localhost:3230/api/health');
    if (health.status === 200 && health.body.status === 'healthy') {
      console.log('✅ GET /api/health – OK');
    } else {
      console.log('⚠️  /api/health returned unexpected response:', health.body);
    }
  } catch {
    console.log('ℹ️  Server not running on :3230 – skipping API tests');
  }

  try {
    const list = await httpGet('http://localhost:3230/api/clips/list');
    if (list.status === 200 && list.body.success) {
      console.log('✅ GET /api/clips/list – OK');
    }
  } catch {
    // Already noted server not running
  }

  try {
    const validate = await httpGet('http://localhost:3230/api/videos/validate?url=https://youtube.com/watch?v=dQw4w9WgXcQ');
    if (validate.status === 200 && validate.body.valid === true) {
      console.log('✅ GET /api/videos/validate – URL correctly validated');
    }
  } catch {
    // Server not running
  }

  console.log('\n✅ Test script completed!');
  console.log('\nTo run full processing:');
  console.log('  node src/index.js "https://youtube.com/watch?v=VIDEO_ID" 5');
}

testClipping();
