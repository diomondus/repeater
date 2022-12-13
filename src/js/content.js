api.on('show-content', (event, title, content) => {
    let terms = document.getElementById("content")
    init(content, terms)
    document.title = title
    sessionStorage.setItem('title', title)
    sessionStorage.setItem('content', JSON.stringify(content))
})

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

function init(content, terms) {
    content.forEach(term => {
        let option = document.createElement("option")
        option.innerHTML = term.orig + ' ' + term.trans
        terms.appendChild(option)
    })
    terms.size = content.length
    document.getElementById("words").innerHTML = content.length + ' words'
}