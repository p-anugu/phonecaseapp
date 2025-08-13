#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { JSDOM } = require('jsdom');
const { SVG, registerWindow } = require('@svgdotjs/svg.js');

// Create a virtual DOM
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
const window = dom.window;
const document = window.document;

// Register the window with svg.js
registerWindow(window, document);

function mergeDesignWithPhoneCase(designSvgPath, outputPath) {
    console.log('Merging SVGs using svg.js...');
    
    // Read the SVG files
    const templatePath = path.join(__dirname, 'Iphone12_BackOfCaseSVG.SVG');
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const designContent = fs.readFileSync(designSvgPath, 'utf8');
    
    // Create a new SVG canvas with template dimensions
    const canvas = SVG().size(1058.56, 1496.32);
    
    // Import the template SVG
    console.log('Loading phone case template...');
    try {
        // Parse template and add all its content
        const templateDiv = document.createElement('div');
        templateDiv.innerHTML = templateContent;
        const templateSvg = templateDiv.querySelector('svg');
        
        // Copy all children from template to canvas
        const templateChildren = Array.from(templateSvg.children);
        templateChildren.forEach(child => {
            const imported = canvas.svg(child.outerHTML);
        });
        
        console.log('Template loaded successfully');
    } catch (error) {
        console.error('Error loading template:', error);
    }
    
    // Import and position the design
    console.log('Loading AI design...');
    try {
        // Parse design SVG
        const designDiv = document.createElement('div');
        designDiv.innerHTML = designContent;
        const designSvg = designDiv.querySelector('svg');
        
        // Get the design's viewBox for proper scaling
        const viewBox = designSvg.getAttribute('viewBox');
        let designWidth = 226.77; // default 60mm
        let designHeight = 226.77;
        
        if (viewBox) {
            const [x, y, w, h] = viewBox.split(' ').map(Number);
            designWidth = w;
            designHeight = h;
        }
        
        // Create a group for the design
        const designGroup = canvas.group();
        
        // Position: center horizontally, below camera
        const phoneWidth = 658; // phoneRight - phoneLeft
        const centerX = 529; // center of template
        const centerY = 900; // below camera area
        
        // Scale to fit nicely on phone (about 200px wide)
        const targetSize = 200;
        const scale = targetSize / designWidth;
        
        // Apply transformations
        designGroup.translate(centerX - (designWidth * scale / 2), centerY - (designHeight * scale / 2));
        designGroup.scale(scale);
        
        // Import all paths from the design
        const paths = designSvg.querySelectorAll('path');
        paths.forEach(path => {
            const pathData = path.getAttribute('d');
            if (pathData) {
                const newPath = designGroup.path(pathData);
                
                // Copy attributes
                if (path.getAttribute('fill')) newPath.fill(path.getAttribute('fill'));
                if (path.getAttribute('stroke')) newPath.stroke(path.getAttribute('stroke'));
                if (path.getAttribute('stroke-width')) newPath.attr('stroke-width', path.getAttribute('stroke-width'));
            }
        });
        
        console.log(`Added ${paths.length} paths from design`);
        console.log(`Design positioned at (${centerX}, ${centerY}) with scale ${scale.toFixed(2)}`);
        
    } catch (error) {
        console.error('Error loading design:', error);
    }
    
    // Export the merged SVG
    const mergedSvg = canvas.svg();
    fs.writeFileSync(outputPath, mergedSvg);
    console.log(`Merged SVG saved to: ${outputPath}`);
    
    return outputPath;
}

function convertSvgToDxf(svgPath, dxfPath) {
    console.log('Converting SVG to DXF...');
    execSync(`inkscape "${svgPath}" --export-type=dxf --export-filename="${dxfPath}"`);
    console.log(`DXF file saved to: ${dxfPath}`);
}

// Export for use in other files
module.exports = { mergeDesignWithPhoneCase, convertSvgToDxf };

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node svg-merger-with-library.js <design.svg> <output>');
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