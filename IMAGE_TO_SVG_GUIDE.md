# Image to SVG Conversion with Inkscape

## Methods of Conversion

### 1. Command Line (Embedding Only)
```bash
# This embeds the raster image in SVG format
inkscape input.png --export-type=svg --export-filename=output.svg
```

### 2. Autotrace (Alternative Tool)
For command-line vectorization, use `autotrace`:
```bash
# Install autotrace
sudo apt-get install autotrace

# Convert image to SVG
autotrace -input-format png -output-format svg -output-file output.svg input.png
```

### 3. Potrace (Better Quality)
```bash
# Install potrace
sudo apt-get install potrace

# Convert to bitmap first, then trace
convert input.png input.pbm
potrace -s input.pbm -o output.svg
```

### 4. Using Inkscape GUI Features via Command Line
```bash
# This requires a more complex approach using Inkscape actions
inkscape input.png --actions="select-all;object-to-path;export-filename:output.svg;export-do"
```

## Node.js Implementation for Image to SVG

```javascript
const { exec } = require('child_process');
const path = require('path');

async function convertImageToSvg(inputPath, outputPath, method = 'potrace') {
  return new Promise((resolve, reject) => {
    let command;
    
    switch(method) {
      case 'embed':
        // Simple embedding
        command = `inkscape "${inputPath}" --export-type=svg --export-filename="${outputPath}"`;
        break;
        
      case 'potrace':
        // High-quality tracing (requires intermediate conversion)
        const pbmPath = inputPath.replace(path.extname(inputPath), '.pbm');
        command = `convert "${inputPath}" "${pbmPath}" && potrace -s "${pbmPath}" -o "${outputPath}"`;
        break;
        
      case 'autotrace':
        // Direct tracing
        command = `autotrace -input-format ${path.extname(inputPath).slice(1)} -output-format svg -output-file "${outputPath}" "${inputPath}"`;
        break;
        
      default:
        reject(new Error('Unknown conversion method'));
        return;
    }
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(outputPath);
      }
    });
  });
}
```

## Comparison of Methods

| Method | Quality | Speed | File Size | Use Case |
|--------|---------|-------|-----------|----------|
| Embed | N/A | Fast | Large | When you need SVG format but don't need vectors |
| Potrace | High | Medium | Small | Black & white logos, silhouettes |
| Autotrace | Medium | Fast | Medium | Color images, quick conversions |
| Manual Trace | Highest | Slow | Smallest | Professional work, precise control |

## Best Practices

1. **For Logos**: Use potrace with high-contrast preprocessing
2. **For Photos**: Consider if vectorization is appropriate (usually not)
3. **For Icons**: Use potrace or manual tracing
4. **For Complex Images**: Use Inkscape GUI for manual tracing

## Integration with the Converter

To add image-to-SVG conversion to the existing converter:

```typescript
// Add to the API route
if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
  // Convert to SVG first
  const svgPath = await convertImageToSvg(file.filepath, tempSvgPath, 'potrace');
  // Then convert SVG to DXF
  await execAsync(`inkscape "${svgPath}" --export-type=dxf --export-filename="${dxfPath}"`);
}
```