function UpdateData()
{
    const items = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemgroup = item.querySelector("div[role='group'][id]");
        if (itemgroup == null)
            continue;
        const reactPropsName = Object.getOwnPropertyNames(itemgroup).filter((n) => n.startsWith("__reactProps$"))[0];
        const tweetData = itemgroup[reactPropsName].children[1].props.retweetWithCommentLink.state.quotedStatus;
        //console.log(tweetData);
        /*
        let mentions = [];
        const user_mentions = tweetData.entities.user_mentions;
        for (let i2 = 0; i2 < user_mentions.length; i2++)
        {
            mentions.push(user_mentions[i2].screen_name);
        }
        let following = tweetData.user.following;
        if (following == undefined)
            following = false;*/
        let atsdata = item.getElementsByTagName("atsdata");
        if (atsdata.length <= 0) {
            atsdata = document.createElement("atsdata");
            atsdata.setAttribute("style", "display:none;");
            item.appendChild(atsdata);
        }
        else
            atsdata = atsdata[0];
        atsdata.innerText = JSON.stringify(tweetData);
        atsdata.innerHTML = "<!--" + atsdata.innerText + "-->";
    }
}
setInterval(function ()
{
    UpdateData();
}, 50);

var observer = new MutationObserver(UpdateData);
UpdateData();
window.addEventListener('DOMContentLoaded', function () {
    //ŠÄŽ‹‚ÌŠJŽn
    observer.observe(document.getElementsByTagName("section")[0], {
        attributes: true,
        childList: true
    });
});