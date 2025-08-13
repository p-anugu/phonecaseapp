const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const ImageToDxfPipeline = require('./utils/pipelines/image-to-dxf-pipeline');

const app = express();
const port = 3000;
const pipeline = new ImageToDxfPipeline();

// Add JSON body parser
app.use(express.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedMimes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp'];
    const allowedExts = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.bmp'];
    
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (SVG, PNG, JPG, GIF, BMP)'));
    }
  }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// Import phone case API
const phoneCaseApi = require('./api/phone-case');
app.use(phoneCaseApi);

// Import AI generation API
const aiGenerateApi = require('./api/generate-and-convert');
app.use('/api', aiGenerateApi);

app.get('/', (req, res) => {
  res.redirect('/ai-generator');
});

app.get('/phone-case-designer', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'phone-case-designer.html'));
});

app.get('/ai-generator', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'ai-generator.html'));
});

app.post('/convert', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const fileExt = path.extname(inputPath).toLowerCase();
  let outputPath = inputPath.replace(/\.[^/.]+$/, '.dxf');
  
  try {
    if (fileExt === '.svg') {
      // Direct SVG to DXF conversion
      const command = `inkscape "${inputPath}" --export-type=dxf --export-filename="${outputPath}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          fs.unlinkSync(inputPath);
          return res.status(500).json({ error: 'Conversion failed. Make sure Inkscape is installed.' });
        }
        
        res.download(outputPath, path.basename(outputPath), (err) => {
          fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        });
      });
    } else {
      // Image to DXF pipeline
      const options = {
        threshold: parseInt(req.body?.threshold) || 50,
        preserveColors: req.body?.preserveColors === 'true',
        colors: parseInt(req.body?.colors) || 8
      };
      
      const result = await pipeline.convert(inputPath, outputPath, options);
      
      res.download(outputPath, path.basename(outputPath), (err) => {
        fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      });
    }
  } catch (error) {
    console.error('Conversion error:', error);
    
    // Cleanup
    try {
      fs.unlinkSync(inputPath);
    } catch (e) {}
    
    return res.status(500).json({ error: 'Conversion failed: ' + error.message });
  }
});

app.listen(port, () => {
  console.log(`SVG to DXF converter running at http://localhost:${port}`);
});