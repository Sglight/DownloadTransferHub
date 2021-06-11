// "use strict";
const DOMAIN = 'https://soar.l4d2lk.cn'
// const DOMAIN = 'http://localhost:8001'

function doParse() {
    let secretKey = document.getElementById('secretKey').value
    secretKey ? 1 : secretKey = 'tmp'
    let inputFile = document.getElementById('inputFile').value
    let remarks = document.getElementById('remarks').value

    if (!inputFile) {
        alert("文件链接为空！")
        return
    }
    const xhr = new XMLHttpRequest()
    let requestUrl = `${DOMAIN}/parse?inputfile=${inputFile}&secretkey=${secretKey}&remarks=${remarks}`
    xhr.open('POST', requestUrl)
    xhr.send()

    hideElement('loading-circle', false)

    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            hideElement('loading-circle', true)
            if (xhr.status >= 200 && xhr.status < 300) {
                hideElement('parse-result-table', false)
                let table = document.getElementById('parse-result-table')
                createResultTable(table, JSON.parse(xhr.response))
            }
        }
    }
}

function doUpload() {
    let secretKey = document.getElementById('secretKey').value
    secretKey ? 1 : secretKey = 'tmp'
    let remarks = document.getElementById('remarks').value
    let fileObj = document.getElementById('uploadFile').files[0]

    var form = new FormData();
    form.append("file", fileObj)

    const xhr = new XMLHttpRequest()
    let requestUrl = `${DOMAIN}/upload?secretkey=${secretKey}&remarks=${remarks}`
    xhr.open('POST', requestUrl)
    xhr.send(form)

    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
            hideElement('parse-result-table', false)
            let table = document.getElementById('parse-result-table')
            createResultTable(table, JSON.parse(xhr.response))
        }
    }
}

function doSearch() {
    let secretKey = document.getElementById('secretKey').value
    secretKey ? 1 : secretKey = 'tmp'

    const xhr = new XMLHttpRequest()
    let requestUrl = `${DOMAIN}/search?secretkey=${secretKey}`
    xhr.open('POST', requestUrl)
    xhr.send()

    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
            hideElement('search-result-table', false)
            let table = document.getElementById('search-result-table')
            createResultTableIterate(table, JSON.parse(xhr.response))
        }
    }
}

function goParse() {
    setNowNavItem('parse')
    hideElement('inputFile', false)
    hideElement('uploadFile',true)
    hideElement('remarks', false)
    setElementValue('mode', 'parse')
    setElementValue('trident', '解析')
    document.getElementById('secretKey').style.width = "35%"
    hideElement('search-result-table', true)

    document.getElementById('parse-result-table').rows.length > 1 ? 
        hideElement('parse-result-table', false) : hideElement('parse-result-table', true)
}

function goUpload() {
    setNowNavItem('upload')
    hideElement('inputFile',true)
    hideElement('uploadFile', false)
    hideElement('remarks', false)
    setElementValue('mode', 'upload')
    setElementValue('trident', '上传')
    document.getElementById('secretKey').style.width = "35%"
    hideElement('search-result-table', true)
    hideElement('parse-result-table', true)
}

function goSearch() {
    setNowNavItem('search')
    hideElement('inputFile',true)
    hideElement('uploadFile',true)
    hideElement('remarks',true)
    setElementValue('mode', 'search')
    setElementValue('trident', '查询')
    document.getElementById('secretKey').style.width = "80%"
    document.getElementById('search-result-table').rows.length > 1 ?
        hideElement('search-result-table', false) : hideElement('search-result-table', true)
    hideElement('parse-result-table', true)
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

function setNowNavItem(item) {
    // 清空 nav-now 状态
    let items = document.getElementsByClassName('nav-item')
    for (let elem of items) {
        elem.className = 'nav-item'
    }
    // 添加 nav-now
    document.getElementById(item).className = 'nav-item nav-now'
}

// 按下回车提交表单
// 只监听 form 里的按键事件
const form = document.getElementById('form')

form.addEventListener('keydown', function (event) {
    if (event.defaultPrevented) {
        return // 如果事件已经在进行中，则不做任何事。
    }
    if (event.key === 'Enter') {
        doTrident()
    }
}, true)

function hideElement(id, hidden) {
    elem = document.getElementById(id)
    hidden ? elem.setAttribute('hidden', 'hidden') : elem.removeAttribute('hidden')
}

function setElementValue(id, value) {
    document.getElementById(id).setAttribute('value', value)
}

function createResultTable(table, responseJSON) {
    let rowLength = table.rows.length
    let tableRow = table.insertRow(rowLength)
    tableRow.setAttribute('id', `fid-${responseJSON.FID}`)

    let fileName = tableRow.insertCell(0)
    let hash = tableRow.insertCell(1)
    let secretKey = tableRow.insertCell(2)
    let remarks = tableRow.insertCell(3)
    let operate = tableRow.insertCell(4)

    fileName.innerHTML = `<a href="UserFiles/${responseJSON.SecretKey}/${responseJSON.FileName}">${responseJSON.FileName}</a>`
    hash.innerHTML = `<a href="javascript:void(0)" onclick="copyToClip('${responseJSON.Hash}')">${responseJSON.Hash}</a>`
    secretKey.innerHTML = `<a href="javascript:void(0)" onclick="copyToClip('${responseJSON.SecretKey}')">${responseJSON.SecretKey}</a>`
    remarks.innerHTML = `<a href="javascript:void(0)" onclick="copyToClip('${responseJSON.remarks}')>${responseJSON.remarks}</a>`
    operate.innerHTML = `
    <form class="operate-form">
        <input type="hidden" name="FID" value="${responseJSON.FID}">
        <input type="button" class="operate-button delete-button" value="" title="删除" onclick="doDelete(${responseJSON.FID}, '${responseJSON.FileName}', '${responseJSON.SecretKey}')">
        <input type="button" class="operate-button change-key-button" value="" title="更改密令" onclick="doChangeKey(${responseJSON.FID})">
        <input type="button" class="operate-button change-remarks-button" value="" title="更改备注" onclick="doChangeRemarks(${responseJSON.FID})">
    </form>
    `
}

function createResultTableIterate(table, responseJSON) {
    let rowLength = table.rows.length

    // 清空表格
    while (rowLength > 1) {
        table.deleteRow(rowLength - 1)
        rowLength--
    }

    for (item of responseJSON) {
        createResultTable(table, item)
        rowLength++
    }
}

function doDelete(FID, fileName, secretKey) {
    // 发送 post
    let xhr = new XMLHttpRequest()
    let requestUrl = `${DOMAIN}/delete?FID=${FID}&filename=${fileName}&secretkey=${secretKey}`
    xhr.open('POST', requestUrl)
    xhr.send()

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
            let row = document.getElementById(`fid-${FID}`)
            row.parentElement.removeChild(row)
        }
    }
}

function doChangeKey(FID) {
    // 参数：FID, oldkey, newkey, mode
    let newKey = prompt("输入新的密令\n可以 '更改' 或者 '添加'")
    let select = confirm(`可以 '更改' 或者 '添加'\n点击 '确定' 更改为 '${newKey}'\n点击 '取消' 增加密令 '${newKey}'`)
    if (select === true) {
        // 更改
    } else if (select === false) {
        // 增加
    }
}

function switchUsage() {
    let displayStatus = document.getElementById('usage-container').getAttribute('hidden')
    if (displayStatus == 'hidden') {
        hideElement('usage-container', false)
    } else {
        hideElement('usage-container', true)
    }
}

function copyToClip(content, message) {
    var aux = document.createElement('input'); 
    aux.setAttribute('value', content); 
    document.body.appendChild(aux); 
    aux.select();
    document.execCommand('copy'); 
    document.body.removeChild(aux);
    // if (message == null) {
    //     alert('复制成功');
    // } else{
    //     alert(message);
    // }
}