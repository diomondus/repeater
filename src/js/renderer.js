/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

init()

function init() {
    document.title = "Repeater Eng -> Rus"
    document.getElementById('image').style.display = 'none'
    document.getElementById('orig').addEventListener('paste', splitPasted)
    document.getElementById("search-res").style.display = 'none'
    document.onpaste = pasteEvent => onImagePasted(pasteEvent)
    document.addEventListener('keydown', event => onKeyEvent(event))
    api.on('dirs-inited', () => onCatSelected())
    api.on('days-loaded', (event, keys) => onDaysLoaded(keys))
    api.on('load-day', (event, content) => onDayLoaded(content))
    api.on('saved-all', () => onSavedAll())
    api.on('update-cache', (event, day, content) => onUpdateContent(day,  content))
    api.on('receive-data-path', (event, dataPath) => onDataPathReceived(dataPath))
    api.on('search', (event, content) => onSearched(content))

    sessionStorage.setItem('reverse', 'false')
    sessionStorage.setItem('mixed', 'false')
    sessionStorage.setItem('current', JSON.stringify([]))
    const categories = [...document.getElementById("cats").children].map(e => e.text.toLowerCase())
    api.send('init-dirs', categories)
}

function onCatSelected() {
    const category = getSelectedCat()
    api.send('load-days', category)
}

function onDaysLoaded(keys) {
    clearCtrls()
    let days = document.getElementById("days")
    if (days.hasChildNodes()) {
        days.innerHTML = ''
    }

    const today = getCurrentDate()
    keys.sort((a, b) => {
        let arr1 = a.split("-")
        let arr2 = b.split("-")
        return new Date(arr1[2], arr1[0], arr1[1]) - new Date(arr2[2], arr2[0], arr2[1])
    })
        .map(key => createOption(key, today))
        .reverse()
        .forEach(option => days.appendChild(option))
    days.selectedIndex = '0'
    onDaySelected()
}

function onDaySelected() {
    sessionStorage.removeItem('prev')
    clearCtrls()
    let day = getSelectedDay()
    let jsonString = sessionStorage.getItem(getSelectedCat() + '-' + day)
    if (jsonString !== null) {
        const content = JSON.parse(jsonString)
        handleContent(content)
    } else {
        api.send('load-day', day)
    }
}

function onUpdateContent(day, content) {
    sessionStorage.setItem(getSelectedCat() + '-' + day, JSON.stringify(content))
}

function onDayLoaded(content) {
    sessionStorage.setItem(getSelectedCat() + '-' + getSelectedDay(), JSON.stringify(content))
    handleContent(content)
}

function handleContent(content) {
    content = !isNotReversed() && !isNotMixed() ? prepareTerms(content) : content
    shuffleArray(content)
    document.getElementById('count').innerHTML = `${content.length} left`
    content.unshift({})
    sessionStorage.setItem('current', JSON.stringify(content))
}

function loadTerm() {
    let content = JSON.parse(sessionStorage.getItem('current'));
    if (content.length === 0) {
        onDaySelected()
        content = JSON.parse(sessionStorage.getItem('current'))
    }
    let prevTerm = sessionStorage.getItem("term")
    if (prevTerm !== null) {
        tryPlayText(JSON.parse(prevTerm).orig)
    }
    clearCtrls()

    let term = content.pop()
    document.getElementById('count').innerHTML = `${content.length} left`

    if (Object.keys(term).length === 0) {
        sessionStorage.removeItem("term")
        sessionStorage.setItem('current', JSON.stringify([]))
        return
    }

    if (isNotReversed()) {
        document.getElementById('orig').value = term.orig
    } else {
        document.getElementById('trans').value = term.trans
    }

    sessionStorage.setItem("term", JSON.stringify(term))
    sessionStorage.setItem('current', JSON.stringify(content))
}

function isNotReversed() {
    return sessionStorage.getItem('reverse') === 'false'
}

function isNotMixed() {
    return sessionStorage.getItem('mixed') === 'false'
}

function getSelectedDay() {
    const days = document.getElementById("days")
    return days.options[days.selectedIndex].text.substring(0, 12)
}

function getSelectedCat() {
    const categories = document.getElementById("cats")
    return categories.options[categories.selectedIndex].text.toLowerCase()
}

function saveTerm(day) {
    if (isNotReversed()) {
        sessionStorage.removeItem(getSelectedCat() + '-' + day)
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
                        api.send('save-all-with-picture', day, imgName, imgBytes, term)
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
                api.send('save-all', day, term)
            }
            document.getElementById('orig').focus()
        }
    }
}

function onSavedAll() {
    sessionStorage.removeItem("term")
    clearCtrls()
}

function showTerm() {
    let term = JSON.parse(sessionStorage.getItem("term"))
    if (term !== null) {
        if (isNotReversed()) {
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

function onDataPathReceived(dataPath) {
    let term = JSON.parse(sessionStorage.getItem("term"))
    document.getElementById('image').src = dataPath + '/pictures/' + term.img
}

function hideOrShowImgTag() {
    let imgGroup = document.getElementById('image')
    if (imgGroup.style.display === '') {
        imgGroup.style.display = 'none'
        document.getElementById('asso').innerHTML = 'Association (Hidden)'
    } else {
        imgGroup.style.display = ''
        document.getElementById('asso').innerHTML = 'Association'
    }
}

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
            option.innerHTML = daysDiff > 0 ? `${date} (-${daysDiff} days)` : `${date} (+${-daysDiff} days)`
            break
    }
    return option
}

function reverse() {
    let rev = sessionStorage.getItem("reverse")
    let mode = rev === "true" || rev === null ? "false" : "true"
    document.title = mode === "true" ? "Repeater Rus -> Eng" : "Repeater Eng -> Rus"
    sessionStorage.setItem("reverse", mode)
    sessionStorage.setItem('current', JSON.stringify([]))
    onDaySelected()
}

function mixed() {
    let mixed = sessionStorage.getItem("mixed")
    let mode = mixed === "true" || mixed === null ? "false" : "true"
    sessionStorage.setItem("mixed", mode)
    sessionStorage.setItem('current', JSON.stringify([]))
    onDaySelected()
}

function clearCtrls() {
    document.getElementById('orig').value = ''
    document.getElementById('image').src = '../resources/default.png'
    document.getElementById('trans').value = ''
    document.getElementById('add-info').value = ''
}

function onKeyEvent(event) {
    if (event.metaKey) {
        switch (event["keyCode"]) {
            case 70: // f
                document.getElementById('search').focus()
                break
            case 73: // i
                hideOrShowImgTag()
                break
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
                saveTerm(getSelectedDay())
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
            case 66: // b
                let term = JSON.parse(sessionStorage.getItem("term"))
                let day = document.getElementById("days").options[0].text.substring(0, 12)
                if (term !== null) {
                    const dialogConfig = {
                        type: 'question',
                        buttons: ['OK', 'Cancel'],
                        message: `Would you like to copy "${term.orig}" to file "${day}"?`,
                    }
                    api.openDialog('showMessageBox', dialogConfig).then(result => {
                        if (result.response === 0) {
                            api.send('save-all', day, term)
                        }
                    })
                }
                break
            case 71: // g
                api.send('global-train')
                break
            case 78: // n
                onNewDay()
                break
            case 84: // е
                mixed()
                break
        }
    }
}

function onNewDay() {
    const days = document.getElementById("days")
    const day = days.options[0]
    let dayValue = day.value
    let currDay = getCurrentDate()
    let newDay = dayValue.startsWith(currDay) ? `${currDay}-${parseInt(dayValue[11]) + 1}` : getCurrentDate() + '-0'
    let option = document.createElement("option")
    option.innerHTML = newDay
    days.insertBefore(option, day)
    days.selectedIndex = 0
    onDaySelected()
}

function onSearch() {
    const searchText = document.getElementById("search").value.toLowerCase()
    document.getElementById("search-res").innerHTML = ''
    if (searchText.length > 1) {
        api.send('search', searchText)
    } else {
        document.getElementById("search-res").style.display = 'none'
    }
}

function onSearched(content) {
    let searchList = document.getElementById('search-res')
    searchList.style.display = ''
    content = prepareTerms(content)
    content.forEach(json => {
        let option = document.createElement('option')
        let origTrans = json.orig + ' — ' + json.trans
        option.innerHTML = origTrans + ' | ' + json.path
        searchList.appendChild(option)
    })
    searchList.size = content.length > 10 ? 10 : content.length
}

function splitPasted(event) {
    event.stopPropagation()
    event.preventDefault()
    let clipboardData = event.clipboardData || window.clipboardData
    let pastedData = clipboardData.getData('Text')

    if (pastedData !== '') {
        if (pastedData.includes('-')) {
            let split = pastedData.toLowerCase().split('-')
            document.getElementById('orig').value = split[0].trim()
            document.getElementById('trans').value = split[1].trim()
            document.getElementById('add-info').focus()
            if (split.length > 2) {
                document.getElementById('add-info').value = split[2].trim()
            }
            tryPlayText(split[0].trim())
        } else {
            document.getElementById('orig').value = pastedData.toLowerCase()
            tryPlayText(pastedData.toLowerCase())
        }
    }
}

function onImagePasted(pasteEvent) {
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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = array[i]
        array[i] = array[j]
        array[j] = temp
    }
}

function prepareTerms(contents) {
    return contents.map(term => term.trans.split(', ').map(trans => {
        const cloneTerm = Object.assign({}, term)
        cloneTerm.trans = trans
        return cloneTerm
    })).flatMap(e => e)
}
