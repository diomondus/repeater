/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */

//const {
//    contextBridge,
//    ipcRenderer
//} = require("electron");
//
//contextBridge.exposeInMainWorld(
//        "api", {
//            send: (channel, data) => {
//                // whitelist channels
//                let validChannels = ["showContent"];
//                if (validChannels.includes(channel)) {
//                    ipcRenderer.send(channel, data);
//                }
//            },
//    receive: (channel, func) => {
//                let validChannels = ["showContent"];
//                if (validChannels.includes(channel)) {
//                    // Deliberately strip event as it includes `sender`
//                    ipcRenderer.on(channel, (event, ...args) => func(...args));
//                }
//            }
//        }
//        );

