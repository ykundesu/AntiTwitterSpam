let CopeType = "None";
let IsAutoTweetHideAuthorOnly = false;
let IsTweetAutoProcessing = true;
let IsSpamReportAndBlockEnable = true;

let lastBlockedCount = -1;

let twitterscript = document.createElement('script')
twitterscript.src = chrome.runtime.getURL('twitter_script.js')
document.documentElement.appendChild(twitterscript);
let twitterstyle = document.createElement('style')
// twitter_style.cssを読み込んでから書き込む
fetch(chrome.runtime.getURL('twitter_style.css'))
    .then(response => response.text())
    .then(data => {
        twitterstyle.innerHTML = data;
    });
document.documentElement.appendChild(twitterstyle);

//悪質なサイトのリスト(偽情報を流すサイトなど)
//独自調査
const ButPages = [
    "jp.superbaby0127.com",
    "jp.cookie-food.com",
    "jp.analysis-car.com",
    "jp.topcarweb.com",
    "jp.firstopdesign.com",
    "jp.lot-pets.com",
    "jp.daily-novel.net",
    "jp.health-wonderful.com",
    "knnwork.com"
];
function GetEmojiCount(dom)
{
    let count = 0;
    for (var i = 0; i < dom.childNodes.length; i++)
    {
        const node = dom.childNodes[i];
        const tagname = node.tagName.toLowerCase();
        if (tagname == "img")
            count++;
    }
    return count;
}
//dom:data-testidがtweetTextのdomを渡す。
function GetTweetText(dom)
{
    let text = "";
    for (var i = 0; i < dom.childNodes.length; i++)
    {
        const node = dom.childNodes[i];
        const tagname = node.tagName.toLowerCase();
        if (tagname == "span" || tagname == "div")
            text += node.innerText;
        else if (tagname == "img")
            text += node.getAttribute("alt");
    }
    return text;
}
function GetMeUserId()
{
    // 正規表現パターン
    const pattern = /"screen_name":"([^"]*)"/;

    // マッチング
    const match = document.body.getElementsByTagName("script")[0].innerText.match(pattern);

    // * の抽出
    if (match && match.length > 0) {
        return match[0];
    } else {
        console.log("screen_nameが見つかりませんでした。");
        return null;
    }

}
//data-testidがcellInnerDivのやつを渡す。
//Spamでtrueを返す
function isSpamTweet(dom, tweetData)/*authoruserid, meuserid, username, tweettext, userid, tweetemojicount, doubletexters)*/
{
    if (tweetData["username"] == undefined)
        return false;
    //悪質なサイトを含んでいたらスパム
    if (isButPageInText(dom, tweetData["tweetText"]))
    {
        console.log(tweetData["username"] + " was spam! reason:But page Spam");
        return true;
    }
    // 内容がほぼ引RTのみだったらスパム
    if (tweetData["FullText"].length <= 3 && tweetData["RequoteExist"] &&
        (!containsJapanese(tweetData["username"]) || tweetData["userpossibly_sensitive"]))
    {
        console.log(tweetData["username"] + " was spam! reason:Requote Spam");
        return true;
    }
    // フォロワー-フォロー中が5万人以上いたらパス
    if ((tweetData["FollowerCount"] - tweetData["FollowingCount"]) >= 50000)
        return false;
    let UsernameHiraganaCount = GetHiraganaKatakanaCount(tweetData["username"]) + GetEnglishAndNumbersCount(tweetData["username"]);
    //プロフ見て系であればスパム
    if (!tweetData["isblueverified"] && !tweetData["verified"] &&
        tweetData["isDefaultIcon"] && !containsKanji(tweetData["username"]) && UsernameHiraganaCount >= 2 && UsernameHiraganaCount <= 8 &&
        tweetData["FullText"].includes("初めまして") &&
        (tweetData["FullText"].includes("プロフ見て") || tweetData["FullText"].includes("プロフリンク見て")) && 
        tweetData["tweetEmojiCount"] >= 2 && tweetData["tweetEmojiCount"] <= 6)
        return true;
    // 名前に日本語が入っているかつひらがな・カタカナが含まれていたらパス
    if (containsHiraganaKatakanaOnly(tweetData["username"]))
        return false;
    //投稿者が投稿者自身or自分であればパス
    if (tweetData["userid"].toLowerCase() == tweetData["authoruserid"].toLowerCase() ||
        tweetData["userid"].toLowerCase() == tweetData["meuserid"].toLowerCase())
        return false;
    //多分絵文字のみだったらスパム
    if (tweetData["FullText"].length > 0 && !containsJapanese(tweetData["FullText"]) && !containsEnglishAndNumbers(tweetData["FullText"]) && tweetData["tweetEmojiCount"] > 0 && tweetData["FullText"].length <= 15) {
        console.log(tweetData["username"] + " was spam! reason:Emoji Spam");
        return true;
    }
    // 未認証だったらパス
    if (!tweetData["isblueverified"] || tweetData["verified"])
        return false
    // フォロワーが500人未満だったらパス
    if (tweetData["FollowerCount"] < 500)
        return false;
    // ツイート内容が4文字未満もしくは日本語名じゃないユーザーかつ日本語率が5割以上ならスパム
    if (tweetData["FullText"].length < 4 || (!containsJapanese(tweetData["username"]) && calculateJapanesePercentage(tweetData["FullText"]) >= 0.5)) {
        console.log(tweetData["username"] + " was spam! reason:Text Copy Spam");
        return true;
    }
    //連投してたらスパム
    else if (tweetData["DoubleTexters"].includes(tweetData["userid"])) {
        console.log(tweetData["username"] + " was spam! reason:Double Tweet Spam");
        return true;
    }
    //対象のユーザーがシャドウBANされてるっぽかったらスパム
    else if (tweetData["userpossibly_sensitive"])
    {
        console.log(tweetData["username"] + " was spam! reason:Shadow banned...?");
        return true;
    }
    return false;
}
function isCanMuteTweet(dom, tweetData)
{
    if (CopeType == "None" && !IsAutoTweetHideAuthorOnly)
        return false;
    if (!isSpamTweet(dom, tweetData))
        return false;
    if (isButPageInText(dom, tweetData["tweetText"]))
        return false;
    if (containsJapanese(tweetData["username"]))
        return false;
    return true;
}
let MuteTaskIdMax = 0;
function UpdateTask()
{
    if (MuteTasks.length <= 0)
        return;
    while (MuteTasks[0] == undefined || MuteTasks[0].querySelector('div[data-testid="caret"]') == null)
    {
        MuteTasks.shift();
    }
    if (document.querySelector('.css-175oi2r div[data-testid="Dropdown"]') != null)
        return;
    ClickButton(MuteTasks[0], MuteTaskIdMax++);
    MuteTasks.shift();
}
function isButPageInText(dom, tweetText)
{
    for (let i = 0; i < ButPages.length; i++)
    {
        const ButPage = ButPages[i];
        if (tweetText.includes(ButPage))
            return true;
    }
    const CardURL = dom.getElementsByClassName("css-1rynq56 r-bcqeeo r-qvutc0 r-1tl8opc r-q4m81j r-n6v787 r-1cwl3u0 r-16dba41 r-lrvibr");
    if (CardURL.length > 0)
        if (ButPages.includes(CardURL[0].innerText))
            return true;
    return false;
}
const AuthedIconClassName = "r-4qtqp9 r-yyyyoo r-1xvli5t r-bnwqim r-1plcrui r-lrvibr r-1cvl2hr r-f9ja8p r-og9te1 r-9cviqr";
function containsEnglishAndNumbers(text) {
    // 英語と数字のみを判定する正規表現
    var englishNumbersRegex = /[a-zA-Z0-9]/;

    return englishNumbersRegex.test(text);
}
function calculateJapanesePercentage(text) {
    if (!containsJapanese(text))
        return 0.0;
    const totalChars = text.length;
    const japaneseChars = Array.from(text).reduce((count, char) => {
        // 日本語の範囲のUnicodeを指定
        if (containsJapanese(char)) {
            count++;
        }
        return count;
    }, 0);

    if (totalChars === 0) {
        return 0.0;
    } else {
        return japaneseChars / totalChars;
    }
}
function GetHiraganaKatakanaCount(text) {
    if (!containsHiraganaKatakanaOnly(text))
        return 0;
    const totalChars = text.length;
    const japaneseChars = Array.from(text).reduce((count, char) => {
        // 日本語の範囲のUnicodeを指定
        if (containsHiraganaKatakanaOnly(char)) {
            count++;
        }
        return count;
    }, 0);

    if (totalChars === 0) {
        return 0;
    } else {
        return japaneseChars;
    }
}
function GetEnglishAndNumbersCount(text) {
    if (!containsEnglishAndNumbers(text))
        return 0;
    const totalChars = text.length;
    const japaneseChars = Array.from(text).reduce((count, char) => {
        // 日本語の範囲のUnicodeを指定
        if (containsEnglishAndNumbers(char)) {
            count++;
        }
        return count;
    }, 0);

    if (totalChars === 0) {
        return 0;
    } else {
        return japaneseChars;
    }
}
function containsHiraganaOnly(text)
{
    // ひらがな・カタカナのみを含む正規表現
    var hiraganaRegex = /[\u3040-\u309F]/;

    return hiraganaRegex.test(text);
}
function containsHiraganaKatakanaOnly(text)
{
    // ひらがな・カタカナのみを含む正規表現
    var hiraganaKatakanaRegex = /[\u3040-\u309F\u30A0-\u30FF]/;

    return hiraganaKatakanaRegex.test(text);
}
function containsJapanese(text) {
    // ひらがな、カタカナ、漢字のいずれかが含まれているかを判定する正規表現
    var japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

    return japaneseRegex.test(text);
}
function containsKanji(text) {
    // カタカナ、漢字のいずれかが含まれているかを判定する正規表現
    var japaneseRegex = /[\u4E00-\u9FAF]/;

    return japaneseRegex.test(text);
}
let BlockedTweetIds = [];
let BlockedTweetCount = 0;
chrome.storage.local.get("BlockedTweetCount", function (BlockedGeted) {
    if (BlockedGeted.BlockedTweetCount)
        BlockedTweetCount = BlockedGeted.BlockedTweetCount;
    else
        BlockedTweetCount = 0
    lastBlockedCount = BlockedTweetCount;
});
chrome.storage.local.get("SpamCope", function (SpamCope) {
    if (SpamCope.SpamCope)
        CopeType = SpamCope.SpamCope;
    console.log("Loaded SpamCope:" + CopeType);
});
chrome.storage.local.get("IsTweetHideAuthorOnly", function (IsTweetHideAuthorOnly) {
    if (IsTweetHideAuthorOnly.IsTweetHideAuthorOnly)
        IsAutoTweetHideAuthorOnly = IsTweetHideAuthorOnly.IsTweetHideAuthorOnly;
    console.log("Loaded IsTweetHideAuthorOnly:" + IsAutoTweetHideAuthorOnly)
});
chrome.storage.local.get("IsTweetAutoProcessing", function (isTweetAutoProcessing) {
    if (isTweetAutoProcessing.IsTweetAutoProcessing == null)
        IsTweetAutoProcessing = true;
    else
        IsTweetAutoProcessing = isTweetAutoProcessing.IsTweetAutoProcessing;
    console.log("Loaded IsTweetAutoProcessing:" + IsTweetAutoProcessing)
});
chrome.storage.local.get("IsSpamReportAndBlockEnable", function (IsSpamReportAndBlockEnable) {
    if (IsSpamReportAndBlockEnable.IsSpamReportAndBlockEnable == null)
        IsSpamReportAndBlockEnable = true;
    else
        IsSpamReportAndBlockEnable = IsSpamReportAndBlockEnable.IsSpamReportAndBlockEnable;
    console.log("Loaded IsSpamReportAndBlockEnable:" + IsSpamReportAndBlockEnable)
});
function SetBlockTweet(reply, tweetid)
{
    reply.style.display = "none";
    //今回のセッションでブロック済みならパス
    if (BlockedTweetIds.includes(tweetid))
        return;
    BlockedTweetIds.push(tweetid);
    BlockedTweetCount++;
}
const TwitterProfileRelativeURL = /^\/[^\/]+$/;
function UpdateNotificationObjects() {
    if (!IsTweetAutoProcessing)
        return;
    const replys = document.querySelectorAll("div[data-testid='cellInnerDiv']");
    if (replys.length <= 0)
        return;
    for (let i = 0; i < replys.length; i++)
    {
        const reply = replys[i];
        const tweetText = reply.querySelector("div[data-testid='tweetText']")
        if (tweetText == null)
            continue;
        if (reply.style.display == "none")
            continue;
        const atsdata = reply.getElementsByTagName("atsdata");
        if (atsdata.length <= 0)
            continue;
        const tweetdetail = JSON.parse(atsdata[0].innerHTML.replace(/<!--(.*?)-->/g, '$1'));
        if (tweetdetail == null)
            continue;
        // 8人以上にメンションしていたらスパムとして防御
        if (tweetdetail.entities.user_mentions.length >= 8)
        {
            const tweetid = tweetdetail.id_str;
            SetBlockTweet(reply, tweetid);
            const username = tweetdetail.user.name;
            console.log(username + " was spam! reason:Notification Mention Spam");
            console.log(username + " is @" + tweetdetail.user.screen_name)
        }
    }

}
let MuteTasks = [];
let DropdownIntervals = {};
let HideMsgIntervals = {};
let ClickBlockOrNoneIntervals = {};
function ClickButton(tweetdom, id)
{
    const menuButton = tweetdom.querySelector('div[data-testid="caret"]');
    const layers = document.getElementById("layers");
    layers.setAttribute("style", layers.getAttribute("style")+"display:none;")
    menuButton.click();
    let waitedcount = 0;
    setTimeout(function () {
        let Dropdown = document.body.querySelector('.css-175oi2r div[data-testid="Dropdown"]');
        if (Dropdown == null) {
            layers.setAttribute("style", layers.getAttribute("style").replace("display:none;", ""))
            return;
        }
        layers.setAttribute("style", layers.getAttribute("style").replace("display:none;",""))
        //clearInterval(DropdownIntervals[id]);
        Dropdown.setAttribute("style", "display:none;")
        const items = Dropdown.querySelectorAll('div[tabindex="0"]');
        let clicked = false;
        let targettext = "";
        let buttons = {};
        for (let i = 1; i < items.length; i++)
        {
            buttons[items[i].innerText] = items[i];
        }
        if (CopeType == "Mute")
            targettext = "さんをミュート";
        else if (CopeType == "Block")
            targettext = "さんをブロック";
        const ButtonKeys = Object.keys(buttons);
        if (IsAutoTweetHideAuthorOnly &&
            ButtonKeys.includes("返信を非表示にする"))
            targettext = "返信を非表示にする";
        if (targettext == "")
            return;
        for (i = 1; i < items.length;i++)
        {
            if (!items[i].innerText.endsWith(targettext))
                continue;
            items[i].click();
            clicked = true;
            break;
        }
        if (targettext == "返信を非表示にする" || targettext == "さんをブロック")
        {
            let waitedcountbon = 0;
            layers.setAttribute("style", layers.getAttribute("style") + "display:none;")
            ClickBlockOrNoneIntervals[id] = setInterval(function ()
            {
                let btntext = "confirmationSheetCancel";
                if (CopeType == "Block")
                    btntext = "confirmationSheetConfirm";
                let yesornobtn = document.querySelector('div[data-testid="'+btntext+'"]');
                if (yesornobtn == undefined || yesornobtn == null)
                {
                    waitedcountbon++;
                    if (waitedcountbon > 10)
                    {
                        clearTimeout(ClickBlockOrNoneIntervals[id]);
                        layers.setAttribute("style", layers.getAttribute("style").replace("display:none;", ""))
                    }
                    return;
                }
                document.getElementsByClassName("css-175oi2r r-1pz39u2 r-16y2uox r-1wbh5a2")[0].setAttribute("style", "display:none;");
                yesornobtn.click();
                clearInterval(ClickBlockOrNoneIntervals[id]);
                layers.setAttribute("style", layers.getAttribute("style").replace("display:none;", ""));
            }, 10);
        }
        const overlays = document.getElementsByClassName("css-175oi2r r-zchlnj r-u8s1d r-1d2f490 r-ipm5af r-1p0dtai r-105ug2t");
        if (overlays.length > 0)
            overlays[0].remove();
    }, 300);

}
let DotTemplate = null;
function GetDotTemplate() {
    if (DotTemplate != null)
        return DotTemplate;
    DotTemplate = document.createElement("div");
    DotTemplate.setAttribute("dir", "ltr");
    DotTemplate.setAttribute("aria-hidden", "true");
    DotTemplate.setAttribute("class", "css-1rynq56 r-bcqeeo r-qvutc0 r-1tl8opc r-a023e6 r-rjixqe r-16dba41 r-1q142lx r-s1qlax");
    DotTemplate.setAttribute("style", "color: rgb(83, 100, 113); text-overflow: unset;");
    DotTemplate.innerHTML = `<span class="css-1qaijid r-bcqeeo r-qvutc0 r-1tl8opc" style="text-overflow: unset;">·</span>`;
    return DotTemplate;
}
function GenerateDot() {
    return GetDotTemplate().cloneNode(true);
}
let SpamReportButtonTemplate = {};
/** @type {HTMLDivElement} */
function GetSpamReportButtonTemplate(reporttexts) {
    if (reporttexts in SpamReportButtonTemplate)
        return SpamReportButtonTemplate[reporttexts];
    if (reporttexts.length > 0) {
        const fragment = document.createDocumentFragment();
        fragment.appendChild(GenerateDot());
        for (let i = 0; i < reporttexts.length; i++) {
            const reporttext = reporttexts[i];

            //テキスト
            let btn = document.createElement("div");
            btn.setAttribute("dir", "ltr");
            btn.setAttribute("class", reporttext + " ATS_SpamReportAndBlockElem css-1rynq56 r-bcqeeo r-qvutc0 r-1tl8opc r-a023e6 r-rjixqe r-16dba41 r-1q142lx r-s1qlax");
            btn.setAttribute("style", "color: rgb(83, 100, 113); text-overflow: unset;");
            btn.innerHTML = `<a href="javascript:void(0);"><span class="css-1qaijid r-bcqeeo r-qvutc0 r-1tl8opc" style="text-overflow: unset;">${reporttext}</span></a>`;
            fragment.appendChild(btn);
            if (i != (reporttexts.length - 1)) {
                fragment.appendChild(GenerateDot());
            }
        }
        SpamReportButtonTemplate[reporttexts] = document.createElement("div");
        SpamReportButtonTemplate[reporttexts].appendChild(fragment);
    }
    return SpamReportButtonTemplate[reporttexts];
}
function UpdateSpamReportButton(reply) {
    if (!IsSpamReportAndBlockEnable)
        return;
    let names = reply.getElementsByClassName("css-175oi2r r-1d09ksm r-18u37iz r-1wbh5a2");
    if (names.length <= 0)
        return;
    names = names[0];
    if (names.children.length > 1)
        return;
    const buttons = ["📢スパム", "📢攻撃的→センシティブ"];
    const btns = GetSpamReportButtonTemplate(buttons).cloneNode(true);
    const spamdetail = "金銭的詐欺、悪意のあるリンクのポスト、ハッシュタグの乱用、偽のエンゲージメント、しつこい返信/リポスト/ダイレクトメッセージ";
    btns.getElementsByClassName(buttons[0])[0].addEventListener("click", function ()
    {
        runReport(reply, [spamdetail]);
    });
    const sensitivedetail = [
        "暴力的出来事の否定、特定の人物への嫌がらせや嫌がらせの扇動",
        "不本意な性的コンテンツや、合意なく個人を性的な対象として見る、露骨な性的対象化は禁止しています"
    ];
    btns.getElementsByClassName(buttons[1])[0].addEventListener("click", function () {
        runReport(reply, sensitivedetail);
    });
    let len = btns.childNodes.length;
    for (let i = 0; i < len; i++) {
        names.appendChild(btns.childNodes[0]);
    }
}
function RunClickBlockButtonTask() {
    let clickBlockButtonTriedCount = 0;
    const clickBlockButtonTask = setInterval(function () {
        //ブロックボタンをクリック
        const ConfirmButtons = document.getElementsByClassName("css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-ywje51 r-usiww2 r-13qz1uu r-2yi16 r-1qi8awa r-ymttw5 r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l");
        let ConfirmButton = null;
        if (ConfirmButtons.length >= 1) {
            if (ConfirmButtons.length == 1) {
                if (ConfirmButtons[0].innerText.endsWith("さんをブロック"))
                    ConfirmButton = ConfirmButtons[0];
            } else {
                ConfirmButton = ConfirmButtons[1];
            }
            // ミュートボタンのみの場合は閉じる
            if (ConfirmButton != null) {
                ConfirmButton.click();
            }
            else {
                document.querySelector('div[data-testid="ocfSettingsListNextButton"]')?.click();
                clearInterval(clickBlockButtonTask);
            }
        } else {
            clickBlockButtonTriedCount++;
            if (clickBlockButtonTriedCount >= 30) {
                document.querySelector('div[data-testid="ocfSettingsListNextButton"]')?.click();
                clearInterval(clickBlockButtonTask);
            }
        }
    }, 10);
}
function runReport(reply, details) {
    const menuButton = reply.querySelector('div[data-testid="caret"]');
    const layers = document.getElementById("layers");
    layers.setAttribute("style", layers.getAttribute("style") + "display:none;")
    menuButton.click();
    setTimeout(function () {
        let Dropdown = document.body.querySelector('.css-175oi2r div[data-testid="Dropdown"]');
        layers.setAttribute("style", layers.getAttribute("style").replace("display:none;", ""))
        if (Dropdown == null) {
            return;
        }
        Dropdown.setAttribute("style", "display:none;")
        const items = Dropdown.querySelectorAll('div[tabindex="0"]');
        let clicked = false;
        let targettext = "ポストさんを報告";
        let buttons = {};
        for (let i = 1; i < items.length; i++) {
            buttons[items[i].innerText] = items[i];
        }
        for (i = 1; i < items.length; i++) {
            if (!items[i].innerText.endsWith(targettext))
                continue;
            items[i].click();
            clicked = true;
            break;
        }
        const overlays = document.getElementsByClassName("css-175oi2r r-zchlnj r-u8s1d r-1d2f490 r-ipm5af r-1p0dtai r-105ug2t");
        if (overlays.length > 0)
            overlays[0].remove();
        let triedcount = 0;
        const showpopupTask = setInterval(function () {
            const Popup = document.getElementsByClassName("css-175oi2r r-1wbh5a2 r-htvplk r-1udh08x r-1867qdf r-kwpbio r-rsyp9y r-1pjcn9w r-1279nm1");
            if (Popup.length >= 1 && Popup[0].style.display != "none")
                Popup[0].style.display = "none";
            const Buttons = document.getElementsByClassName("css-175oi2r r-1habvwh r-18u37iz r-16y2uox r-1wtj0ep r-16x9es5 r-1dye5f7 r-1f1sjgu r-1l7z4oj r-i023vh r-gy4na3 r-o7ynqc r-6416eg r-1ny4l3l");
            let clicked = false;
            for (let i = 0; i < Buttons.length; i++) {
                if (Buttons[i].innerText.includes(details[0])) {
                    Buttons[i].click();
                    clicked = true;
                    break;
                }
            }
            if (clicked) {
                // 「次へ」をクリックする
                document.
                    getElementsByClassName(
                        "css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-19yznuf r-64el8z r-1dye5f7 r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l"
                )[0].click();
                if (details.length >= 2) {
                    triedcount = 0;
                    const processNextPopupTask = setInterval(function () {
                        const Buttons2 = document.getElementsByClassName("css-175oi2r r-1habvwh r-18u37iz r-16y2uox r-1wtj0ep r-16x9es5 r-1dye5f7 r-1f1sjgu r-1l7z4oj r-i023vh r-gy4na3 r-o7ynqc r-6416eg r-1ny4l3l");
                        let clicked2 = false;
                        for (let i = 0; i < Buttons2.length; i++) {
                            if (Buttons2[i].innerText.includes(details[1])) {
                                Buttons2[i].click();
                                clicked2 = true;
                                break;
                            }
                        }
                        if (clicked2) {
                            document.
                                getElementsByClassName(
                                    "css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-19yznuf r-64el8z r-1dye5f7 r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l"
                                )[0].click();
                            RunClickBlockButtonTask();
                            clearInterval(processNextPopupTask);
                        } else {
                            triedcount++;
                            if (triedcount >= 30) {
                                const Popup = document.getElementsByClassName("css-175oi2r r-1wbh5a2 r-htvplk r-1udh08x r-1867qdf r-kwpbio r-rsyp9y r-1pjcn9w r-1279nm1");
                                if (Popup.length >= 1 && Popup[0].style.display != "none")
                                    Popup[0].style.display = "";
                                clearInterval(processNextPopupTask);
                                document.querySelector('div[aria-label="閉じる"]')?.click();
                            }
                        }
                    }, 10);
                }
                else {
                    RunClickBlockButtonTask();
                }
                clearInterval(showpopupTask);
            } else {
                console.log("Failed spam click");
                triedcount++;
                if (triedcount >= 30) {
                    if (Popup.length >= 1 && Popup[0].style.display != "none")
                        Popup[0].style.display = "";
                    clearInterval(showpopupTask);
                    document.querySelector('div[aria-label="閉じる"]')?.click();
                }
            }
        }, 10);
    }, 20);
}
function UpdateReplyObjects()
{
    const replys = document.querySelectorAll("div[data-testid='cellInnerDiv']");
    if (replys.length <= 2)
        return;
    const meuserid = GetMeUserId();//document.querySelector('a[data-testid="AppTabBar_Profile_Link"]').getAttribute("href").replace("/", "");
    let authoruserid = null;
    let CurrentUserIds = [];
    let DoubleTexters = [];
    const IsPC = isPC()
    if (IsPC) {
        for (var i = 0; i < replys.length; i++) {
            UpdateSpamReportButton(replys[i]);
        }
    }

    if (!IsTweetAutoProcessing)
        return;
    for (var i = 2; i < replys.length; i++)
    {
        if (replys[i] == null)
            continue;
        const atsdata = replys[i].getElementsByTagName("atsdata");
        if (atsdata.length <= 0)
            continue;
        const tweetdetail = JSON.parse(atsdata[0].innerHTML.replace(/<!--(.*?)-->/g, '$1'));
        if (tweetdetail == null)
            continue;
        //プロモーションならパス
        if (tweetdetail.promoted_content != undefined)
            continue;
        const userid = tweetdetail.user.screen_name;
        if (userid == null)
            continue;
        if (DoubleTexters.includes(userid))
            continue;
        if (authoruserid == null || authoruserid == undefined)
            authoruserid = tweetdetail.in_reply_to_screen_name;
        //console.log(tweetdetail.user.screen_name + "detail:" + atsdata[0].innerHTML)
        
        if (CurrentUserIds.includes(userid))
        {
            DoubleTexters.push(userid);
            continue;
        }
        CurrentUserIds.push(userid)
    }
    for (var i = 2; i < replys.length; i++) {
        const reply = replys[i];
        if (reply == null)
            continue;
        if (reply?.firstChild?.firstChild == null) {
            continue;
        }
        if (reply.style.display == "none")
            continue;
        const atsdata = reply.getElementsByTagName("atsdata");
        if (atsdata.length <= 0)
            continue;
        const tweetdetail = JSON.parse(atsdata[0].innerHTML.replace(/<!--(.*?)-->/g, '$1'));
        if (tweetdetail == null)
            continue;
        let replyisfollowing = tweetdetail.user.following;
        if (replyisfollowing == undefined)
            replyisfollowing = false;
        if (replyisfollowing)
        {
            //悪質なサイトを含んでいたらスパム
            if (isButPageInText(reply, tweetdetail.full_text)) {
                console.log(tweetdetail.user.name + " was spam! reason:But page Spam");
                console.log(tweetdetail.user.name + " is @" + tweetdetail.user.screen_name)
                SetBlockTweet(reply, tweetdetail.id_str);
            }
            continue;
        }
        // リプライ者のフォロー中数
        const replyfollowingcount = tweetdetail.user.friends_count;
        // リプライ者のフォロワー数
        const replyfollowercount = tweetdetail.user.followers_count;
        // リプライ者のツイート本文
        const replyfulltext = tweetdetail.full_text;
        // リプライ者のユーザーID
        const userid = tweetdetail.user.screen_name;
        let replyfulltextreplaced = replyfulltext.replace("@" + authoruserid,"");
        const replyurls = tweetdetail.entities.urls;
        for (let i2 = 0; i2 < replyurls.length; i2++)
        {
            replyfulltextreplaced = replyfulltextreplaced.replace(replyurls[i2].url,"");
        }
        // リプライ者がXプレミアムで認証済みか
        const isblueverified = tweetdetail.user.is_blue_verified;
        // リプライ者が認証済みか
        const verified = tweetdetail.user.verified;
        const userpossibly_sensitive = tweetdetail.user.possibly_sensitive;
        const favorite_count = tweetdetail.favorite_count;
        const requoteExist = tweetdetail.quoted_status != undefined;
        const isDefaultIcon = tweetdetail.user.default_profile_image;
        let tweetid = tweetdetail.id_str;
        const username = tweetdetail.user.name;
        const tweetTextEl = reply.querySelector('div[data-testid="tweetText"]');
        let tweetText = "";
        let tweetEmojiCount = 0;
        //引用RTのツイートテキスト対策
        if (tweetTextEl?.parentElement?.className == "css-175oi2r")
        {
            tweetText = GetTweetText(tweetTextEl).trim();
            tweetEmojiCount = GetEmojiCount(tweetTextEl);
        }
        const tweetData =
        {
            authoruserid: authoruserid,
            meuserid: meuserid,
            username: username,
            tweetText: tweetText,
            userid: userid,
            tweetEmojiCount: tweetEmojiCount,
            DoubleTexters: DoubleTexters,
            FollowingCount: replyfollowingcount,
            FollowerCount: replyfollowercount,
            FullText: replyfulltextreplaced,
            verified: verified,
            isblueverified: isblueverified,
            userpossibly_sensitive: userpossibly_sensitive,
            favorite_count: favorite_count,
            RequoteExist: requoteExist,
            isDefaultIcon: isDefaultIcon
        };
        if (isSpamTweet(reply, tweetData))
        {
            console.log(username+" is @"+userid)
            SetBlockTweet(reply, tweetid);
            if (isCanMuteTweet(reply, tweetData))
            {
                if (!MuteTasks.includes(reply))
                    MuteTasks.push(reply);
            }
            //console.log(username + ":" + tweetText)
        }
    }
}
// TwitterのURLを判定する関数
function isTwitterProfileURL(url) {
    // 正規表現パターン
    const pattern = /^https:\/\/twitter\.com\/[^\/]+\/?$/;

    // マッチング
    const isMatch = pattern.test(url);

    return isMatch;
}
function isPC() {
    return window.innerWidth >= 500;
}
function UpdateSearchObjects() {
    if (!isPC())
        return;
    const tweets = document.querySelectorAll("div[data-testid='cellInnerDiv']");
    if (tweets.length <= 0)
        return;
    for (var i = 0; i < tweets.length; i++) {
        if (tweets[i] == null)
            continue;
        UpdateSpamReportButton(tweets[i]);
    }
}
// TwitterのURLを判定する関数
function isTwitterNotificationURL(url) {
    return url.endsWith("twitter.com/notifications") || url.endsWith("twitter.com/notifications/") ||
        url.endsWith("twitter.com/notifications/mentions") || url.endsWith("twitter.com/notifications/mentions/");
}
// TwitterのURLを判定する関数
function isTweetURL(url) {
    // 正規表現パターン
    const pattern = /^https:\/\/twitter\.com\/\w+\/status\/\d+$/;

    // マッチング
    const isMatch = pattern.test(url);

    return isMatch;
}
/** @type {string} */
var lastlocation = location.href;
let currentInterval = null;
let layers = document.getElementById("layers");
setInterval(() => {
    if (layers == null)
        layers = document.getElementById("layers");
    if (layers != null)
        layers.setAttribute("style", layers.getAttribute("style").replace("display:none;", ""))
}, 1500);
setInterval(() => {
    if (BlockedTweetCount != lastBlockedCount) {
        chrome.storage.local.set({ BlockedTweetCount: BlockedTweetCount });
        lastBlockedCount = BlockedTweetCount;
    }
    UpdateTask();
}, 750);
let currentObserver = null;
let currentTimeout = null;
function CheckAndUpdateUrl()
{
    if (lastlocation != location.href) {
        if (currentInterval != null) {
            clearInterval(currentInterval);
            currentInterval = null;
        }
        if (currentTimeout != null) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
        }
        if (currentObserver != null) {
            currentObserver.disconnect();
            currentObserver = null;
        }
        console.log(lastlocation + " to " + location.href + " !")
        lastlocation = location.href
        // マッチング
        /** @type {boolean} */
        if (isTweetURL(lastlocation)) {
            currentObserver = new MutationObserver(function () {
                setTimeout(function () {
                    UpdateReplyObjects();
                }, 20);
            });

            currentTimeout = window.setTimeout(function () {
                UpdateReplyObjects();
                currentInterval = setInterval(() => {
                    UpdateReplyObjects();
                }, 750);
                if (document.getElementsByTagName("section").length > 0) {
                    //監視の開始
                    currentObserver.observe(document.getElementsByTagName("section")[0].lastChild.lastChild, {
                        attributes: true,
                        childList: true
                    });
                }
            }, 500);
        }
        else if (isTwitterNotificationURL(lastlocation))
        {
            currentObserver = new MutationObserver(UpdateNotificationObjects);

            currentTimeout = window.setTimeout(function () {
                UpdateNotificationObjects();
                currentInterval = setInterval(() => {
                    UpdateNotificationObjects();
                }, 750);
                if (document.getElementsByTagName("section").length > 0) {
                    //監視の開始
                    currentObserver.observe(document.getElementsByTagName("section")[0].parentElement, {
                        attributes: true,
                        childList: true
                    });
                }
            }, 500);
        }
        else if (location.pathname == "/search") {
            currentObserver = new MutationObserver(UpdateSearchObjects);

            currentTimeout = window.setTimeout(function () {
                UpdateSearchObjects();
                currentInterval = setInterval(() => {
                    UpdateSearchObjects();
                }, 750);
                if (document.getElementsByTagName("section").length > 0) {
                    //監視の開始
                    currentObserver.observe(document.getElementsByTagName("section")[0].parentElement, {
                        attributes: true,
                        childList: true
                    });
                }
            }, 500);
        }
    }
}
// 0.3秒ごとにURLをチェックして更新する
// 阪神はマジで関係ないです
setInterval(() => {
    CheckAndUpdateUrl();
}, 334);

// マッチング
if (isTweetURL(location.href) || isTwitterNotificationURL(location.href) || location.pathname == "/search") {
    const llinterval = setInterval(function () {
        if (isTweetURL(location.href) || isTwitterNotificationURL(location.href) || location.pathname == "/search") {
            if (document.getElementsByTagName("section").length >= 1) {
                lastlocation = "";
                clearInterval(llinterval);
            }
        } else {
            clearInterval(llinterval);
        }
    }, 1000);
}
chrome.storage.onChanged.addListener(function (changes, area) {
    // ローカルストレージの変更か？
    if (area !== "local") {
        return;
    }
    
    if ("BlockedTweetCount" in changes) {
        if (changes.BlockedTweetCount)
            BlockedTweetCount = changes.BlockedTweetCount.newValue;
        else
            BlockedTweetCount = 0
        lastBlockedCount = BlockedTweetCount;
    }
    if ("SpamCope" in changes) {
        if (changes.SpamCope)
            CopeType = changes.SpamCope.newValue;
    }
    if ("IsTweetHideAuthorOnly" in changes) {
        if (changes.IsTweetHideAuthorOnly)
            IsAutoTweetHideAuthorOnly = changes.IsTweetHideAuthorOnly.newValue;
    }
    if ("IsTweetAutoProcessing" in changes) {
        if (changes.IsTweetAutoProcessing)
            IsTweetAutoProcessing = changes.IsTweetAutoProcessing.newValue;
    }
    if ("IsSpamReportAndBlockEnable" in changes) {
        if (changes.IsSpamReportAndBlockEnable)
            IsSpamReportAndBlockEnable = changes.IsSpamReportAndBlockEnable.newValue;
    }
});
console.log("Loaded AntiTwitterSpam")