(() => {
    ////////////////////////////////////////////////////////////////////////
    ///                                                                  ///
    ///  SCREENSHOT CLIENT SCRIPT FOR FM-DX-WEBSERVER (V1.2)             ///
    ///                                                                  ///
    ///  by Highpoint                last update: 17.02.25               ///
    ///                                                                  ///
    ///  https://github.com/Highpoint2000/webserver-screensho            ///
    ///                                                                  ///
    ////////////////////////////////////////////////////////////////////////
	
	///  This plugin only works from web server version 1.3.5 !!!

    const Width = 1280;        // default width
    const Height = 920;        // default height
    const Timeout = 1500;      // default timeout

    ////////////////////////////////////////////////////////////////////////

    const plugin_version = 'V1.2';
    const corsAnywhereUrl = 'https://cors-proxy.de:13128/';
    const serverPort = '8090';
    let websocket;
    let picode = '', freq = '', itu = '', city = '', station = '';
    let storedPicode = '', storedFreq = '', storedITU = '', storedCity = '', storedStation = ''; // Values stored for the screenshot filename

    document.addEventListener('DOMContentLoaded', () => {
        setupWebSocket(); // Set up the WebSocket connection
    });

    async function handleScreenshotRequest() {
        // Store current values for the filename
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
            // For an external hostname, use the current URL
            url = currentUrl;
        } else {
            // For a local IP or localhost, retrieve the external IP
            const externalIP = await getExternalIP();
            const protocol = urlObj.protocol;
            const port = urlObj.port || (protocol === 'http:' ? '80' : '443'); // Default port based on the protocol

            url = `${protocol}//${externalIP}:${port}`; // Build the URL using the external IP
        }

        sendToast('info important', 'Screenshot', `is requested - please wait!`, false, false);
        requestScreenshot(url, Width, Height, Timeout);
    }

    async function getExternalIP() {
        return fetch('https://api.ipify.org?format=json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => data.ip);
    }

    function requestScreenshot(url, width, height, timeout) {
        const encodedUrl = encodeURIComponent(url);
        const requestUrl = `${corsAnywhereUrl}http://127.0.0.1:${serverPort}/screenshot?url=${encodedUrl}&width=${width}&height=${height}&timeout=${timeout}`;

        console.log(`Request URL: ${requestUrl}`);

        fetch(requestUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                const date = new Date();
                const dateString = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
                const timeString = date.toTimeString().slice(0, 8).replace(/:/g, '');  // HHMMSS

                const parts = [dateString, timeString];

                if (storedFreq) parts.push(storedFreq);
                if (storedPicode) parts.push(storedPicode);
                if (storedStation) parts.push(storedStation);
                if (storedCity) parts.push(storedCity);
                if (storedITU) parts.push(`[${storedITU}]`);

                const filename = parts.filter(Boolean).join('_') + '.png';

                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(link.href);
            })
            .catch(error => {
                console.error('Error requesting screenshot:', error);
                sendToast('error important', 'Screenshot', `Error: ${error.message}. Please try again.`);
            });
    }

    async function handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            picode = (data.pi || '').replace(/\?/g, '');
            freq = (data.freq || '').replace(/\?/g, '');
            itu = (data.txInfo.itu || '').replace(/\?/g, '');
            city = (data.txInfo.city || '').replace(/\?/g, '');
            station = (data.txInfo.tx || '').replace(/\?/g, '');
        } catch (error) {
            console.error("Error processing the message:", error);
        }
    }

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

    // ───────────────────────────────────────────────────────────────
    // New button: creation and assignment of event listeners
    function createButton(buttonId) {
      (function waitForFunction() {
        const maxWaitTime = 10000;
        let functionFound = false;

        const observer = new MutationObserver((mutationsList, observer) => {
          if (typeof addIconToPluginPanel === 'function') {
            observer.disconnect();
            // Create the button using the plugin panel
            addIconToPluginPanel(buttonId, "Screenshot", "solid", "print", `Plugin Version: ${plugin_version}`);
            functionFound = true;

            const buttonObserver = new MutationObserver(() => {
              const $pluginButton = $(`#${buttonId}`);
              if ($pluginButton.length > 0) {
                // Statt langer Druckdauer wird nun ein einfacher Klick verwendet:
                $pluginButton.on('click', handleScreenshotRequest);
                buttonObserver.disconnect();
              }
            });
            buttonObserver.observe(document.body, { childList: true, subtree: true });
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
          observer.disconnect();
          if (!functionFound) {
            console.error(`Function addIconToPluginPanel not found after ${maxWaitTime / 1000} seconds.`);
          }
        }, maxWaitTime);
      })();

      // Additional CSS adjustments for the new button
      const aScreenshotCss = `
        #${buttonId}:hover {
          color: var(--color-5);
          filter: brightness(120%);
        }
      `;
      $("<style>")
        .prop("type", "text/css")
        .html(aScreenshotCss)
        .appendTo("head");
    }

    // Create the button with the ID 'Screenshot'
    createButton('Screenshot');
})();
