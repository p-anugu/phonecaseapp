#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function convertImageToDxf(inputImagePath, outputDxfPath) {
    console.log('Converting image to DXF...');
    
    // Target dimensions: 60mm x 60mm
    const targetSize = 907; // 4x for quality (227px * 4)
    
    // Step 1: Convert image to PBM (monochrome) with correct aspect ratio
    const pbmPath = inputImagePath.replace(path.extname(inputImagePath), '_preprocessed.pbm');
    console.log('Preprocessing image with target dimensions...');
    // First resize to fit within bounds, then pad with white background
    execSync(`convert "${inputImagePath}" -resize ${targetSize}x${targetSize} -background white -gravity center -extent ${targetSize}x${targetSize} -colorspace Gray -threshold 50% -type bilevel "${pbmPath}"`);
    
    // Step 2: Vectorize to SVG using potrace with size units
    const svgPath = inputImagePath.replace(path.extname(inputImagePath), '_vectorized.svg');
    console.log('Vectorizing image...');
    execSync(`potrace "${pbmPath}" -s -o "${svgPath}" --width 60mm --height 60mm`);
    
    // Step 3: Convert SVG to DXF using Inkscape
    console.log('Converting SVG to DXF with Inkscape...');
    execSync(`inkscape "${svgPath}" --export-type=dxf --export-filename="${outputDxfPath}"`);
    
    console.log(`DXF file saved to: ${outputDxfPath}`);
    console.log('DXF dimensions: 60mm x 60mm');
    
    // Cleanup temporary files
    fs.unlinkSync(pbmPath);
    console.log('Keeping SVG file for reference:', svgPath);
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node simple-image-to-dxf.js <input-image> <output-dxf>');
        console.log('Example: node simple-image-to-dxf.js ai-art.png output.dxf');
        process.exit(1);
    }
    
    const inputImage = args[0];
    const outputDxf = args[1];
    
    if (!fs.existsSync(inputImage)) {
        console.error(`Error: Input file "${inputImage}" not found`);
        process.exit(1);
    }
    
    try {
        convertImageToDxf(inputImage, outputDxf);
        console.log('Conversion complete!');
    } catch (error) {
        console.error('Error during conversion:', error.message);
        process.exit(1);
    }
}

module.exports = { convertImageToDxf };