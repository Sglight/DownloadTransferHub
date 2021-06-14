"use strict";
const DOMAIN = 'https://soar.l4d2lk.cn'
// const DOMAIN = 'http://localhost:8001'

function doParse() {
    let inputFile = document.getElementById('inputFile')
    let secretKey = encodeURIComponent(document.getElementById('secretKey').value)
    secretKey ? 1 : secretKey = 'tmp'
    let inputFileLink = encodeURIComponent(inputFile.value)
    let remarks = encodeURIComponent(document.getElementById('remarks').value)

    if (!inputFileLink) {
        inputFile.style.animation = "alert-glow 250ms ease-out 3"
        setTimeout(() => { inputFile.style.animation = "" }, 750)
        return
    }
    const xhr = new XMLHttpRequest()
    let requestUrl = `${DOMAIN}/parse?inputfile=${inputFileLink}&secretkey=${secretKey}&remarks=${remarks}`
    xhr.open('POST', requestUrl)
    xhr.send()

    disableElement('trident', true)

    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            disableElement('trident', false)
            if (xhr.status >= 200 && xhr.status < 300) {
                hideElement('parse-result-table', false)
                let table = document.getElementById('parse-result-table')
                createResultTable(table, JSON.parse(xhr.response))
            }
        }
    }
}

function doUpload() {
    let uploadFile = document.getElementById('uploadFile')
    if (!uploadFile.value) {
        uploadFile.style.animation = "alert-glow 250ms ease-out 3"
        setTimeout(() => { uploadFile.style.animation = "" }, 750)
        return
    }

    uploadFile.style = ""
    let secretKey = encodeURIComponent(document.getElementById('secretKey').value)
    secretKey ? 1 : secretKey = 'tmp'
    let remarks = encodeURIComponent(document.getElementById('remarks').value)
    let fileObj = document.getElementById('uploadFile').files[0]

    var form = new FormData();
    form.append("file", fileObj)

    const xhr = new XMLHttpRequest()
    let requestUrl = `${DOMAIN}/upload?secretkey=${secretKey}&remarks=${remarks}`
    xhr.open('POST', requestUrl)
    xhr.send(form)

    disableElement('trident', true)

    xhr.onreadystatechange = () => {
        disableElement('trident', false)
        if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
            hideElement('parse-result-table', false)
            let table = document.getElementById('parse-result-table')
            createResultTable(table, JSON.parse(xhr.response))
        }
    }
}

function doSearch() {
    let secretKey = encodeURIComponent(document.getElementById('secretKey').value)
    secretKey ? 1 : secretKey = 'tmp'

    const xhr = new XMLHttpRequest()
    let requestUrl = `${DOMAIN}/search?secretkey=${secretKey}`
    xhr.open('POST', requestUrl)
    xhr.send()
    disableElement('trident', true)

    xhr.onreadystatechange = () => {
        disableElement('trident', false)
        if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
            hideElement('search-result-table', false)
            let table = document.getElementById('search-result-table')
            createResultTableIterate(table, JSON.parse(xhr.response))
        }
    }
}

function doDelete(FID, fileName, secretKey) {
    let xhr = new XMLHttpRequest()
    let requestUrl = `${DOMAIN}/delete?FID=${FID}&filename=${fileName}&secretkey=${secretKey}`
    xhr.open('POST', requestUrl)
    xhr.send()

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
            let row = document.getElementById(`fid-${FID}`)
            row.parentElement.removeChild(row)
        }
    }
}

function doChangeKey(FID, fileName, secretKey) {
    // 参数：FID, oldkey, newkey, mode
    // let newKey = prompt("输入新的密令\n可以 '更改' 或者 '添加'")
    // if (select === true) {
    //     let select = confirm(`可以 '更改' 或者 '添加'\n点击 '确定' 更改为 '${newKey}'\n点击 '取消' 增加密令 '${newKey}'`)
    //     // 更改
    // } else if (select === false) {
    //     // 增加
    // }
    alert('还没做')
}

function doChangeRemarks(FID) {
    alert('还没做')
}

function doTrident() {
    let mode = document.getElementById('mode').getAttribute('value')
    switch (mode) {
        case 'parse':
            doParse()
            break
        case 'upload':
            doUpload()
            break
        case 'search':
            doSearch()
            break
    }
}

function copyToClip(content, message) {
    let aux = document.createElement('input');
    aux.setAttribute('value', content);
    document.body.appendChild(aux);
    aux.select();
    document.execCommand('copy');
    document.body.removeChild(aux);
    message ? true : message = '复制成功'
}