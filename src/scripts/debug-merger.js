#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get latest generated files
const generatedDir = path.join(__dirname, 'public', 'generated');
const files = fs.readdirSync(generatedDir);

// Find the latest AI generated SVG and its phone case version
const aiSvgs = files.filter(f => f.match(/ai-generated-\d+\.svg$/)).sort();
const phoneCaseSvgs = files.filter(f => f.match(/ai-generated-\d+-phone-case\.svg$/)).sort();

if (aiSvgs.length === 0) {
    console.log('No AI generated SVGs found');
    process.exit(1);
}

const latestAI = aiSvgs[aiSvgs.length - 1];
const latestPhoneCase = phoneCaseSvgs[phoneCaseSvgs.length - 1];

console.log('Latest AI SVG:', latestAI);
console.log('Latest Phone Case SVG:', latestPhoneCase);

// Read the AI SVG
const aiSvgPath = path.join(generatedDir, latestAI);
const aiSvg = fs.readFileSync(aiSvgPath, 'utf8');

console.log('\n=== AI SVG Structure ===');
console.log('First 500 chars:', aiSvg.substring(0, 500));

// Check what we're extracting
const gMatch = aiSvg.match(/<g[^>]*transform[^>]*>([\s\S]*?)<\/g>/);
if (gMatch) {
    console.log('\nFound <g> content, first 300 chars:', gMatch[1].substring(0, 300));
    console.log('Total content length:', gMatch[1].length);
} else {
    console.log('\nNo <g> match found!');
}

// Check phone case SVG if it exists
if (latestPhoneCase) {
    const phoneCasePath = path.join(generatedDir, latestPhoneCase);
    const phoneCaseSvg = fs.readFileSync(phoneCasePath, 'utf8');
    
    // Check if AI design is in there
    const hasAIComment = phoneCaseSvg.includes('<!-- AI Generated Design -->');
    const hasAIGroup = phoneCaseSvg.includes('id="ai-design"');
    
    console.log('\n=== Phone Case SVG Check ===');
    console.log('Has AI comment:', hasAIComment);
    console.log('Has AI group:', hasAIGroup);
    
    if (hasAIComment) {
        // Extract the AI section
        const aiStart = phoneCaseSvg.indexOf('<!-- AI Generated Design -->');
        const aiSection = phoneCaseSvg.substring(aiStart, aiStart + 500);
        console.log('\nAI Section in phone case:', aiSection);
    }
}

// Create a simple test merge
console.log('\n=== Creating Test Merge ===');
const template = fs.readFileSync(path.join(__dirname, 'Iphone12_BackOfCaseSVG.SVG'), 'utf8');

// Create a simple visible rectangle as test
const testDesign = '<rect x="0" y="0" width="100" height="100" fill="red" stroke="black" stroke-width="2"/>';

const testMerge = template.replace('</svg>', 
    '\n<!-- TEST RECTANGLE -->\n' +
    '<g transform="translate(500, 700)">\n' +
    testDesign + '\n' +
    '</g>\n' +
    '</svg>');

fs.writeFileSync('debug-test-merge.svg', testMerge);
console.log('Created debug-test-merge.svg with a red rectangle');

// Now test with actual design
const actualMerge = template.replace('</svg>', 
    '\n<!-- AI Generated Design -->\n' +
    '<g transform="translate(500, 700) scale(2)">\n' +
    (gMatch ? gMatch[1] : '<text>NO DESIGN FOUND</text>') + '\n' +
    '</g>\n' +
    '</svg>');

fs.writeFileSync('debug-actual-merge.svg', actualMerge);
console.log('Created debug-actual-merge.svg with actual AI design');