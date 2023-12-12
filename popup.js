function addwhite() {
    let whiteList = GetWhiteList();
    const id = document.getElementById("useridinput").value.replace("@","");
    document.getElementById("useridinput").value = "";
    if (!isEnglishAlphaNumericUnderscore(id) || id.length > 15)
        return;
    AddWhiteList(id);
    UpdateShow();
}
let isblocktaskended = true;
let lastblocked = -1;
window.addEventListener('DOMContentLoaded', function () {
    UpdateBlocked();
    setInterval(() => {
        if (isblocktaskended)
            UpdateBlocked();
    }, 500);/*
    document.getElementById('addw').addEventListener('click',
        addwhite);
    document.getElementById('clearbtn').addEventListener('click',
        ClearWhiteList);*/
});
async function UpdateBlocked()
{
    isblocktaskended = false;
    await chrome.storage.local.get("BlockedTweetCount", function (nowblocked)
    {
        if (nowblocked.BlockedTweetCount == null)
            nowblocked = 0;
        else
            nowblocked = nowblocked.BlockedTweetCount;
        if (nowblocked != lastblocked)
            document.getElementById("blocked").innerText = lastblocked = nowblocked;
        isblocktaskended = true;
});
}
function ClearWhiteList()
{
    if (whiteList == null)
        return;
    whiteList = [];
    chrome.storage.local.set({ Whitelist: "" });
    UpdateShow();
}

async function AddWhiteList(userid) {

    userid = userid.toLowerCase();
    if ((await GetWhiteList()).includes(userid))
        return;
    whiteList.push(userid);
    chrome.storage.local.set({ Whitelist: whiteList.join('@') });
}
let whiteList = null;
async function GetWhiteList() {
    if (whiteList == null) {
        let whiteListGeted = await chrome.storage.local.get("Whitelist");
        console.log(whiteListGeted);
        if (whiteListGeted["Whitelist"])
            whiteList = whiteListGeted["Whitelist"].split('@');
        else
            whiteList = [];
    }
    return whiteList;
}
function isEnglishAlphaNumericUnderscore(str) {
    // 英語の文字、数字、アンダースコアのみを許可する正規表現
    var regex = /^[a-zA-Z0-9_]+$/;

    // テストして結果を返す
    return regex.test(str);
}
async function UpdateShow() {
    let wl = await GetWhiteList();
    const len = wl.length;
    const element = document.getElementById("list");
    element.innerHTML = "";
    for (let i = 0; i < len; i++) {
        const whiteuser = wl[i];
        element.innerHTML += "\n<br><a href='javascript:void(0)' onclick='deleteUser(\"" + whiteuser +"\")'>@" + whiteuser+"</a>";
    }
}