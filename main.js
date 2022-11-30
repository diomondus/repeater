const {app, BrowserWindow} = require('electron')
const path = require('path')
const electron = require('electron')
const ipc = electron.ipcMain
const storage = require('electron-json-storage')
const os = require("os")
const fs = require('fs')
const appStoragePath = os.homedir() + '/.repeater'
let dataPath

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 350,
        height: 750,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModeule: false,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })
    mainWindow.loadFile('index.html')
//    mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipc.on('show-content', function (event, fileName) {
    let win = new BrowserWindow({
        width: 300,
        height: 650,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })
//    win.webContents.openDevTools()
    win.loadFile('content.html')
    win.webContents.once('dom-ready', () => {
        storage.get(fileName, function (error, contents) {
            if (error) throw error
            win.webContents.send('show-content', fileName, contents)
        })
    })
})

ipc.on('load-term', (event, fileName) => {
    storage.get(fileName, function (error, content) {
        if (error) throw error
        event.sender.send('load-term', content)
    })
})

ipc.on('init-dirs', (event, categories) => {
    categories.forEach(category => {
        const dir = `${appStoragePath}/${category}`
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
            fs.mkdirSync(dir + '/pictures')
        }
    })
    event.sender.send('dirs-inited')
})

ipc.on('init-data-path', (event, category) => {
    dataPath = appStoragePath + '/' + category
    storage.setDataPath(dataPath)
    event.sender.send('data-path-inited')
})

ipc.on('load-days', (event) => {
    storage.keys((error, keys) => {
        if (error) throw error
        event.sender.send('load-days', keys)
    })
})

ipc.on('on-day-selected', (event, day) => {
    storage.get(day, (error, contents) => {
        if (error) throw error
        event.sender.send('on-day-selected', contents)
    })
})

ipc.on('get-data-path', event => {
    event.sender.send('receive-data-path', dataPath)
})

ipc.on('save-term', (event, key) => {
    storage.get(key, (error, contents) => {
        if (error) throw error
        if (Object.keys(contents).length === 0) {
            contents = []
        }
        event.sender.send('save-term', key, contents)
    })
})

ipc.on('update-term', (event, fileName) => {
    storage.get(fileName, (error, contents) => {
        if (error) throw error
        event.sender.send('update-term', fileName, contents)
    })
})

ipc.on('remove-picture', (event, fileName) => {
    let filePath = dataPath + '/pictures/' + fileName
    fs.unlink(filePath, () => {
    })
})

ipc.on('save-all', (event, fileName, contents) => {
    storage.set(fileName, contents, error => {
        if (error) throw error
        event.sender.send('saved-all')
    })
})

ipc.on('save-all-with-picture', (event, fileName, imgName, imgBufer, contents) => {
    let filePath = dataPath + '/pictures/' + imgName
    fs.writeFile(filePath, imgBufer, (err) => {
        if (err) throw err
        storage.set(fileName, contents, error => {
            if (error) throw error
            event.sender.send('saved-all')
        })
    })
})
