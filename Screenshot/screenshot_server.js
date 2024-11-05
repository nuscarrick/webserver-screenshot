////////////////////////////////////////////////////////////////
///                                                          ///
///  SCREENSHOT SERVER SCRIPT FOR FM-DX-WEBSERVER (V1.0)     ///
///                                                          ///
///  by Highpoint                last update: 05.11.24       ///
///                                                          ///
///  https://github.com/Highpoint2000/webserver-screenshot   ///
///                                                          ///
////////////////////////////////////////////////////////////////

// Window size configuration
const WINDOW_WIDTH = 1280; // Define your desired width
const WINDOW_HEIGHT = 1024; // Define your desired height

////////////////////////////////////////////////////////////////

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { logInfo, logError } = require('./../../server/console');
const config = require('./../../config.json');
const webserverPort = config.webserver.webserverPort;
const externalWsUrl = `ws://127.0.0.1:${webserverPort}`;
let TextSocket;
let data_pluginsWs;

// Function to check and install missing modules
const NewModules = [
    'playwright'
];

function checkAndInstallNewModules() {
    NewModules.forEach(module => {
        try {
            require.resolve(module); // Check if module is available
        } catch (error) {
            // If the module is not available, install it
            logInfo(`Module ${module} is missing. Installing...`);
            try {
                execSync(`npm install ${module}`, { stdio: 'inherit' });
                logInfo(`Module ${module} installed successfully.`);
            } catch (error) {
                logError(`Error installing module ${module}:`, error);
                process.exit(1); // Exit the process with an error code
            }
        }
    });
}

// Function to install Playwright browsers
function installPlaywrightBrowsers() {
    logInfo("Installing Playwright browsers...");
    try {
        execSync('npx playwright install', { stdio: 'inherit' });
        logInfo("Playwright browsers installed successfully.");
    } catch (error) {
        logError("Error installing Playwright browsers:", error);
        process.exit(1); // Exit the process with an error code
    }
}

// Check and install modules and browsers before starting the server
checkAndInstallNewModules();
installPlaywrightBrowsers();

// Import Playwright after installation
const { chromium } = require('playwright');

// Variables for station information
let frequency, picode, station, city, itu;

// Setup TextSocket WebSocket connection
async function setupTextSocket() {
    if (!TextSocket || TextSocket.readyState === WebSocket.CLOSED) {
        try {
            TextSocket = new WebSocket(`${externalWsUrl}/text`);

            TextSocket.addEventListener("open", () => {
                logInfo("Screenshot Text WebSocket connected");
            });

            TextSocket.addEventListener("message", handleTextSocketMessage);

            TextSocket.addEventListener("error", (error) => {
                logError("TextSocket error:", error);
            });

            TextSocket.addEventListener("close", () => {
                logInfo("TextSocket closed, retrying...");
                setTimeout(setupTextSocket, 5000); // Retry connection after 5 seconds
            });

        } catch (error) {
            logError("Failed to setup TextSocket:", error);
            setTimeout(setupTextSocket, 5000); // Retry connection after 5 seconds
        }
    }
}

async function handleTextSocketMessage(event) {
    try {
        const eventData = JSON.parse(event.data);
        // Update global variables for filename creation
        frequency = eventData.freq;
        picode = eventData.pi ? eventData.pi.replace(/\?/g, '') : ""; // Remove '?' from picode
        station = eventData.txInfo?.tx || "";
        city = eventData.txInfo?.city || "";
        itu = eventData.txInfo?.itu || "";

    } catch (error) {
        logError("Error handling TextSocket message:", error);
    }
}

function setupDataPluginsWebSocket() {
    data_pluginsWs = new WebSocket(`${externalWsUrl}/data_plugins`);

    data_pluginsWs.on('open', () => {
        logInfo("Screenshot data_plugins WebSocket connected");
    });

    data_pluginsWs.on('message', async (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            
            if (parsedMessage.type === 'Screenshot' && parsedMessage.value === 'create') {
                const screenshotPath = await captureScreenshot();
                
                const now = new Date();
                const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                const formattedTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

                // Initialize the filename parts with the date and time
                let filename = `${formattedDate}_${formattedTime}_${frequency}`;
            
                // Append each part only if it has a non-empty, non-whitespace value
                if (picode && picode.trim()) filename += `_${picode}`;
                if (station && station.trim()) filename += `_${station}`;
                if (city && city.trim()) filename += `_${city}`;
                if (itu && itu.trim()) filename += `[${itu}]`;

                // Add the file extension
                filename += `.png`;
                
                logInfo(`Screenshot created: ${filename}`);
                data_pluginsWs.send(JSON.stringify({ type: 'Screenshot', value: 'saved', name: filename }));
            }
        } catch (error) {
            logError('Error processing message:', error);
        }
    });

    data_pluginsWs.on('error', (error) => logError("Screenshot data_plugins WebSocket error:", error));

    data_pluginsWs.on('close', () => {
        logInfo("data_plugins WebSocket closed, retrying...");
        setTimeout(setupDataPluginsWebSocket, 5000); // Retry connection after 5 seconds
    });
}

// Capture screenshot using Playwright
async function captureScreenshot() {
    const browser = await chromium.launch({
        headless: true, // Set to false if you want to see the browser window
        args: [
            '--no-sandbox',
            '--disable-gpu',
            `--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`
        ]
    });

    const page = await browser.newPage();
    
    try {
        // Load the page and wait until fully loaded
        await page.goto(`http://127.0.0.1:${webserverPort}`, { waitUntil: 'networkidle' });

        // Wait for an additional second before taking the screenshot
        await page.waitForTimeout(1000); // Wait for 1 second

        // Define the path for saving the screenshot
        const screenshotsDir = path.resolve(__dirname, './../../web/images');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        const screenshotPath = path.join(screenshotsDir, `screenshot.png`);
        
        // Take the screenshot and save it as a file
        await page.screenshot({ path: screenshotPath });
        
        return screenshotPath;
    } finally {
        await browser.close();
    }
}

// Start the WebSocket connections
setupTextSocket();
setupDataPluginsWebSocket();
