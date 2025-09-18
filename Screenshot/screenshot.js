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
  ////////////////////////////////////////////////////////////////////////

  const plugin_version = 'V1.2';
  let websocket;
  let picode = '', freq = '', itu = '', city = '', station = '';

  document.addEventListener('DOMContentLoaded', () => {
      setupWebSocket(); // Set up the WebSocket connection
      
      $('head').append('<style>.ui-dialog .ui-dialog-titlebar { display: none !important; } .ui-dialog-content { display: flex; justify-content: center; align-items: center; }</style>');

      $('body').append($('<div>').attr('title', 'Screenshot request').attr('id', 'screenshot-dialog').attr('style', 'display: none;').html('<div>Waiting for the screenshot. It will take about 30 seconds <span class = "fa fa-spinner fa-spin"></span></div>'));
  });

  function showDialog() {
    $('#screenshot-dialog').dialog({
        modal: true,
        closeOnEscape: false,
        draggable: false,
        resizable: false,
        position: {my: "center", at: "center", of: window}
    });
  }

  function closeDialog() {
    $('#screenshot-dialog').dialog('close');
  }

  async function handleScreenshotRequest() {
      const date = new Date();
      const dateString = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      const timeString = date.toTimeString().slice(0, 8).replace(/:/g, '');  // HHMMSS

      const parts = [dateString, timeString];
      if (freq) parts.push(freq);
      if (picode) parts.push(picode);
      if (station) parts.push(station);
      if (city) parts.push(city);
      if (itu) parts.push(`[${itu}]`);

      const filename = parts.filter(Boolean).join('_') + '.png';
      showDialog();
      fetch('https://screenshot.fmscan.com/take-screenshot', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              filename: filename,
              pageURL: window.location.href,
          }),
          credentials: 'include'
      }).then(response => response.json())
        .then(data => {
          console.log(data);
          if (data.success) {
              const link = document.createElement('a');
              fetch(data.imageURL).then(response => response.blob()).then(blob => {
                  const url = URL.createObjectURL(blob);
                  link.href = url;
                  link.download = filename;
                  link.click();
                  URL.revokeObjectURL(url);
                  sendToast('success', 'Screenshot', `Screenshot saved as ${filename}`, false, false);
                  closeDialog();
              });
              return;
          }
          if (data.errorCode === 'AUTH_TOKEN_REQUIRED') {
              window.location.reload();
          }
        }).catch(error => {
            console.error(error);
            sendToast('error', 'Screenshot', `Screenshot failed: ${error}`, false, false);
            closeDialog();
        });
      return;
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
