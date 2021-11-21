"use strict"
const DOMAIN = "https://soar.l4d2lk.cn"
// const DOMAIN = 'http://localhost:8001'

function doParse() {
  let inputFile = document.getElementById("inputFile")
  let secretKey = encodeURIComponent(
    document.getElementById("secretKey").value
  )
  secretKey ? 1 : (secretKey = "tmp") // set default value tmp
  let inputFileLink = encodeURIComponent(inputFile.value)
  let remarks = encodeURIComponent(document.getElementById("remarks").value)

  if (!inputFileLink) { // No Link, show a red border on input
    flashEmptyInput(inputFile)
    showPopupTips('下载链接为空')
    return
  }
  const xhr = new XMLHttpRequest()
  let requestUrl = `${DOMAIN}/parse?inputfile=${inputFileLink}&secretkey=${secretKey}&remarks=${remarks}`
  xhr.open("POST", requestUrl)
  xhr.send()

  disableElement("trident", true)

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      disableElement("trident", false)
      if (xhr.status >= 200 && xhr.status < 300) {
        hideElement("parse-result-table", false)
        let table = document.getElementById("parse-result-table")
        createResultTable(table, JSON.parse(xhr.response))
      }
    }
  }
}

function doUpload() {
  let uploadFile = document.getElementById("uploadFile")
  if (!uploadFile.value) { // No File, show a red border on input
    flashEmptyInput(uploadFile)
    showPopupTips('文件为空')
    return
  }

  let secretKey = encodeURIComponent(
    document.getElementById("secretKey").value
  )
  secretKey ? 1 : (secretKey = "tmp")
  let remarks = encodeURIComponent(document.getElementById("remarks").value)
  let fileObj = document.getElementById("uploadFile").files[0]

  // limit max file size
  if (fileObj.size > 200 * 1024 * 1024) {
    flashEmptyInput(uploadFile)
    showPopupTips('文件大于 200 MB')
  }

  let form = new FormData()
  form.append("file", fileObj)

  const xhr = new XMLHttpRequest()
  let requestUrl = `${DOMAIN}/upload?secretkey=${secretKey}&remarks=${remarks}`
  xhr.open("POST", requestUrl)
  xhr.upload.onprogress = tridentOnProgress
  xhr.upload.onloadend = tridentOnLoadEnd // restore trident logo position-x
  xhr.send(form)

  disableElement("trident", true)

  xhr.onreadystatechange = () => {
    disableElement("trident", false)
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
      hideElement("parse-result-table", false)
      let table = document.getElementById("parse-result-table")
      createResultTable(table, JSON.parse(xhr.response))
    }
  }
}

function doSearch() {
  let secretKey = encodeURIComponent(
    document.getElementById("secretKey").value
  )
  secretKey ? 1 : (secretKey = "tmp")

  const xhr = new XMLHttpRequest()
  let requestUrl = `${DOMAIN}/search?secretkey=${secretKey}`
  xhr.open("POST", requestUrl)
  xhr.send()
  disableElement("trident", true)

  xhr.onreadystatechange = () => {
    disableElement("trident", false)
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
      hideElement("search-result-table", false)
      let table = document.getElementById("search-result-table")
      createResultTableIterate(table, JSON.parse(xhr.response))
    }
  }
}

function doDelete(FID, fileName, secretKey) {
  let xhr = new XMLHttpRequest()
  let requestUrl = `${DOMAIN}/delete?FID=${FID}&filename=${fileName}&secretkey=${secretKey}`
  xhr.open("POST", requestUrl)
  xhr.send()

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
      let row = document.getElementById(`fid-${FID}`)
      row.parentElement.removeChild(row)
    }
  }
}

function doChangeKey(FID, fileName, secretKey) {
  // 参数：FID, oldkey, newkey, mode
  let row = document.getElementById(`fid-${FID}`)
  let oldKey = row.childNodes[2].childNodes[0].text
  let newKey = prompt(`输入新的密令\n当前密令为 '${oldKey}'`)
  if (newKey === null) return

  let select = confirm(
    `可以 '更改' 或者 '添加'\n点击 '确定' 更改为 '${newKey}'\n点击 '取消' 增加密令 '${newKey}'`
  )
  let mode
  select ? (mode = "change") : (mode = "add")

  let xhr = new XMLHttpRequest()
  let requestUrl = `${DOMAIN}/changekey?FID=${FID}&filename=${fileName}&oldkey=${oldKey}&newkey=${newKey}&mode=${mode}`
  xhr.open("POST", requestUrl)
  xhr.send()

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
      if (mode == "change") {
        row.childNodes[2].childNodes[0].text = newKey
      } else if (mode == "add") {
        row.childNodes[2].childNodes[0].text += ` | ${newKey}`
      }
    }
  }
}

function doChangeRemarks(FID) {
  let row = document.getElementById(`fid-${FID}`)
  let newRemarks = prompt("请输入新备注", row.childNodes[3].childNodes[0].text)
  if (newRemarks === null) return

  let xhr = new XMLHttpRequest()
  let requestUrl = `${DOMAIN}/changeremarks?FID=${FID}&newremarks=${newRemarks}`
  xhr.open("POST", requestUrl)
  xhr.send()

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
      row.childNodes[3].childNodes[0].text = newRemarks // row - td[3] - a[0] - text
    }
  }
}

function doTrident() {
  let mode = document.getElementById("mode").getAttribute("value")
  switch (mode) {
    case "parse":
      doParse()
      break
    case "upload":
      doUpload()
      break
    case "search":
      doSearch()
      break
  }
}

function copyToClip(content, message) {
  let aux = document.createElement("input")
  aux.setAttribute("value", content)
  document.body.appendChild(aux)
  aux.select()
  document.execCommand("copy")
  document.body.removeChild(aux)
  message ? true : (message = "复制成功")
}

function disableElement(id, boolean) {
  document.getElementById(id).disabled = boolean
}