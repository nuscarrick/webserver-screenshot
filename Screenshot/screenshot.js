////////////////////////////////////////////////////////////////
///                                                          ///
///  SCREENSHOT CLIENT SCRIPT FOR FM-DX-WEBSERVER (V1.0)     ///
///                                                          ///
///  by Highpoint                last update: 05.11.24       ///
///                                                          ///
///  https://github.com/Highpoint2000/webserver-screenshot   ///
///                                                          ///
////////////////////////////////////////////////////////////////

(() => {

    const defaultWidth = 1280;		// default 1280 
    const defaultHeight = 920; 		// default 920 
    const defaultTimeout = 1000; 	// default 1000 
	
////////////////////////////////////////////////////////////////	
	
	const plugin_version = 'V1.0';

    // Fixed server address
    const serverAddress = 'http://89.58.28.164:8090';

    document.addEventListener('DOMContentLoaded', () => {
        // Initialize input fields and screenshot button
        initializeScreenshotButton();
        initializeParametersInput();
    });

    function initializeParametersInput() {
        const inputWrapper = document.createElement('div');
        inputWrapper.style.marginTop = '16px';

        // Width input field
        const widthInput = document.createElement('input');
        widthInput.id = 'widthInput';
        widthInput.placeholder = `Width (default ${defaultWidth})`;
        widthInput.type = 'number';
        widthInput.value = defaultWidth;

        // Height input field
        const heightInput = document.createElement('input');
        heightInput.id = 'heightInput';
        heightInput.placeholder = `Height (default ${defaultHeight})`;
        heightInput.type = 'number';
        heightInput.value = defaultHeight;

        // Timeout input field
        const timeoutInput = document.createElement('input');
        timeoutInput.id = 'timeoutInput';
        timeoutInput.placeholder = `Timeout (default ${defaultTimeout} ms)`;
        timeoutInput.type = 'number';
        timeoutInput.value = defaultTimeout;

        // Append inputs to the input wrapper
        inputWrapper.appendChild(widthInput);
        inputWrapper.appendChild(heightInput);
        inputWrapper.appendChild(timeoutInput);
        document.body.appendChild(inputWrapper);
    }

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

    function handleScreenshotRequest() {
        const width = document.getElementById('widthInput').value.trim() || defaultWidth;
        const height = document.getElementById('heightInput').value.trim() || defaultHeight;
        const timeout = document.getElementById('timeoutInput').value.trim() || defaultTimeout;

        // Use the current page URL for the screenshot request
        const url = window.location.href;

        // Log the requested URL to the console
        console.log(`Requesting screenshot for URL: ${url} with width: ${width}, height: ${height}, timeout: ${timeout}`);

        requestScreenshot(url, width, height, timeout);
    }

    function requestScreenshot(url, width, height, timeout) {
        const encodedUrl = encodeURIComponent(url); // Encode the current page URL
        const requestUrl = `${serverAddress}/screenshot?url=${encodedUrl}&width=${width}&height=${height}&timeout=${timeout}`;

        // Log the constructed request URL for debugging
        console.log(`Constructed request URL: ${requestUrl}`);
		sendToast('info', 'Screenshot', `is requested - please wait!`, false, false);

        fetch(requestUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.blob(); // Get the image as a Blob
            })
            .then(blob => {
                // Create a link element for download
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'screenshot.png'; // Name of the downloaded file

                // Programmatically click the link to trigger the download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link); // Remove the link from the document

                // Clean up the URL object
                URL.revokeObjectURL(link.href);
            })
            .catch(error => {
                console.error('Error requesting screenshot:', error);
                alert(`Failed to capture screenshot. Error: ${error.message}. Please try again.`);
            });
    }

})();
