/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

function init() {
    const categories = [...document.getElementById("cats").children].map(e => e.text.toLowerCase());
    api.send('init-dirs', categories)
}

api.on('dirs-inited', () => {
    sessionStorage.setItem("reverse", "true")
    onCatSelected()
})

function onCatSelected() {
    const catregories = document.getElementById("cats")
    const category = catregories.options[catregories.selectedIndex].text.toLowerCase()
    api.send('load-days', category)
}

api.on('days-loaded', (event, keys) => {
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

function onDaySelected() {
    sessionStorage.removeItem('prev')
    clearCtrls()
    const e = document.getElementById("days")
    if (e.children.length !== 0) {
        const day = e.options[e.selectedIndex].text.substring(0, 12)
        api.send('on-day-selected', day)
    }
}

function loadTerm() {
    api.send('load-term')
}

api.on('load-term', (event, term) => {
    let prevTerm = sessionStorage.getItem("term")
    if (prevTerm !== null) {
        tryPlayText(JSON.parse(prevTerm).orig)
    }
    clearCtrls()

    if (term === undefined) {
        sessionStorage.removeItem("term")
        onDaySelected()
        return
    }

    if (sessionStorage.getItem("reverse") === "false") {
        document.getElementById('orig').value = term.orig
    } else {
        document.getElementById('trans').value = term.trans
    }

    sessionStorage.setItem("term", JSON.stringify(term))
})

function getSelectedDay() {
    const days = document.getElementById("days")
    return days.options[days.selectedIndex].text.substring(0, 12)
}

function saveTerm() {
    let fileName = getSelectedDay()
    let orig = document.getElementById('orig').value.trim().toLowerCase()
    if (orig !== '') {
        tryPlayText(orig)
        let imagePath = document.getElementById('image').src
        if (imagePath.startsWith("data")) {
            fetch(imagePath)
                .then(res => res.blob())
                .then(blob => blob.arrayBuffer())
                .then(imgBytes => {
                    let imgName = uuidv4() + '.png'
                    let term = {
                        orig: orig,
                        trans: document.getElementById('trans').value.trim().toLowerCase(),
                        addinfo: document.getElementById('add-info').value,
                        img: imgName
                    }
                    api.send('save-all-with-picture', fileName, imgName, imgBytes, term)
                })
        } else {
            let imgName = ''
            if (!imagePath.includes('default')) {
                let split = imagePath.split('/')
                imgName = split[split.length - 1]
            }
            let term = {
                orig: orig,
                trans: document.getElementById('trans').value.trim().toLowerCase(),
                addinfo: document.getElementById('add-info').value,
                img: imgName
            }
            api.send('save-all', fileName, term)
        }
    }
}

api.on('saved-all', () => {
    sessionStorage.removeItem("term")
    clearCtrls()
})

function showTerm() {
    let term = JSON.parse(sessionStorage.getItem("term"))
    if (term !== null) {
        if (sessionStorage.getItem("reverse") === 'false') {
            document.getElementById('trans').value = term.trans
        } else {
            document.getElementById('orig').value = term.orig
        }
        document.getElementById('add-info').value = term.addinfo
    }
}

function showImg() {
    let term = JSON.parse(sessionStorage.getItem("term"))
    if ((term ?? {img: ''}).img !== '') {
        api.send('get-data-path')
    }
}

api.on('receive-data-path', (event, dataPath) => {
    let term = JSON.parse(sessionStorage.getItem("term"))
    document.getElementById('image').src = dataPath + '/pictures/' + term.img
})

function createOption(date, today) {
    let option = document.createElement("option")
    let daysDiff = (new Date(today).getTime() - new Date(date.substring(0, 10)).getTime()) / 86400000
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
                showImg()
                break
            case 76: // l
                showTerm()
                break
            case 85: // u
                reverse()
                break
            case 83: // s
                saveTerm()
                break
            case 79: // o
                api.send('show-content', getSelectedDay())
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
            case 71: // g
                api.send('global-train')
                break
            case 78: // n
                onNewDay()
                break
        }
    }
})

function onNewDay() {
    const days = document.getElementById("days")
    const day = days.options[0]
    let dayValue = day.value
    let currDay = getCurrentDate()
    let newDay = dayValue.startsWith(currDay) ? `${currDay}-${parseInt(dayValue[11]) + 1}` : getCurrentDate() + '-0'
    let option = document.createElement("option")
    option.innerHTML = newDay
    days.insertBefore(option, day)
}

document.onpaste = pasteEvent => {
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

function handlePaste(event) {
    event.stopPropagation()
    event.preventDefault()
    let clipboardData = event.clipboardData || window.clipboardData
    let pastedData = clipboardData.getData('Text')

    if (pastedData !== '') {
        if (pastedData.includes('-')) {
            let split = pastedData.toLowerCase().split('-')
            document.getElementById("orig").value = split[0].trim()
            document.getElementById("trans").value = split[1].trim()
            tryPlayText(split[0].trim())
        } else {
            document.getElementById("orig").value = pastedData.toLowerCase()
            tryPlayText(pastedData.toLowerCase())
        }
    }
}

document.getElementById('orig').addEventListener('paste', handlePaste)

init()
