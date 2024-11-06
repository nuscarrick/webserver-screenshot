(() => {
    ////////////////////////////////////////////////////////////////////////
    ///                                                                    ///
    ///  SCREENSHOT CLIENT SCRIPT FOR FM-DX-WEBSERVER (V1.0)               ///
    ///                                                                    ///
    ///  by Highpoint                last update: 05.11.24                 ///
    ///                                                                    ///
    ///  https://github.com/Highpoint2000/webserver-screenshot             ///
    ///                                                                    ///
    ////////////////////////////////////////////////////////////////////////

    const Width = 1280;		// default width
    const Height = 920; 	// default height
    const Timeout = 1000; 	// default timeout

    ////////////////////////////////////////////////////////////////////////
    
    const plugin_version = 'V1.0';
    const corsAnywhereUrl = 'https://cors-proxy.de:13128/';
    const serverPort = '8090';
    let websocket;
	let picode = '', freq = '', itu = '', city = '', station = '';
    let storedPicode = '', storedFreq = '', storedITU = '', storedCity = '', storedStation = ''; // Store for screenshot

    document.addEventListener('DOMContentLoaded', () => {
        // Initialize input fields
        setupWebSocket(); // Set up WebSocket connection
    });

    const ScreenshotButton = document.createElement('button');

    function initializeScreenshotButton() {
        const buttonWrapper = document.getElementById('button-wrapper') || createDefaultButtonWrapper();

        if (buttonWrapper) {
            ScreenshotButton.id = 'Screenshot';
            ScreenshotButton.classList.add('hide-phone');
            ScreenshotButton.setAttribute('data-tooltip', 'Request screenshot');
            ScreenshotButton.innerHTML = '<strong>SCREENSHOT</strong>';
            ScreenshotButton.style.marginTop = '16px';
            ScreenshotButton.style.marginLeft = '5px';
            ScreenshotButton.style.width = '100px';
            ScreenshotButton.classList.add('bg-color-2');
            ScreenshotButton.style.borderRadius = '0px';
            ScreenshotButton.title = `Plugin Version: ${plugin_version}`;
            buttonWrapper.appendChild(ScreenshotButton);
            ScreenshotButton.addEventListener('click', handleScreenshotRequest); // Add click event listener
            console.log('Screenshot button successfully added.');
        } else {
            console.error('Unable to add button.');
        }
    }

    function createDefaultButtonWrapper() {
        const wrapperElement = document.querySelector('.tuner-info');
        if (wrapperElement) {
            const buttonWrapper = document.createElement('div');
            buttonWrapper.classList.add('button-wrapper');
            buttonWrapper.id = 'button-wrapper';
            wrapperElement.appendChild(buttonWrapper);
            wrapperElement.appendChild(document.createElement('br'));
            return buttonWrapper;
        } else {
            console.error('Standard location not found. Unable to add button.');
            return null;
        }
    }

async function handleScreenshotRequest() {
    // Store the current values for the screenshot filename
    storedPicode = picode;
    storedFreq = freq;
    storedITU = itu;
    storedCity = city;
    storedStation = station;

    // Get the current URL and hostname
    const currentUrl = window.location.href;
    const urlObj = new URL(currentUrl);
    const hostname = urlObj.hostname;

    let url;

    // Check if the hostname is a local IP (127.x.x.x, 192.x.x.x, 10.x.x.x) or localhost
    const isLocalIP = hostname.match(/^(127\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.\d{1,3}\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|::1|localhost)$/);

    if (!isLocalIP) {
        // If hostname is not a local IP, use the current hostname
        url = currentUrl;
    } else {
        // If it's a local IP or localhost, retrieve the external IP
        const externalIP = await getExternalIP();
        const protocol = urlObj.protocol;
        const port = urlObj.port || (protocol === 'http:' ? '80' : '443'); // Set default port based on protocol

        url = `${protocol}//${externalIP}:${port}`; // Build the URL with the external IP
    }

    sendToast('info important', 'Screenshot', `is requested - please wait!`, false, false);
    requestScreenshot(url, Width, Height, Timeout); // Use the new URL
}


async function getExternalIP() {
    return fetch('https://api.ipify.org?format=json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => data.ip); // Gibt die externe IP zurück
}



    function requestScreenshot(url, width, height, timeout) {
        const encodedUrl = encodeURIComponent(url); // Encode the current page URL
        const requestUrl = `${corsAnywhereUrl}http://127.0.0.1:${serverPort}/screenshot?url=${encodedUrl}&width=${width}&height=${height}&timeout=${timeout}`;

        // Log the constructed request URL for debugging
        console.log(`Request URL: ${requestUrl}`);

        fetch(requestUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.blob(); // Get the image as a Blob
            })
            .then(blob => {
                // Generate filename based on the specified format
                const date = new Date();
                const dateString = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
                const timeString = date.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS

                // Build the filename conditionally using stored values
                const parts = [dateString, timeString];

                if (storedFreq) parts.push(storedFreq);
                if (storedPicode) parts.push(storedPicode);
                if (storedStation) parts.push(storedStation);
                if (storedCity) parts.push(storedCity);
                if (storedITU) parts.push(`[${storedITU}]`);

                const filename = parts.filter(Boolean).join('_') + '.png'; // Filter out empty values and join parts with underscore

                // Create a link element for download
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename; // Name of the downloaded file

                // Programmatically click the link to trigger the download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link); // Remove the link from the document

                // Clean up the URL object
                URL.revokeObjectURL(link.href);
            })
            .catch(error => {
                console.error('Error requesting screenshot:', error);
                sendToast('error important', 'Screenshot', `Error: ${error.message}. Please try again.`);
            });
    }

    async function handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data); // Parse the incoming WebSocket message
            picode = (data.pi || '').replace(/\?/g, ''); // Extract pi code from data, removing '?'
            freq = (data.freq || '').replace(/\?/g, ''); // Extract frequency from data, removing '?'
            itu = (data.txInfo.itu || '').replace(/\?/g, ''); // Extract ITU information, removing '?'
            city = (data.txInfo.city || '').replace(/\?/g, ''); // Extract city from transmission info, removing '?'
            station = (data.txInfo.tx || '').replace(/\?/g, ''); // Extract station from transmission info, removing '?'
        } catch (error) {
            console.error("Error processing the message:", error); // Log any errors that occur
        }
    }	
	
    // WebSocket setup function
    async function setupWebSocket() {
        if (!websocket || websocket.readyState === WebSocket.CLOSED) {
            try {
                websocket = await window.socketPromise;

                websocket.addEventListener("open", () => {
                    debugLog("WebSocket connected.");
                });

                websocket.addEventListener("message", handleWebSocketMessage);

                websocket.addEventListener("error", (error) => {
                    debugLog("WebSocket error:", error);
                });

                websocket.addEventListener("close", (event) => {
                    debugLog("WebSocket connection closed, retrying in 5 seconds.");
                    setTimeout(setupWebSocket, 5000);
                });

            } catch (error) {
                debugLog("Error during WebSocket setup:", error);
            }
        }
    }

    setTimeout(initializeScreenshotButton, 1000);

})();
