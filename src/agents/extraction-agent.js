const { extractClip } = require('../core/clip-extractor');
const path = require('path');

async function run(params) {
  const { sourceVideo, highlights, outputDir } = params;
  
  console.log(`✂️ Extraction agent starting - ${highlights.length} clips to create`);
  
  const results = [];
  
  for (let i = 0; i < highlights.length; i++) {
    const highlight = highlights[i];
    try {
      console.log(`🎬 Extracting clip ${i + 1}/${highlights.length}...`);
      
      const clipPath = await extractClip(sourceVideo, highlight, outputDir, i);
      results.push({ 
        id: i, 
        path: clipPath, 
        start: highlight.start, 
        end: highlight.end,
        score: highlight.viralScore 
      });
      
      console.log(`✅ Clip ${i + 1} created: ${clipPath}`);
    } catch (error) {
      console.error(`❌ Clip ${i + 1} failed: ${error.message}`);
    }
  }
  
  console.log(`🎉 Extraction complete - ${results.length}/${highlights.length} clips created`);
  process.send({ type: 'extraction_complete', clips: results });
}

const params = JSON.parse(process.argv[2]);
run(params);
