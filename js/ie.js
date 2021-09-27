"use strict"
var DOMAIN = "https://soar.l4d2lk.cn"

function doSearch() {
  var secretKey = encodeURIComponent(
    document.getElementById("secretKey").value
  )
  secretKey ? 1 : (secretKey = "tmp")

  var xhr = new XMLHttpRequest()
  var requestUrl = DOMAIN + "/search?secretkey=" + secretKey
  xhr.open("POST", requestUrl)
  xhr.send()

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
      var table = document.getElementById("search-result-table")
      createResultTableIterate(table, strToJson(xhr.responseText))
    }
  }
}

function createResultTable(table, responseJSON) {
  var rowLength = table.rows.length
  var tableRow = table.insertRow(rowLength)
  tableRow.setAttribute("id", "fid-" + responseJSON.FID)

  var fileNameCell = tableRow.insertCell(0)
  var hashCell = tableRow.insertCell(1)
  var secretKeyCell = tableRow.insertCell(2)
  var remarksCell = tableRow.insertCell(3)

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
  var elem = document.createElement("a")
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
  var txt = document.createTextNode(text)
  elem.appendChild(txt)
}

function createResultTableIterate(table, responseJSON) {
  var rowLength = table.rows.length

  // 清空表格
  while (rowLength > 1) {
    table.deleteRow(rowLength - 1)
    rowLength--
  }

  for (var item in responseJSON) {
    createResultTable(table, responseJSON[item])
    rowLength++
  }
}

function strToJson(str){ 
  var json = (new Function("return " + str))()
  return json
} 
