function doParse() {
    alert("doParse()")
}

function doUpload() {
    alert("doUpload()")
}

function doSearch() {
    const xhr = new XMLHttpRequest()
    let secretKey = document.getElementById('secretKey').value
    if (secretKey == '') {
        secretKey = 'tmp'
    }

    let requestUrl = 'http://localhost:8001/search?secretkey=' + secretKey
    xhr.open('GET', requestUrl)
    xhr.send()

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                hideElement("result-table", false)
                let table = document.getElementById('result-table')
                let rowLength = table.rows.length

                // 清空表格
                while (rowLength > 1) {
                    table.deleteRow(rowLength - 1)
                    rowLength--
                }

                for (item of JSON.parse(xhr.response)) {
                    console.log(item)
                    let tableRow = table.insertRow(rowLength)

                    let fileName = tableRow.insertCell(0)
                    let hash = tableRow.insertCell(1)
                    let secretKey = tableRow.insertCell(2)
                    let remarks = tableRow.insertCell(3)
                    let operate = tableRow.insertCell(4)

                    fileName.innerHTML = `<a href="UserFiles/${item.SecretKey}/${item.FileName}">${item.FileName}</a>`
                    hash.innerHTML = `<a href="javascript:">${item.Hash}</a>`
                    secretKey.innerHTML = `<a href="javascript:">${item.SecretKey}</a>`
                    remarks.innerHTML = `<a href="javascript:">${item.remarks}</a>`
                    operate.innerHTML = `
                    <form>
                        <input type="button" class="operate-button delete-button" value="" title="删除" onclick="doDelete()">
                        <input type="button" class="operate-button change-key-button" value="" title="更改密令" onclick="doChangeKey()">
                        <input type="button" class="operate-button change-remarks-button" value="" title="更改备注" onclick="doChangeRemarks()">
                    </form>
                    `
                    rowLength++;
                }
            }
        }
    }
}

function goParse() {
    setNowNavItem("parse")
    hideElement("inputFile", false)
    hideElement("uploadFile",true)
    hideElement("remarks", false)
    setElementValue("mode", "parse")
    setElementValue("gogogo", "解析")
    document.form.action="/parse"
    document.getElementById("secretKey").style.width = "35%"
}

function goUpload() {
    setNowNavItem("upload")
    hideElement("inputFile",true)
    hideElement("uploadFile", false)
    hideElement("remarks", false)
    setElementValue("mode", "upload")
    setElementValue("gogogo", "上传")
    document.form.action="/upload"
    document.getElementById("secretKey").style.width = "35%"
}

function goSearch() {
    setNowNavItem("search")
    hideElement("inputFile",true)
    hideElement("uploadFile",true)
    hideElement("remarks",true)
    setElementValue("mode", "search")
    setElementValue("gogogo", "查询")
    document.form.action=""
    document.getElementById("secretKey").style.width = "80%"
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

function setNowNavItem(item) {
    // 清空 nav-now 状态
    let items = document.getElementsByClassName("nav-item")
    for (let elem of items) {
        elem.className = "nav-item"
    }
    // 添加 nav-now
    document.getElementById(item).className = "nav-item nav-now"
}

// 按下回车提交表单
// 只监听 form 里的按键事件
const form = document.getElementById('form')

form.addEventListener("keydown", function (event) {
    if (event.defaultPrevented) {
        return // 如果事件已经在进行中，则不做任何事。
    }
    if (event.key === "Enter") {
        doTrident()
    }
}, true)

function hideElement(id, hidden) {
    if (hidden) {
        document.getElementById(id).setAttribute("hidden", "hidden")
    } else {
        document.getElementById(id).removeAttribute("hidden")
    }
}

function setElementValue(id, value) {
    document.getElementById(id).setAttribute("value", value)
}

function doDelete() {
    // 获取 request 的参数
    deleteData('FID 1', '文件名 1', '路径 1')
}

function deleteData(FID, fileName, path) {
    alert(`delete: ${FID}, ${fileName}, ${path}`)
}

function doChangeKey() {
    // 获取 request 的参数
    changeKey('FID 1')
}

function changeKey(FID) {
    alert(`更改密令: ${FID}\n
        可以 '更改' 或者 '添加'
    `)
}

function doChangeRemarks() {
    // 获取 request 的参数
    changeRemarks('FID 1')
}

function changeRemarks(FID) {
    alert(`更改备注: ${FID}`)
}

function switchUsage() {
    let displayStatus = document.getElementById("usage-container").getAttribute("hidden")
    if (displayStatus == "hidden") {
        hideElement("usage-container", false)
    } else {
        hideElement("usage-container", true)
    }
}
