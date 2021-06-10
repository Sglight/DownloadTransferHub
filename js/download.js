"use strict";
const Aria2 = require("aria2")

async function downloadFile(url, path, response, responseData) {
    let aria2 = new Aria2({
        host: 'localhost',
        port: 6800,
        secure: false,
        secret: '',
        path: '/jsonrpc'
    })

    await aria2.open()
    .then(() => {
        aria2.call('addUri', [url], {dir: path})
    })
    .then(() => {
        aria2.on("onDownloadComplete", () => {
            response.send(responseData)
            aria2.close()
        })
    })
    .catch((err) => console.log(err))
}

module.exports = {
    downloadFile
  }