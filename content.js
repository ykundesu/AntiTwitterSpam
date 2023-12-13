// 誰かこれやってください！！！
// ・自動ミュート・ブロックの実装(内部APIを叩けずに保留)
// ・自動報告の実装(内部APIを叩けずに保留)
// だれかプルリク出して！！！頼む！！！出来なかったんや！！！

let twitterscript = document.createElement('script')
twitterscript.src = chrome.runtime.getURL('twitter_script.js')
document.documentElement.appendChild(twitterscript);

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
    }/*
    console.log(tweetData["userid"] + "1: " + tweetData["FullText"])
    console.log(tweetData["userid"] + "2: " + tweetData["FullText"].length)
    console.log(tweetData["userid"] + "3: " + tweetData["RequoteExist"])
    console.log(tweetData["userid"] + "4:" + tweetData["username"])
    console.log(tweetData["userid"] + "5:" + containsJapanese(tweetData["username"]))
    console.log(tweetData["userid"] + "6:" + tweetData["userpossibly_sensitive"])*/
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
    var englishNumbersRegex = /^[a-zA-Z0-9]+$/;

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
function findElementsByTag(parentNode, targetTag, resultArray) {
    // parentNodeが存在しない場合や子要素がない場合は終了
    if (!parentNode || !parentNode.children) {
        return;
    }

    // 子要素を順番にチェック
    for (let i = 0; i < parentNode.children.length; i++) {
        const childNode = parentNode.children[i];

        // 特定のクラスを持つ場合は結果に追加
        if (childNode.nodeName == targetTag) {
            resultArray.push(childNode);
        }

        // 子要素の中も再帰的に検索
        findElementsByTag(childNode, targetTag, resultArray);
    }
}
let whiteList = [];
chrome.storage.local.get("Whitelist", function (whiteListGeted)
{
    if (whiteListGeted.Whitelist)
        whiteList = whiteListGeted.Whitelist.split('@');
    else
        whiteList = [];
});
let BlockedTweetIds = [];
let BlockedTweetCount = 0;
chrome.storage.local.get("BlockedTweetCount", function (BlockedGeted) {
    if (BlockedGeted.BlockedTweetCount)
        BlockedTweetCount = BlockedGeted.BlockedTweetCount;
    else
        BlockedTweetCount = 0
});
function SetBlockTweet(reply, styletemp, tweetid)
{
    reply.setAttribute("style", styletemp + "; display:none;");
    //今回のセッションでブロック済みならパス
    if (BlockedTweetIds.includes(tweetid))
        return;
    BlockedTweetIds.push(tweetid);
    BlockedTweetCount++;
    chrome.storage.local.set({ BlockedTweetCount: BlockedTweetCount });
}
function IncludeWhiteList(userid)
{
    return GetWhiteList().includes(userid.toLowerCase());
}
function GetWhiteList() {
    return whiteList;
}
function AddWhiteList(userid)
{
    userid = userid.toLowerCase();
    if (whiteList.includes(userid))
        return;
    whiteList.push(userid);
    chrome.storage.local.set({ Whitelist: whiteList.join('@') });
}
function RemoveWhiteList(userid) {
    userid = userid.toLowerCase();
    if (!whiteList.includes(userid))
        return;
    whiteList = whiteList.filter(function (item) {
        return item != userid;
    });
    chrome.storage.local.set({ Whitelist: whiteList.join('@') });
}
const TwitterProfileRelativeURL = /^\/[^\/]+$/;
function UpdateNotificationObjects() {
    const replys = document.querySelectorAll("div[data-testid='cellInnerDiv']");
    if (replys.length <= 0)
        return;
    for (let i = 0; i < replys.length; i++)
    {
        const reply = replys[i];
        const tweetText = reply.querySelector("div[data-testid='tweetText']")
        if (tweetText == null)
            continue;
        const styletemp = reply.getAttribute("style");
        if (styletemp.indexOf("display:none;") !== -1)
            continue;
        const atsdata = reply.getElementsByTagName("atsdata");
        if (atsdata.length <= 0)
            continue;
        const tweetdetail = JSON.parse(atsdata[0].innerText);
        if (tweetdetail == null)
            continue;
        // 8人以上にメンションしていたらスパムとして防御
        if (tweetdetail.entities.user_mentions.length >= 8)
        {
            const tweetid = tweetdetail.id_str;
            SetBlockTweet(reply, styletemp, tweetid);
            const username = tweetdetail.user.name;
            console.log(username + " was spam! reason:Notification Mention Spam");
            console.log(username + " is @" + userid)
        }
    }

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
    for (var i = 2; i < replys.length; i++)
    {
        const atsdata = replys[i].getElementsByTagName("atsdata");
        if (atsdata.length <= 0)
            continue;
        const tweetdetail = JSON.parse(atsdata[0].innerText);
        if (tweetdetail == null)
            continue;
        if (authoruserid == null || authoruserid == undefined)
            authoruserid = tweetdetail.in_reply_to_screen_name;
        if (BlockedTweetIds.includes(tweetdetail.id_str))
            continue;
        //console.log(tweetdetail.user.screen_name + "detail:" + atsdata[0].innerText)
        const userid = tweetdetail.user.screen_name;
        if (userid == null)
            continue;
        if (DoubleTexters.includes(userid))
            continue;
        if (CurrentUserIds.includes(userid))
        {
            DoubleTexters.push(userid);
            continue;
        }
        CurrentUserIds.push(userid)
    }
    for (var i = 2; i < replys.length; i++) {
        const reply = replys[i];
        const styletemp = reply.getAttribute("style");
        if (styletemp.indexOf("display:none;") !== -1)
            continue;
        if (reply.firstChild.firstChild == null) {
            continue;
        }
        const atsdata = reply.getElementsByTagName("atsdata");
        if (atsdata.length <= 0)
            continue;
        const tweetdetail = JSON.parse(atsdata[0].innerText);
        if (tweetdetail == null)
            continue;
        let tweetid = tweetdetail.id_str;
        if (BlockedTweetIds.includes(tweetid))
        {
            SetBlockTweet(reply, styletemp, tweetid);
            continue;
        }

        let replyisfollowing = tweetdetail.user.following;
        if (replyisfollowing == undefined)
            replyisfollowing = false;
        if (replyisfollowing)
        {
            //悪質なサイトを含んでいたらスパム
            if (isButPageInText(reply, tweetdetail.full_text)) {
                console.log(tweetdetail.user.name + " was spam! reason:But page Spam");
                console.log(tweetdetail.user.name + " is @" + tweetdetail.user.screen_name)
                SetBlockTweet(reply, styletemp, tweetid);
            }
            continue;
        }
        if (authoruserid == null || authoruserid == undefined)
            authoruserid = tweetdetail.in_reply_to_screen_name;
        const replyfollowingcount = tweetdetail.user.friends_count;
        const replyfollowercount = tweetdetail.user.followers_count;
        const replyfulltext = tweetdetail.full_text;
        const userid = tweetdetail.user.screen_name;
        let replyfulltextreplaced = replyfulltext.replace("@" + authoruserid,"");
        const replyurls = tweetdetail.entities.urls;
        for (let i2 = 0; i2 < replyurls.length; i2++)
        {
            replyfulltextreplaced = replyfulltextreplaced.replace(replyurls[i2].url,"");
        }
        const isblueverified = tweetdetail.user.is_blue_verified;
        const verified = tweetdetail.user.verified;
        const userpossibly_sensitive = tweetdetail.user.possibly_sensitive;
        const favorite_count = tweetdetail.favorite_count;
        const requoteExist = tweetdetail.quoted_status != undefined;
        if (GetWhiteList().includes(userid))
            continue;
        let tweetlink = reply.getElementsByClassName("css-1rynq56 r-bcqeeo r-qvutc0 r-1tl8opc r-a023e6 r-rjixqe r-16dba41 r-xoduu5 r-1q142lx r-1w6e6rj r-9aw3ui r-3s2u2q r-1loqt21");
        if (tweetlink.length <= 0)
            continue;
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
            RequoteExist: requoteExist
        };
        if (isSpamTweet(reply, tweetData))
        {
            console.log(username+" is @"+userid)
            SetBlockTweet(reply, styletemp, tweetid);
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
//封・印
function UpdateProfileButton(profile, isListed)
{/*
    let WhiteText = "に追加";
    let bc = 0;
    if (isListed)
    {
        WhiteText = "から削除";
        bc = 255;
    }
    //const stylehtml = ".image-container {background-color: white; border-radius: 10px; /* 角丸のサイズを設定 *///overflow: hidden;   /* 角丸を適用するために必要 */} ";
    /*
    const basestyle = `border-color: rgb(207, 217, 222); background-color: rgba(${bc},${bc},${bc});`;
    const inside = `<div id="ATS_towhitebtn" dir="ltr" class="css-1rynq56 r-bcqeeo r-qvutc0 r-1tl8opc r-q4m81j r-a023e6 r-rjixqe r-b88u0q r-1awozwy r-6koalj r-18u37iz r-16y2uox r-1777fci" style="color: rgb(${255 - bc},${255 - bc},${255 - bc}); text-overflow: unset;"><span class="css-1qaijid r-dnmrzs r-1udh08x r-3s2u2q r-bcqeeo r-qvutc0 r-1tl8opc r-a023e6 r-rjixqe" style="text-overflow: unset;">　ホワイトリスト${WhiteText}  <img src="` + chrome.runtime.getURL("icon.png") + '" width="20px" style="vertical-align:top;">　</span></div>';
    const html = `<div aria-expanded="false" aria-tabindex="0" class="ATS_towhite css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-6gpygo r-1kb76zh r-2yi16 r-1qi8awa r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l" style="${basestyle}">${inside}</div>`;
    //ATS_towhiteがclass名に入っているかを確認する
    ATS_towhite = profile.getElementsByClassName("ATS_towhite");
    if (ATS_towhite.length <= 0)
    {
        profile.parentElement.innerHTML = html + profile.parentElement.innerHTML;
    } else
    {
        ATS_towhite[0].innerHTML = inside;
        ATS_towhite[0].setAttribute("style", basestyle);
    }
    let button = document.getElementById('ATS_towhitebtn');
    button.addEventListener('click', function () { OnClickWhitelist(profile); });*/
}
function OnClickWhitelist(dom)
{
    let userid = location.href.split("/").slice(-1)[0];
    if (location.href.endsWith("/"))
        userid = location.href.split("/").slice(-2)[0];
    let added = true;
    if (IncludeWhiteList(userid))
    {
        console.log("Removed:" + userid)
        RemoveWhiteList(userid);
        added = false;
    } else
    {
        console.log("Added:"+userid)
        AddWhiteList(userid);
    }
    UpdateProfileButton(dom, added);
}
/*const te = document.getElementsByClassName("css-175oi2r")
const reactPropsName = Object.getOwnPropertyNames(te).filter((n) => n.startsWith("__reactProps$"))[0];
const reactProps = te[0][reactPropsName];
console.log(reactProps)*/
/** @type {string} */
var lastlocation = location.href;
let currentInterval = null;
function CheckAndUpdateUrl()
{
    if (lastlocation != location.href) {
        if (currentInterval != null) {
            clearInterval(currentInterval);
            currentInterval = null;
        }
        console.log(lastlocation + " to " + location.href + " !")
        lastlocation = location.href
        // マッチング
        /** @type {boolean} */
        if (isTweetURL(lastlocation)) {
            var observer = new MutationObserver(UpdateReplyObjects);

            window.setTimeout(function () {
                UpdateReplyObjects();
                currentInterval = setInterval(() => {
                    UpdateReplyObjects();
                }, 750);
                if (document.getElementsByTagName("section").length > 0) {
                    //監視の開始
                    observer.observe(document.getElementsByTagName("section")[0].lastChild.lastChild, {
                        attributes: true,
                        childList: true
                    });
                }
            }, 500);
        }
        else if (isTwitterNotificationURL(lastlocation))
        {
            var observer = new MutationObserver(UpdateNotificationObjects);

            window.setTimeout(function () {
                UpdateNotificationObjects();
                currentInterval = setInterval(() => {
                    UpdateNotificationObjects();
                }, 750);
                if (document.getElementsByTagName("section").length > 0) {
                    //監視の開始
                    observer.observe(document.getElementsByTagName("section")[0].parentElement, {
                        attributes: true,
                        childList: true
                    });
                }
            }, 500);
        }
        else if (isTwitterProfileURL(lastlocation))
        {
            currentInterval = setInterval(() => {
                const profile = document.getElementsByClassName("css-175oi2r r-obd0qt r-18u37iz r-1w6e6rj r-1h0z5md r-dnmrzs")[0];
                //自分かを判定(自分ならボタンが1つしかない)
                if (profile == null || profile == undefined || profile.children.length <= 1)
                    return;
                UpdateProfileButton(profile, IncludeWhiteList(location.href.split("/").slice(-1)[0]));
            }, 500);
            window.setTimeout(function () {
                const profile = document.getElementsByClassName("css-175oi2r r-obd0qt r-18u37iz r-1w6e6rj r-1h0z5md r-dnmrzs")[0];
                //自分かを判定(自分ならボタンが1つしかない)
                if (profile == null || profile == undefined || profile.children.length <= 1)
                    return;
                UpdateProfileButton(profile, IncludeWhiteList(location.href.split("/").slice(-1)[0]));
            }, 250);
        }

    }
}
setInterval(() => {
    CheckAndUpdateUrl();
}, 750);

// マッチング
if (isTweetURL(location.href) || isTwitterNotificationURL(location.href)) {
    const llinterval = setInterval(function () {
        if (isTweetURL(location.href) || isTwitterNotificationURL(location.href)) {
            if (document.getElementsByTagName("section").length >= 1) {
                lastlocation = "";
                clearInterval(llinterval);
            }
        } else {
            clearInterval(llinterval);
        }
    }, 1000);
}
else if (isTwitterProfileURL(location.href)) {
    const llinterval = setInterval(function () {
        if (isTwitterProfileURL(location.href)) {
            if (document.getElementsByClassName("css-175oi2r r-obd0qt r-18u37iz r-1w6e6rj r-1h0z5md r-dnmrzs").length >= 1) {
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

    // changesは変更したプロパティの配列
    if ("Whitelist" in changes) {
        if (changes.Whitelist)
            whiteList = changes.Whitelist.newValue.split('@');
        else
            whiteList = [];
    }
    if ("BlockedTweetCount" in changes) {
        if (changes.BlockedTweetCount)
            BlockedTweetCount = changes.BlockedTweetCount.newValue;
        else
            BlockedTweetCount = 0
    }

});
console.log("Loaded AntiTwitterSpam")