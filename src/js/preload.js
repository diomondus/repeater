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

const validChannels = ['init-dirs', 'dirs-inited', 'load-days', 'days-loaded',
    'load-day', 'get-data-path', 'receive-data-path', 'search',
    'save-all', 'saved-all', 'save-all-with-picture', 'show-content', 'global-train']

contextBridge.exposeInMainWorld("api", {
    send: (channel, ...args) => {
        if (validChannels.includes(channel)) {
//            console.log("api send: " + channel + " args: " + args)
            ipcRenderer.send(channel, ...args)
        }
    },
    on: (channel, func) => {
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => {
//                console.log("api on: " + channel + " args: " + args)
                func(event, ...args)
            })
        }
    }
});
