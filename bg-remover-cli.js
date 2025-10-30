#!/usr/bin/env node
/**
 * Background Remover CLI
 * Command-line interface for batch background removal with ZIP support
 */

const BackgroundRemoverCore = require('./bg-remover-core');
const path = require('path');
const fs = require('fs').promises;

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        input: './input',
        output: './output',
        format: 'png',
        zip: false,
        help: false,
        singleFile: null,

        // Color-based removal options
        mode: 'ai',              // Default to AI mode (backwards compatible)
        targetColor: null,       // RGB string: "r,g,b"
        threshold: 50,           // Default threshold
        feather: 0,              // Default no feathering

        // Hybrid mode options
        textPadding: 5,          // Padding around detected text regions
        textDetectionMode: 'color',  // Default to color-based detection
        textColors: '255,255,255',   // Default: white text
        textThreshold: 60        // Threshold for text color detection
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--input' || arg === '-i') {
            options.input = args[++i];
        } else if (arg === '--output' || arg === '-o') {
            options.output = args[++i];
        } else if (arg === '--format' || arg === '-f') {
            options.format = args[++i];
        } else if (arg === '--zip' || arg === '-z') {
            options.zip = true;
        }
        // Color-based removal options
        else if (arg === '--mode' || arg === '-m') {
            options.mode = args[++i];
        } else if (arg === '--target-color' || arg === '-c') {
            options.targetColor = args[++i];
        } else if (arg === '--threshold' || arg === '-t') {
            options.threshold = parseInt(args[++i], 10);
        } else if (arg === '--feather') {
            options.feather = parseInt(args[++i], 10);
        }
        // Hybrid mode options
        else if (arg === '--text-padding') {
            options.textPadding = parseInt(args[++i], 10);
        } else if (arg === '--text-detection') {
            options.textDetectionMode = args[++i];
        } else if (arg === '--text-colors') {
            options.textColors = args[++i];
        } else if (arg === '--text-threshold') {
            options.textThreshold = parseInt(args[++i], 10);
        }
        else if (!arg.startsWith('-')) {
            // Single file mode
            options.singleFile = arg;
        }
    }

    // Validate mode
    if (!['ai', 'color', 'hybrid'].includes(options.mode)) {
        console.error(`${colors.red}Error: Invalid mode '${options.mode}'. Use 'ai', 'color', or 'hybrid'${colors.reset}`);
        process.exit(1);
    }

    // Validate color mode requirements
    if (options.mode === 'color' && !options.targetColor) {
        console.error(`${colors.red}Error: --target-color required for color mode${colors.reset}`);
        console.error(`${colors.yellow}Example: --target-color "0,0,255" (blue)${colors.reset}`);
        process.exit(1);
    }

    // Parse target color
    if (options.targetColor) {
        const rgb = parseRGBColor(options.targetColor);
        if (!rgb) {
            console.error(`${colors.red}Error: Invalid RGB color format '${options.targetColor}'${colors.reset}`);
            console.error(`${colors.yellow}Use format: "r,g,b" (e.g., "0,0,255")${colors.reset}`);
            process.exit(1);
        }
        options.targetColorParsed = rgb;
    }

    // Validate format
    if (!['png', 'webp'].includes(options.format)) {
        console.error(`${colors.red}Error: Invalid format. Use 'png' or 'webp'${colors.reset}`);
        process.exit(1);
    }

    // Parse text colors for hybrid mode
    if (options.textColors) {
        const colors = options.textColors.split(';').map(colorStr => {
            const parts = colorStr.split(',').map(s => parseInt(s.trim(), 10));
            if (parts.length !== 3 || parts.some(v => isNaN(v) || v < 0 || v > 255)) {
                console.error(`${colors.red}Error: Invalid text color format '${colorStr}'${colors.reset}`);
                console.error(`${colors.yellow}Use format: "r,g,b" or "r1,g1,b1;r2,g2,b2" for multiple colors${colors.reset}`);
                process.exit(1);
            }
            return parts;
        });
        options.textColorsParsed = colors;
    }

    return options;
}

/**
 * Parse RGB color string to object
 * @param {string} rgbString - "r,g,b" format
 * @returns {object|null} {r, g, b} or null if invalid
 */
function parseRGBColor(rgbString) {
    const parts = rgbString.split(',').map(s => parseInt(s.trim(), 10));

    if (parts.length !== 3) return null;
    if (parts.some(v => isNaN(v) || v < 0 || v > 255)) return null;

    return { r: parts[0], g: parts[1], b: parts[2] };
}

/**
 * Display help message
 */
function showHelp() {
    console.log(`
${colors.bright}Background Remover CLI v1.1.0${colors.reset}
AI-powered and color-based background removal tool

${colors.cyan}USAGE:${colors.reset}
  node bg-remover-cli.js [options]
  node bg-remover-cli.js <file> [options]

${colors.cyan}OPTIONS:${colors.reset}
  -i, --input <dir>           Input directory (default: ./input)
  -o, --output <dir>          Output directory (default: ./output)
  -f, --format <fmt>          Output format: png or webp (default: png)
  -z, --zip                   Create ZIP file after processing
  -h, --help                  Show this help message

  ${colors.bright}Background Removal Modes:${colors.reset}
  -m, --mode <mode>           Mode: ai or color (default: ai)
  -c, --target-color <rgb>    Target color for removal (color mode only)
                              Format: "r,g,b" (e.g., "0,0,255" for blue)
  -t, --threshold <num>       Color similarity threshold 0-441 (default: 50)
                              Lower = more precise, Higher = more removal
  --feather <num>             Edge feathering in pixels (default: 0)

  ${colors.bright}Hybrid Mode Options:${colors.reset}
  --text-padding <num>        Padding around text regions (default: 5)
  --text-detection <mode>     Text detection: 'ocr' or 'color' (default: color)
  --text-colors <colors>      Text colors to detect (default: "255,255,255")
                              Format: "r,g,b" or "r1,g1,b1;r2,g2,b2" for multiple
  --text-threshold <num>      Color threshold for text detection (default: 60)

${colors.cyan}EXAMPLES:${colors.reset}
  ${colors.gray}# AI mode (default) - removes background automatically${colors.reset}
  node bg-remover-cli.js

  ${colors.gray}# Hybrid mode - preserves both people AND text${colors.reset}
  node bg-remover-cli.js --mode hybrid

  ${colors.gray}# Hybrid mode with custom text padding${colors.reset}
  node bg-remover-cli.js --mode hybrid --text-padding 10

  ${colors.gray}# Hybrid mode - detect red text${colors.reset}
  node bg-remover-cli.js --mode hybrid --text-colors "255,0,0"

  ${colors.gray}# Hybrid mode - detect multiple text colors${colors.reset}
  node bg-remover-cli.js --mode hybrid --text-colors "255,255,255;255,0,0"

  ${colors.gray}# Color mode - remove blue background${colors.reset}
  node bg-remover-cli.js --mode color --target-color "0,0,255" --threshold 50

  ${colors.gray}# Color mode - remove green screen with feathering${colors.reset}
  node bg-remover-cli.js --mode color --target-color "0,255,0" --threshold 30 --feather 2

  ${colors.gray}# Color mode with higher threshold (removes more similar colors)${colors.reset}
  node bg-remover-cli.js --mode color --target-color "100,150,200" --threshold 80

  ${colors.gray}# Process and create ZIP${colors.reset}
  node bg-remover-cli.js --zip

  ${colors.gray}# Process single file with color removal${colors.reset}
  node bg-remover-cli.js image.jpg --mode color --target-color "255,255,255"

${colors.cyan}MODES:${colors.reset}
  ${colors.bright}ai${colors.reset}     - AI-powered removal (default)
          Pros: Automatic, high quality for photos
          Cons: May remove text/logos, slower

  ${colors.bright}hybrid${colors.reset} - AI + Text detection (BEST for images with text!)
          Pros: Preserves BOTH people AND text, automatic
          Cons: Slower than color mode, requires good text contrast
          Note: Uses Tesseract.js for text detection

  ${colors.bright}color${colors.reset}  - Color-based removal
          Pros: Fast, predictable
          Cons: Requires uniform background color, may leave artifacts

${colors.cyan}THRESHOLD GUIDE:${colors.reset}
  20-30  = Very precise (only exact color matches)
  40-60  = Balanced (recommended for most cases)
  70-100 = Aggressive (removes similar colors too)
  Max: 441 (diagonal of RGB cube)

${colors.cyan}SUPPORTED FORMATS:${colors.reset}
  Input:  JPG, PNG, WebP, BMP, GIF
  Output: PNG (transparent background)

${colors.cyan}NOTE:${colors.reset}
  AI mode: First run downloads model (~30MB, cached)
  Color mode: Instant processing, no downloads
`);
}

/**
 * Display processing statistics
 */
function displayStats(stats, duration) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${colors.bright}Processing Summary${colors.reset}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total files:    ${stats.total}`);
    console.log(`${colors.green}Success:        ${stats.success}${colors.reset}`);
    if (stats.failed > 0) {
        console.log(`${colors.red}Failed:         ${stats.failed}${colors.reset}`);
    }
    if (stats.skipped > 0) {
        console.log(`${colors.yellow}Skipped:        ${stats.skipped}${colors.reset}`);
    }
    console.log(`Processing time: ${duration.toFixed(2)}s`);
    console.log(`${'='.repeat(60)}\n`);
}

/**
 * Process single file
 */
async function processSingleFile(core, filePath, options) {
    try {
        console.log(`${colors.cyan}Processing single file...${colors.reset}\n`);

        const inputPath = path.resolve(filePath);
        const basename = path.basename(filePath, path.extname(filePath));
        // Always output as PNG (WebP not supported without sharp)
        const outputFileName = `${basename}_no_bg.png`;
        const outputPath = path.resolve(options.output, outputFileName);

        const startTime = Date.now();
        const success = await core.removeBackground(inputPath, outputPath, options.format);
        const duration = (Date.now() - startTime) / 1000;

        if (success) {
            console.log(`\n${colors.green}✓ Success!${colors.reset}`);
            console.log(`Output: ${outputPath}`);
            console.log(`Processing time: ${duration.toFixed(2)}s\n`);
            return true;
        } else {
            console.log(`\n${colors.red}✗ Failed to process file${colors.reset}\n`);
            return false;
        }

    } catch (error) {
        console.error(`\n${colors.red}Error: ${error.message}${colors.reset}\n`);
        return false;
    }
}

/**
 * Process batch (directory)
 */
async function processBatch(core, options) {
    try {
        console.log(`${colors.cyan}Starting batch processing...${colors.reset}\n`);
        console.log(`Input:  ${path.resolve(options.input)}`);
        console.log(`Output: ${path.resolve(options.output)}`);
        console.log(`Format: ${options.format.toUpperCase()}`);
        if (options.zip) {
            console.log(`ZIP:    Enabled`);
        }
        console.log('');

        const startTime = Date.now();
        const stats = await core.processBatch(
            path.resolve(options.input),
            path.resolve(options.output),
            options.format
        );
        const duration = (Date.now() - startTime) / 1000;

        displayStats(stats, duration);

        if (stats.success === 0) {
            console.log(`${colors.yellow}No files were processed successfully${colors.reset}\n`);
            return false;
        }

        // Create ZIP if requested
        if (options.zip && stats.success > 0) {
            console.log(`${colors.cyan}Creating ZIP file...${colors.reset}\n`);

            const timestamp = core.getTimestamp();
            const zipName = `bg-removed_${timestamp}.zip`;
            const zipPath = path.resolve(options.output, '..', zipName);

            await core.createZip(path.resolve(options.output), zipPath);

            console.log(`${colors.green}✓ ZIP created: ${zipName}${colors.reset}\n`);
        }

        console.log(`${colors.green}✓ All done!${colors.reset}\n`);
        return true;

    } catch (error) {
        console.error(`\n${colors.red}Error: ${error.message}${colors.reset}\n`);
        return false;
    }
}

/**
 * Main function
 */
async function main() {
    const options = parseArgs();

    // Show help
    if (options.help) {
        showHelp();
        process.exit(0);
    }

    // Display banner
    console.log(`\n${colors.bright}${colors.cyan}Background Remover CLI v1.1.0${colors.reset}`);
    console.log(`${colors.gray}AI-powered and color-based background removal${colors.reset}\n`);

    // Initialize core with all options
    const core = new BackgroundRemoverCore({
        verbose: false,
        mode: options.mode,
        targetColor: options.targetColorParsed,
        threshold: options.threshold,
        feather: options.feather,
        textPadding: options.textPadding,
        textDetectionMode: options.textDetectionMode,
        textColors: options.textColorsParsed || [[255, 255, 255]],
        textThreshold: options.textThreshold
    });

    try {
        let success = false;

        if (options.singleFile) {
            // Single file mode
            success = await processSingleFile(core, options.singleFile, options);
        } else {
            // Batch mode
            success = await processBatch(core, options);
        }

        process.exit(success ? 0 : 1);

    } catch (error) {
        console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}`);
        console.error(`${colors.gray}${error.stack}${colors.reset}\n`);
        process.exit(1);
    }
}

// Error handlers
process.on('uncaughtException', (error) => {
    console.error(`\n${colors.red}Uncaught exception: ${error.message}${colors.reset}\n`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`\n${colors.red}Unhandled rejection: ${reason}${colors.reset}\n`);
    process.exit(1);
});

// Run main function
if (require.main === module) {
    main();
}

module.exports = { parseArgs, showHelp };
