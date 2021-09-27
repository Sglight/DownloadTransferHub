"use strict"
const DOMAIN = "https://soar.l4d2lk.cn"
// const DOMAIN = 'http://localhost:8001'

function doSearch() {
  let secretKey = encodeURIComponent(
    document.getElementById("secretKey").value
  )
  secretKey ? 1 : (secretKey = "tmp")

  const xhr = new XMLHttpRequest()
  let requestUrl = DOMAIN + "/search?secretkey=" + secretKey
  xhr.open("POST", requestUrl)
  xhr.send()

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
      let table = document.getElementById("search-result-table")
      createResultTableIterate(table, JSON.parse(xhr.response))
    }
  }
}

function createResultTable(table, responseJSON) {
  let rowLength = table.rows.length
  let tableRow = table.insertRow(rowLength)
  tableRow.setAttribute("id", "fid-" + responseJSON.FID)

  let fileNameCell = tableRow.insertCell(0)
  let hashCell = tableRow.insertCell(1)
  let secretKeyCell = tableRow.insertCell(2)
  let remarksCell = tableRow.insertCell(3)

  fillRowCell(
    fileNameCell,
    "UserFiles/" + responseJSON.SecretKey + "/" + responseJSON.FileName,
    decodeURIComponent(responseJSON.FileName)
  )
  fillRowCell(hashCell, "", responseJSON.Hash)
  fillRowCell(secretKeyCell, "", responseJSON.SecretKey)
  fillRowCell(remarksCell, "", responseJSON.remarks)
}

function fillRowCell(cell, href, text) {
  let elem = document.createElement("a")
  if (href) {
    elem.href = href
    elem.title = "点击下载"
  } else {
    elem.onclick = function () {
      copyToClip(text)
    }
    elem.title = "点击复制"
  }
  cell.appendChild(elem)
  let txt = document.createTextNode(text)
  elem.appendChild(txt)
}

function createResultTableIterate(table, responseJSON) {
  let rowLength = table.rows.length

  // 清空表格
  while (rowLength > 1) {
    table.deleteRow(rowLength - 1)
    rowLength--
  }

  for (let item in responseJSON) {
    createResultTable(table, responseJSON[item])
    rowLength++
  }
}
