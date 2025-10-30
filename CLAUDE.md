# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered background removal tool designed for:
- **Batch processing** of multiple images
- **Easy integration** with LINE Stamp creation tool
- **Non-technical users** via simple Windows batch file
- **Developers** via command-line interface

## Architecture

### Core Components

1. **bg-remover-core.js** - Core logic (independent, reusable)
   - Background removal using @imgly/background-removal
   - Image processing with Sharp
   - ZIP file creation
   - Batch processing logic

2. **bg-remover-cli.js** - CLI interface
   - Command-line argument parsing
   - User-friendly console output
   - Progress reporting
   - Error handling

3. **start-bg-remover.bat** - Windows launcher
   - One-click execution for non-technical users
   - Automatic dependency installation
   - Interactive prompts

## Common Commands

### Development
```bash
npm install                          # Install dependencies (first time)
node bg-remover-cli.js              # Run CLI tool (default: input/ -> output/)
node bg-remover-cli.js --help       # Show help
npm test                            # Test with examples
npm run pkg                         # Build Windows executable
```

### Batch Files (Windows)
```bash
start-bg-remover.bat               # User-friendly batch processing
```

### Testing
```bash
# Test with single file
node bg-remover-cli.js test.webp

# Test batch processing
node bg-remover-cli.js --input ./examples/input --output ./examples/output

# Test with ZIP output
node bg-remover-cli.js --zip

# Test WebP output
node bg-remover-cli.js --format webp
```

## File Structure

```
bg-remover/
├── bg-remover-core.js        # Core: Background removal logic (reusable module)
├── bg-remover-cli.js         # CLI: Command-line interface
├── start-bg-remover.bat      # Windows: Batch file launcher
├── package.json              # npm: Dependencies and scripts
├── README.md                 # User: Documentation for end users
├── CLAUDE.md                 # Dev: This file (for Claude Code)
├── LICENSE                   # Legal: MIT License
├── .gitignore                # Git: Excluded files/folders
│
├── input/                    # User: Input images folder
├── output/                   # Auto: Output images folder (generated)
├── temp/                     # Auto: Temporary processing (generated)
└── examples/                 # Dev: Example images for testing
    ├── input/
    └── output/
```

## Design Principles

### 1. Ease of Distribution
- **Zero configuration** for end users (Windows batch file)
- **Single command** installation: `npm install`
- **Minimal dependencies** (4 packages total)
- **Portable** - Can be copied/moved easily

### 2. Performance & Lightweight
- **Efficient batch processing** - Processes multiple files sequentially
- **Memory conscious** - Sharp for optimized image handling
- **AI model caching** - Model downloaded once, reused thereafter
- **No unnecessary features** - Focused on core functionality

### 3. User Experience
- **Progress indicators** - Clear console output with colors
- **Error messages** - User-friendly, actionable error messages
- **Emoji support** - Visual indicators for status (✓ ✗ ⚠)
- **Help documentation** - Comprehensive --help output

### 4. Maintainability
- **Modular design** - Core logic separated from CLI
- **Clear separation** - Business logic vs. interface
- **Commented code** - Key functions documented
- **Conventional structure** - Follows Node.js best practices

### 5. Extensibility
- **Reusable core** - Can be imported by other tools
- **Flexible options** - Format, ZIP, custom paths
- **Python integration ready** - Designed for subprocess calls
- **Future GUI support** - Core module can be wrapped

## Integration with LINE Stamp Tool

### Design Goal
This tool is designed to integrate with the Python-based LINE Stamp creation tool located at `D:\LINEスタンプツール\`.

### Integration Pattern
The LINE Stamp tool will call this Node.js tool via Python subprocess:

```python
# Future: D:\LINEスタンプツール\modules\background_remover.py
import subprocess
from pathlib import Path

class BackgroundRemover:
    def __init__(self, bg_remover_path: str, node_executable='node'):
        self.bg_remover_path = Path(bg_remover_path)
        self.node_executable = node_executable
        self.script_path = self.bg_remover_path / 'bg-remover-cli.js'

    def remove_background(
        self,
        folder_path: Path,
        output_folder: Optional[Path] = None,
        format: str = 'png',
        progress_callback: Optional[Callable[[str], None]] = None
    ) -> bool:
        """Remove background from all images in folder"""

        # Call Node.js script
        result = subprocess.run([
            self.node_executable,
            str(self.script_path),
            '--input', str(folder_path),
            '--output', str(output_folder or folder_path),
            '--format', format
        ], capture_output=True, text=True)

        # Parse output and call progress callback
        if progress_callback:
            for line in result.stdout.split('\n'):
                progress_callback(line)

        return result.returncode == 0
```

### Integration Checklist
- ✅ CLI accepts `--input` and `--output` arguments
- ✅ Returns appropriate exit codes (0=success, 1=failure)
- ✅ Outputs progress to stdout
- ✅ Outputs errors to stderr
- ✅ Can be called via subprocess from Python
- ✅ Supports PNG output (LINE stamp requirement)

## Dependencies

### Production Dependencies
```json
{
  "@imgly/background-removal-node": "^1.4.5",  // AI background removal (Node.js)
  "archiver": "^7.0.1"                          // ZIP creation
}
```

### Development Dependencies
```json
{
  "pkg": "^5.8.1"  // Executable generation for distribution
}
```

### Why These Dependencies?
- **@imgly/background-removal-node** - Industry-standard AI background removal (Node.js optimized)
- **archiver** - Reliable ZIP creation for batch output
- **pkg** - Creates standalone .exe for Windows users (no Node.js required)

### Note on Sharp
- Sharp was removed due to Windows DLL compatibility issues
- @imgly/background-removal-node handles all image processing internally
- All output is PNG format (transparent background)

## Processing Flow

```
User Action
    ↓
CLI Argument Parsing (bg-remover-cli.js)
    ↓
Core Initialization (bg-remover-core.js)
    ↓
Input File Discovery
    ↓
For Each Image:
    ├─ Convert to file:// URL
    ├─ AI Background Removal (@imgly/background-removal-node)
    ├─ Blob to Buffer conversion
    └─ Save as PNG to output folder
    ↓
(Optional) ZIP Creation
    ↓
Display Statistics
```

## Error Handling Strategy

### Levels of Error Handling

1. **File-level errors** - Individual image failures don't stop batch
2. **Batch-level errors** - Critical errors stop processing
3. **User-friendly messages** - No technical jargon in output
4. **Exit codes** - 0=success, 1=failure (for scripts)

### Example Error Messages

```bash
# Good (user-friendly)
❌ Input file not found: image.jpg
ℹ️ No supported image files found in input directory
✓ Success! Processed 10/12 images (2 failed)

# Bad (technical)
Error: ENOENT: no such file or directory
TypeError: Cannot read property 'buffer' of undefined
```

## Testing Checklist

When making changes, test these scenarios:

- [ ] Single file processing
- [ ] Batch processing (multiple files)
- [ ] Empty input folder
- [ ] Missing input folder
- [ ] Invalid file format
- [ ] Large files (>10MB)
- [ ] PNG output format
- [ ] WebP output format
- [ ] ZIP file creation
- [ ] Windows batch file execution
- [ ] Help command (`--help`)
- [ ] Custom input/output directories

## Future Enhancements (Not Implemented Yet)

### Planned Features
- [ ] Python module for LINE Stamp tool integration
- [ ] GUI wrapper (Electron or similar)
- [ ] Configurable AI model options
- [ ] Edge refinement options
- [ ] Background color replacement
- [ ] Preview before/after (GUI)
- [ ] Progress bar for batch processing
- [ ] Resume interrupted batch jobs

### Intentionally Not Included
- ❌ Server mode (CLI only for now)
- ❌ API endpoints (not needed)
- ❌ Database integration (stateless tool)
- ❌ User authentication (local tool)
- ❌ Cloud processing (privacy concern)

## Deployment

### For End Users (Windows)
1. Distribute entire `bg-remover/` folder
2. User runs `start-bg-remover.bat`
3. Batch file handles npm install automatically

### For Developers
```bash
git clone <repo>
cd bg-remover
npm install
node bg-remover-cli.js --help
```

### As Executable (Future)
```bash
npm run pkg
# Distributes: bg-remover.exe (standalone, no Node.js required)
```

## Troubleshooting

### Common Issues

**Issue**: "Node.js not found"
- **Solution**: Install Node.js from https://nodejs.org/

**Issue**: "@imgly/background-removal not found"
- **Solution**: Run `npm install`

**Issue**: "Out of memory" error
- **Solution**: Process fewer images at once, close other applications

**Issue**: First run is very slow
- **Solution**: Normal - AI model (~30MB) is being downloaded and cached

**Issue**: "sharp" installation fails
- **Solution**: Requires native compilation. Ensure Python and build tools are installed

## Code Style

### Conventions Used
- **Async/await** for asynchronous code (no callbacks)
- **ES6+ syntax** (const/let, arrow functions, template literals)
- **Descriptive names** (no single-letter variables except loops)
- **Comments** on complex logic only
- **Error-first** handling pattern

### Example Good Code
```javascript
// Good: Clear, async/await, descriptive
async function removeBackground(inputPath, outputPath, format = 'png') {
    try {
        const imageBuffer = await fs.readFile(inputPath);
        const blob = await removeBackground(imageBuffer);
        await saveImage(blob, outputPath, format);
        return true;
    } catch (error) {
        console.error(`Failed to process: ${error.message}`);
        return false;
    }
}
```

## Contributing

When contributing to this project:
1. Test with both PNG and WebP outputs
2. Ensure Windows batch file still works
3. Update README.md if adding features
4. Keep dependencies minimal
5. Maintain non-technical user focus

## License

MIT License - See LICENSE file for details
