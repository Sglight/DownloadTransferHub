"use strict"
addLoadEvent(prepareClicks)

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

function prepareClicks() {
  if (
    !document.createElement ||
    !document.createTextNode ||
    !document.getElementById
  )
    return false
  document.getElementById("tab-parse").onclick = goParse
  document.getElementById("tab-upload").onclick = goUpload
  document.getElementById("tab-search").onclick = goSearch
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
    responseJSON.SecretKey,
  ])
  fillOperateCell(
    operateCell,
    "change-remarks-button",
    "更改备注",
    doChangeRemarks,
    responseJSON.FID
  )
}

function fillRowCell(cell, href, text) {
  let elem = document.createElement("a")
  if (href) {
    elem.href = href
    elem.title = "点击下载"
  } else {
    elem.onclick = () => {
      copyToClip(text)
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

function flashEmptyInput(input) {
  input.style.animation = "alert-glow 250ms ease-out 3"
    setTimeout(() => {
      input.style.animation = ""
    }, 750)
}

function tridentOnProgress(e) {
  let total = e.total
  let loaded = e.loaded
  let progress = loaded / total * 100
  document.getElementById('trident').style.backgroundPositionX = `${progress}%`
}

function tridentOnLoadEnd(e) {
  document.getElementById('trident').style.backgroundPositionX = '0'
}

function showPopupTips(text) {
  let tips = document.querySelector('.popup-tips')
  let tipsText = document.querySelector('.popup-tips-text')
  let originTop = tips.style.top
  tips.style.top = '5px'
  tipsText.textContent = text
  setTimeout(() => {
    tips.style.top = originTop
  }, 2500)

}