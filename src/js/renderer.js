/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

function init() {
    let categories = document.getElementById("cats").children
    let cats = []
    for (let i = 0; i < categories.length; i++) {
        let cat = categories[i].text.toLowerCase()
        cats.push(cat)
    }
    api.send('init-dirs', cats)
}

api.on('dirs-inited', () => {
    sessionStorage.setItem("reverse", "true")
    onCatSelected()
})

function loadTerm() {
    const fileName = getSelectedDay()
    api.send('load-term', fileName)
}

api.on('load-term', (event, contents) => {
    let prevWord = sessionStorage.getItem("prev")
    if (prevWord !== null) {
        tryPlayText(prevWord)
    }
    clearCtrls()

    if (sessionStorage.getItem('inds') === null) {
        sessionStorage.removeItem("prev")
        sessionStorage.removeItem("orig")
        sessionStorage.removeItem("trans")
        sessionStorage.removeItem("image")
        sessionStorage.removeItem("add-info")
        onDaySelected()
        return
    }

    let indexes = JSON.parse(sessionStorage.getItem('inds'))
    let i = indexes.pop()
    let content = contents[i]

    if (sessionStorage.getItem("reverse") === "false") {
        document.getElementById('orig').value = content.orig
        sessionStorage.setItem("trans", content.trans)
    } else {
        document.getElementById('trans').value = content.trans
        sessionStorage.setItem("orig", content.orig)
    }

    sessionStorage.setItem("image", content.img)
    sessionStorage.setItem("add-info", content.addinfo)

    if (indexes.length === 0) {
        sessionStorage.removeItem('inds')
    } else {
        sessionStorage.setItem('inds', JSON.stringify(indexes))
        sessionStorage.setItem("prev", content.orig)
    }
})

function getSelectedDay() {
    const days = document.getElementById("days")
    return days.options[days.selectedIndex].text.substring(0, 10)
}

function updateTerm() {
    const orig = document.getElementById('orig').value
    if (orig !== '') {
        const fileName = getSelectedDay()
        api.send('update-term', fileName, orig)
    }
}

api.on('update-term', (event, fileName, contents) => {
    const orig = document.getElementById('orig').value
    let filteredContents = contents.filter(c => {
        let b = c.orig !== orig
        if (!b && document.getElementById('image').src.startsWith("data")) {
            let imgName = c.img
            api.send('remove-picture', imgName)
        }
        return b
    })
    saveToFile(fileName, filteredContents)
})

function saveTerm() {
    if (document.getElementById('orig').value !== '') {
        let key = getCurrentDate()
        api.send('save-term', key)
    }
}

api.on('save-term', (event, key, contents) => {
    saveToFile(key, contents)
})

function saveToFile(key, contents) {
    let imagePath = document.getElementById('image').src
    if (imagePath.startsWith("data")) {
        fetch(imagePath)
            .then(res => res.blob())
            .then(blob => blob.arrayBuffer())
            .then(imgBytes => {
                let imgName = uuidv4() + '.png'
                let orig = document.getElementById('orig').value.toLowerCase()
                tryPlayText(orig)
                contents.push({
                    orig: orig,
                    trans: document.getElementById('trans').value.toLowerCase(),
                    addinfo: document.getElementById('add-info').value,
                    img: imgName
                })
                api.send('save-all-with-picture', key, imgName, imgBytes, contents)
            })
    } else {
        let imgName = ''
        if (!imagePath.includes('default')) {
            let split = imagePath.split('/')
            imgName = split[split.length - 1]
        }
        contents.push({
            orig: document.getElementById('orig').value.toLowerCase(),
            trans: document.getElementById('trans').value.toLowerCase(),
            addinfo: document.getElementById('add-info').value,
            img: imgName
        })
        api.send('save-all', key, contents)
    }
}

api.on('saved-all', () => {
    clearCtrls()
})

function showTerm() {
    if (sessionStorage.getItem("reverse") === 'false') {
        document.getElementById('trans').value = sessionStorage.getItem("trans")
    } else {
        document.getElementById('orig').value = sessionStorage.getItem("orig")
    }
    document.getElementById('add-info').value = sessionStorage.getItem("add-info")
}

function showAsso() {
    if (sessionStorage.getItem("image") ?? '' !== '') {
        api.send('get-data-path')
    }
}

api.on('receive-data-path', (event, dataPath) => {
    document.getElementById('image').src = dataPath + '/pictures/' + sessionStorage.getItem("image")
})

function loadDays() {
    api.send('load-days')
}

api.on('load-days', (event, keys) => {
    clearCtrls()
    let days = document.getElementById("days")
    if (days.hasChildNodes()) {
        days.innerHTML = ''
    }
    const today = getCurrentDate()
    keys.sort()
        .reverse()
        .map(key => createOption(key, today))
        .forEach(option => days.appendChild(option))
    days.selectedIndex = '0'
    onDaySelected()
})

function createOption(date, today) {
    let option = document.createElement("option")
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
    return option
}

function reverse() {
    let mode = sessionStorage.getItem("reverse") === "false" ? "true" : "false"
    sessionStorage.setItem("reverse", mode)
}

function onDaySelected() {
    const e = document.getElementById("days")
    if (e.children.length !== 0) {
        const day = e.options[e.selectedIndex].text.substring(0, 10)
        api.send('on-day-selected', day)
    }
}

api.on('on-day-selected', (event, contents) => {
    const indexies = [...Array(contents.length).keys()]
    shuffleArray(indexies)
    sessionStorage.setItem('inds', JSON.stringify(indexies))
    sessionStorage.removeItem('prev')
    clearCtrls()
})

function onCatSelected() {
    const catregories = document.getElementById("cats")
    const category = catregories.options[catregories.selectedIndex].text.toLowerCase()
    api.send('init-data-path', category)
}

api.on('data-path-inited', () => {
    loadDays()
})

function clearCtrls() {
    document.getElementById('orig').value = ''
    document.getElementById('image').src = '../resources/default.png'
    document.getElementById('trans').value = ''
    document.getElementById('add-info').value = ''
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
                api.send('show-content', fileName)
                break
            case 68: // d
                const days = document.getElementById("days")
                if (!event.shiftKey) {
                    days.selectedIndex = (days.selectedIndex === days.children.length - 1) ? 0 : days.selectedIndex + 1
                } else {
                    days.selectedIndex = (days.selectedIndex === 0) ? days.children.length - 1 : days.selectedIndex - 1
                }
                onDaySelected()
                break
        }
    }
})

document.onpaste = function (pasteEvent) {
    const item = pasteEvent.clipboardData.items[0]
    if (item.type.indexOf("image") === 0) {
        const reader = new FileReader()
        reader.onload = function (event) {
            document.getElementById("image").src = event.target.result
        }
        const blob = item.getAsFile()
        reader.readAsDataURL(blob)
    }
}

init()
