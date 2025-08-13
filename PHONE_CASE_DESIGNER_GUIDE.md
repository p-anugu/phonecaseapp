# AI Phone Case Designer Guide

This tool creates custom iPhone 12 case designs using DALL-E to generate line art, then combines it with the case template and converts to DXF for manufacturing.

## Setup

1. Make sure the server is running:
```bash
npm start
```

2. Navigate to the Phone Case Designer:
```
http://localhost:3000/phone-case-designer
```

## Usage

### 1. Enter OpenAI API Key
- Get your API key from https://platform.openai.com/api-keys
- The key is saved locally in your browser (not on server)

### 2. Enter Design Prompt
Examples:
- "minimalist geometric pattern with circles and triangles"
- "abstract flowing lines inspired by water"
- "mandala design with intricate details"
- "zen circle with organic shapes"
- "tribal pattern with repeating elements"

### 3. Generate Design
Click "Generate Phone Case Design" and watch the progress:
1. DALL-E generates the line art
2. Image is converted to clean vectors
3. Combined with iPhone 12 case template
4. Converted to DXF for laser cutting/CNC

### 4. Download Files
- **SVG**: For editing in Illustrator/Inkscape
- **DXF**: For manufacturing (laser cutting, CNC)

## Command Line Usage

```bash
# Basic usage
node phone-case-art-pipeline.js <API-KEY> "<prompt>" [output-name]

# Examples
node phone-case-art-pipeline.js sk-... "geometric mandala" mandala-case
node phone-case-art-pipeline.js sk-... "minimalist waves"
```

## File Structure

```
output/
├── case-*-combined.svg    # Final design with case outline
└── case-*-final.dxf       # Manufacturing-ready file

temp/
├── case-*-dalle.png       # Original DALL-E image
└── case-*-lineart.svg     # Vectorized line art
```

## Tips for Best Results

1. **Keep prompts simple**: Focus on line art, patterns, and geometric designs
2. **Add style hints**: "minimalist", "continuous line", "single stroke"
3. **Avoid complexity**: DALL-E works best with clear, simple concepts
4. **Think manufacturing**: Designs should work as cut lines

## Customization

Edit `phone-case-art-pipeline.js` to:
- Adjust margins and positioning
- Change line thickness
- Modify the vectorization threshold
- Add different phone case templates

## Troubleshooting

### "DALL-E API error"
- Check your API key is valid
- Ensure you have credits in your OpenAI account

### "Conversion failed"
- Make sure Inkscape is installed
- Check that ImageMagick and Potrace are available

### Poor quality vectors
- Try different prompts focusing on "line art"
- Adjust the threshold in the pipeline
- Use simpler, more geometric designs