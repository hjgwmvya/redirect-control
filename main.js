const unload = require("sdk/system/unload");
const urls = require("sdk/url");
const tabs = require("sdk/tabs");
const { Ci, Cr } = require("chrome");

require("./migration.js");

require("./uninstall-cleanup.js");
require("./ui/options-button.js");
require("./ui/options-page.js");

const utils = require("./utils.js");
const settings = require("./settings.js");
const rules = require("./rules.js");
const notification = require("./ui/notification.js");

let requests = { };
let metaRefreshs = { };
let redirects = { };
let clickedLinks = [ ];

let webProgress = require("./web-progress.js").create();
let clickWatcher = require("./click-watcher.js").create();
let contextMenu = require("./context-menu.js").create();

webProgress.register();
clickWatcher.register();
contextMenu.register();
    
unload.when(function(reason)
{
    clickWatcher.unregister();
    webProgress.unregister();
    contextMenu.unregister();
});

tabs.on('close', function(tab)
{
    let tabId = "panel" + tab.id;
    
    cancel(tabId);
    
    delete requests[tabId];
    delete metaRefreshs[tabId];
    delete redirects[tabId];
    
    console.log("Tab closed: " + tabId);
});

function suspend(tabId, request)
{
    cancel(tabId);
    
    try
    {
        request.suspend();
        requests[tabId] = request;
        
        console.log("Request suspended");
    }
    catch (exception)
    {
        console.error(exception);
    }
}

function resume(tabId)
{
    let request = requests[tabId];
    if (!request) return;
    
    try
    {
        request.resume();
        delete requests[tabId];
       
        console.log("Request continued");
    }
    catch (exception)
    {
        console.error(exception);
    }
}

function cancel(tabId)
{
    let request = requests[tabId];
    if (!request) return;

    try
    {
        request.resume();
        request.cancel(Cr.NS_BINDING_ABORTED);
        delete requests[tabId];
        
        console.log("Request cancelled");
    }
    catch (exception)
    {
        console.error(exception);
    }
}

function cleanupLinks()
{
    let now = new Date().getTime();

    for (let index = clickedLinks.length - 1; index >= 0; index--)
    {
        let clickedLink = clickedLinks[index];
        if (now - clickedLink.time > 1000 * 10)
        {
            clickedLinks.splice(index, 1);
        }
    }
}

function addClickedLink(source, target)
{
    cleanupLinks();
    
    console.log("--------------------- Link ---------------------");
    console.log("source: " + source);
    console.log("target: " + target);
    console.log("------------------------------------------------");
    
    let index = clickedLinks.findIndex(function(element, index, array)
    {
        return element.source == source && element.target == target;
    });
    
    if (index == -1)
    {
        clickedLinks.push(
        {
            source: source,
            target: target,
            time: new Date().getTime(),
        });
    }
    else
    {
        clickedLinks[index].time = new Date().getTime();
    }
}

function containsClickedLink(source, target)
{
    let index = clickedLinks.findIndex(function(clickedLink, index, array)
    {
        return clickedLink.source == source && clickedLink.target == target;
    });
    if (index == -1) return;
    
    let clickedTime = clickedLinks[index].time;
   
    let now = new Date().getTime();
    return (now - clickedTime <= 1000 * 10);
}

function getWindow(webProgress)
{
    try
    {
        let window = webProgress.DOMWindow;
        if (!window || window.frameElement)
            return null;
            
        return window;
    }
    catch (e)
    {
        return null;
    }
}

function getTab(window)
{
    try
    {
        let tab = utils.getTabForWindow(window);
        if (!tab.linkedBrowser.docShell)
            return null;
        
        return tab;
    }
    catch (e)
    {
        return null;
    }
}

function getReferrer(channel)
{
    const key = "docshell.internalReferrer";

    try
    {
        let properties = channel.QueryInterface(Ci.nsIPropertyBag2);
        if (!properties.hasKey(key))
            return null;

        let referrer = properties.getPropertyAsInterface(key, Ci.nsIURL);
        if (!referrer)
            return null;

        return urls.URL(referrer.prePath + referrer.path);
    }
    catch (e)
    {
        console.error(e);
        return null;
    }
}

function getStateFlags(stateFlags)
{
    let flags = "";
    if (stateFlags & Ci.nsIWebProgressListener.STATE_START) flags += "STATE_START ";
    if (stateFlags & Ci.nsIWebProgressListener.STATE_IS_REQUEST) flags += "STATE_IS_REQUEST ";
    if (stateFlags & Ci.nsIWebProgressListener.STATE_IS_WINDOW) flags += "STATE_IS_WINDOW ";
    if (stateFlags & Ci.nsIWebProgressListener.STATE_IS_DOCUMENT) flags += "STATE_IS_DOCUMENT ";
    if (stateFlags & Ci.nsIWebProgressListener.STATE_REDIRECTING) flags += "STATE_REDIRECTING ";
    if (stateFlags & Ci.nsIWebProgressListener.STATE_TRANSFERRING) flags += "STATE_TRANSFERRING ";
    if (stateFlags & Ci.nsIWebProgressListener.STATE_NEGOTIATING) flags += "STATE_NEGOTIATING ";
    if (stateFlags & Ci.nsIWebProgressListener.STATE_STOP) flags += "STATE_STOP ";
    if (stateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK) flags += "STATE_IS_NETWORK ";
    if (stateFlags & Ci.nsIWebProgressListener.STATE_RESTORING) flags += "STATE_RESTORING ";

    flags += stateFlags;

    return flags;
}

function getLoadCommand(loadCommand)
{
    let command = "";
    
    if (loadCommand & Ci.nsIDocShell.LOAD_CMD_NORMAL) command = "LOAD_CMD_NORMAL ";
    if (loadCommand & Ci.nsIDocShell.LOAD_CMD_RELOAD) command = "LOAD_CMD_RELOAD ";
    if (loadCommand & Ci.nsIDocShell.LOAD_CMD_HISTORY) command = "LOAD_CMD_HISTORY ";
    if (loadCommand & Ci.nsIDocShell.LOAD_CMD_PUSHSTATE) command = "LOAD_CMD_PUSHSTATE ";

    command += loadCommand;
    
    return command;
}

function getLoadFlags(loadFlags)
{
    let flags = "";

    if (loadFlags == 0) flags += "LOAD_FLAGS_NONE ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_IS_REFRESH) flags += "LOAD_FLAGS_IS_REFRESH ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_IS_LINK) flags += "LOAD_FLAGS_IS_LINK ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_HISTORY) flags += "LOAD_FLAGS_BYPASS_HISTORY ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE) flags += "LOAD_FLAGS_BYPASS_CACHE ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_PROXY) flags += "LOAD_FLAGS_BYPASS_PROXY ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_CHARSET_CHANGE) flags += "LOAD_FLAGS_CHARSET_CHANGE ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_STOP_CONTENT) flags += "LOAD_FLAGS_STOP_CONTENT ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_FROM_EXTERNAL) flags += "LOAD_FLAGS_FROM_EXTERNAL ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_MIXED_CONTENT) flags += "LOAD_FLAGS_ALLOW_MIXED_CONTENT ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_FIRST_LOAD) flags += "LOAD_FLAGS_FIRST_LOAD ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_POPUPS) flags += "LOAD_FLAGS_ALLOW_POPUPS ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_CLASSIFIER) flags += "LOAD_FLAGS_BYPASS_CLASSIFIER ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_FORCE_ALLOW_COOKIES) flags += "LOAD_FLAGS_FORCE_ALLOW_COOKIES ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_DISALLOW_INHERIT_OWNER) flags += "LOAD_FLAGS_DISALLOW_INHERIT_OWNER ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP) flags += "LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP ";
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_FIXUP_SCHEME_TYPOS) flags += "LOAD_FLAGS_FIXUP_SCHEME_TYPOS ";

    flags += loadFlags;
    
    return flags;
}

function isRequestAllowed(loadCommand, loadFlags, source, target)
{
    try
    {
    if (loadCommand & Ci.nsIDocShell.LOAD_CMD_HISTORY)
    {
        console.log("Request allowed: History");
        return true;
    }

    if (loadCommand & Ci.nsIDocShell.LOAD_CMD_RELOAD)
    {
        console.log("Request allowed: Refresh");
        return true;
    }

    if (!source)
    {
        console.log("Request allowed: User action");
        return true;
    }
     
    if (settings.get("allowTriggeredByLinkClick"))
    {
        if ((loadCommand & Ci.nsIDocShell.LOAD_CMD_NORMAL) && (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_IS_LINK))
        {
            console.log("Request allowed: Link clicked");
            return true;
        }
    
        if (containsClickedLink(source.href, target.href))
        {
            console.log("Request allowed: Link clicked");
            return true;
        }
    }
   
    if (settings.get("allowSameDomain"))
    {
        if (source.host == target.host)
        {
            console.log("Request allowed: Same domain");
            return true;
        }
    }
   
    if (settings.get("allowSameBaseDomain"))
    {
        let sourceBaseDomain = utils.getBaseDomainFromHost(source.host);
        let targetBaseDomain = utils.getBaseDomainFromHost(target.host);
        if (sourceBaseDomain == targetBaseDomain)
        {
            console.log("Request allowed: Same base domain");
            return true;
        }
    }
    
    if (settings.get("ignoreSubdomains"))
    {     
        let sourceBaseDomain = utils.getBaseDomainFromHost(source.host);
        let targetBaseDomain = utils.getBaseDomainFromHost(target.host);
        if ((sourceBaseDomain == targetBaseDomain) ||
            rules.exists(sourceBaseDomain, targetBaseDomain))
        {
            console.log("Request allowed: Rule matched");
            return true;
        }
    }
    else
    {
        if (rules.exists(source.host, target.host))
        {
            console.log("Request allowed: Rule matched");
            return true;
        }
    }
    
    return false;
    }
    catch (e)
    {
        console.error(e);
    }
}

function getMetaRefreshInfo(tabId, channel)
{
    let metaRefresh = metaRefreshs[tabId];
    if (!metaRefresh || !metaRefresh.source) return null;
    
    let target = urls.URL(channel.URI.prePath + channel.URI.path);
    if (metaRefresh.target.href != target.href) return null;
    
    return metaRefresh;
}

function getRedirectInfo(tabId, channel)
{
    let redirect = redirects[tabId];
    if (!redirect || !redirect.source) return null;
    
    let origin = urls.URL(channel.originalURI.prePath + channel.originalURI.path);
    let target = urls.URL(channel.URI.prePath + channel.URI.path);
    if (redirect.origin.href != origin.href || redirect.source.href == target.href) return null;
    
    return redirect;
}

webProgress.addStateChangedListener(function(webProgress, request, stateFlags, status)
{
    try
    {
    let channel = request.nsIHttpChannel;
    if (!channel) return;
    
    let window = getWindow(webProgress);
    if (!window) return;
    
    let tab = getTab(window);
    if (!tab) return;
    
    let tabId = tab.linkedPanel;
    let loadInfo = channel.loadInfo;
    
    // loadInfo.externalContentPolicyType for FF version >= 44.0
    // loadInfo.contentPolicyType for FF version < 44.0
    if (loadInfo.contentPolicyType != Ci.nsIContentPolicy.TYPE_DOCUMENT && 
        loadInfo.externalContentPolicyType != Ci.nsIContentPolicy.TYPE_DOCUMENT)
    {
        return;
    }

    let origin = urls.URL(channel.originalURI.prePath + channel.originalURI.path);
    let target = urls.URL(channel.URI.prePath + channel.URI.path);
    let referrer = getReferrer(channel);

    let loadType = tab.linkedBrowser.docShell.loadType;
    let loadCommand = loadType;
    let loadFlags = (loadType >> 16);

    if (stateFlags & Ci.nsIWebProgressListener.STATE_START)
    {   
        let metaRefresh = getMetaRefreshInfo(tabId, channel);
        let redirect = getRedirectInfo(tabId, channel);
     
        redirects[tabId] =
        {
            origin: origin,
            source: target,
        };
     
        let source = null;
        
        if (metaRefresh)
        {
            source = metaRefresh.source;
                 
            console.log("----------------- MetaRefresh ------------------");
            console.log("tabId " + tabId);
            console.log("source " + source.href);
            console.log("target " + target.href);
            console.log("stateFlags " + getStateFlags(stateFlags));
            console.log("loadCommand " + getLoadCommand(loadCommand));
            console.log("loadFlags " + getLoadFlags(loadFlags));
            console.log("------------------------------------------------");
        }
        else if (redirect)
        {
            source = redirect.source;
            loadCommand = Ci.nsIDocShell.LOAD_CMD_NORMAL;
            loadFlags = Ci.nsIWebNavigation.LOAD_FLAGS_NONE;
            
            console.log("------------------ Redirect --------------------");
            console.log("tabId " + tabId);
            console.log("source " + source.href);
            console.log("target " + target.href);
            console.log("stateFlags " + getStateFlags(stateFlags));
            console.log("loadCommand " + getLoadCommand(loadCommand));
            console.log("loadFlags " + getLoadFlags(loadFlags));
            console.log("------------------------------------------------");
        }
        else
        {
            source = referrer;
            
            console.log("------------------- Request --------------------");
            console.log("tabId " + tabId);
            console.log("source " + ((source) ? source.href : "(null)"));
            console.log("target " + target.href);
            console.log("stateFlags " + getStateFlags(stateFlags));
            console.log("loadCommand " + getLoadCommand(loadCommand));
            console.log("loadFlags " + getLoadFlags(loadFlags));
            console.log("------------------------------------------------");
        }
        
        let isAllowed = isRequestAllowed(loadCommand, loadFlags, source, target);
        if (!isAllowed)
        {
            suspend(tabId, request);
            notification.show(tabId, window, source, target);
        }
        
        return;
    }

    if (stateFlags & Ci.nsIWebProgressListener.STATE_STOP &&
        stateFlags & Ci.nsIWebProgressListener.STATE_IS_WINDOW)
    {
        delete requests[tabId];
        delete redirects[tabId];
    
        console.log("-------------------- Stop ----------------------");
        console.log("tabId " + tabId);
        console.log("------------------------------------------------");
        return;
    }
    }
    catch (exception)
    {
        console.error(exception);
    }
});

webProgress.addRefreshAttemptedListeners(function(webProgress, refreshURI, millis, sameURI)
{
    try
    {
    let channel = tab.linkedBrowser.docShell.currentDocumentChannel;
    if (!channel) return;
    
    let window = getWindow(webProgress);
    if (!window) return;
    
    let tab = getTab(window);
    if (!tab) return;

    let tabId = tab.linkedPanel;
    
    let source = urls.URL(channel.URI.prePath + channel.URI.path);
    let target = urls.URL(refreshURI.prePath + refreshURI.path);

    metaRefreshs[tabId] =
    {
        source: source,
        target: target,
    };
    
    console.log("-------------- MetaRefresh Attempt -------------");
    console.log("tabId " + tabId);
    console.log("source " + source.href);
    console.log("target " + target.href);
    console.log("------------------------------------------------");
    }
    catch (exception)
    {
        console.error(exception);
    }
});

clickWatcher.addListener(function(event)
{
    if (event.mozInputSource == 0) return;    
    if (event.button != 0 && event.button != 1) return;
    
    let linkUrl = null;
    for (let node = event.target; node; node = node.parentNode)
    {
        let nodeName = node.nodeName.toLowerCase();
        if (nodeName == "a")
        {
            linkUrl = node.href;
            break;
        }
        
        if (nodeName == "input" && node.type.toLowerCase() == "submit")
        {
            linkUrl = node.form.action;
            break;
        }
    }
    
    if (!linkUrl) return;
   
    addClickedLink(event.target.ownerDocument.URL, linkUrl);
});

contextMenu.addListener(function(event)
{
    let xulDocument = event.currentTarget.ownerDocument;
    if (!xulDocument || !xulDocument.defaultView) return;
    
    let gContextMenu = xulDocument.defaultView.gContextMenu;
    if (!gContextMenu) return;
    
    let gContextMenuContentData = xulDocument.defaultView.gContextMenuContentData;
    if (!gContextMenuContentData) return;
 
    if(!event.target) return;
    
    let command = event.target.id;
    console.log("----------------- Context Menu -----------------");
    console.log("command: " + command);
    console.log("------------------------------------------------");
    
    if (command == "context-openlinkincurrent" ||
        command == "context-openlinkintab" ||
        command == "context-openlink" ||
        command == "context-openlinkprivate")
    {
        if (!gContextMenuContentData.documentURIObject || !gContextMenuContentData.documentURIObject.spec) return;
        if (!gContextMenu.linkURI || !gContextMenu.linkURI.spec) return;
    
        let source = gContextMenuContentData.documentURIObject.spec;
        let target = gContextMenu.linkURI.spec;
        
        addClickedLink(source, target);
        return;
    }

    if (command == "context-viewimage")
    {
        if (!gContextMenuContentData.documentURIObject || !gContextMenuContentData.documentURIObject.spec) return;
        if (!gContextMenu.mediaURL) return;
        
        let source = gContextMenuContentData.documentURIObject.spec;
        let target = gContextMenu.mediaURL;
        
        addClickedLink(source, target);
        return;
    }
    
    if (command == "context-showonlythisframe" ||
        command == "context-openframeintab" ||
        command == "context-openframe")
    {
        if (!gContextMenuContentData.referrer) return;
        if (!gContextMenuContentData.docLocation) return;
    
        let source = gContextMenuContentData.referrer;
        let target = gContextMenuContentData.docLocation;
        
        addClickedLink(source, target);
        return;
    }
});

notification.addListener(function(event, data)
{
    if (event == "allow")
    {
        resume(data.tabId);
        return;
    }

    if (event == "deny")
    {
        cancel(data.tabId);
        return;
    }

    if (event == "add-rule")
    {
        rules.add({ source: data.source, target: data.target, regularExpression: false });
        resume(data.tabId);
        return;
    }
});