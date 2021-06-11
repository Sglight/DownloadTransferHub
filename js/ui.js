"use strict";

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

    document.getElementById('parse-result-table').rows.length > 1 ? 
        hideElement('parse-result-table', false) : hideElement('parse-result-table', true)
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

    let fileName = tableRow.insertCell(0)
    let hash = tableRow.insertCell(1)
    let secretKey = tableRow.insertCell(2)
    let remarks = tableRow.insertCell(3)
    let operate = tableRow.insertCell(4)

    fileName.innerHTML = `<a href="UserFiles/${responseJSON.SecretKey}/${responseJSON.FileName}">${responseJSON.FileName}</a>`
    hash.innerHTML = `<a href="javascript:void(0)" onclick="copyToClip('${responseJSON.Hash}')">${responseJSON.Hash}</a>`
    secretKey.innerHTML = `<a href="javascript:void(0)" onclick="copyToClip('${responseJSON.SecretKey}')">${responseJSON.SecretKey}</a>`
    remarks.innerHTML = `<a href="javascript:void(0)" onclick="copyToClip('${responseJSON.remarks}')">${responseJSON.remarks}</a>`
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

    for (let item of responseJSON) {
        createResultTable(table, item)
        rowLength++
    }
}