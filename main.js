const electron = require('electron')
    // Module to control application life.
const app = electron.app
    // Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

const ipc = electron.ipcMain
const Menu = electron.Menu
const Tray = electron.Tray
const shell = electron.shell

let appIcon = null


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let aboutWindow

ipc.on('hideApp', function () {
    mainWindow.hide();
});

ipc.on('openLink', function (event, arg) {
    shell.openExternal(arg)
});

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: false,
        frame: false,
        resizable: false,
        movable: false,
        vibrancy: 'dark'
    })

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    //mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })

    mainWindow.on('ready-to-show', function () {
        showWindow();

    });
}


function createTrayWindow() {
    const iconName = 'icon-weather.png';
    const iconPath = path.join(__dirname, 'assets/', iconName)
    tray = new Tray(iconPath)

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'About',
            click: function () {
                if (!aboutWindow)
                    createAboutWindow();
                else
                    aboutWindow.focus();
            }
        }, {
            type: 'separator'
        },
        {
            label: 'Quit',
            click: function () {
                app.quit();
            }
        }
  ])

    tray.on('click', function (event) {
        toggleWindow();

        /*if (mainWindow.isVisible() && event.metaKey) {
            mainWindow.openDevTools({
                mode: 'detach'
            });
        }*/
    })

    tray.on('double-click', function (event) {
        toggleWindow();
    })

    tray.on('right-click', function (event) {
        tray.popUpContextMenu(contextMenu)
    });
}

function toggleWindow() {
    if (mainWindow.isVisible()) {
        mainWindow.hide();
    } else {
        showWindow();
    }
}


function showWindow() {
    const trayPos = tray.getBounds()
    const windowPos = mainWindow.getBounds()
    let x, y = 0

    if (process.platform == 'darwin') {
        x = Math.round(trayPos.x + (trayPos.width / 2) - (windowPos.width / 2))
        y = Math.round(trayPos.y + trayPos.height)
    } else {
        x = Math.round(trayPos.x + (trayPos.width / 2) - (windowPos.width / 2))
        y = Math.round(trayPos.y + trayPos.height * 10)
    }

    mainWindow.setPosition(x, y, false)
    mainWindow.show()
    mainWindow.focus()

}


function createAboutWindow() {

    const modalPath = path.join('file://', __dirname, '/about.html')

    aboutWindow = new BrowserWindow({
        width: 450,
        height: 450,
        resizable: false,
        show: false,
        frame: true,
        vibrancy: 'dark'
    });

    aboutWindow.on('close', function () {
        aboutWindow = null
    });

    aboutWindow.loadURL(modalPath)

    aboutWindow.on('ready-to-show', function () {
        aboutWindow.show();
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
    app.dock.hide()
    createWindow();
    createTrayWindow();
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.dock.hide()
        app.quit()
    }
})

app.on('browser-window-blur', function () {
    mainWindow.hide();
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
