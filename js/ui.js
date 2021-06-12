"use strict";

addLoadEvent(prepareClicks)

function addLoadEvent(func) {
    let oldonload = window.onload
    if (typeof window.onload != 'function') {
        window.onload = func;
    } else {
        window.onload = function() {
            oldonload()
            func()
        }
    }
}

function prepareClicks() {
    if (!document.createElement || !document.createTextNode || !document.getElementById) return false
    document.getElementById('tab-parse').onclick = goParse
    document.getElementById('tab-upload').onclick = goUpload
    document.getElementById('tab-search').onclick = goSearch
    document.getElementById('trident').onclick = doTrident
    document.getElementById('form').onkeydown = (event) => {
        if (event.defaultPrevented) {
            return // 如果事件已经在进行中，则不做任何事。
        }
        if (event.key === 'Enter') {
            doTrident()
        }
    }
}

function goParse() {
    setNowNavItem('tab-parse')
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
    setNowNavItem('tab-upload')
    hideElement('inputFile',true)
    hideElement('uploadFile', false)
    hideElement('remarks', false)
    setElementValue('mode', 'upload')
    setElementValue('trident', '上传')
    document.getElementById('secretKey').style.width = "35%"
    hideElement('search-result-table', true)

    document.getElementById('parse-result-table').rows.length > 1 ? 
        hideElement('parse-result-table', false) : hideElement('parse-result-table', true)
}

function goSearch() {
    setNowNavItem('tab-search')
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

function setNowNavItem(item) {
    // 清空 nav-now 状态
    let items = document.getElementsByClassName('nav-item')
    for (let elem of items) {
        elem.className = 'nav-item'
    }
    // 添加 nav-now
    document.getElementById(item).className = 'nav-item nav-now'
}

function hideElement(id, boolean) {
    let elem = document.getElementById(id)
    boolean ? elem.setAttribute('hidden', 'hidden') : elem.removeAttribute('hidden')
}

function setElementValue(id, value) {
    document.getElementById(id).setAttribute('value', value)
}

function disableElement(id, boolean) {
    document.getElementById(id).disabled = boolean
}

function createResultTable(table, responseJSON) {
    let rowLength = table.rows.length
    let tableRow = table.insertRow(rowLength)
    tableRow.setAttribute('id', `fid-${responseJSON.FID}`)

    let fileNameCell = tableRow.insertCell(0)
    let hashCell = tableRow.insertCell(1)
    let secretKeyCell = tableRow.insertCell(2)
    let remarksCell = tableRow.insertCell(3)
    let operateCell = tableRow.insertCell(4)

    fillRowCell(fileNameCell, `UserFiles/${responseJSON.SecretKey}/${responseJSON.FileName}`, responseJSON.FileName)
    fillRowCell(hashCell, '', responseJSON.Hash)
    fillRowCell(secretKeyCell, '', responseJSON.SecretKey)
    fillRowCell(remarksCell, '',responseJSON.remarks)
    fillOperateCell(operateCell, 'delete-button', '删除', doDelete, responseJSON.FID)
    fillOperateCell(operateCell, 'change-key-button', '更改密令', doChangeKey, responseJSON.FID)
    fillOperateCell(operateCell, 'change-remarks-button', '更改备注', doChangeRemarks, responseJSON.FID)
}

function fillRowCell(cell, href, text) {
    let elem = document.createElement('a')
    href ? elem.href = href : elem.onclick = () => {copyToClip(text)}
    cell.appendChild(elem)
    let txt = document.createTextNode(text)
    elem.appendChild(txt)
}

function fillOperateCell(cell, className, title, func, FID) {
    let elem = document.createElement('button')
    elem.setAttribute('class', 'operate-button ' + className)
    elem.title = title
    elem.onclick = () => {func(FID)}
    cell.appendChild(elem)
}

function createResultTableIterate(table, responseJSON) {
    let rowLength = table.rows.length

    // 清空表格
    while (rowLength > 1) {
        table.deleteRow(rowLength - 1)
        rowLength--
    }

    for (let item of responseJSON) {
        createResultTable(table, item)
        rowLength++
    }
}

function copyToClip(content, message) {
    var aux = document.createElement('input'); 
    aux.setAttribute('value', content); 
    document.body.appendChild(aux); 
    aux.select();
    document.execCommand('copy'); 
    document.body.removeChild(aux);
    message ? true : message = '复制成功'
}