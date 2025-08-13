#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function simpleMerge(designPath, outputPath) {
    console.log('Simple SVG merge...');
    
    // Read both files
    const templatePath = path.join(__dirname, 'Iphone12_BackOfCaseSVG.SVG');
    const template = fs.readFileSync(templatePath, 'utf8');
    const design = fs.readFileSync(designPath, 'utf8');
    
    // Extract just the paths from the design SVG
    const designPaths = design.match(/<path[^>]*d="[^"]*"[^>]*>/g) || [];
    console.log(`Found ${designPaths.length} paths in design`);
    
    // Find where to insert (before closing </svg>)
    const insertPoint = template.lastIndexOf('</svg>');
    
    // Center the design on the phone (roughly)
    const centerX = 529;  // Half of template width
    const centerY = 748;  // Half of template height
    
    // Insert the design
    const merged = template.slice(0, insertPoint) + 
        '\n<!-- AI Design -->\n' +
        '<g transform="translate(' + centerX + ',' + centerY + ') scale(2)">\n' +
        '  <g transform="translate(-150,-150)">\n' +  // Center 60mm design
        designPaths.join('\n') + 
        '\n  </g>\n' +
        '</g>\n' +
        '</svg>';
    
    fs.writeFileSync(outputPath, merged);
    console.log('Done! Saved to:', outputPath);
}

// Run it
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node simple-svg-merger.js <design.svg> <output.svg>');
    process.exit(1);
}

simpleMerge(args[0], args[1]);