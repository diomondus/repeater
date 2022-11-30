/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

const electron = require('electron')
const ipc = electron.ipcRenderer
const storage = require('electron-json-storage')
const os = require("os")
const fs = require('fs')
const appStoragePath = os.homedir() + '/.repeater'
let dataPath;

prepare()

function prepare() {
    let categories = document.getElementById("cats").children
    for (let i = 0; i < categories.length; i++) {
        let cat = categories[i].text.toLowerCase()
        const dir = `${appStoragePath}/${cat}`
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
            fs.mkdirSync(dir + '/pictures');
        }
    }

    onCatSelected()
    sessionStorage.setItem("reverse", "true");
}

function loadTerm() {
    const fileName = getSelectedDay()
    storage.get(fileName, function (error, contents) {
        if (error) throw error;

        let prevWord = sessionStorage.getItem("prev")
        if (prevWord !== null) {
            tryPlayText(prevWord)
        }

        if (sessionStorage.getItem('inds') === null) {
            console.log('inds is undefined')
            clearCtrls()
            sessionStorage.removeItem("prev");
            onDaySelected()
            doDirtyHack()
        }

        let indexies = JSON.parse(sessionStorage.getItem('inds'));
        let i = indexies.pop()
        let content = contents[i]

        if (sessionStorage.getItem("reverse") === "false") {
            document.getElementById('orig').value = content.orig;
            document.getElementById('trans').value = '';
            sessionStorage.setItem("trans", content.trans);
        } else {
            document.getElementById('orig').value = '';
            document.getElementById('trans').value = content.trans;
            sessionStorage.setItem("orig", content.orig);
        }

        document.getElementById('image')["src"] = '';
        sessionStorage.setItem("image", content.img);
        document.getElementById('add-info').value = '';
        sessionStorage.setItem("add-info", content.addinfo);

        if (indexies.length === 0) {
            sessionStorage.removeItem('inds')
        } else {
            sessionStorage.setItem('inds', JSON.stringify(indexies));
            sessionStorage.setItem("prev", content.orig);
        }
    });
}

function getSelectedDay() {
    const days = document.getElementById("days");
    return days.options[days.selectedIndex].text.substring(0, 10);
}

function updateTerm() {
    console.log("updateTerm")
    const orig = document.getElementById('orig').value
    if (orig !== '') {
        console.log("updateTerm inside")
        const fileName = getSelectedDay()
        storage.get(fileName, function (error, contents) {
            if (error) throw error
            let filteredContents = contents.filter(c => {
                let b = c.orig !== orig
                if (!b && document.getElementById('image').src.startsWith("data")) {
                    let fileName = c.img
                    let filePath = dataPath + '/pictures/' + fileName
                    fs.unlink(filePath, () => {
                    })
                }
                return b
            })
            saveToFile(fileName, filteredContents)
        });
    }
}

function saveTerm() {
    if (document.getElementById('orig').value !== '') {
        let key = getCurrentDate()
        storage.get(key, function (error, contents) {
            if (error) throw error
            if (Object.keys(contents).length === 0) {
                contents = []
            }
            saveToFile(key, contents)
        });
    }
}

function saveToFile(key, contents) {
    let fileName = uuidv4() + '.png'
    let filePath = dataPath + '/pictures/' + fileName
    let image = document.getElementById('image').src
    if (image.startsWith("data")) {
        fetch(image)
            .then(res => res.blob())
            .then(blob => blob.arrayBuffer())
            .then(ab => fs.writeFile(filePath, Buffer.from(ab), (err) => {
                if (err) throw err

                let orig = document.getElementById('orig').value.toLowerCase()
                tryPlayText(orig)
                contents.push({
                    orig: orig,
                    trans: document.getElementById('trans').value.toLowerCase(),
                    addinfo: document.getElementById('add-info').value,
                    img: fileName
                })
                storage.set(key, contents, function (error) {
                    if (error) throw error;
                });
                clearCtrls()
            }))
    } else {
        let split = document.getElementById('image').src.split('/')
        let imgName = split[split.length - 1]
        contents.push({
            orig: document.getElementById('orig').value.toLowerCase(),
            trans: document.getElementById('trans').value.toLowerCase(),
            addinfo: document.getElementById('add-info').value,
            img: imgName
        })
        storage.set(key, contents, function (error) {
            if (error) throw error;
        });
        clearCtrls()
    }
}

function showTerm() {
    if (sessionStorage.getItem("reverse") === 'false') {
        document.getElementById('trans').value = sessionStorage.getItem("trans")
    } else {
        document.getElementById('orig').value = sessionStorage.getItem("orig")
    }
    document.getElementById('add-info').value = sessionStorage.getItem("add-info")
}

function showAsso() {
    document.getElementById('image').src = dataPath + '/pictures/' + sessionStorage.getItem("image")
}

function loadDays() {
    clearCtrls()
    let days = document.getElementById("days");
    if (days.hasChildNodes()) {
        days.innerHTML = ''
    }
    storage.keys(function (error, keys) {
        if (error) throw error;

        const today = getCurrentDate();
        const days = document.getElementById("days");
        keys.sort()
            .reverse()
            .map(key => createOption(key, today))
            .forEach(option => days.appendChild(option))
        days.selectedIndex = '0'
    })
}

function createOption(date, today) {
    let option = document.createElement("option");
    let daysDiff = (new Date(today).getTime() - new Date(date).getTime()) / 86400000
    switch (daysDiff) {
        case 0:
            option.innerHTML = date
            break
        case 1:
            option.innerHTML = `${date} (-${daysDiff} day)`
            break
        default:
            option.innerHTML = `${date} (-${daysDiff} days)`
            break
    }
    return option;
}

function reverse() {
    let mode = sessionStorage.getItem("reverse") === "false" ? "true" : "false"
    sessionStorage.setItem("reverse", mode)
}

function onDaySelected() {
    console.log("onDaySelected")
    const e = document.getElementById("days");
    if (e.children.length !== 0) {
        const text = e.options[e.selectedIndex].text.substring(0, 10);
        storage.get(text, function (error, contents) {
            const indexies = [...Array(contents.length).keys()];
            shuffleArray(indexies)
            sessionStorage.setItem('inds', JSON.stringify(indexies));
            sessionStorage.removeItem('prev');
        })
    }
}

function onCatSelected() {
    const cats = document.getElementById("cats");
    const cat = cats.options[cats.selectedIndex].text.toLowerCase()
    dataPath = appStoragePath + '/' + cat
    storage.setDataPath(dataPath)
    loadDays()
    onDaySelected()
}

function clearCtrls() {
    document.getElementById('orig').value = ''
    document.getElementById('image').src = ''
    document.getElementById('trans').value = ''
    document.getElementById('add-info').value = ''
}

function doDirtyHack() {
    if (sessionStorage.getItem('firstLaunch') === null) {
        try {
            sessionStorage.setItem('firstLaunch', '0')
            loadTerm()
        } catch (e) {
        }
    }
}

document.addEventListener('keydown', function (event) {
    if (event.metaKey) {
        switch (event["keyCode"]) {
            case 74: // j
                loadTerm()
                break
            case 75: // k
                showAsso()
                break
            case 76: // l
                showTerm()
                break
            case 85: // u
                reverse()
                break
            case 83: // s
                event.shiftKey ? updateTerm() : saveTerm()
                break
            case 79: // o
                const fileName = getSelectedDay()
                ipc.send('show-content', dataPath, fileName)
                break
        }
    }
});

document.onpaste = function (pasteEvent) {
    const item = pasteEvent.clipboardData.items[0]
    if (item.type.indexOf("image") === 0) {
        const reader = new FileReader()
        reader.onload = function (event) {
            document.getElementById("image").src = event.target.result
        };
        const blob = item.getAsFile()
        reader.readAsDataURL(blob)
    }
}
