const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { createPhoneCaseSVG, convertSvgToDxf } = require('../utils/mergers/svg-phone-case-stitcher');

// Ensure output directory exists
const outputDir = path.join(__dirname, '..', '..', 'public', 'phone-cases');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

router.post('/stitch-phone-case', async (req, res) => {
    try {
        const { phoneModel, designUrl } = req.body;
        
        if (!phoneModel || !designUrl) {
            return res.status(400).json({ error: 'Phone model and design URL are required' });
        }
        
        // Extract filename from design URL
        const designFilename = path.basename(designUrl);
        const designPath = path.join(__dirname, '..', '..', 'public', designUrl.replace(/^\//, ''));
        
        if (!fs.existsSync(designPath)) {
            return res.status(404).json({ error: 'Design file not found' });
        }
        
        const timestamp = Date.now();
        const outputFilename = `phone-case-${phoneModel}-${timestamp}`;
        const svgPath = path.join(outputDir, `${outputFilename}.svg`);
        const dxfPath = path.join(outputDir, `${outputFilename}.dxf`);
        
        // Create phone case SVG
        createPhoneCaseSVG(phoneModel, designPath, svgPath);
        
        // Convert to DXF
        convertSvgToDxf(svgPath, dxfPath);
        
        // Return URLs
        res.json({
            success: true,
            phoneModel: phoneModel,
            svgUrl: `/phone-cases/${outputFilename}.svg`,
            dxfUrl: `/phone-cases/${outputFilename}.dxf`
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;