# Background Remover Tool

AI-powered and color-based background removal tool - Easy, Fast, Free

## Features

- **Dual Modes** - AI-powered automatic removal OR color-based removal
- **Preserves Text** - Color mode keeps text and logos intact
- **Batch Processing** - Process multiple images at once
- **Multiple Formats** - Supports WebP, PNG, JPG, BMP, GIF (input)
- **ZIP Output** - Package results into ZIP file
- **Fast** - Color mode processes in <1 second per image
- **Easy to Use** - Simple command-line interface and Windows batch file
- **Privacy First** - All processing happens on your device
- **Free & Open Source** - MIT License

## Background Removal Modes

### 🤖 AI Mode (Default)
Automatically detects and removes backgrounds using AI. Best for photos with complex backgrounds.

**Pros:**
- Fully automatic - no configuration needed
- Works with any background
- High quality for photos with people/objects

**Cons:**
- May remove text and logos
- Slower processing (2-5 seconds per image)
- Requires model download on first run (~30MB)

**Use Cases:** Portrait photos, product photography, general photos

### 🎨 Color Mode (New!)
Removes backgrounds based on color similarity. Best for solid-color backgrounds (blue screen, green screen, white background, etc.).

**Pros:**
- **Preserves text and logos** - Perfect for images with text!
- Much faster (<1 second per image)
- No AI model downloads needed
- Predictable and controllable results

**Cons:**
- Requires uniform background color
- Need to specify target color and threshold
- May need threshold tuning

**Use Cases:** Blue/green screen, studio photos with solid backgrounds, images with text overlays

## Quick Start

### Windows Users (Easiest)

1. **Install Node.js** (one-time setup)
   - Download from: https://nodejs.org/
   - Choose LTS version (recommended)
   - Install with default settings

2. **Put images in input folder**
   - Place your images (WebP, PNG, JPG, etc.) in the `input/` folder

3. **Run the tool**
   - Double-click `start-bg-remover.bat`
   - Wait for processing to complete
   - Find results in `output/` folder

**That's it!** The batch file handles everything automatically.

---

### Command Line Users

#### First Time Setup
```bash
npm install
```

#### AI Mode (Default - Automatic)
```bash
# Process all images in input/ folder (AI mode)
node bg-remover-cli.js

# Process single file (AI mode)
node bg-remover-cli.js photo.jpg

# Process and create ZIP file
node bg-remover-cli.js --zip
```

#### Color Mode (For images with text on solid backgrounds)
```bash
# Remove blue background (keeps text and people)
node bg-remover-cli.js --mode color --target-color "0,0,255" --threshold 50

# Remove white background
node bg-remover-cli.js --mode color --target-color "255,255,255" --threshold 60

# Remove green screen
node bg-remover-cli.js --mode color --target-color "0,255,0" --threshold 40

# Process single file with color mode
node bg-remover-cli.js image.jpg --mode color --target-color "50,100,170" --threshold 50

# With edge feathering for smoother results
node bg-remover-cli.js --mode color --target-color "0,0,255" --threshold 50 --feather 2
```

#### Other Options
```bash
# Custom input/output directories
node bg-remover-cli.js --input ./photos --output ./results

# Show help (see all options)
node bg-remover-cli.js --help
```

---

## Folder Structure

```
bg-remover/
├── input/              ← Put your images here
├── output/             ← Results saved here (auto-created)
├── bg-remover-cli.js   ← Main CLI tool
├── bg-remover-core.js  ← Core processing logic
├── start-bg-remover.bat ← Windows launcher (double-click)
└── README.md           ← This file
```

---

## Command Line Options

### Basic Options
```
-i, --input <dir>           Input directory (default: ./input)
-o, --output <dir>          Output directory (default: ./output)
-z, --zip                   Create ZIP file after processing
-h, --help                  Show help message
```

### Mode Selection
```
-m, --mode <ai|color>       Removal mode (default: ai)
-c, --target-color <r,g,b>  Target color to remove (color mode only)
-t, --threshold <0-441>     Color similarity threshold (default: 50)
--feather <pixels>          Edge feathering (default: 0)
```

---

## Threshold Guide (Color Mode)

The `--threshold` parameter controls how similar colors must be to get removed:

| Threshold | Behavior | Best For |
|-----------|----------|----------|
| 20-30 | Very precise - only exact matches | Perfectly uniform backgrounds |
| 40-60 | Balanced (recommended) | Most use cases |
| 70-100 | Aggressive - removes similar colors | Backgrounds with slight variations |
| 441 (max) | Entire RGB color space | Not recommended |

**Example:** If your background is "pure blue" RGB(0,0,255), a threshold of 50 will also remove colors like RGB(0,20,230) or RGB(25,10,255).

---

## Which Mode Should I Use?

| Your Situation | Recommended Mode | Command Example |
|----------------|------------------|-----------------|
| Photo with person, any background | AI mode | `node bg-remover-cli.js` |
| Blue/green screen | Color mode | `--mode color --target-color "0,0,255"` |
| **Image with text on solid background** | **Color mode** | `--mode color --target-color "R,G,B"` |
| White background product photo | Color mode | `--mode color --target-color "255,255,255"` |
| Complex/gradient background | AI mode | `node bg-remover-cli.js` |
| Need to preserve logos/text | Color mode | `--mode color ...` |
| Fast batch processing | Color mode | `--mode color ...` |

---

## Examples

### Example 1: Basic Batch Processing
```bash
# 1. Put images in input/ folder
# 2. Run command
node bg-remover-cli.js

# Results will be in output/ folder
```

### Example 2: Batch Processing (PNG Output)
```bash
# All output is PNG format (transparent background)
node bg-remover-cli.js
```

### Example 3: Create ZIP Package
```bash
node bg-remover-cli.js --zip

# Creates: bg-removed_YYYYMMDD_HHMMSS.zip
```

### Example 4: Process Single File
```bash
node bg-remover-cli.js image.webp

# Output: output/image_no_bg.png
```

### Example 5: Custom Directories
```bash
node bg-remover-cli.js --input ./my-photos --output ./processed
```

---

## Supported Formats

### Input Formats
- JPG / JPEG
- PNG
- WebP
- BMP
- GIF

### Output Formats
- **PNG** (only format) - Lossless transparency, best compatibility
- Note: WebP output is not currently supported due to dependency compatibility issues

---

## Tips & Best Practices

### For Best Results
- Use high-resolution images (but under 10MB for performance)
- Images with clear subject/background separation work best
- First run takes longer (AI model download, ~30MB)
- Subsequent runs are much faster (model is cached)

### Performance Tips
- Process in batches for efficiency
- Close other applications to free up memory
- WebP output is ~30% smaller than PNG

### Troubleshooting
- If processing is slow, try smaller images
- If errors occur, check Node.js version (18+ required)
- For memory errors, process fewer images at once

---

## Integration with LINE Stamp Tool

This tool is designed to integrate easily with the LINE Stamp creation tool.

### Python Integration Example
```python
import subprocess
from pathlib import Path

# Call bg-remover from Python
result = subprocess.run([
    'node',
    'bg-remover-cli.js',
    '--input', str(input_folder),
    '--output', str(output_folder),
    '--format', 'png'
], capture_output=True, text=True)

if result.returncode == 0:
    print("Background removal successful!")
else:
    print(f"Error: {result.stderr}")
```

### Future Integration
A Python module (`background_remover.py`) will be added to the LINE Stamp tool for seamless integration with the GUI.

---

## FAQ

### Q: Do I need to install anything besides Node.js?
**A:** No! Just Node.js. The batch file (`start-bg-remover.bat`) automatically installs dependencies on first run.

### Q: Is my data uploaded anywhere?
**A:** No! All processing happens on your computer. The AI model is downloaded once and cached locally.

### Q: How long does processing take?
**A:** First run: 30-60 seconds (model download). After that: 2-5 seconds per image.

### Q: Can I output in WebP format?
**A:** Not currently. All output is PNG format due to sharp dependency compatibility issues. PNG supports full transparency and is widely compatible.

### Q: Can I process 100+ images at once?
**A:** Yes, but it may take time. Process in smaller batches if you experience memory issues.

### Q: Does this work on Mac/Linux?
**A:** Yes! Just use the command line interface (`node bg-remover-cli.js`). The `.bat` file is Windows-only.

### Q: The first run is very slow. Is something wrong?
**A:** No, it's normal. The AI model (~30MB) is being downloaded. Subsequent runs will be fast.

### Q: I got an error about Node.js not found
**A:** Install Node.js from https://nodejs.org/ (LTS version recommended)

### Q: Can I contribute or report issues?
**A:** Yes! This is open source (MIT License). Check the GitHub repository for issues and contributions.

---

## Technical Details

### Dependencies
- `@imgly/background-removal-node` - AI background removal (Node.js version)
- `archiver` - ZIP file creation

### System Requirements
- Node.js 18+ (LTS recommended)
- 2GB+ RAM (4GB+ recommended for large images)
- Internet connection (first run only, for AI model download)

### AI Model
- Model: U2Net (ONNX format)
- Size: ~30MB (downloaded on first run, cached locally)
- Accuracy: High-quality segmentation for most images

---

## License

MIT License - Free to use, modify, and distribute

---

## Related Tools

- [WebP Converter](https://github.com/yourusername/webpconverter) - Convert images to WebP format
- [LINE Stamp Maker](https://github.com/yourusername/line_stamp_maker) - Create LINE stamps from images

---

## Credits

Built with:
- [@imgly/background-removal](https://github.com/imgly/background-removal-js) - Background removal library
- [Sharp](https://sharp.pixelplumbing.com/) - Image processing
- [Node.js](https://nodejs.org/) - JavaScript runtime

---

**Made with ❤️ for easy image processing**
