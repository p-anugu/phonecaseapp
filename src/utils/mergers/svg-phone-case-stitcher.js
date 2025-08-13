#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Phone case dimensions (in mm)
const PHONE_CASES = {
    'iphone14': { width: 71.5, height: 146.7, name: 'iPhone 14' },
    'iphone14pro': { width: 71.5, height: 147.5, name: 'iPhone 14 Pro' },
    'iphone14plus': { width: 78.1, height: 160.8, name: 'iPhone 14 Plus' },
    'iphone14promax': { width: 77.6, height: 160.7, name: 'iPhone 14 Pro Max' },
    'samsung-s23': { width: 70.9, height: 146.3, name: 'Samsung S23' },
    'samsung-s23plus': { width: 76.2, height: 157.8, name: 'Samsung S23+' },
    'samsung-s23ultra': { width: 78.1, height: 163.4, name: 'Samsung S23 Ultra' }
};

function createPhoneCaseSVG(phoneModel, designSvgPath, outputPath) {
    const phone = PHONE_CASES[phoneModel];
    if (!phone) {
        throw new Error(`Unknown phone model: ${phoneModel}`);
    }

    // Read the design SVG
    const designSvg = fs.readFileSync(designSvgPath, 'utf8');
    
    // Extract the design content (everything inside the main <g> tag)
    const designMatch = designSvg.match(/<g[^>]*>([\s\S]*?)<\/g>/);
    if (!designMatch) {
        throw new Error('Could not extract design from SVG');
    }
    const designContent = designMatch[1];

    // Calculate positioning (center the 100x100mm design on the phone case)
    const designSize = 100; // Our designs are 100x100mm
    const centerX = (phone.width - designSize) / 2;
    const centerY = (phone.height - designSize) / 2;

    // Add margins for the case edges (5mm on each side)
    const caseMargin = 5;
    const totalWidth = phone.width + (caseMargin * 2);
    const totalHeight = phone.height + (caseMargin * 2);

    // Create the combined SVG
    const combinedSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${totalWidth}mm" height="${totalHeight}mm" 
     viewBox="0 0 ${totalWidth} ${totalHeight}" 
     xmlns="http://www.w3.org/2000/svg">
  
  <!-- Phone case outline -->
  <g id="phone-case">
    <rect x="${caseMargin}" y="${caseMargin}" 
          width="${phone.width}" height="${phone.height}" 
          fill="none" stroke="#0000FF" stroke-width="0.5" rx="8" ry="8"/>
    
    <!-- Camera cutout (example - adjust for specific models) -->
    <rect x="${caseMargin + 5}" y="${caseMargin + 5}" 
          width="20" height="20" 
          fill="none" stroke="#0000FF" stroke-width="0.5" rx="3" ry="3"/>
  </g>
  
  <!-- Centered design -->
  <g id="design" transform="translate(${centerX + caseMargin}, ${centerY + caseMargin})">
    <rect x="0" y="0" width="${designSize}" height="${designSize}" 
          fill="none" stroke="#00FF00" stroke-width="0.1" stroke-dasharray="2,2"/>
    ${designContent}
  </g>
  
  <!-- Cut lines (red) for the laser cutter -->
  <g id="cut-lines">
    <rect x="${caseMargin}" y="${caseMargin}" 
          width="${phone.width}" height="${phone.height}" 
          fill="none" stroke="#FF0000" stroke-width="0.1" rx="8" ry="8"/>
  </g>
</svg>`;

    // Save the combined SVG
    fs.writeFileSync(outputPath, combinedSvg);
    console.log(`Phone case SVG saved to: ${outputPath}`);
    console.log(`Phone model: ${phone.name}`);
    console.log(`Case dimensions: ${totalWidth}mm x ${totalHeight}mm`);
    console.log(`Design centered at: ${centerX + caseMargin}mm, ${centerY + caseMargin}mm`);

    return outputPath;
}

function convertSvgToDxf(svgPath, dxfPath) {
    console.log('Converting SVG to DXF...');
    execSync(`inkscape "${svgPath}" --export-type=dxf --export-filename="${dxfPath}"`);
    console.log(`DXF file saved to: ${dxfPath}`);
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.log('Usage: node svg-phone-case-stitcher.js <phone-model> <design.svg> <output>');
        console.log('');
        console.log('Available phone models:');
        Object.entries(PHONE_CASES).forEach(([key, phone]) => {
            console.log(`  ${key} - ${phone.name} (${phone.width}x${phone.height}mm)`);
        });
        console.log('');
        console.log('Example: node svg-phone-case-stitcher.js iphone14pro design.svg phone-case.svg');
        console.log('         node svg-phone-case-stitcher.js iphone14pro design.svg phone-case.dxf');
        process.exit(1);
    }
    
    const phoneModel = args[0];
    const designPath = args[1];
    const outputPath = args[2];
    
    try {
        // Create the phone case SVG
        const svgPath = outputPath.endsWith('.dxf') 
            ? outputPath.replace('.dxf', '.svg') 
            : outputPath;
            
        createPhoneCaseSVG(phoneModel, designPath, svgPath);
        
        // Convert to DXF if requested
        if (outputPath.endsWith('.dxf')) {
            convertSvgToDxf(svgPath, outputPath);
        }
        
        console.log('Done!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

module.exports = { createPhoneCaseSVG, convertSvgToDxf };