#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { mergeDesignWithPhoneCase } = require('./fix-merger');

module.exports = { mergeDesignWithPhoneCase, convertSvgToDxf };

function convertSvgToDxf(svgPath, dxfPath) {
    console.log('Converting SVG to DXF...');
    execSync(`inkscape "${svgPath}" --export-type=dxf --export-filename="${dxfPath}"`);
    console.log(`DXF file saved to: ${dxfPath}`);
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node svg-phone-case-merger.js <design.svg> <output>');
        process.exit(1);
    }
    
    const designPath = args[0];
    const outputPath = args[1];
    
    try {
        const svgPath = outputPath.endsWith('.dxf') 
            ? outputPath.replace('.dxf', '.svg') 
            : outputPath;
            
        mergeDesignWithPhoneCase(designPath, svgPath);
        
        if (outputPath.endsWith('.dxf')) {
            convertSvgToDxf(svgPath, outputPath);
        }
        
        console.log('Done!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}