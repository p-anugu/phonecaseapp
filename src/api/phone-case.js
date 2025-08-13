const express = require('express');
const multer = require('multer');
const PhoneCaseArtPipeline = require('../utils/pipelines/phone-case-art-pipeline');
const path = require('path');

const router = express.Router();
const upload = multer();

router.post('/api/generate-case-art', upload.none(), async (req, res) => {
  const { apiKey, prompt } = req.body;
  
  if (!apiKey || !prompt) {
    return res.status(400).json({ error: 'API key and prompt are required' });
  }
  
  // Set headers for SSE (Server-Sent Events)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    const pipeline = new PhoneCaseArtPipeline(apiKey);
    const timestamp = Date.now();
    const outputName = `case-${timestamp}`;
    
    // Override methods to send progress updates
    const originalGenerateLineArt = pipeline.generateLineArt.bind(pipeline);
    pipeline.generateLineArt = async (...args) => {
      sendUpdate({ step: 1, message: 'Generating line art with DALL-E...' });
      const result = await originalGenerateLineArt(...args);
      sendUpdate({ step: 1, complete: true });
      return result;
    };
    
    const originalImageToLineArtSVG = pipeline.imageToLineArtSVG.bind(pipeline);
    pipeline.imageToLineArtSVG = async (...args) => {
      sendUpdate({ step: 2, message: 'Converting to vector format...' });
      const result = await originalImageToLineArtSVG(...args);
      sendUpdate({ step: 2, complete: true });
      return result;
    };
    
    const originalCombineWithCase = pipeline.combineWithCase.bind(pipeline);
    pipeline.combineWithCase = async (...args) => {
      sendUpdate({ step: 3, message: 'Combining with phone case template...' });
      const result = await originalCombineWithCase(...args);
      sendUpdate({ step: 3, complete: true });
      return result;
    };
    
    const originalSvgToDxf = pipeline.svgToDxf.bind(pipeline);
    pipeline.svgToDxf = async (...args) => {
      sendUpdate({ step: 4, message: 'Converting to DXF...' });
      const result = await originalSvgToDxf(...args);
      sendUpdate({ step: 4, complete: true });
      return result;
    };
    
    const result = await pipeline.generatePhoneCaseArt(prompt, outputName);
    
    // Convert file paths to URLs
    const svgUrl = `/output/${path.basename(result.svg)}`;
    const dxfUrl = `/output/${path.basename(result.dxf)}`;
    
    sendUpdate({
      complete: true,
      svgPath: svgUrl,
      dxfPath: dxfUrl
    });
    
    res.end();
  } catch (error) {
    console.error('Generation error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Serve output files
router.use('/output', express.static(path.join(__dirname, 'output')));

module.exports = router;