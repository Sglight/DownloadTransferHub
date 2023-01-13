"use strict"
const DOMAIN = ['https://soar.hykq.cc']
const ORIGIN = document.location.origin
const HOSTNAME = document.location.hostname
const LOCALNODE = 'http://127.0.0.1:8001'

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
    showPopupTips('下载链接为空', 'red')
    return
  }
  if ('EventSource' in window) { // 支持 SSE
    let requestUrl
    if (DOMAIN.includes(ORIGIN)) {
      requestUrl = `${ORIGIN}/parsesse?inputfile=${inputFileLink}&secretkey=${secretKey}&remarks=${remarks}`
    } else if (HOSTNAME == '127.0.0.1') {
      requestUrl = `${LOCALNODE}/parsesse?inputfile=${inputFileLink}&secretkey=${secretKey}&remarks=${remarks}`
    }
    const sse = new EventSource(requestUrl)
    disableElement("trident", true)
    sse.onerror = (err) => {
      showPopupTips(err, 'red')
      console.log(err)
      sse.close()
      disableElement("trident", false)
    }
    sse.onmessage = (e) => {
      if ( e.lastEventId === 'progress' ) { // 进度
        setTridentProgress(e.data)
      } else if (e.lastEventId === 'result') { // 下载完毕
        sse.close()
        disableElement("trident", false)
        hideElement("parse-result-table", false)
        let table = document.getElementById("parse-result-table")
        createResultTable(table, JSON.parse(e.data))
        setTridentProgress(0)
      }
    }
  } else { // 不支持 SSE，使用 XHR
    const xhr = new XMLHttpRequest()
    let requestUrl
    if (DOMAIN.includes(ORIGIN)) {
      requestUrl = `${ORIGIN}/parse?inputfile=${inputFileLink}&secretkey=${secretKey}&remarks=${remarks}`
    } else if (HOSTNAME == '127.0.0.1') {
      requestUrl = `${LOCALNODE}/parse?inputfile=${inputFileLink}&secretkey=${secretKey}&remarks=${remarks}`
    }
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
}

function doUpload() {
  let uploadFile = document.getElementById("uploadFile")
  if (!uploadFile.value) { // No File, show a red border on input
    flashEmptyInput(uploadFile)
    showPopupTips('文件为空', 'red')
    return
  }

  let secretKey = encodeURIComponent(
    document.getElementById("secretKey").value
  )
  secretKey ? 1 : (secretKey = "tmp")
  let remarks = encodeURIComponent(document.getElementById("remarks").value)
  let fileObj = document.getElementById("uploadFile").files[0]

  // limit max file size
  if (fileObj.size > 300 * 1024 * 1024) {
    flashEmptyInput(uploadFile)
    showPopupTips('文件大于 300 MB', 'red')
  }

  let form = new FormData()
  form.append("file", fileObj) // "file" 对应 multer 中的 fieldName

  const xhr = new XMLHttpRequest()
  let requestUrl
  if (DOMAIN.includes(ORIGIN)) {
    requestUrl = `${ORIGIN}/upload?secretkey=${secretKey}&remarks=${remarks}`
  } else if (HOSTNAME == '127.0.0.1') {
    requestUrl = `${LOCALNODE}/upload?secretkey=${secretKey}&remarks=${remarks}`
  }
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
  let requestUrl
  if (DOMAIN.includes(ORIGIN)) {
    requestUrl = `${ORIGIN}/search?secretkey=${secretKey}`
  } else if (HOSTNAME == '127.0.0.1') {
    requestUrl = `${LOCALNODE}/search?secretkey=${secretKey}`
  }
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
  let requestUrl
  if (DOMAIN.includes(ORIGIN)) {
    requestUrl = `${ORIGIN}/delete?FID=${FID}&filename=${fileName}&secretkey=${secretKey}`
  } else if (HOSTNAME == '127.0.0.1') {
    requestUrl = `${LOCALNODE}/delete?FID=${FID}&filename=${fileName}&secretkey=${secretKey}`
  }
  xhr.open("POST", requestUrl)
  xhr.send()

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
      let row = document.getElementById(`fid-${FID}`)
      row.parentElement.removeChild(row)
    }
  }
}

function doChangeKey(FID, fileName) {
  // 参数：FID, oldkey, newkey, mode
  let row = document.getElementById(`fid-${FID}`)
  let oldKey = row.childNodes[2].childNodes[0].text
  // TODO 更改询问方法
  let newKey = prompt(`输入新的密令\n当前密令为 '${oldKey}'`)
  if (newKey === null) { // 为空与取消都是 null，设置不允许为空
    showPopupTips("新密令为空", 'red')
    return
  }
  if (oldKey === newKey) { // 新旧密令相同
    showPopupTips("新旧密令相同", 'red')
    return
  }

  let select = confirm(
    `可以 '更改' 或者 '添加'\n点击 '确定' 更改为 '${newKey}'\n点击 '取消' 增加密令 '${newKey}'`
  )
  let mode
  select ? (mode = "change") : (mode = "add")

  let xhr = new XMLHttpRequest()
  let requestUrl
  if (DOMAIN.includes(ORIGIN)) {
    requestUrl = `${ORIGIN}/changekey?FID=${FID}&filename=${fileName}&oldkey=${oldKey}&newkey=${newKey}&mode=${mode}`
  } else if (HOSTNAME == '127.0.0.1') {
    requestUrl = `${LOCALNODE}/changekey?FID=${FID}&filename=${fileName}&oldkey=${oldKey}&newkey=${newKey}&mode=${mode}`
  }
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
  let requestUrl
  if (DOMAIN.includes(ORIGIN)) {
    requestUrl = `${ORIGIN}/changeremarks?FID=${FID}&newremarks=${newRemarks}`
  } else if (HOSTNAME == '127.0.0.1') {
    requestUrl = `${LOCALNODE}/changeremarks?FID=${FID}&newremarks=${newRemarks}`
  }
  xhr.open("POST", requestUrl)
  xhr.send()

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
      row.childNodes[3].childNodes[0].text = newRemarks // row - td[3] - a[0] - text
    }
  }
}

function doRename(FID, fileName, secretKey) {
  let row = document.getElementById(`fid-${FID}`)
  let newFileName = prompt("请输入新文件名", row.childNodes[0].childNodes[0].text)
  if (newFileName === null) return

  let newHref = `UserFiles/${secretKey}/${newFileName}`

  let xhr = new XMLHttpRequest()
  let requestUrl
  if (DOMAIN.includes(ORIGIN)) {
    requestUrl = `${ORIGIN}/rename?FID=${FID}&newfilename=${newFileName}&oldfilename=${fileName}&secretkey=${secretKey}`
  } else if (HOSTNAME == '127.0.0.1') {
    requestUrl = `${LOCALNODE}/rename?FID=${FID}&newfilename=${newFileName}&oldfilename=${fileName}&secretkey=${secretKey}`
  }
  xhr.open("POST", requestUrl)
  xhr.send()

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
      row.childNodes[0].childNodes[0].text = newFileName
      row.childNodes[0].childNodes[0].href = newHref
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

function disableElement(id, boolean) {
  document.getElementById(id).disabled = boolean
}

function doPreview(FID, fileName, secretKey) {
  let row = document.getElementById(`fid-${FID}`)
  let url = row.childNodes[0].childNodes[0].href

  // 提取后缀名
  let suffix = fileName.split(".").pop().toLowerCase()
  if (isOffice(suffix)) {
    doPreviewOffice(url)
  } else if (suffix == "pdf") {
    doPreviewPDF(secretKey, fileName)
  } else if (isZip(suffix)) {
    doPreviewZip(secretKey, fileName)
  }
}

// office 文件预览，使用 Office Web Viewer
function doPreviewOffice(url) {
  // http://view.officeapps.live.com/op/view.aspx?src=
  window.open(`https://view.officeapps.live.com/op/view.aspx?src=${url}`)
}

function isOffice(suffix) {
  let office = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"]
  return office.includes(suffix)
}

// pdf 文件预览，使用 pdf.js
function doPreviewPDF(secretKey, fileName) {
  // nginx location /pdfviewer { alias PROJECT_PATH/js/pdfjs/ }
  // /pdfviewer/web/viewer.html?file=../../../UserFiles//${secretKey}/${fileName}
  window.open(`/pdfviewer/web/viewer.html?file=../../../UserFiles//${secretKey}/${fileName}`)
}

// 压缩文件预览
function doPreviewZip(secretKey, fileName) {
  // 请求后端，获取压缩文件的文件列表
  let xhr = new XMLHttpRequest()
  let requestUrl
  if (DOMAIN.includes(ORIGIN)) {
    requestUrl = `${ORIGIN}/previewzip?secretkey=${secretKey}&filename=${fileName}`
  } else if (HOSTNAME == '127.0.0.1') {
    requestUrl = `${LOCALNODE}/previewzip?secretkey=${secretKey}&filename=${fileName}`
  }
  xhr.open("POST", requestUrl)
  xhr.send()

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
      let fileList = JSON.parse(xhr.response)
      // 弹窗显示
      showPreviewZipModal(fileList)
    }
  }
}

function isZip(suffix) {
  let zip = ["zip", "rar", "7z"]
  return zip.includes(suffix)
}