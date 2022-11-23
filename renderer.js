/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

const storage = require('electron-json-storage');
const os = require("os");
const fs = require('fs');
const appStoragePath = os.homedir() + '/.repeater';
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
    const days = document.getElementById("days");
    const fileName = days.options[days.selectedIndex].text.substring(0, 10);
    storage.get(fileName, function (error, contents) {
        if (error) throw error;

        if (sessionStorage.getItem('inds') === null) {
            console.log('inds is undefined')
            clearCtrls()
            onDaySelected()
            doDirtyHack()
        }
        let prevInd = sessionStorage.getItem("prev")
        const cats = document.getElementById("cats");
        const cat = cats.options[cats.selectedIndex].text
        if (prevInd !== null && cat === 'Words') {
            let prevWord = contents[parseInt(prevInd)].orig
            tryPlayWord(prevWord)
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
            sessionStorage.removeItem("prev");
        } else {
            sessionStorage.setItem('inds', JSON.stringify(indexies));
            sessionStorage.setItem("prev", i);
        }
    });
}

function saveTerm() {
    let key = getCurrentDate()
    storage.get(key, function (error, contents) {
        if (error) throw error
        if (Object.keys(contents).length === 0) contents = []
        saveToFile(key, contents)
    });
}

function saveToFile(key, contents) {
    let fileName = uuidv4() + '.png'
    let filePath = dataPath + '/pictures/' + fileName
    fetch(document.getElementById('image').src)
        .then(res => res.blob())
        .then(blob => blob.arrayBuffer())
        .then(ab => fs.writeFile(filePath, Buffer.from(ab), (err) => {
            if (err) throw err

            contents.push({
                orig: document.getElementById('orig').value.toLowerCase(),
                img: fileName,
                trans: document.getElementById('trans').value.toLowerCase(),
                addinfo: document.getElementById('add-info').value
            })
            storage.set(key, contents, function (error) {
                if (error) throw error;
            });
            clearCtrls()
        }))
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
        days.childNodes.forEach(option => days.removeChild(option))
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
    if (sessionStorage.getItem("reverse") === "false") {
        sessionStorage.setItem("reverse", "true")
    } else {
        sessionStorage.setItem("reverse", "false")
    }
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

function getCurrentDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return mm + '-' + dd + '-' + yyyy;
}

document.addEventListener('keydown', function (event) {
    if (event.metaKey) {
        if (event.key === 'j') {
            loadTerm()
        } else if (event.key === 'k') {
            showAsso()
        } else if (event.key === 'l') {
            showTerm()
        } else if (event.key === 'u') {
            reverse()
        } else if (event.key === 's') {
            saveTerm()
        }
    }
});

document.onpaste = function (pasteEvent) {
    const item = pasteEvent.clipboardData.items[0];
    if (item.type.indexOf("image") === 0) {
        const reader = new FileReader();
        reader.onload = function (event) {
            document.getElementById("image").src = event.target.result;
        };
        const blob = item.getAsFile();
        reader.readAsDataURL(blob);
    }
}

function tryPlayWord(word) {
    try {
        const url = `https://ssl.gstatic.com/dictionary/static/pronunciation/2022-03-02/audio/${word.substring(0, 2)}/${word}_en_us_1.mp3`
        const audio = new Audio(url);
        audio.play();
    } catch (e) {
        console.log(url)x
        console.log(e)
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
