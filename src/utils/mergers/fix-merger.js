#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function mergeDesignWithPhoneCase(designSvgPath, outputPath) {
    console.log('Merging design with iPhone 12 case template...');
    
    // Read both files
    const templatePath = path.join(__dirname, '..', '..', 'assets', 'templates', 'Iphone12_BackOfCaseSVG.SVG');
    const templateSvg = fs.readFileSync(templatePath, 'utf8');
    const designSvg = fs.readFileSync(designSvgPath, 'utf8');
    
    // Parse the potrace SVG properly
    // Potrace creates: <g transform="translate(0,170) scale(0.018,-0.018)" fill="#000000" stroke="none">
    const gMatch = designSvg.match(/<g[^>]*transform="[^"]*"[^>]*fill="#000000"[^>]*>([\s\S]*?)<\/g>/);
    
    if (!gMatch) {
        console.error('Could not find design group with fill="#000000"');
        return null;
    }
    
    // Get the transform and paths
    const transformMatch = designSvg.match(/transform="([^"]*)"/);
    const fillMatch = designSvg.match(/fill="([^"]*)"/);
    
    const originalTransform = transformMatch ? transformMatch[1] : '';
    const fillColor = fillMatch ? fillMatch[1] : '#000000';
    
    console.log('Original transform:', originalTransform);
    console.log('Fill color:', fillColor);
    
    // Extract just the path data
    const paths = gMatch[1].match(/<path[^>]*d="[^"]*"[^>]*\/>/g) || [];
    console.log(`Found ${paths.length} paths`);
    
    // Extract viewBox to get design dimensions
    const viewBoxMatch = designSvg.match(/viewBox="0 0 ([\d\.]+) ([\d\.]+)"/);
    let designWidth = 170.078740; // default for 60mm designs
    let designHeight = 170.078740;
    
    if (viewBoxMatch) {
        designWidth = parseFloat(viewBoxMatch[1]);
        designHeight = parseFloat(viewBoxMatch[2]);
        console.log(`Design dimensions from viewBox: ${designWidth} x ${designHeight}`);
    }
    
    // Calculate center offset based on actual design size
    const offsetX = -(designWidth / 2);
    const offsetY = -(designHeight / 2);
    console.log(`Center offset: (${offsetX}, ${offsetY})`);
    
    // Position on phone case - center it properly
    // Phone case dimensions: 1058.56px × 1496.32px
    // Center point: 529.28px × 748.16px
    const centerX = 529;
    const centerY = 748;
    
    // Scale adjustment for 60mm designs
    const scale = 4; // 4x scale - smaller and more reasonable size
    console.log(`Using scale: ${scale}x`);
    
    // Build the design group with proper attributes
    const designGroup = `
  <!-- AI Generated Design -->
  <g id="ai-design" transform="translate(${centerX}, ${centerY})">
    <g transform="scale(${scale}) translate(${offsetX}, ${offsetY})">
      <g ${originalTransform ? `transform="${originalTransform}"` : ''} fill="${fillColor}" stroke="none">
        ${paths.join('\n        ')}
      </g>
    </g>
  </g>`;
    
    // Insert before closing tag
    const insertPoint = templateSvg.lastIndexOf('</svg>');
    const mergedSvg = templateSvg.slice(0, insertPoint) + designGroup + '\n</svg>';
    
    // Save
    fs.writeFileSync(outputPath, mergedSvg);
    console.log(`Saved to: ${outputPath}`);
    
    return outputPath;
}

// Clear require cache to ensure updated code is loaded
delete require.cache[require.resolve('./fix-merger')];

// Update the main merger
const mainMergerPath = path.join(__dirname, 'svg-phone-case-merger.js');
const updatedMerger = `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { mergeDesignWithPhoneCase } = require('./fix-merger');

module.exports = { mergeDesignWithPhoneCase, convertSvgToDxf };

function convertSvgToDxf(svgPath, dxfPath) {
    console.log('Converting SVG to DXF...');
    execSync(\`inkscape "\${svgPath}" --export-type=dxf --export-filename="\${dxfPath}"\`);
    console.log(\`DXF file saved to: \${dxfPath}\`);
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
}`;

fs.writeFileSync(mainMergerPath, updatedMerger);
console.log('Updated main merger to use fixed version');

module.exports = { mergeDesignWithPhoneCase };

// Test if run directly
if (require.main === module) {
    const testDesign = '/home/pree/phonecaseapp/svg-to-dxf-demo/public/generated/ai-generated-1753825742819.svg';
    mergeDesignWithPhoneCase(testDesign, 'test-fixed-merge.svg');
}