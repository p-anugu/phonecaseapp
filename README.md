# Phone Case Designer App

A comprehensive Node.js application for designing custom phone cases with AI-generated art. Convert images and designs to DXF format for laser cutting and manufacturing.

## Features

- **AI Art Generation**: Generate custom designs using DALL-E integration
- **Phone Case Templates**: Pre-configured iPhone 12 case template with precise dimensions
- **Image to DXF Pipeline**: 
  - Convert raster images (PNG, JPG) to vectorized SVG
  - Export to DXF format for CAD/laser cutting
- **Web Interface**: User-friendly interface with drag-and-drop support
- **Multiple Conversion Options**:
  - Direct SVG to DXF conversion
  - Image vectorization with adjustable parameters
  - Phone case design merging

## Prerequisites

```bash
# Required system tools
sudo apt-get install inkscape potrace imagemagick

# Node.js (v18 or higher recommended)
node --version
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/p-anugu/phonecaseapp.git
cd phonecaseapp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key for AI generation features
```

## Usage

### Start the Application

```bash
npm start
```

The app will be available at `http://localhost:3000`

### Features Available

1. **AI Generator** (`/ai-generator`): Generate custom designs with AI
2. **Phone Case Designer** (`/phone-case-designer`): Design phone cases with templates
3. **SVG/Image Upload**: Convert existing designs to DXF

## Project Structure

```
src/
├── index.js                 # Main Express server
├── api/                     # API endpoints
│   ├── phone-case.js
│   ├── generate-and-convert.js
│   └── phone-case-stitch.js
├── utils/                   # Utility functions
│   ├── pipelines/          # Processing pipelines
│   ├── mergers/            # SVG merging utilities
│   └── converters/         # Format converters
├── components/             # React/TSX components
├── scripts/                # Utility scripts
└── assets/                 # Static assets
    └── templates/          # Phone case templates

public/                     # Static files and generated outputs
├── ai-generator.html
├── phone-case-designer.html
└── generated/             # AI-generated designs
```

## API Endpoints

- `POST /api/generate-and-convert` - Generate AI art and convert to DXF
- `POST /api/generate-case-art` - Generate phone case art with AI
- `POST /convert` - Convert uploaded SVG/image to DXF
- `POST /stitch-phone-case` - Merge design with phone case template

## Technologies Used

- **Backend**: Node.js, Express
- **Image Processing**: Sharp, ImageMagick, Potrace
- **AI Integration**: OpenAI DALL-E
- **Vector Processing**: Inkscape (SVG to DXF conversion)
- **File Handling**: Multer

## Output Specifications

- **Phone Case Dimensions**: iPhone 12 (146.7mm x 71.5mm)
- **DXF Format**: Compatible with laser cutters and CAD software
- **SVG Format**: Scalable vector graphics for editing
- **Design Area**: 60mm x 60mm centered on case back

## Environment Variables

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Contributing

Feel free to submit issues and pull requests.

## License

MIT

## Author

p-anugu