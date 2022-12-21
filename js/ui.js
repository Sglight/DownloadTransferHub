"use strict"
addLoadEvent(prepareOnLoad)

function addLoadEvent(func) {
  let oldonload = window.onload
  if (typeof window.onload != "function") {
    window.onload = func
  } else {
    window.onload = function () {
      oldonload()
      func()
    }
  }
}

function prepareOnLoad() {
  if (
    !document.createElement ||
    !document.createTextNode ||
    !document.getElementById
  )
    return false
  document.getElementById("trident").onclick = doTrident
  document.getElementById("form").onkeydown = (event) => { // 监听 Enter 按下
    if (event.defaultPrevented) {
      return // 如果事件已经在进行中，则不做任何事。
    }
    if (event.key === "Enter") {
      doTrident()
    }
  }

  // 根据 Hash 链接跳转到模块
  window.onhashchange = goTrident
  goTrident()

  // footer 年份
  let d = new Date()
  document.querySelector('#year-from-to').innerHTML += d.getFullYear()
}

function goParse() {
  document.getElementById("mode").setAttribute("value", "parse")
  hideElement("search-result-table", true)
  document.getElementById("parse-result-table").rows.length > 1
    ? hideElement("parse-result-table", false)
    : hideElement("parse-result-table", true)
}

function goUpload() {
  document.getElementById("mode").setAttribute("value", "upload")
  hideElement("search-result-table", true)
  document.getElementById("parse-result-table").rows.length > 1
    ? hideElement("parse-result-table", false)
    : hideElement("parse-result-table", true)
}

function goSearch() {
  document.getElementById("mode").setAttribute("value", "search")
  document.getElementById("search-result-table").rows.length > 1
    ? hideElement("search-result-table", false)
    : hideElement("search-result-table", true)
  hideElement("parse-result-table", true)
}

// 根据 Hash 链接跳转到模块
function goTrident() {
  switch (location.hash) {
    case "#parse":
      goParse()
      break
    case "#upload":
      goUpload()
      break
    case "#search":
      goSearch()
      break
  }
}

function hideElement(id, boolean) {
  let elem = document.getElementById(id)
  boolean
    ? elem.setAttribute("hidden", "hidden")
    : elem.removeAttribute("hidden")
}

function createResultTable(table, responseJSON) {
  let rowLength = table.rows.length
  let tableRow = table.insertRow(rowLength)
  tableRow.setAttribute("id", `fid-${responseJSON.FID}`)

  let fileNameCell = tableRow.insertCell(0)
  let hashCell = tableRow.insertCell(1)
  let secretKeyCell = tableRow.insertCell(2)
  let remarksCell = tableRow.insertCell(3)
  let operateCell = tableRow.insertCell(4)

  fillRowCell(
    fileNameCell,
    `UserFiles/${responseJSON.SecretKey}/${responseJSON.FileName}`,
    decodeURIComponent(responseJSON.FileName)
  )
  fillRowCell(hashCell, "", responseJSON.Hash)
  fillRowCell(secretKeyCell, "", responseJSON.SecretKey)
  fillRowCell(remarksCell, "", responseJSON.remarks)

  operateCell.className = "operate-cell"
  fillOperateCell(operateCell, "delete-button", "删除", doDelete, [
    responseJSON.FID,
    responseJSON.FileName,
    responseJSON.SecretKey,
  ])
  fillOperateCell(operateCell, "change-key-button", "更改密令", doChangeKey, [
    responseJSON.FID,
    responseJSON.FileName,
  ])
  fillOperateCell(
    operateCell,
    "change-remarks-button",
    "更改备注",
    doChangeRemarks,
    responseJSON.FID
  )
  fillOperateCell(operateCell, "rename-button", "重命名", doRename, [
    responseJSON.FID,
    responseJSON.FileName,
    responseJSON.SecretKey,
  ])
  fillOperateCell(operateCell, "preview-button", "预览", doPreview, [
    responseJSON.FID,
    responseJSON.FileName,
    responseJSON.SecretKey,
  ])
}

function fillRowCell(cell, href, text) {
  let elem = document.createElement("a")
  if (href) {
    elem.href = href
    elem.title = "点击下载"
  } else {
    elem.onclick = () => {
      navigator.clipboard.writeText(text)
      showPopupTips("复制成功", 'green')
    }
    elem.title = "点击复制"
  }
  cell.appendChild(elem)
  let txt = document.createTextNode(text)
  elem.appendChild(txt)
}

function fillOperateCell(cell, className, title, func, params) {
  let elem = document.createElement("button")
  elem.setAttribute("class", "operate-button " + className)
  elem.title = title
  if (typeof params == "object") {
    elem.onclick = () => {
      func(params[0], params[1], params[2])
    }
  } else {
    elem.onclick = () => {
      func(params)
    }
  }
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

// empty link / file flash 空链接 / 文件闪光
function flashEmptyInput(input) {
  input.style.animation = "alert-glow 250ms ease-out 3"
  setTimeout(() => {
    input.style.animation = ""
  }, 750)
}

// progress bar 进度条
function tridentOnProgress(e) {
  let total = e.total
  let loaded = e.loaded
  let progress = loaded / total * 100 + "%"
  setTridentProgress(progress)
}

function setTridentProgress(progress) {
  document.getElementById('trident').style.backgroundPositionX = `${progress}`
}

function tridentOnLoadEnd(e) {
  document.getElementById('trident').style.backgroundPositionX = '0'
}

// popup tips 弹框提示
let popupTimeoutID

function showPopupTips(text, color) {
  let tips = document.getElementById('popup-tips')
  let tipsText = document.getElementById('popup-tips-text')
  let originTop = '-100px'
  let currentTop = tips.style.top
  let alterTop = '5px'
  let bgColor
  let boxShadow

  // 已经弹出
  if (currentTop === alterTop) {
    clearTimeout(popupTimeoutID)
  }

  // 更改弹框坐标、文字、背景颜色
  tips.style.top = alterTop
  tipsText.textContent = text
  switch (color) {
    case 'red':
      bgColor = '#ff5252'
      boxShadow = '0px 6px 2px -1px rgba(211, 47, 47, 0.3)'
      break
    case 'green':
      bgColor = '#bee7cd'
      boxShadow = '0px 6px 2px -1px rgba(152, 184, 164, 0.3)'
      break
  }
  tips.style.backgroundColor = bgColor
  tips.style.boxShadow = boxShadow

  // 定时恢复隐藏
  popupTimeoutID = setTimeout(() => {
    tips.style.top = originTop
    popupTimeoutID = null
  }, 2500)
}

// 弹窗
let modal = document.querySelector(".modal")
let closeBtn = document.querySelector(".close-btn")

function showPreviewZipModal(responseJSON) {
  modal.style.display = "block"
  let text = ""
  modal.querySelector(".modal-content-title").innerHTML = "压缩文件预览"
  let modalContentText = modal.querySelector(".modal-content-text")
  modalContentText.innerHTML = `正在加载压缩文件...`
  for (let item of responseJSON) {
    // 按行显示
    text += `<div class="zip-row">
      <span class="zip-row-name">${item.name}</span>
      <span class="zip-row-desc">${item.desc}</span>
    </div>`
  }
  modalContentText.innerHTML = text
}

closeBtn.onclick = function () {
  modal.style.display = "none"
}
window.onclick = function (e) {
  if (e.target == modal) {
    modal.style.display = "none"
  }
}