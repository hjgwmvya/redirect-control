const { Ci } = require("chrome");

exports.getBaseDomainFromHost = getBaseDomainFromHost;
exports.getChromeWindow = getChromeWindow;
exports.getTabForWindow = getTabForWindow;

function getBaseDomainFromHost(host)
{
    if (host.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/) != null)
    {
        return host;
    }

    if (host.match(/(([^\.]+\.)?[^\.]+)$/) != null)
    {
        return RegExp.$1;
    }

    return host;
}

function getChromeWindow(contentWindow)
{
    return contentWindow.top
        .QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation)
        .QueryInterface(Ci.nsIDocShellTreeItem).rootTreeItem
        .QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow)
        .QueryInterface(Ci.nsIDOMChromeWindow);
}

function getTabForWindow(contentWindow)
{
    let gBrowser = getChromeWindow(contentWindow).gBrowser;
    if (!gBrowser) return null;
    if (!gBrowser._getTabForContentWindow) return null;
    
    return gBrowser._getTabForContentWindow(contentWindow.top);
}