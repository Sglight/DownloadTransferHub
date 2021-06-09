function doParse() {
    alert("doParse()")
}

function doUpload() {
    alert("doUpload()")
}

function doSearch() {
    const xhr = new XMLHttpRequest()
    let secretKey = document.getElementById('secretKey').value
    
    secretKey ? 1 : secretKey = 'tmp'
    data = JSON.stringify({
        "secretkey": secretKey
    })

    let requestUrl = 'https://soar.l4d2lk.cn/search'
    xhr.open('POST', requestUrl)
    xhr.send(data)

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
                    hash.innerHTML = `<a href="javascript:void(0)" onclick="copyToClip('${item.Hash}')">${item.Hash}</a>`
                    secretKey.innerHTML = `<a href="javascript:void(0)" onclick="copyToClip('${item.SecretKey}')">${item.SecretKey}</a>`
                    remarks.innerHTML = `<a href="javascript:void(0)" onclick="copyToClip('${item.remarks}')>${item.remarks}</a>`
                    operate.innerHTML = `
                    <form class="operate-form">
                        <input type="hidden" name="FID" value="${item.FID}">
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
    setElementValue("trident", "解析")
    document.getElementById("secretKey").style.width = "35%"
    hideElement("result-table", true)
}

function goUpload() {
    setNowNavItem("upload")
    hideElement("inputFile",true)
    hideElement("uploadFile", false)
    hideElement("remarks", false)
    setElementValue("mode", "upload")
    setElementValue("trident", "上传")
    document.getElementById("secretKey").style.width = "35%"
    hideElement("result-table", true)
}

function goSearch() {
    setNowNavItem("search")
    hideElement("inputFile",true)
    hideElement("uploadFile",true)
    hideElement("remarks",true)
    setElementValue("mode", "search")
    setElementValue("trident", "查询")
    document.getElementById("secretKey").style.width = "80%"
    if (document.getElementById('result-table').rows.length > 1) {
        hideElement("result-table", false)
    } else {
        hideElement("result-table", true)
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
    // 发送 post

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

function switchUsage() {
    let displayStatus = document.getElementById("usage-container").getAttribute("hidden")
    if (displayStatus == "hidden") {
        hideElement("usage-container", false)
    } else {
        hideElement("usage-container", true)
    }
}

function copyToClip(content, message) {
    var aux = document.createElement("input"); 
    aux.setAttribute("value", content); 
    document.body.appendChild(aux); 
    aux.select();
    document.execCommand("copy"); 
    document.body.removeChild(aux);
    // if (message == null) {
    //     alert("复制成功");
    // } else{
    //     alert(message);
    // }
}
