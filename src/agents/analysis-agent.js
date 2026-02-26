const { analyzeVideo, detectHighlights } = require('../core/clip-analyzer');

async function run(params) {
  const { videoPath, numClips } = params;
  
  console.log(`🔍 Analysis agent starting for: ${videoPath}`);
  
  try {
    const analysis = await analyzeVideo(videoPath);
    console.log(`📊 Analyzed video - ${analysis.scenes.length} scenes detected`);
    
    const highlights = await detectHighlights(analysis, numClips);
    console.log(`⭐ Found ${highlights.length} viral-worthy clips`);
    
    process.send({ type: 'analysis_complete', highlights });
  } catch (error) {
    console.error(`❌ Analysis failed: ${error.message}`);
    process.send({ type: 'analysis_error', error: error.message });
  }
}

const params = JSON.parse(process.argv[2]);
run(params);
