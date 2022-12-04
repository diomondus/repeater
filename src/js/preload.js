/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */

const {
    contextBridge,
    ipcRenderer
} = require("electron")

contextBridge.exposeInMainWorld("api", {
    send: (channel, ...args) => {
//        console.log("api send: " + channel + " args: " + args)
        let validChannels = ['init-dirs', 'load-term', 'update-term', 'remove-picture', 'save-term', 'show-content',
            'save-all-with-picture', 'save-all', 'get-data-path', 'load-days', 'on-day-selected', 'init-data-path']
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, ...args)
        }
    },
    on: (channel, func) => {
        let validChannels = ['dirs-inited', 'load-term', 'update-term', 'save-term', 'saved-all',
            'receive-data-path', 'load-days', 'on-day-selected', 'data-path-inited', 'show-content']
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => {
//                console.log("api on: " + channel + " args: " + args)
                func(event, ...args)
            })
        }
    }
});
