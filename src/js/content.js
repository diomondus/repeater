api.on('show-content', (event, title, content) => {
    let terms = document.getElementById("content")
    init(content, terms)
    document.title = title
    sessionStorage.setItem('title', title)
    sessionStorage.setItem('content', JSON.stringify(content))
})

api.on('saved-all', () =>{
    document.getElementById("ta").remove()
    preInit()
})

preInit()

function preInit() {
    let title = sessionStorage.getItem('title')
    if (title != null) {
        document.title = title
    }
    let content = sessionStorage.getItem('content')
    if (content != null) {
        let terms = document.getElementById("content")
        if (terms.hasChildNodes()) {
            terms.innerHTML = ''
        }
        let content = JSON.parse(sessionStorage.getItem('content'))
        init(content, terms)
    }
}

function splitPasted(event) {
    event.stopPropagation()
    event.preventDefault()
    let clipboardData = event.clipboardData || window.clipboardData
    let pastedData = clipboardData.getData('Text')

    if (pastedData !== '') {
        let rows = pastedData.toLowerCase().split('\n')
        let terms = []
        rows.filter(row => row.length > 0)
            .forEach(row => {
                let split = row.toLowerCase().split('-')
                let term = {
                    orig: split[0].trim(),
                    trans: split[1].trim(),
                    addinfo: split.length > 2 ? split[2].trim() : ''
                }
                terms.push(term)
            })
        let day = sessionStorage.getItem('title')
        api.send('save-day', day, terms)
        sessionStorage.setItem('content', JSON.stringify(terms))
    }
}

function init(content, terms) {
    if (content.length === 0) {
        let textarea = document.createElement("textarea")
        textarea.id = 'ta'
        textarea.addEventListener('paste', splitPasted)
        textarea.className = "form-control"
        textarea.rows = 3
        textarea.focus()
        document.getElementById("div-content").appendChild(textarea);
    } else {
        for (let i = 0; i < content.length; i++) {
            const term = content[i];
            let li = document.createElement("li")
            li.className = 'form-control'
            let div = document.createElement("div")

            let numberLabel = document.createElement("label")
            numberLabel.innerHTML = `#${i + 1}`
            numberLabel.className = 'numberLabel'

            let btn = document.createElement("button")
            btn.type = 'button'
            btn.addEventListener("click", () => tryPlayText(term.orig))
            btn.innerHTML = '<img src="../resources/play-button.png">';

            let termLabel = document.createElement("label")
            termLabel.className = 'termLabel'
            termLabel.innerHTML = term.orig.padEnd(20, "_") + term.trans
            if (term.addinfo) {
                termLabel.innerHTML += "______" + term.addinfo
            }

            div.append(numberLabel)
            div.append(btn)
            div.append(termLabel)

            li.appendChild(div)
            terms.appendChild(li)
        }
        terms.size = content.length
        document.getElementById("words").innerHTML = content.length + ' words'
    }
}