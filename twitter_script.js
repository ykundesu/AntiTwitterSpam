function UpdateData(item, itemgroup = null) {
    if (itemgroup == null) {
        itemgroup = item.querySelector("div[role='group'][id]");
        if (itemgroup == null)
            return;
    }
    const reactPropsName = Object.getOwnPropertyNames(itemgroup).filter((n) => n.startsWith("__reactProps$"))[0];
    const tweetData = itemgroup[reactPropsName].children[1].props.retweetWithCommentLink.state.quotedStatus;

    let atsdata = item.getElementsByTagName("atsdata");
    if (atsdata.length <= 0) {
        atsdata = document.createElement("atsdata");
        atsdata.style.display ="none";
        item.appendChild(atsdata);
    }
    else
        atsdata = atsdata[0];
    atsdata.innerText = JSON.stringify(tweetData);
    atsdata.innerHTML = "<!--" + atsdata.innerText + "-->";
}
setInterval(function ()
{
    const items = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.childElementCount == 1 && item.children[0].childElementCount > 0) {
            const itemgroup = item.querySelector("div[role='group'][id]");
            if (itemgroup != null) {
                UpdateData(item, itemgroup);
            }
        }
    }
}, 30);
setInterval(function () {
    const items = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        UpdateData(item);
    }
}, 600);