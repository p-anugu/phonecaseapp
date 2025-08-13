const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class ImageToDxfPipeline {
  constructor(options = {}) {
    this.options = {
      // Preprocessing options
      threshold: options.threshold || 50,
      despeckle: options.despeckle || true,
      smooth: options.smooth || true,
      
      // Potrace options
      turnpolicy: options.turnpolicy || 'minority',
      turdsize: options.turdsize || 2,
      alphamax: options.alphamax || 1.0,
      
      // Color quantization for color images
      colors: options.colors || 8,
      
      // Output options
      keepIntermediateFiles: options.keepIntermediateFiles || false
    };
  }

  async preprocessImage(inputPath, outputPath) {
    console.log('Preprocessing image...');
    
    // Get image info
    const { stdout: imageInfo } = await execAsync(`identify -format "%w %h %[channels]" "${inputPath}"`);
    const [width, height, channels] = imageInfo.trim().split(' ');
    
    let command = `convert "${inputPath}"`;
    
    // Apply preprocessing based on image type
    if (channels === 'gray' || channels === 'graya') {
      // Grayscale image
      command += ` -threshold ${this.options.threshold}%`;
    } else {
      // Color image - apply posterization for better vectorization
      command += ` -posterize ${this.options.colors}`;
    }
    
    // Common preprocessing
    if (this.options.despeckle) {
      command += ' -despeckle';
    }
    
    if (this.options.smooth) {
      command += ' -median 2';
    }
    
    // Enhance edges for better tracing
    command += ' -morphology EdgeOut Diamond';
    
    // Convert to high-contrast black and white for potrace
    command += ` -colorspace Gray -threshold ${this.options.threshold}% -type bilevel`;
    
    // Output as PBM (Portable Bitmap) for potrace
    command += ` "${outputPath}"`;
    
    await execAsync(command);
    console.log('Preprocessing complete');
  }

  async traceToSvg(pbmPath, svgPath) {
    console.log('Tracing to SVG...');
    
    const potraceOptions = [
      `-t ${this.options.turdsize}`,
      `--turnpolicy ${this.options.turnpolicy}`,
      `--alphamax ${this.options.alphamax}`,
      '-s', // SVG output
      `-o "${svgPath}"`,
      `"${pbmPath}"`
    ].join(' ');
    
    await execAsync(`potrace ${potraceOptions}`);
    console.log('SVG tracing complete');
  }

  async traceColorImage(inputPath, svgPath) {
    console.log('Tracing color image to SVG...');
    
    // Create temporary directory for color separations
    const tempDir = path.join(path.dirname(inputPath), 'temp_colors');
    await fs.mkdir(tempDir, { recursive: true });
    
    try {
      // Extract unique colors
      const { stdout: colorsOutput } = await execAsync(
        `convert "${inputPath}" -posterize ${this.options.colors} -unique-colors -format "%c" histogram:info:`
      );
      
      const colors = colorsOutput.match(/#[0-9A-Fa-f]{6}/g) || [];
      console.log(`Found ${colors.length} unique colors`);
      
      // Create SVG with multiple paths for each color
      let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1">
  <g id="vectorized-image">`;
      
      // Process each color separately
      for (let i = 0; i < colors.length; i++) {
        const color = colors[i];
        const layerPath = path.join(tempDir, `layer_${i}.pbm`);
        const layerSvgPath = path.join(tempDir, `layer_${i}.svg`);
        
        // Extract color layer
        await execAsync(
          `convert "${inputPath}" -posterize ${this.options.colors} ` +
          `-fill white +opaque "${color}" -fill black -opaque "${color}" ` +
          `-type bilevel "${layerPath}"`
        );
        
        // Trace this layer
        await execAsync(`potrace -s -o "${layerSvgPath}" "${layerPath}"`);
        
        // Read SVG and extract path
        const layerSvg = await fs.readFile(layerSvgPath, 'utf8');
        const pathMatch = layerSvg.match(/<path[^>]*d="([^"]+)"/);
        
        if (pathMatch) {
          svgContent += `\n    <path fill="${color}" d="${pathMatch[1]}"/>`;
        }
      }
      
      svgContent += `\n  </g>\n</svg>`;
      
      await fs.writeFile(svgPath, svgContent);
      console.log('Color SVG tracing complete');
    } finally {
      // Cleanup temp directory
      if (!this.options.keepIntermediateFiles) {
        await execAsync(`rm -rf "${tempDir}"`);
      }
    }
  }

  async svgToDxf(svgPath, dxfPath) {
    console.log('Converting SVG to DXF...');
    
    await execAsync(`inkscape "${svgPath}" --export-type=dxf --export-filename="${dxfPath}"`);
    console.log('DXF conversion complete');
  }

  async convert(inputImagePath, outputDxfPath, options = {}) {
    const startTime = Date.now();
    const tempFiles = [];
    
    try {
      // Merge options
      const convertOptions = { ...this.options, ...options };
      
      // Generate temp file paths
      const baseName = path.basename(inputImagePath, path.extname(inputImagePath));
      const tempDir = path.dirname(inputImagePath);
      const pbmPath = path.join(tempDir, `${baseName}_preprocessed.pbm`);
      const svgPath = path.join(tempDir, `${baseName}_vectorized.svg`);
      
      tempFiles.push(pbmPath, svgPath);
      
      // Determine if image is color or grayscale
      const { stdout: colorspace } = await execAsync(
        `identify -format "%[colorspace]" "${inputImagePath}"`
      );
      
      const isColor = !colorspace.toLowerCase().includes('gray');
      
      if (isColor && convertOptions.preserveColors) {
        // Color tracing workflow
        await this.traceColorImage(inputImagePath, svgPath);
      } else {
        // Standard black and white workflow
        await this.preprocessImage(inputImagePath, pbmPath);
        await this.traceToSvg(pbmPath, svgPath);
      }
      
      // Convert SVG to DXF
      await this.svgToDxf(svgPath, outputDxfPath);
      
      const endTime = Date.now();
      console.log(`✓ Pipeline complete in ${(endTime - startTime) / 1000}s`);
      console.log(`✓ Output saved to: ${outputDxfPath}`);
      
      return {
        success: true,
        outputPath: outputDxfPath,
        intermediateFiles: convertOptions.keepIntermediateFiles ? { pbmPath, svgPath } : null,
        duration: endTime - startTime
      };
      
    } catch (error) {
      console.error('Pipeline error:', error);
      throw error;
    } finally {
      // Cleanup intermediate files
      if (!this.options.keepIntermediateFiles) {
        for (const file of tempFiles) {
          try {
            await fs.unlink(file);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Usage: node image-to-dxf-pipeline.js <input-image> <output-dxf> [options]

Options:
  --threshold <0-100>     Threshold for black/white conversion (default: 50)
  --colors <number>       Number of colors for posterization (default: 8)
  --preserve-colors       Attempt to preserve colors in output
  --keep-files           Keep intermediate files
  --no-smooth            Disable smoothing
  --no-despeckle         Disable despeckling

Examples:
  node image-to-dxf-pipeline.js photo.jpg output.dxf
  node image-to-dxf-pipeline.js logo.png logo.dxf --threshold 70
  node image-to-dxf-pipeline.js art.png art.dxf --preserve-colors --colors 16
    `);
    process.exit(1);
  }
  
  const [inputPath, outputPath] = args;
  const options = {};
  
  // Parse options
  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--threshold':
        options.threshold = parseInt(args[++i]);
        break;
      case '--colors':
        options.colors = parseInt(args[++i]);
        break;
      case '--preserve-colors':
        options.preserveColors = true;
        break;
      case '--keep-files':
        options.keepIntermediateFiles = true;
        break;
      case '--no-smooth':
        options.smooth = false;
        break;
      case '--no-despeckle':
        options.despeckle = false;
        break;
    }
  }
  
  const pipeline = new ImageToDxfPipeline(options);
  
  pipeline.convert(inputPath, outputPath, options)
    .then(result => {
      console.log('Success!', result);
    })
    .catch(error => {
      console.error('Failed:', error.message);
      process.exit(1);
    });
}

module.exports = ImageToDxfPipeline;