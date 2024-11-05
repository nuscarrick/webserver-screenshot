////////////////////////////////////////////////////////////////
///                                                          ///
// SCREENSHOT SERVER SCRIPT FOR FM-DX-WEBSERVER (V1.0)       ///
//                                                           ///
// by Highpoint                last update: 05.11.24         ///
//                                                           ///
// https://github.com/Highpoint2000/webserver-screenshot     ///
//                                                           ///
////////////////////////////////////////////////////////////////

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { logInfo, logError } = require('./../../server/console');
const config = require('./../../config.json');
const webserverPort = config.webserver.webserverPort;
const externalWsUrl = `ws://127.0.0.1:${webserverPort}`;
let TextSocket;
let data_pluginsWs;

// Variables for station information
let frequency, picode, station, city, itu;

// Function to check and install missing modules
const { execSync } = require('child_process');
const NewModules = [
    'puppeteer',
];

function checkAndInstallNewModules() {
    NewModules.forEach(module => {
        const modulePath = path.join(__dirname, './../../node_modules', module);
        if (!fs.existsSync(modulePath)) {
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

// Check and install modules before starting the server
checkAndInstallNewModules();

const puppeteer = require('puppeteer');

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

async function captureScreenshot() {
    // Launch Puppeteer in headless mode
    const browser = await puppeteer.launch({
        headless: true, // Run in headless mode
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage', // Overcome limited resource problems
            '--disable-gpu', // Applicable for certain environments
            '--window-size=1280,800' // Set a default window size
        ],
        ignoreHTTPSErrors: true // Ignore HTTPS errors for local development
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 }); // Set viewport size

        // Navigate to the web server URL
        await page.goto(`http://127.0.0.1:${webserverPort}`, { waitUntil: 'networkidle2' });

        // Short delay to ensure the page has loaded fully
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1500))); // waits for 1.5 seconds

        // Prepare the directory for saving screenshots
        const screenshotsDir = path.resolve(__dirname, './../../web/images');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true }); // Create the directory if it doesn't exist
        }

        // Generate the screenshot file path
        const screenshotPath = path.join(screenshotsDir, `screenshot.png`);
        
        // Take the screenshot and save it
        await page.screenshot({ path: screenshotPath, fullPage: true });

        return screenshotPath; // Return the path of the saved screenshot
    } finally {
        await browser.close(); // Ensure the browser closes after screenshot capture
    }
}

// Start the WebSocket connections
setupTextSocket();
setupDataPluginsWebSocket();
