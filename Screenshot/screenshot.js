////////////////////////////////////////////////////////////////
///                                                          ///
///  SCREENSHOT CLIENT SCRIPT FOR FM-DX-WEBSERVER (V1.0)     ///
///                                                          ///
///  by Highpoint                last update: 03.11.24       ///
///                                                          ///
///  https://github.com/Highpoint2000/webserver-screenshot   ///
///                                                          ///
////////////////////////////////////////////////////////////////

(() => {
    const plugin_version = 'V1.0';
    let wsSendSocket;

    const currentURL = new URL(window.location.href);
    const WebserverURL = currentURL.hostname;
    const WebserverPath = currentURL.pathname.replace(/setup/g, '');
    const WebserverPORT = currentURL.port || (currentURL.protocol === 'https:' ? '443' : '80');

    document.addEventListener('DOMContentLoaded', () => {
        const protocol = currentURL.protocol === 'https:' ? 'wss:' : 'ws:';
        const imageProtocol = currentURL.protocol;

        const webSocketUrl = `${protocol}//${WebserverURL}:${WebserverPORT}/data_plugins`;
        const ws = new WebSocket(webSocketUrl);

        ws.onopen = () => {
            console.log('Screenshot WebSocket-Verbindung hergestellt');
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            if (message.type === 'Screenshot' && message.value === 'saved') {
                const link = document.createElement('a');
                link.href = `${imageProtocol}//${WebserverURL}:${WebserverPORT}/images/screenshot.png`; // Use the received filename
                link.download = message.name; // Use the received filename for download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else if (message.type === 'Error') {
                console.error('Fehler:', message.message);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket-Fehler:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket-Verbindung geschlossen');
        };

        ScreenshotButton.addEventListener('click', () => {
            ws.send(JSON.stringify({ type: 'Screenshot', value: 'create' }));
			sendToast('info', 'Screenshot', `is requested - please wait!`, false, false);
        });
    });

    function setButtonStatus(isActive) {
        if (ScreenshotButton) {
            ScreenshotButton.classList.toggle('bg-color-4', isActive);
            ScreenshotButton.classList.toggle('bg-color-2', !isActive);
            AlertActive = isActive;
        }
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
            ScreenshotButton.addEventListener('mousedown', startPressTimer);
            ScreenshotButton.addEventListener('mouseup', cancelPressTimer);
            ScreenshotButton.addEventListener('mouseleave', cancelPressTimer);
            console.log('Alert button successfully added.');
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
            buttonWrapper.appendChild(ScreenshotButton);
            wrapperElement.appendChild(buttonWrapper);
            wrapperElement.appendChild(document.createElement('br'));
            return buttonWrapper;
        } else {
            console.error('Standard location not found. Unable to add button.');
            return null;
        }
    }

    setTimeout(initializeScreenshotButton, 1000);
})();
