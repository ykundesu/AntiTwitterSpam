let Blocked = 0;
let IsShowBlockedBadge = false;
function UpdateBlockedCount() {
    //バッジのサイズを変更
    if (Blocked > 999)
        chrome.browserAction.setBadgeText({ text: "999+" });
    else
        chrome.browserAction.setBadgeText({ text: Blocked.toString() });
}
async function UpdateBlocked() {
    await chrome.storage.local.get("IsShowBlockedBadge", async function (nowIsShowBlockedBadge) {
        if (nowIsShowBlockedBadge.IsShowBlockedBadge != null && nowIsShowBlockedBadge.IsShowBlockedBadge) {
            IsShowBlockedBadge = true;
            await chrome.storage.local.get("BlockedTweetCount", function (nowblocked) {
                if (nowblocked.BlockedTweetCount == null)
                    Blocked = 0;
                else
                    Blocked = nowblocked.BlockedTweetCount;
                UpdateBlockedCount();
            });
        }
    });
}
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if ("IsShowBlockedBadge" in changes) {
        IsShowBlockedBadge = changes.IsShowBlockedBadge?.newValue ?? false;
        if (changes.IsShowBlockedBadge?.newValue)
            UpdateBlockedCount();
        else
            chrome.browserAction.setBadgeText({ text: "" });
    }
    if (IsShowBlockedBadge && "BlockedTweetCount" in changes) {
        if (changes.BlockedTweetCount)
            Blocked = changes.BlockedTweetCount.newValue;
        else
            Blocked = 0;
        UpdateBlockedCount();
    }
});
UpdateBlocked();