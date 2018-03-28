const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const Splashscreen = require("@trodi/electron-splashscreen");

const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let tray = null;


function createWindow() {


  // Example of ICONS implementation
  // https://github.com/kevinsawicki/tray-example
  tray = new electron.Tray('sniffer-sm-icon.png');
  const contextMenu = electron.Menu.buildFromTemplate([
    {label: 'Open Developer Tool', type: 'radio', click: () => mainWindow.webContents.openDevTools()},
    {label: 'Open Application', type: 'radio',
      click: (event) =>{
        console.log(event);
        console.log(process.defaultApp);
        mainWindow.show()
      }}
  ])
  tray.setToolTip('Sniffer');
  tray.setContextMenu(contextMenu);

    // Create the browser window.
    // mainWindow = new BrowserWindow({width: 1000, height: 900});
  const windowOptions = {
    width: 1000,
    height: 900,
  };
  mainWindow = Splashscreen.initSplashScreen({
    windowOpts: windowOptions,
    templateUrl: path.join(__dirname, "splash.html"),
    delay: 0, // force show immediately since example will load fast
    splashScreenOpts: {
      height: 500,
      width: 500,
    },
  });

    // and load the index.html of the app.
    const startUrl = process.env.ELECTRON_START_URL || url.format({
            pathname: path.join(__dirname, '/../build/index.html'),
            protocol: 'file:',
            slashes: true
        });
    mainWindow.loadURL(startUrl);
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
      console.log("HERE");
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);
// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
  console.log("all closed");
    if (process.platform !== 'darwin') {
        app.quit()
      console.log("officially closed");
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    console.log("Got activated");
    if (mainWindow === null) {
        createWindow()
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
