# Screenshot Plugin for [FM-DX-Webserver](https://github.com/NoobishSVK/fm-dx-webserver)

This plugin generates screenshots of the web server.

![image](https://github.com/user-attachments/assets/7fbd8625-c797-4c6b-8533-84a9bf9d11e0)



## Version 1.0

## Installation notes:

1. [Download](https://github.com/Highpoint2000/webserver-screenshot/releases) the last repository as a zip
2. Unpack all files from the plugins folder to ..fm-dx-webserver-main\plugins\ 
3. Stop or close the fm-dx-webserver
4. Start/Restart the fm-dx-webserver with "npm run webserver" on node.js console, check the console informations
5. Activate the Screenshot plugin in the settings
6. Stop or close the fm-dx-webserver
7. Start/Restart the fm-dx-webserver with "npm run webserver" on node.js console, check the console informations

## Configuration options:

The following variables can be changed in the header of the screenshot.js:

    const defaultWidth = 1280;	// default is: 1280 
    const defaultHeight = 920; 	// default is: 920 
    const defaultTimeout = 1000; 	    // default is: 1000 

## Important notes:

- The loading time of the screenshot depends on the number of elements (installed plugins)
- Since the screenshot is created by reloading the web server on the server side, only the elements that are active when loading are displayed
