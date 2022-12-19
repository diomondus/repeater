const {app, BrowserWindow, ipcMain, nativeTheme} = require('electron')
const path = require('path')
const storage = require('electron-json-storage')
const os = require("os")
const fs = require('fs')
const appStoragePath = os.homedir() + '/.repeater'
var dataPath
var currentDayContent = []
var currDay
var isReversed = false
var wasLast = true

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 400,
        height: 850,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })
    mainWindow.loadFile('src/html/index.html')
//    mainWindow.webContents.openDevTools()
    nativeTheme.themeSource = 'system'
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
ipcMain.on('show-content', function (event, fileName) {
    let win = new BrowserWindow({
        width: 400,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })
//    win.webContents.openDevTools()
    win.loadFile('src/html/content.html')
    win.webContents.once('dom-ready', () => {
        storage.get(fileName, function (error, contents) {
            if (error) throw error
            win.webContents.send('show-content', fileName, contents)
        })
    })
})

ipcMain.on('init-dirs', (event, categories) => {
    categories.forEach(category => {
        const dir = `${appStoragePath}/${category}`
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
            fs.mkdirSync(dir + '/pictures')
        }
    })
    event.sender.send('dirs-inited')
})

ipcMain.on('load-days', (event, category) => {
    dataPath = appStoragePath + '/' + category
    storage.setDataPath(dataPath)
    storage.keys((error, keys) => {
        if (error) throw error
        event.sender.send('days-loaded', keys)
    })
})

ipcMain.on('on-day-selected', (event, day) => {
    currDay = day
    currentDayContent = []
    wasLast = true
})

ipcMain.on('set-reversable', (event, mode) => {
    isReversed = mode === 'true'
    currentDayContent = []
    wasLast = true
})

ipcMain.on('global-train', event => {
    storage.keys((error, keys) => {
        if (error) throw error
        currentDayContent = keys.map(day => storage.getSync(day)).flatMap(e => e)
        shuffleArray(currentDayContent)
    })
})

ipcMain.on('load-term', event => {
    if (currentDayContent.length === 0) {
        if (!wasLast) {
            wasLast = true
            event.sender.send('load-term', currentDayContent.pop())
        } else {
            wasLast = false
            storage.get(currDay, (error, contents) => {
                if (error) throw error
                currentDayContent = isReversed ? prepareTerms(contents) : contents
                shuffleArray(currentDayContent)
                event.sender.send('load-term', currentDayContent.pop())
            })
        }
    } else {
        event.sender.send('load-term', currentDayContent.pop())
    }
})

ipcMain.on('get-data-path', event => {
    event.sender.send('receive-data-path', dataPath)
})

ipcMain.on('save-all', (event, fileName, term) => {
    storage.get(fileName, (error, contents) => {
        contents = Object.keys(contents).length === 0 ? [] : contents.filter(c => c.orig !== term.orig)
        contents.push(term)
        storage.set(fileName, contents, error => {
            if (error) throw error
            event.sender.send('saved-all')
        })
    })
})

ipcMain.on('save-all-with-picture', (event, fileName, imgName, imgBufer, term) => {
    let filePath = dataPath + '/pictures/' + imgName
    fs.writeFile(filePath, Buffer.from(imgBufer), error => {
        if (error) throw error
        storage.get(fileName, (error, contents) => {
            if (error) throw error
            contents = Object.keys(contents).length === 0 ? [] : contents.filter(c => {
                if (c.orig === term.orig) {
                    let filePath = dataPath + '/pictures/' + c.img
                    fs.unlink(filePath, () => {})
                }
                return c.orig !== term.orig
            })
            contents.push(term)
            storage.set(fileName, contents, error => {
                if (error) throw error
                event.sender.send('saved-all')
            })
        })
    })
})

function prepareTerms(contents) {
    return contents.map(term => term.trans.split(', ').map(trans => {
        const cloneTerm = Object.assign({}, term);
        cloneTerm.trans = trans
        return cloneTerm
    })).flatMap(e => e)
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}