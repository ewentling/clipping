const { downloadVideo, getVideoInfo } = require('../core/youtube-downloader');
const path = require('path');

async function run(params) {
  const { videoUrl, outputDir } = params;
  
  console.log(`📥 Download agent starting for: ${videoUrl}`);
  
  try {
    const info = await getVideoInfo(videoUrl);
    console.log(`📺 Video: ${info.title}`);
    console.log(`⏱️  Duration: ${info.duration}s`);
    
    const videoPath = await downloadVideo(videoUrl, outputDir);
    console.log(`✅ Download complete: ${videoPath}`);
    
    process.send({ type: 'download_complete', videoPath, info });
  } catch (error) {
    console.error(`❌ Download failed: ${error.message}`);
    process.send({ type: 'download_error', error: error.message });
  }
}

const params = JSON.parse(process.argv[2]);
run(params);
