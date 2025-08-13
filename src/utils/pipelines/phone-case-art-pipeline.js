const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const { exec } = require('child_process');
const { promisify } = require('util');
const FormData = require('form-data');

const execAsync = promisify(exec);

class PhoneCaseArtPipeline {
  constructor(openAIKey) {
    this.openAIKey = openAIKey;
    this.caseTemplatePath = path.join(__dirname, 'Iphone12_BackOfCaseSVG.SVG');
  }

  // Generate line art using DALL-E
  async generateLineArt(prompt, outputPath) {
    console.log('Generating line art with DALL-E...');
    
    const fullPrompt = `${prompt}, minimalist black and white line art, simple continuous lines, suitable for laser cutting, no shading, no fills, single color outline only`;
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: "dall-e-3",
          prompt: fullPrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          style: "natural"
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openAIKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const imageUrl = response.data.data[0].url;
      
      // Download the image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      await fs.writeFile(outputPath, imageResponse.data);
      
      console.log(`Line art saved to: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('DALL-E API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Convert the generated image to clean line art SVG
  async imageToLineArtSVG(imagePath, svgPath) {
    console.log('Converting to line art SVG...');
    
    // First, preprocess the image for better vectorization
    const processedPath = imagePath.replace('.png', '_processed.png');
    
    // Convert to high contrast black and white
    await sharp(imagePath)
      .grayscale()
      .threshold(128)
      .toFile(processedPath);
    
    // Convert to PBM for potrace
    const pbmPath = processedPath.replace('.png', '.pbm');
    await execAsync(`convert "${processedPath}" "${pbmPath}"`);
    
    // Use potrace to create clean line art SVG
    await execAsync(`potrace -s -o "${svgPath}" "${pbmPath}"`);
    
    // Clean up temp files
    await fs.unlink(processedPath).catch(() => {});
    await fs.unlink(pbmPath).catch(() => {});
    
    console.log('Line art SVG created');
    return svgPath;
  }

  // Combine line art with phone case template
  async combineWithCase(lineArtSvgPath, outputSvgPath) {
    console.log('Combining line art with phone case...');
    
    // Read the case template
    const caseContent = await fs.readFile(this.caseTemplatePath, 'utf8');
    
    // Extract case dimensions
    const widthMatch = caseContent.match(/width="([^"]+)"/);
    const heightMatch = caseContent.match(/height="([^"]+)"/);
    const caseWidth = parseFloat(widthMatch[1]);
    const caseHeight = parseFloat(heightMatch[1]);
    
    // Read line art SVG
    const lineArtContent = await fs.readFile(lineArtSvgPath, 'utf8');
    
    // Extract line art paths
    const pathMatches = lineArtContent.match(/<path[^>]*d="([^"]+)"[^>]*>/g) || [];
    
    // Calculate scaling and positioning for the line art
    // Place it in the center of the case, leaving margins
    const margin = 100; // pixels
    const artWidth = caseWidth - (2 * margin);
    const artHeight = caseHeight - (2 * margin);
    const scale = Math.min(artWidth / 1024, artHeight / 1024); // Assuming 1024x1024 DALL-E output
    
    // Create combined SVG
    let combinedSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${caseWidth}" 
     height="${caseHeight}" 
     viewBox="0 0 ${caseWidth} ${caseHeight}">
  
  <!-- Phone Case Outline -->
  <g id="phone-case">`;
    
    // Extract just the paths from the case template
    const casePaths = caseContent.match(/<path[^>]*>/g) || [];
    casePaths.forEach(path => {
      combinedSvg += '\n    ' + path;
    });
    
    combinedSvg += `
  </g>
  
  <!-- Line Art -->
  <g id="line-art" transform="translate(${margin}, ${margin}) scale(${scale})">`;
    
    // Add line art paths
    pathMatches.forEach(pathTag => {
      // Modify the path to ensure it's visible
      const modifiedPath = pathTag
        .replace(/fill="[^"]*"/, 'fill="none"')
        .replace(/stroke="[^"]*"/, 'stroke="#000000"')
        .replace(/stroke-width="[^"]*"/, 'stroke-width="2"');
      
      combinedSvg += '\n    ' + (modifiedPath.includes('stroke=') ? modifiedPath : pathTag.replace('>', ' stroke="#000000" stroke-width="2" fill="none">'));
    });
    
    combinedSvg += `
  </g>
</svg>`;
    
    await fs.writeFile(outputSvgPath, combinedSvg);
    console.log('Combined SVG created');
    return outputSvgPath;
  }

  // Convert final SVG to DXF
  async svgToDxf(svgPath, dxfPath) {
    console.log('Converting to DXF...');
    
    await execAsync(`inkscape "${svgPath}" --export-type=dxf --export-filename="${dxfPath}"`);
    
    console.log('DXF conversion complete');
    return dxfPath;
  }

  // Complete pipeline
  async generatePhoneCaseArt(prompt, outputName) {
    const timestamp = Date.now();
    const baseName = outputName || `phone-case-${timestamp}`;
    
    const paths = {
      dalleImage: path.join(__dirname, 'temp', `${baseName}-dalle.png`),
      lineArtSvg: path.join(__dirname, 'temp', `${baseName}-lineart.svg`),
      combinedSvg: path.join(__dirname, 'output', `${baseName}-combined.svg`),
      finalDxf: path.join(__dirname, 'output', `${baseName}-final.dxf`)
    };
    
    // Create directories
    await fs.mkdir(path.join(__dirname, 'temp'), { recursive: true });
    await fs.mkdir(path.join(__dirname, 'output'), { recursive: true });
    
    try {
      // 1. Generate line art with DALL-E
      await this.generateLineArt(prompt, paths.dalleImage);
      
      // 2. Convert to clean line art SVG
      await this.imageToLineArtSVG(paths.dalleImage, paths.lineArtSvg);
      
      // 3. Combine with phone case
      await this.combineWithCase(paths.lineArtSvg, paths.combinedSvg);
      
      // 4. Convert to DXF
      await this.svgToDxf(paths.combinedSvg, paths.finalDxf);
      
      // Clean up temp files
      await fs.unlink(paths.dalleImage).catch(() => {});
      await fs.unlink(paths.lineArtSvg).catch(() => {});
      
      console.log(`✓ Phone case art complete!`);
      console.log(`  SVG: ${paths.combinedSvg}`);
      console.log(`  DXF: ${paths.finalDxf}`);
      
      return {
        svg: paths.combinedSvg,
        dxf: paths.finalDxf
      };
      
    } catch (error) {
      // Clean up on error
      Object.values(paths).forEach(async (p) => {
        await fs.unlink(p).catch(() => {});
      });
      throw error;
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Usage: node phone-case-art-pipeline.js <OpenAI-API-Key> "<prompt>" [output-name]

Example:
  node phone-case-art-pipeline.js sk-... "geometric mandala pattern" mandala-case
  node phone-case-art-pipeline.js sk-... "minimalist mountain landscape"
  node phone-case-art-pipeline.js sk-... "abstract flowing lines"
    `);
    process.exit(1);
  }
  
  const [apiKey, prompt, outputName] = args;
  const pipeline = new PhoneCaseArtPipeline(apiKey);
  
  pipeline.generatePhoneCaseArt(prompt, outputName)
    .then(result => {
      console.log('Success!', result);
    })
    .catch(error => {
      console.error('Pipeline failed:', error.message);
      process.exit(1);
    });
}

module.exports = PhoneCaseArtPipeline;