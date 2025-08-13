#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// Get OpenAI API key from environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is not set');
    console.error('Please set it using: export OPENAI_API_KEY="your-api-key-here"');
    process.exit(1);
}

function enhancePromptForLineArt(originalPrompt) {
    // Always prepend instructions for simple line art
    const lineArtInstructions = [
        "Simple minimalist black line art drawing",
        "Clean vector-style illustration", 
        "Single black lines on white background",
        "No shading, no gradients, no fills",
        "Suitable for laser cutting or CNC",
        "Single image",
        "Like a coloring book outline"
    ].join(", ");
    
    // Remove words that might create complexity
    const simplifiedPrompt = originalPrompt
        .replace(/realistic|detailed|complex|shaded|3d|photorealistic|textured/gi, 'simple')
        .replace(/colorful|colored|multicolor/gi, 'black line');
    
    const enhancedPrompt = `${lineArtInstructions}: ${simplifiedPrompt}`;
    
    console.log('Original prompt:', originalPrompt);
    console.log('Enhanced prompt:', enhancedPrompt);
    
    return enhancedPrompt;
}

async function generateImage(prompt, size = '1024x1024') {
    console.log('Generating AI image with DALL-E...');
    
    // Enhance prompt for line art
    const enhancedPrompt = enhancePromptForLineArt(prompt);
    
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/images/generations',
            {
                model: 'dall-e-3',
                prompt: enhancedPrompt,
                n: 1,
                size: size,
                quality: 'standard',
                style: 'natural'
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data.data[0].url;
    } catch (error) {
        console.error('Error generating image:', error.response?.data || error.message);
        throw error;
    }
}

async function downloadImage(url, outputPath) {
    console.log('Downloading generated image...');
    
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

function convertImageToDxf(inputImagePath, outputDxfPath) {
    console.log('Converting image to DXF...');
    
    // Target dimensions: 60mm x 60mm
    // Using 96 DPI (standard SVG), 1mm = 3.7795275591 pixels
    // 60mm = 226.77px
    // We'll use a higher resolution for better quality, then scale in DXF
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

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node ai-generate-to-dxf.js "prompt" output.dxf');
        console.log('Example: node ai-generate-to-dxf.js "a simple geometric pattern" pattern.dxf');
        console.log('');
        console.log('Make sure to set your OpenAI API key:');
        console.log('export OPENAI_API_KEY="your-api-key-here"');
        process.exit(1);
    }
    
    const prompt = args[0];
    const outputDxf = args[1];
    const tempImage = `ai-generated-${Date.now()}.png`;
    
    try {
        // Generate image with DALL-E
        const imageUrl = await generateImage(prompt);
        
        // Download the image
        await downloadImage(imageUrl, tempImage);
        console.log('Image downloaded successfully');
        
        // Convert to DXF
        convertImageToDxf(tempImage, outputDxf);
        
        // Keep the original image for reference
        const finalImagePath = outputDxf.replace('.dxf', '_original.png');
        fs.renameSync(tempImage, finalImagePath);
        console.log('Original image saved as:', finalImagePath);
        
        console.log('Process complete!');
        console.log('Files created:');
        console.log('- DXF file:', outputDxf);
        console.log('- SVG file:', outputDxf.replace('.dxf', '_vectorized.svg'));
        console.log('- Original image:', finalImagePath);
        
    } catch (error) {
        console.error('Error:', error.message);
        // Cleanup temp file if it exists
        if (fs.existsSync(tempImage)) {
            fs.unlinkSync(tempImage);
        }
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}