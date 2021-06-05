function switchUsage() {
  let displayStatus = document.getElementById("usage-container").getAttribute("hidden");
  if (displayStatus == "hidden") {
    hideElement("usage-container", false);
  } else {
    hideElement("usage-container", true);
  }
}

function doParse() {
  alert("doParse()");
}

function doUpload() {
  alert("doUpload()");
}

function doSearch() {
  alert("doSearch()");
}

function goParse() {
  setNowNavItem("parse");
  hideElement("inputFile", false);
  hideElement("uploadFile",true);
  hideElement("remarks", false);
  setElementValue("mode", "parse");
  setElementValue("gogogo", "解析");
  document.getElementById("secretKey").style.width = "35%";

}

function goUpload() {
  setNowNavItem("upload");
  hideElement("inputFile",true);
  hideElement("uploadFile", false);
  hideElement("remarks", false);
  setElementValue("mode", "upload");
  setElementValue("gogogo", "上传");
  document.getElementById("secretKey").style.width = "35%";
}

function goSearch() {
  setNowNavItem("search");
  hideElement("inputFile",true);
  hideElement("uploadFile",true);
  hideElement("remarks",true);
  setElementValue("mode", "search");
  setElementValue("gogogo", "查询");
  document.getElementById("secretKey").style.width = "80%";
}

function doTrident() {
  let mode = document.getElementById("mode").getAttribute("value");
  switch (mode) {
    case "parse":
      doParse();
      break;
    case "upload":
      doUpload();
      break;
    case "search":
      doSearch()
      break;
  }
}

function setNowNavItem(item) {
  // 清空 nav-now 状态
  let items = document.getElementsByClassName("nav-item");
  for (let elem of items) {
    elem.className = "nav-item";
  }
  // 添加 nav-now
  document.getElementById(item).className = "nav-item nav-now";
}

// 按下回车提交表单
// 只监听 form 里的按键事件
const form = document.getElementById('form');

form.addEventListener("keydown", function (event) {
  if (event.defaultPrevented) {
    return; // 如果事件已经在进行中，则不做任何事。
  }
  if (event.key === "Enter") {
    doTrident();
  }
}, true);

function hideElement(id, hidden) {
  if (hidden) {
    document.getElementById(id).setAttribute("hidden", "hidden");
  } else {
    document.getElementById(id).removeAttribute("hidden");
  }
}

function setElementValue(id, value) {
  document.getElementById(id).setAttribute("value", value);
}
