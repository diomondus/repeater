function getCurrentDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return mm + '-' + dd + '-' + yyyy;
}

function getPronunciationServiceUrl(word) {
    return `https://ssl.gstatic.com/dictionary/static/pronunciation/2022-03-02/audio/${word.substring(0, 2)}/${word}_en_us_1.mp3`
}

function tryPlayText(text) {
    let audios = text.split(" ").map(word => new Audio(getPronunciationServiceUrl(word)))
    for (let i = 1; i < audios.length; i++) {
        audios[i - 1].onended = () => audios[i].play();
    }
    audios[0].play()
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}