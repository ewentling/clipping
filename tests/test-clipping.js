const { exec } = require('child_process');

async function testClipping() {
  console.log('🧪 Running ViralClip test...\n');

  // Test video (short demo video)
  const testVideo = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  
  console.log(`Test video: ${testVideo}`);
  console.log('Note: This is a basic test. Full processing requires ffmpeg and yt-dlp.\n');

  // Check dependencies
  console.log('Checking dependencies...');
  
  try {
    exec('ffmpeg -version', (error) => {
      if (error) {
        console.log('⚠️  FFmpeg not found - install from https://ffmpeg.org/');
      } else {
        console.log('✅ FFmpeg installed');
      }
    });
  } catch (e) {
    console.log('⚠️  FFmpeg check failed');
  }

  try {
    exec('yt-dlp --version', (error) => {
      if (error) {
        console.log('⚠️  yt-dlp not found - run: pip install yt-dlp');
      } else {
        console.log('✅ yt-dlp installed');
      }
    });
  } catch (e) {
    console.log('⚠️  yt-dlp check failed');
  }

  console.log('\n✅ Test script completed!');
  console.log('\nTo run full processing:');
  console.log('  node src/index.js "https://youtube.com/watch?v=VIDEO_ID" 5');
}

testClipping();
