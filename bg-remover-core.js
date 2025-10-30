#!/usr/bin/env node
/**
 * Background Remover Core Module
 * AI-powered background removal using @imgly/background-removal
 */

const { removeBackground } = require('@imgly/background-removal-node');
const Jimp = require('jimp');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { createWriteStream } = require('fs');

class BackgroundRemoverCore {
    constructor(options = {}) {
        this.supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
        this.verbose = options.verbose || false;
        this.initialized = false;

        // Color-based removal options
        this.mode = options.mode || 'ai';
        this.targetColor = options.targetColor || null;  // {r, g, b}
        this.threshold = options.threshold || 50;
        this.feather = options.feather || 0;
        this.colorPasses = options.colorPasses || null;  // Array of {color, threshold} for multi-pass

        // Hybrid mode options
        this.textPadding = options.textPadding || 5;  // Padding around text regions
        this.textDetectionMode = options.textDetectionMode || 'ocr';  // 'ocr' or 'color'
        this.textColors = options.textColors || [[255, 255, 255]];  // Default: white text
        this.textThreshold = options.textThreshold || 40;  // For color-based text detection
    }

    /**
     * Initialize AI model (optional pre-loading)
     */
    async initialize() {
        if (this.initialized) return;

        this.log('Initializing AI model...');
        // The model will be loaded on first use
        this.initialized = true;
        this.log('Ready for background removal');
    }

    /**
     * Check if file has supported format
     */
    isSupportedFormat(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedFormats.includes(ext);
    }

    /**
     * Remove background from single image (router method)
     * @param {string} inputPath - Input image path
     * @param {string} outputPath - Output image path
     * @param {string} format - Output format ('png' or 'webp')
     * @returns {Promise<boolean>} Success status
     */
    async removeBackground(inputPath, outputPath, format = 'png') {
        if (this.mode === 'ai') {
            return await this.removeBackgroundAI(inputPath, outputPath, format);
        } else if (this.mode === 'color') {
            return await this.removeBackgroundColor(inputPath, outputPath);
        } else if (this.mode === 'hybrid') {
            return await this.removeBackgroundHybrid(inputPath, outputPath, format);
        } else {
            throw new Error(`Unknown mode: ${this.mode}. Use 'ai', 'color', or 'hybrid'.`);
        }
    }

    /**
     * Remove background using AI
     * @param {string} inputPath - Input image path
     * @param {string} outputPath - Output image path
     * @param {string} format - Output format ('png' or 'webp')
     * @returns {Promise<boolean>} Success status
     */
    async removeBackgroundAI(inputPath, outputPath, format = 'png') {
        try {
            if (!await this.fileExists(inputPath)) {
                throw new Error(`Input file not found: ${inputPath}`);
            }

            // Check if INPUT file format is supported (not output)
            const inputExt = path.extname(inputPath).toLowerCase();
            if (!this.supportedFormats.includes(inputExt)) {
                throw new Error(`Unsupported file format: ${inputExt}`);
            }

            this.log(`Processing: ${path.basename(inputPath)}`);

            // Remove background using AI (pass file:// URL)
            // removeBackground returns a Blob in Node.js environment
            const fileUrl = `file:///${inputPath.replace(/\\/g, '/')}`;
            const blob = await removeBackground(fileUrl);

            // Convert blob to buffer
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Ensure output directory exists
            await fs.mkdir(path.dirname(outputPath), { recursive: true });

            // Note: @imgly/background-removal-node returns PNG format by default
            // If WebP requested, we need sharp which has compatibility issues
            // For now, always save as PNG regardless of format parameter
            if (format === 'webp') {
                console.warn('  Warning: WebP output not available. Saving as PNG instead.');
            }

            // Save the buffer directly (already in PNG format)
            await fs.writeFile(outputPath, buffer);

            this.log(`Saved: ${path.basename(outputPath)}`);
            return true;

        } catch (error) {
            console.error(`Error processing ${path.basename(inputPath)}: ${error.message}`);
            return false;
        }
    }

    /**
     * Remove background based on color similarity
     * @param {string} inputPath - Input image path
     * @param {string} outputPath - Output image path
     * @returns {Promise<boolean>} Success status
     */
    async removeBackgroundColor(inputPath, outputPath) {
        try {
            if (!await this.fileExists(inputPath)) {
                throw new Error(`Input file not found: ${inputPath}`);
            }

            // Check if INPUT file format is supported
            const inputExt = path.extname(inputPath).toLowerCase();
            if (!this.supportedFormats.includes(inputExt)) {
                throw new Error(`Unsupported file format: ${inputExt}`);
            }

            // Multi-pass mode
            if (this.colorPasses && this.colorPasses.length > 0) {
                this.log(`Processing (multi-pass color mode): ${path.basename(inputPath)}`);
                this.log(`Total passes: ${this.colorPasses.length}`);

                // Load image with jimp
                let image = await Jimp.read(inputPath);
                const width = image.bitmap.width;
                const height = image.bitmap.height;

                // Apply each pass
                for (let i = 0; i < this.colorPasses.length; i++) {
                    const pass = this.colorPasses[i];
                    this.log(`Pass ${i + 1}/${this.colorPasses.length}: RGB(${pass.color.r}, ${pass.color.g}, ${pass.color.b}), threshold=${pass.threshold}`);

                    let pixelsChanged = 0;

                    // Process each pixel
                    image.scan(0, 0, width, height, (x, y, idx) => {
                        const r = image.bitmap.data[idx + 0];
                        const g = image.bitmap.data[idx + 1];
                        const b = image.bitmap.data[idx + 2];
                        const a = image.bitmap.data[idx + 3];

                        // Skip already transparent pixels
                        if (a === 0) return;

                        // Calculate color distance
                        const distance = this.calculateColorDistance(
                            { r, g, b },
                            pass.color
                        );

                        // If within threshold, make transparent
                        if (distance <= pass.threshold) {
                            image.bitmap.data[idx + 3] = 0;
                            pixelsChanged++;
                        }
                    });

                    this.log(`  Pixels made transparent: ${pixelsChanged} (${(pixelsChanged / (width * height) * 100).toFixed(1)}%)`);
                }

                // Ensure output directory exists
                await fs.mkdir(path.dirname(outputPath), { recursive: true });

                // Save as PNG with transparency
                await image.writeAsync(outputPath);

                this.log(`Saved: ${path.basename(outputPath)}`);
                return true;
            }

            // Single-pass mode (original behavior)
            if (!this.targetColor) {
                throw new Error('Target color not specified. Use --target-color option.');
            }

            this.log(`Processing (color mode): ${path.basename(inputPath)}`);
            this.log(`Target color: RGB(${this.targetColor.r}, ${this.targetColor.g}, ${this.targetColor.b})`);
            this.log(`Threshold: ${this.threshold}`);

            // Load image with jimp
            const image = await Jimp.read(inputPath);

            // Get image dimensions
            const width = image.bitmap.width;
            const height = image.bitmap.height;

            let pixelsChanged = 0;

            // Process each pixel
            image.scan(0, 0, width, height, (x, y, idx) => {
                // Get pixel RGBA values
                const r = image.bitmap.data[idx + 0];
                const g = image.bitmap.data[idx + 1];
                const b = image.bitmap.data[idx + 2];
                const a = image.bitmap.data[idx + 3];

                // Calculate color distance
                const distance = this.calculateColorDistance(
                    { r, g, b },
                    this.targetColor
                );

                // If within threshold, make transparent
                if (distance <= this.threshold) {
                    image.bitmap.data[idx + 3] = 0;  // Set alpha to 0
                    pixelsChanged++;
                } else if (this.feather > 0 && distance <= this.threshold + this.feather) {
                    // Optional: Apply feathering for smoother edges
                    const featherRatio = (distance - this.threshold) / this.feather;
                    image.bitmap.data[idx + 3] = Math.floor(a * featherRatio);
                }
            });

            this.log(`Pixels made transparent: ${pixelsChanged} / ${width * height} (${(pixelsChanged / (width * height) * 100).toFixed(1)}%)`);

            // Ensure output directory exists
            await fs.mkdir(path.dirname(outputPath), { recursive: true });

            // Save as PNG with transparency
            await image.writeAsync(outputPath);

            this.log(`Saved: ${path.basename(outputPath)}`);
            return true;

        } catch (error) {
            console.error(`Error processing ${path.basename(inputPath)}: ${error.message}`);
            return false;
        }
    }

    /**
     * Calculate Euclidean distance between two RGB colors
     * @param {object} color1 - {r, g, b}
     * @param {object} color2 - {r, g, b}
     * @returns {number} Distance (0-441)
     */
    calculateColorDistance(color1, color2) {
        const rDiff = color1.r - color2.r;
        const gDiff = color1.g - color2.g;
        const bDiff = color1.b - color2.b;
        return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    }

    /**
     * Remove background using hybrid mode (AI + text detection)
     * Preserves both people and text
     * @param {string} inputPath - Input image path
     * @param {string} outputPath - Output image path
     * @param {string} format - Output format ('png' or 'webp')
     * @returns {Promise<boolean>} Success status
     */
    async removeBackgroundHybrid(inputPath, outputPath, format = 'png') {
        try {
            if (!await this.fileExists(inputPath)) {
                throw new Error(`Input file not found: ${inputPath}`);
            }

            const inputExt = path.extname(inputPath).toLowerCase();
            if (!this.supportedFormats.includes(inputExt)) {
                throw new Error(`Unsupported file format: ${inputExt}`);
            }

            this.log(`Processing (hybrid mode): ${path.basename(inputPath)}`);
            this.log('Step 1/3: AI-based person detection...');

            // Step 1: Get person mask using AI
            const absolutePath = path.resolve(inputPath);
            const fileUrl = `file:///${absolutePath.replace(/\\/g, '/')}`;
            const blob = await removeBackground(fileUrl);
            const arrayBuffer = await blob.arrayBuffer();
            const personMaskBuffer = Buffer.from(arrayBuffer);

            // Load masks with Jimp
            const personMask = await Jimp.read(personMaskBuffer);
            const originalImage = await Jimp.read(inputPath);
            const width = originalImage.bitmap.width;
            const height = originalImage.bitmap.height;

            this.log('Step 2/3: Text detection...');

            // Step 2: Detect text regions
            let textRegions = [];
            if (this.textDetectionMode === 'ocr') {
                textRegions = await this.detectTextRegions(inputPath);
                this.log(`Found ${textRegions.length} text region(s) via OCR`);
            } else if (this.textDetectionMode === 'color') {
                textRegions = await this.detectTextByColor(originalImage);
                this.log(`Found ${textRegions.length} text region(s) via color detection`);
            }

            this.log('Step 3/3: Combining masks...');

            // Step 3: Create combined mask (person + text)
            const combinedMask = personMask.clone();

            // Add text regions to the mask
            for (const region of textRegions) {
                const { x, y, width: w, height: h } = region;
                const padding = this.textPadding;

                // Draw text region on mask (make it opaque)
                for (let py = Math.max(0, y - padding); py < Math.min(height, y + h + padding); py++) {
                    for (let px = Math.max(0, x - padding); px < Math.min(width, x + w + padding); px++) {
                        const idx = combinedMask.getPixelIndex(px, py);
                        // Copy color from original image
                        combinedMask.bitmap.data[idx + 0] = originalImage.bitmap.data[idx + 0]; // R
                        combinedMask.bitmap.data[idx + 1] = originalImage.bitmap.data[idx + 1]; // G
                        combinedMask.bitmap.data[idx + 2] = originalImage.bitmap.data[idx + 2]; // B
                        combinedMask.bitmap.data[idx + 3] = 255; // Full opacity
                    }
                }
            }

            // Ensure output directory exists
            await fs.mkdir(path.dirname(outputPath), { recursive: true });

            // Save the result
            await combinedMask.writeAsync(outputPath);

            this.log(`Saved: ${path.basename(outputPath)}`);
            return true;

        } catch (error) {
            console.error(`Error processing ${path.basename(inputPath)}: ${error.message}`);
            return false;
        }
    }

    /**
     * Detect text regions based on color similarity
     * @param {Jimp} image - Jimp image object
     * @returns {Promise<Array>} Array of text region bounding boxes
     */
    async detectTextByColor(image) {
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const textMask = new Array(width * height).fill(false);

        // Mark pixels that match text colors
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = image.getPixelIndex(x, y);
                const r = image.bitmap.data[idx + 0];
                const g = image.bitmap.data[idx + 1];
                const b = image.bitmap.data[idx + 2];

                // Check against each text color
                for (const textColor of this.textColors) {
                    const distance = this.calculateColorDistance(
                        { r, g, b },
                        { r: textColor[0], g: textColor[1], b: textColor[2] }
                    );

                    if (distance <= this.textThreshold) {
                        textMask[y * width + x] = true;
                        break;
                    }
                }
            }
        }

        // Find connected components (text regions)
        const regions = this.findConnectedComponents(textMask, width, height);
        return regions;
    }

    /**
     * Find connected components in binary mask
     * @param {Array} mask - Binary mask array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Array} Array of bounding boxes
     */
    findConnectedComponents(mask, width, height) {
        const visited = new Array(width * height).fill(false);
        const regions = [];
        const minRegionSize = 50;  // Minimum pixels for a valid text region

        const directions = [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [-1,1], [1,-1], [1,1]];

        const bfs = (startX, startY) => {
            const queue = [[startX, startY]];
            const points = [];
            visited[startY * width + startX] = true;

            while (queue.length > 0) {
                const [x, y] = queue.shift();
                points.push([x, y]);

                for (const [dx, dy] of directions) {
                    const nx = x + dx;
                    const ny = y + dy;
                    const nidx = ny * width + nx;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                        !visited[nidx] && mask[nidx]) {
                        visited[nidx] = true;
                        queue.push([nx, ny]);
                    }
                }
            }

            return points;
        };

        // Find all connected components
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (mask[idx] && !visited[idx]) {
                    const component = bfs(x, y);

                    if (component.length >= minRegionSize) {
                        // Calculate bounding box
                        const xs = component.map(p => p[0]);
                        const ys = component.map(p => p[1]);
                        const minX = Math.min(...xs);
                        const maxX = Math.max(...xs);
                        const minY = Math.min(...ys);
                        const maxY = Math.max(...ys);

                        regions.push({
                            x: minX,
                            y: minY,
                            width: maxX - minX + 1,
                            height: maxY - minY + 1,
                            pixelCount: component.length
                        });
                    }
                }
            }
        }

        return regions;
    }

    /**
     * Detect text regions in image using Tesseract.js
     * @param {string} imagePath - Path to image
     * @returns {Promise<Array>} Array of text region bounding boxes
     */
    async detectTextRegions(imagePath) {
        try {
            const options = {};
            if (this.verbose) {
                options.logger = (m) => console.log(m);
            }

            const result = await Tesseract.recognize(imagePath, 'eng+jpn', options);

            const regions = [];

            // Extract bounding boxes from recognized words
            if (result.data && result.data.words) {
                for (const word of result.data.words) {
                    if (word.bbox) {
                        regions.push({
                            x: word.bbox.x0,
                            y: word.bbox.y0,
                            width: word.bbox.x1 - word.bbox.x0,
                            height: word.bbox.y1 - word.bbox.y0,
                            text: word.text,
                            confidence: word.confidence
                        });
                    }
                }
            }

            return regions;

        } catch (error) {
            console.error(`Text detection error: ${error.message}`);
            return [];
        }
    }

    /**
     * Process all images in a directory (batch processing)
     * @param {string} inputDir - Input directory path
     * @param {string} outputDir - Output directory path
     * @param {string} format - Output format ('png' or 'webp')
     * @returns {Promise<object>} Processing statistics
     */
    async processBatch(inputDir, outputDir, format = 'png') {
        const stats = {
            total: 0,
            success: 0,
            failed: 0,
            skipped: 0,
            files: []
        };

        try {
            // Check if input directory exists
            if (!await this.fileExists(inputDir)) {
                throw new Error(`Input directory not found: ${inputDir}`);
            }

            // Get all files from input directory
            const files = await fs.readdir(inputDir);
            const imageFiles = files.filter(file => this.isSupportedFormat(file));

            if (imageFiles.length === 0) {
                console.log('No supported image files found in input directory');
                return stats;
            }

            stats.total = imageFiles.length;
            console.log(`Found ${imageFiles.length} image(s) to process\n`);

            // Ensure output directory exists
            await fs.mkdir(outputDir, { recursive: true });

            // Process each file
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const inputPath = path.join(inputDir, file);
                const basename = path.basename(file, path.extname(file));
                // Always output as PNG (WebP not supported without sharp)
                const outputPath = path.join(outputDir, `${basename}.png`);

                console.log(`[${i + 1}/${imageFiles.length}] Processing: ${file}`);

                const success = await this.removeBackground(inputPath, outputPath, format);

                if (success) {
                    stats.success++;
                    stats.files.push({
                        input: file,
                        output: path.basename(outputPath),
                        status: 'success'
                    });
                } else {
                    stats.failed++;
                    stats.files.push({
                        input: file,
                        status: 'failed'
                    });
                }

                console.log(''); // Empty line for readability
            }

            return stats;

        } catch (error) {
            console.error(`Batch processing error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create ZIP file from directory
     * @param {string} sourceDir - Source directory to zip
     * @param {string} outputZipPath - Output ZIP file path
     * @returns {Promise<boolean>} Success status
     */
    async createZip(sourceDir, outputZipPath) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!await this.fileExists(sourceDir)) {
                    throw new Error(`Source directory not found: ${sourceDir}`);
                }

                // Ensure output directory exists
                await fs.mkdir(path.dirname(outputZipPath), { recursive: true });

                this.log(`Creating ZIP: ${path.basename(outputZipPath)}`);

                const output = createWriteStream(outputZipPath);
                const archive = archiver('zip', {
                    zlib: { level: 9 } // Maximum compression
                });

                output.on('close', () => {
                    const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
                    this.log(`ZIP created: ${sizeMB} MB`);
                    resolve(true);
                });

                archive.on('error', (err) => {
                    reject(err);
                });

                archive.pipe(output);

                // Add all files from source directory
                archive.directory(sourceDir, false);

                await archive.finalize();

            } catch (error) {
                console.error(`ZIP creation error: ${error.message}`);
                reject(error);
            }
        });
    }

    /**
     * Check if file or directory exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Log message (if verbose mode enabled)
     */
    log(message) {
        if (this.verbose) {
            console.log(message);
        }
    }

    /**
     * Get formatted timestamp
     */
    getTimestamp() {
        const now = new Date();
        return now.toISOString().replace(/[:.]/g, '-').split('.')[0];
    }
}

module.exports = BackgroundRemoverCore;
