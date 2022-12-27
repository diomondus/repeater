const {app, BrowserWindow, ipcMain, nativeTheme} = require('electron')
const path = require('path')
const storage = require('electron-json-storage')
const os = require("os")
const fs = require('fs')
const exec = require('child_process').exec;

const appStoragePath = os.homedir() + '/.repeater'
let dataPath
let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 512,
        height: 935,
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
        width: 512,
        height: 935,
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
    search('ble')
})

ipcMain.on('load-days', (event, category) => {
    dataPath = appStoragePath + '/' + category
    storage.setDataPath(dataPath)
    storage.keys((error, keys) => {
        if (error) throw error
        event.sender.send('days-loaded', keys)
    })
})

//ipcMain.on('global-train', event => {
//    storage.keys((error, keys) => {
//        if (error) throw error
//        currentDayContent = keys.map(day => storage.getSync(day)).flatMap(e => e)
//        shuffleArray(currentDayContent)
//    })
//})

ipcMain.on('load-day', (event, day) => {
    storage.get(day, (error, content) => {
        if (error) throw error

        event.sender.send('load-day', Object.keys(content).length === 0 ? [] : content)
    })
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

ipcMain.on('hide-img', () => mainWindow.setSize(512, 600))
ipcMain.on('show-img', () => mainWindow.setSize(512, 935))

ipcMain.on('search', (event, text) => {
    const cmd = `grep -R --exclude-dir=pictures --exclude='.DS_Store' '${text}' ${dataPath} | sed 's/.*\\({[^{]*${text}[^}]*}\\).*/\\1/'`
    exec(cmd, (error, stdout, stderr) => {
        let terms = stdout.split('\n').filter(term => term !== '')
        event.sender.send('search', `[${terms}]`)
        console.log('stderr: ' + stderr)
        if (error !== null) {
            console.log('exec error: ' + error)
        }
    })
})
