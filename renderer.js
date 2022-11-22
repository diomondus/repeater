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
const dataPath = os.homedir() + '/.repeater';

prepare()

function prepare() {
    storage.setDataPath(dataPath);
    const dir = dataPath + '/pictures';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    loadDays()
    sessionStorage.setItem("seq", "0");
    sessionStorage.setItem("reverse", "false");
}

function loadTerm() {
    const e = document.getElementById("days");
    const text = e.options[e.selectedIndex].text.substring(0, 10);
    storage.get(text, function (error, contents) {
        if (error) throw error;
        const i = parseInt(sessionStorage.getItem("seq"));
        if (i === contents.length) {
            sessionStorage.setItem("seq", "0");
            clearCtrls()
            return
        }
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
        sessionStorage.setItem("seq", i + 1);
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
                orig: document.getElementById('orig').value,
                img: fileName,
                trans: document.getElementById('trans').value,
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
    console.log(sessionStorage.getItem("content"))
    let url = dataPath + '/pictures/' + sessionStorage.getItem("image")
    console.log(url)
    document.getElementById('image').src = url
}

function loadDays() {
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
    sessionStorage.setItem("seq", "0")
}

function clearCtrls() {
    document.getElementById('orig').value = ''
    document.getElementById('image').src = ''
    document.getElementById('trans').value = ''
    document.getElementById('add-info').value = ''
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
        if (event.key === 'n') {
            loadTerm()
        } else if (event.key === 'i') {
            showTerm()
        } else if (event.key === 's') {
            saveTerm()
        } else if (event.key === 'p') {
            showAsso()
        } else if (event.key === 'u') {
            reverse()
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

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}