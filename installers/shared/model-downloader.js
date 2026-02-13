#!/usr/bin/env node
// =============================================================================
// LearnQuest Model Downloader
// =============================================================================
//
// Downloads the phi3 model via the Ollama API with progress tracking.
// Displays a console progress bar showing download percentage and speed.
//
// USAGE:
//   node model-downloader.js [model-name]
//
// EXAMPLES:
//   node model-downloader.js           # Downloads phi3 (default)
//   node model-downloader.js phi3      # Downloads phi3 explicitly
//   node model-downloader.js llama3.2  # Downloads a different model
//
// PREREQUISITES:
//   - Ollama must be installed and running (ollama serve)
//   - Internet connection for the initial download
//
// =============================================================================

const http = require('http');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const DEFAULT_MODEL = 'phi3';
const modelName = process.argv[2] || DEFAULT_MODEL;

// Parse the Ollama host URL
const ollamaUrl = new URL(OLLAMA_HOST);
const OLLAMA_HOSTNAME = ollamaUrl.hostname;
const OLLAMA_PORT = parseInt(ollamaUrl.port) || 11434;

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Format bytes into a human-readable string.
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(1)} ${units[i]}`;
}

/**
 * Format seconds into a human-readable duration.
 */
function formatDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) {
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${m}m ${s}s`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

/**
 * Draw a progress bar in the console.
 */
function drawProgressBar(percent, width = 40) {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
    return `[${bar}]`;
}

/**
 * Check if Ollama is running by pinging its API.
 */
function checkOllamaRunning() {
    return new Promise((resolve) => {
        const req = http.get(`http://${OLLAMA_HOSTNAME}:${OLLAMA_PORT}/`, (res) => {
            resolve(true);
            res.resume();
        });
        req.on('error', () => resolve(false));
        req.setTimeout(3000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

/**
 * Check if a model is already downloaded.
 */
function checkModelExists(model) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({ name: model });
        const req = http.request({
            hostname: OLLAMA_HOSTNAME,
            port: OLLAMA_PORT,
            path: '/api/show',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve(res.statusCode === 200);
            });
        });
        req.on('error', () => resolve(false));
        req.write(postData);
        req.end();
    });
}

/**
 * Download a model from Ollama with streaming progress updates.
 */
function downloadModel(model) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ name: model, stream: true });
        const startTime = Date.now();
        let lastProgressTime = Date.now();
        let lastCompletedBytes = 0;

        const req = http.request({
            hostname: OLLAMA_HOSTNAME,
            port: OLLAMA_PORT,
            path: '/api/pull',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        }, (res) => {
            if (res.statusCode !== 200) {
                let errorData = '';
                res.on('data', (chunk) => { errorData += chunk; });
                res.on('end', () => {
                    reject(new Error(`Ollama API returned status ${res.statusCode}: ${errorData}`));
                });
                return;
            }

            let buffer = '';
            let currentStatus = '';

            res.on('data', (chunk) => {
                buffer += chunk.toString();

                // Process complete JSON lines (newline-delimited JSON stream)
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.trim()) continue;

                    let msg;
                    try {
                        msg = JSON.parse(line);
                    } catch (e) {
                        continue;
                    }

                    // Handle error responses
                    if (msg.error) {
                        reject(new Error(msg.error));
                        return;
                    }

                    // Track status changes
                    if (msg.status && msg.status !== currentStatus) {
                        if (currentStatus) {
                            // Clear the progress line before printing new status
                            process.stdout.write('\r' + ' '.repeat(80) + '\r');
                        }
                        currentStatus = msg.status;

                        if (!msg.total) {
                            // Status message without progress (e.g., "verifying sha256 digest")
                            console.log(`  ${msg.status}`);
                        }
                    }

                    // Show download progress
                    if (msg.total && msg.completed !== undefined) {
                        const percent = Math.min(100, (msg.completed / msg.total) * 100);
                        const bar = drawProgressBar(percent);
                        const downloaded = formatBytes(msg.completed);
                        const total = formatBytes(msg.total);

                        // Calculate speed
                        const now = Date.now();
                        const elapsed = (now - lastProgressTime) / 1000;
                        let speed = '';
                        if (elapsed > 0.5) {
                            const bytesPerSec = (msg.completed - lastCompletedBytes) / elapsed;
                            speed = `${formatBytes(bytesPerSec)}/s`;
                            lastCompletedBytes = msg.completed;
                            lastProgressTime = now;

                            // Estimate time remaining
                            if (bytesPerSec > 0) {
                                const remaining = (msg.total - msg.completed) / bytesPerSec;
                                speed += ` | ETA: ${formatDuration(remaining)}`;
                            }
                        }

                        process.stdout.write(
                            `\r  ${bar} ${percent.toFixed(1)}%  ${downloaded} / ${total}  ${speed}   `
                        );
                    }

                    // Check for completion
                    if (msg.status === 'success') {
                        process.stdout.write('\n');
                        const totalTime = (Date.now() - startTime) / 1000;
                        resolve(totalTime);
                        return;
                    }
                }
            });

            res.on('end', () => {
                // Process any remaining data in buffer
                if (buffer.trim()) {
                    try {
                        const msg = JSON.parse(buffer);
                        if (msg.status === 'success') {
                            process.stdout.write('\n');
                            const totalTime = (Date.now() - startTime) / 1000;
                            resolve(totalTime);
                            return;
                        }
                        if (msg.error) {
                            reject(new Error(msg.error));
                            return;
                        }
                    } catch (e) {
                        // ignore
                    }
                }
                const totalTime = (Date.now() - startTime) / 1000;
                resolve(totalTime);
            });

            res.on('error', (err) => {
                reject(err);
            });
        });

        req.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
                reject(new Error(
                    'Cannot connect to Ollama. Make sure Ollama is running (ollama serve).'
                ));
            } else {
                reject(err);
            }
        });

        // Set a long timeout for large model downloads
        req.setTimeout(30 * 60 * 1000); // 30 minutes

        req.write(postData);
        req.end();
    });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    console.log('');
    console.log('============================================');
    console.log('  LearnQuest Model Downloader');
    console.log('============================================');
    console.log('');
    console.log(`  Model:  ${modelName}`);
    console.log(`  Server: ${OLLAMA_HOST}`);
    console.log('');

    // Step 1: Check if Ollama is running
    process.stdout.write('  Checking Ollama connection... ');
    const isRunning = await checkOllamaRunning();

    if (!isRunning) {
        console.log('FAILED');
        console.log('');
        console.log('  Ollama is not running. Attempting to start it...');

        // Try to start Ollama
        try {
            if (process.platform === 'win32') {
                execSync('start /b ollama serve', { stdio: 'ignore', shell: true });
            } else {
                execSync('ollama serve &', { stdio: 'ignore', shell: true });
            }
            // Wait for it to start
            let started = false;
            for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 1000));
                if (await checkOllamaRunning()) {
                    started = true;
                    break;
                }
            }
            if (!started) {
                console.log('');
                console.error('  ERROR: Could not start Ollama.');
                console.error('  Please start Ollama manually and try again:');
                console.error('    ollama serve');
                console.error('');
                process.exit(1);
            }
            console.log('  Ollama started successfully.');
        } catch (err) {
            console.log('');
            console.error('  ERROR: Ollama is not installed or cannot be started.');
            console.error('  Please install Ollama from https://ollama.com/download');
            console.error('');
            process.exit(1);
        }
    } else {
        console.log('OK');
    }

    // Step 2: Check if model already exists
    process.stdout.write(`  Checking if ${modelName} is already downloaded... `);
    const exists = await checkModelExists(modelName);

    if (exists) {
        console.log('YES');
        console.log('');
        console.log(`  The ${modelName} model is already downloaded and ready.`);
        console.log('  No action needed.');
        console.log('');
        process.exit(0);
    } else {
        console.log('NO');
    }

    // Step 3: Download the model
    console.log('');
    console.log(`  Downloading ${modelName}...`);
    console.log('  This may take several minutes depending on your connection speed.');
    console.log('');

    try {
        const totalTime = await downloadModel(modelName);
        console.log('');
        console.log('  ============================================');
        console.log('  Download Complete!');
        console.log('  ============================================');
        console.log('');
        console.log(`  Model:    ${modelName}`);
        console.log(`  Time:     ${formatDuration(totalTime)}`);
        console.log('');
        console.log('  LearnQuest is ready to use!');
        console.log('');
    } catch (err) {
        console.log('');
        console.error(`  ERROR: Failed to download ${modelName}`);
        console.error(`  ${err.message}`);
        console.error('');
        console.error('  Troubleshooting:');
        console.error('    1. Check your internet connection');
        console.error('    2. Make sure Ollama is running (ollama serve)');
        console.error(`    3. Try manually: ollama pull ${modelName}`);
        console.error('');
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('');
    console.error(`  Unexpected error: ${err.message}`);
    console.error('');
    process.exit(1);
});
