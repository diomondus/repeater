const electron = require('electron')
const ipc = electron.ipcRenderer

ipc.on('show-content', (event, fileName, content) => {
    let terms = document.getElementById("content");
    init(content, terms)
    document.title = fileName
    sessionStorage.setItem('content', JSON.stringify(content));
})

let content = sessionStorage.getItem('content')
if (content != null) {
    let terms = document.getElementById("content");
    if (terms.hasChildNodes()) {
        terms.innerHTML = ''
    }
    let content = JSON.parse(sessionStorage.getItem('content'));
    init(content, terms)
}

function init(content, terms) {
    content.forEach(term => {
        let option = document.createElement("option");
        option.innerHTML = term.orig
        terms.appendChild(option)
    })
    terms.size = content.length
}