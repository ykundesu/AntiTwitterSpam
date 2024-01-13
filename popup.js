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
    UpdateDetail();
    UpdatePopup();
    setInterval(() => {
        if (isblocktaskended)
            UpdatePopup();
    }, 500);

    const IsTweetAutoProcessing = document.getElementById("IsTweetAutoProcessing");
    chrome.storage.local.get("IsTweetAutoProcessing", function (nowIsTweetAutoProcessing) {
        if (nowIsTweetAutoProcessing.IsTweetAutoProcessing == null)
            nowIsTweetAutoProcessing = true;
        else
            nowIsTweetAutoProcessing = nowIsTweetAutoProcessing.IsTweetAutoProcessing;
        IsTweetAutoProcessing.checked = nowIsTweetAutoProcessing;
    });
    IsTweetAutoProcessing.onchange = function () {
        console.log("onchanged");
        chrome.storage.local.set({ IsTweetAutoProcessing: this.checked });
        UpdateOption();
    };

    const IsTweetHideAuthorOnly = document.getElementById("IsTweetHideAuthorOnly");

    const SpamCope = document.getElementById("SpamCope");
    chrome.storage.local.get("SpamCope", function (nowSpamCope)
    {
        if (nowSpamCope.SpamCope == null)
            nowSpamCope = "None";
        else
            nowSpamCope = nowSpamCope.SpamCope;
        SpamCope.value = nowSpamCope;
        if (SpamCope.value != "None")
            IsTweetHideAuthorOnly.parentElement.setAttribute("style", "");
    });
    SpamCope.onchange = function () {
        chrome.storage.local.set({ SpamCope: this.value });
    };


    chrome.storage.local.get("IsTweetHideAuthorOnly", function (nowIsTweetHideAuthorOnly) {
        if (nowIsTweetHideAuthorOnly.IsTweetHideAuthorOnly == null)
            nowIsTweetHideAuthorOnly = false;
        else
            nowIsTweetHideAuthorOnly = nowIsTweetHideAuthorOnly.IsTweetHideAuthorOnly;
        IsTweetHideAuthorOnly.checked = nowIsTweetHideAuthorOnly;
    });
    IsTweetHideAuthorOnly.onchange = function () {
        chrome.storage.local.set({ IsTweetHideAuthorOnly: this.checked });
    };

    const IsSpamReportAndBlockEnable = document.getElementById("IsSpamReportAndBlockEnable");
    chrome.storage.local.get("IsSpamReportAndBlockEnable", function (nowIsSpamReportAndBlockEnable) {
        if (nowIsSpamReportAndBlockEnable.IsSpamReportAndBlockEnable == null)
            nowIsSpamReportAndBlockEnable = true;
        else
            nowIsSpamReportAndBlockEnable = nowIsSpamReportAndBlockEnable.IsSpamReportAndBlockEnable;
        IsSpamReportAndBlockEnable.checked = nowIsSpamReportAndBlockEnable;
    });
    IsSpamReportAndBlockEnable.onchange = function () {
        chrome.storage.local.set({ IsSpamReportAndBlockEnable: this.checked });
    };

    const IsShowBlockedBadge = document.getElementById("IsShowBlockedBadge");
    chrome.storage.local.get("IsShowBlockedBadge", function (nowIsShowBlockedBadge) {
        if (nowIsShowBlockedBadge.IsShowBlockedBadge == null)
            nowIsShowBlockedBadge = false;
        else
            nowIsShowBlockedBadge = nowIsShowBlockedBadge.IsShowBlockedBadge;
        IsShowBlockedBadge.checked = nowIsShowBlockedBadge;
    });
    IsShowBlockedBadge.onchange = function () {
        chrome.storage.local.set({ IsShowBlockedBadge: this.checked });
    }
});
function UpdateDetail() {
    const manifest = chrome.runtime.getManifest();
    document.getElementById("Detail_name").innerText = manifest.name;
    document.getElementById("Detail_version").innerText = `v${manifest.version}`;
    const manifest_version = manifest.manifest_version;
    document.getElementById("Detail_edition").innerText = (manifest_version == 2 ? "Firefox" : "Chrome") + "版(manifestv" + manifest_version + ")";
    let ReviewURL = "https://chromewebstore.google.com/detail/anti-twitterspam/kidepcmgoakfaefpgjkmkkkmcidneffo";
    if (manifest_version == 2)
        ReviewURL = "https://addons.mozilla.org/ja/firefox/addon/anti-twitterspam/";
    document.getElementById("Detail_review").setAttribute("href", ReviewURL);
}
async function UpdateBlocked()
{
    isblocktaskended = false;
    await chrome.storage.local.get("BlockedTweetCount", function (nowblocked) {
        if (nowblocked.BlockedTweetCount == null)
            nowblocked = 0;
        else
            nowblocked = nowblocked.BlockedTweetCount;
        if (nowblocked != lastblocked)
            document.getElementById("blocked").innerText = lastblocked = nowblocked;
        isblocktaskended = true;
    });
}
async function UpdatePopup()
{
    UpdateBlocked();
    UpdateOption();
}
async function UpdateOption()
{
    // IsTweetAutoProcessingをstorageから取得して有効ならTweetAutoProcessOptionを表示、でなければ非表示にする
    await chrome.storage.local.get("IsTweetAutoProcessing", function (nowIsTweetAutoProcessing) {
        if (nowIsTweetAutoProcessing.IsTweetAutoProcessing == null)
            nowIsTweetAutoProcessing = true;
        else
            nowIsTweetAutoProcessing = nowIsTweetAutoProcessing.IsTweetAutoProcessing;
        if (nowIsTweetAutoProcessing)
            document.getElementById("TweetAutoProcessOption").setAttribute("style", "");
        else
            document.getElementById("TweetAutoProcessOption").setAttribute("style", "display:none;");
        document.getElementById("loading").style.display = "none";
        document.getElementById("Options").style.display = "";
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