require('dotenv').config();
const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure output directories exist
const outputDir = path.join(__dirname, '..', '..', 'output');
const publicDir = path.join(__dirname, '..', '..', 'public', 'generated');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

function enhancePromptForLineArt(originalPrompt) {
    // Concise, effective prompt for line art symbols
    const lineArtInstructions = "Centered minimalist black continuous line art symbol. Single unbroken black path on a plain white background. Clean vector-style drawing with no shading, no gradients, and no fills. Balanced and symmetrical composition. Very simple, geometric design suitable for SVG conversion or laser cutting. Like a modern icon or abstract logo outline.";
    
    // Remove words that might create complexity
    const simplifiedPrompt = originalPrompt
        .replace(/realistic|detailed|complex|shaded|3d|photorealistic|textured/gi, 'simple')
        .replace(/colorful|colored|multicolor/gi, 'black line');
    
    const enhancedPrompt = `${lineArtInstructions} Subject: ${simplifiedPrompt}`;
    
    console.log('Original prompt:', originalPrompt);
    console.log('Enhanced prompt:', enhancedPrompt);
    
    return enhancedPrompt;
}

async function generateImage(apiKey, prompt, size = '1024x1024') {
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
                    'Authorization': `Bearer ${apiKey}`,
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

function convertImageToDxf(inputImagePath, outputDxfPath, outputSvgPath) {
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
    console.log('Vectorizing image...');
    execSync(`potrace "${pbmPath}" -s -o "${outputSvgPath}" --width 60mm --height 60mm`);
    
    // Step 3: Convert SVG to DXF using Inkscape
    console.log('Converting SVG to DXF with Inkscape...');
    execSync(`inkscape "${outputSvgPath}" --export-type=dxf --export-filename="${outputDxfPath}"`);
    
    console.log(`DXF file saved to: ${outputDxfPath}`);
    console.log('DXF dimensions: 60mm x 60mm');
    
    // Cleanup temporary files
    fs.unlinkSync(pbmPath);
}

// Get OpenAI API key from environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY is not set in .env file');
}

router.post('/generate-and-convert', async (req, res) => {
    try {
        const { prompt, size, includePhoneCase } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        if (!OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API key not configured on server' });
        }
        
        const apiKey = OPENAI_API_KEY;
        
        const timestamp = Date.now();
        const filename = `ai-generated-${timestamp}`;
        
        // File paths
        const tempImagePath = path.join(outputDir, `${filename}.png`);
        const svgPath = path.join(publicDir, `${filename}.svg`);
        const dxfPath = path.join(publicDir, `${filename}.dxf`);
        const finalImagePath = path.join(publicDir, `${filename}.png`);
        
        // Generate image with DALL-E
        const imageUrl = await generateImage(apiKey, prompt, size);
        
        // Download the image
        await downloadImage(imageUrl, tempImagePath);
        console.log('Image downloaded successfully');
        
        // Convert to DXF
        convertImageToDxf(tempImagePath, dxfPath, svgPath);
        
        // Copy original image to public directory
        fs.copyFileSync(tempImagePath, finalImagePath);
        
        // Clean up temp file
        fs.unlinkSync(tempImagePath);
        
        // If phone case is requested, create merged version
        let phoneCaseSvgUrl = null;
        let phoneCaseDxfUrl = null;
        
        if (includePhoneCase) {
            // Clear module cache to ensure we get the latest version
            delete require.cache[require.resolve('../utils/mergers/svg-phone-case-merger')];
            delete require.cache[require.resolve('../utils/mergers/fix-merger')];
            
            const { mergeDesignWithPhoneCase, convertSvgToDxf } = require('../utils/mergers/svg-phone-case-merger');
            const phoneCaseSvgPath = path.join(publicDir, `${filename}-phone-case.svg`);
            const phoneCaseDxfPath = path.join(publicDir, `${filename}-phone-case.dxf`);
            
            // Merge design with phone case
            mergeDesignWithPhoneCase(svgPath, phoneCaseSvgPath);
            
            // Convert merged SVG to DXF
            convertSvgToDxf(phoneCaseSvgPath, phoneCaseDxfPath);
            
            phoneCaseSvgUrl = `/generated/${filename}-phone-case.svg`;
            phoneCaseDxfUrl = `/generated/${filename}-phone-case.dxf`;
        }
        
        // Return URLs for the client
        res.json({
            success: true,
            filename: filename,
            imageUrl: `/generated/${filename}.png`,
            svgUrl: `/generated/${filename}.svg`,
            dxfUrl: `/generated/${filename}.dxf`,
            phoneCaseSvgUrl: phoneCaseSvgUrl,
            phoneCaseDxfUrl: phoneCaseDxfUrl
        });
        
    } catch (error) {
        console.error('Error:', error);
        
        if (error.response?.status === 401) {
            res.status(401).json({ error: 'Invalid API key. Please check your OpenAI API key.' });
        } else if (error.response?.data?.error) {
            res.status(400).json({ error: error.response.data.error.message });
        } else {
            res.status(500).json({ error: 'Failed to generate and convert image' });
        }
    }
});

module.exports = router;