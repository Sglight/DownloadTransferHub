function setNowNavItem(item) {
  // 清空 nav-now 状态
  let test = document.getElementsByClassName("nav-item");
  for (let elem of test) {
    elem.className = "nav-item";
  }
  // 添加 nav-now
  document.getElementById(item).className = "nav-item nav-now";
}

function goParse() {
  setNowNavItem("parse");
  document.getElementById("inputFile").removeAttribute("hidden");
  document.getElementById("remarks").removeAttribute("hidden");
  document.getElementById("uploadFile").setAttribute("hidden", "hidden");
  document.getElementById("mode").setAttribute("value", "parse");
  document.getElementById("gogogo").setAttribute("value", "解析");
  document.getElementById("gogogo").setAttribute("onclick", "doParse()");
  document.getElementById("secretKey").style.width = "35%";

}

function goUpload() {
  setNowNavItem("upload");
  document.getElementById("uploadFile").removeAttribute("hidden");
  document.getElementById("remarks").removeAttribute("hidden");
  document.getElementById("inputFile").setAttribute("hidden", "hidden");
  document.getElementById("mode").setAttribute("value", "upload");
  document.getElementById("gogogo").setAttribute("value", "上传");
  document.getElementById("gogogo").setAttribute("onclick", "doUpload()");
  document.getElementById("secretKey").style.width = "35%";
}

function goSearch() {
  setNowNavItem("search");
  document.getElementById("inputFile").setAttribute("hidden", "hidden");
  document.getElementById("uploadFile").setAttribute("hidden", "hidden");
  document.getElementById("remarks").setAttribute("hidden", "hidden");
  document.getElementById("mode").setAttribute("value", "search");
  document.getElementById("gogogo").setAttribute("value", "查询");
  document.getElementById("gogogo").setAttribute("onclick", "doSearch()");
  document.getElementById("secretKey").style.width = "80%";
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
