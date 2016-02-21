require("./uninstall-cleanup.js");
require("./ui/options-button.js");
require("./ui/options-page.js");

const unload = require("sdk/system/unload");
const urls = require("sdk/url");
const tabs = require("sdk/tabs");
const utils = require("./utils.js");
const settings = require("./settings.js");
const rules = require("./rules.js");
const notification = require("./ui/notification.js");

const { Ci, Cr } = require("chrome");

let currentRequests = { };
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
    
    delete currentRequests[tabId];
    
    console.log("Tab closed: " + tabId);
});

function suspend(tabId, request)
{
    let currentRequest = currentRequests[tabId];
    if (!currentRequest) return;

    cancel(tabId);
    try
    {
        request.suspend();
        currentRequest.request = request;
        console.log("Request suspended");
    }
    catch (exception)
    {
        console.error(exception);
    }
}

function resume(tabId)
{
    let currentRequest = currentRequests[tabId];
    if (!currentRequest || !currentRequest.request) return;
    
    try
    {
        currentRequest.request.resume();
        currentRequest.request = null;
        console.log("Request continued");
    }
    catch (exception)
    {
        console.error(exception);
    }
}

function cancel(tabId)
{
    let currentRequest = currentRequests[tabId];
    if (!currentRequest || !currentRequest.request) return;

    try
    {
        currentRequest.request.resume();
        currentRequest.request.cancel(Cr.NS_BINDING_ABORTED);
        currentRequest.request = null;
        console.log("Request cancelled");
    }
    catch (exception)
    {
        console.error(exception);
    }
}

function cleanupLinks()
{
    var now = new Date().getTime();

    for (let index = clickedLinks.length - 1; index >= 0; index--)
    {
        let clickedLink = clickedLinks[index];
        if (now - clickedLink.time > 1000 * 10)
        {
            clickedLinks.splice(index, 1);
        }
    }
}

function addClickedLink(origin, destination)
{
    cleanupLinks();
    
    console.log("--------------------- Link ---------------------");
    console.log("origin: " + origin);
    console.log("destination: " + destination);
    console.log("------------------------------------------------");
    
    let index = clickedLinks.findIndex(function(element, index, array)
    {
        return element.origin == origin && element.destination == destination;
    });
    
    if (index == -1)
    {
        clickedLinks.push(
        {
            origin: origin,
            destination: destination,
            time: new Date().getTime(),
        });
    }
    else
    {
        clickedLinks[index].time = new Date().getTime();
    }
}

function containsClickedLink(origin, destination)
{
    let index = clickedLinks.findIndex(function(element, index, array)
    {
        return element.origin == origin && element.destination == destination;
    });
    if (index == -1) return;
    
    let clickedTime = clickedLinks[index].time;
   
    var now = new Date().getTime();
    return (now - clickedTime <= 1000 * 10);
}

function isSameBaseDomain(originLocation, destinationLocation)
{
    if (originLocation && destinationLocation)
    {
        let originBaseDomain = utils.getBaseDomainFromHost(originLocation.host);
        let destinationBaseDomain = utils.getBaseDomainFromHost(destinationLocation.host);

        if (originBaseDomain == destinationBaseDomain)
        {
            return true;
        }
    }

    return false;
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

function getLoadFlags(loadType)
{
    let flags = "";
    if (loadType & Ci.nsIDocShell.LOAD_CMD_NORMAL) flags += "LOAD_CMD_NORMAL ";
    if (loadType & Ci.nsIDocShell.LOAD_CMD_RELOAD) flags += "LOAD_CMD_RELOAD ";
    if (loadType & Ci.nsIDocShell.LOAD_CMD_HISTORY) flags += "LOAD_CMD_HISTORY ";
    if (loadType & Ci.nsIDocShell.LOAD_CMD_PUSHSTATE) flags += "LOAD_CMD_PUSHSTATE ";

    let loadFlags = loadType >> 16;
    if (loadFlags & Ci.nsIWebNavigation.LOAD_FLAGS_NONE) flags += "LOAD_FLAGS_NONE ";
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

    flags += loadType;

    return flags;
}

function isRequestAllowed(loadType, referrerLocation, destinationLocation, isRedirect)
{
    try
    {
    if (loadType & Ci.nsIDocShell.LOAD_CMD_HISTORY)
    {
        console.log("Request allowed: History");
        return true;
    }

    if (loadType & Ci.nsIDocShell.LOAD_CMD_RELOAD)
    {
        console.log("Request allowed: Refresh");
        return true;
    }

    if (settings.get("allowTriggeredByLinkClick"))
    {
        if (!isRedirect && (loadType & Ci.nsIDocShell.LOAD_CMD_NORMAL) && ((loadType >> 16) & Ci.nsIWebNavigation.LOAD_FLAGS_IS_LINK))
        {
            console.log("Request allowed: Link clicked");
            return true;
        }
    }

    if (!referrerLocation)
    {
        console.log("Request allowed: User action");
        return true;
    }
   
    if (referrerLocation.host == destinationLocation.host)
    {
        console.log("Request allowed: Same host");
        return true;
    }
   
    if (settings.get("allowTriggeredByLinkClick"))
    {
        if (containsClickedLink(referrerLocation.href, destinationLocation.href))
        {
            console.log("Request allowed: Link clicked");
            return true;
        }
    }
    
    if (settings.get("allowBaseDomain"))
    {
        if (isSameBaseDomain(referrerLocation, destinationLocation))
        {
            console.log("Request allowed: Same base domain");
            return true;
        }
    }
    
    if (settings.get("ignoreSubdomains"))
    {
        console.log(referrerLocation.host);
        console.log(utils.getBaseDomainFromHost(referrerLocation.host));
        console.log(destinationLocation.host);
        console.log(utils.getBaseDomainFromHost(destinationLocation.host));
        
        let referrerBaseDomain = utils.getBaseDomainFromHost(referrerLocation.host);
        let destinationBaseDomain = utils.getBaseDomainFromHost(destinationLocation.host);
        if ((referrerBaseDomain == destinationBaseDomain) ||
            rules.exists(referrerBaseDomain, destinationBaseDomain) ||
            rules.exists(referrerBaseDomain, null) ||
            rules.exists(null, destinationBaseDomain))
        {
            console.log("Request allowed: Rule matched");
            return true;
        }
    }
    else
    {
        if (rules.exists(referrerLocation.host, destinationLocation.host) ||
            rules.exists(referrerLocation.host, null) ||
            rules.exists(null, destinationLocation.host))
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

webProgress.addListener(function(webProgress, request, stateFlags, status)
{
    try
    {
    let window = null;
    try
    {
        window = webProgress.DOMWindow;
    }
    catch (e) { }
    if (!window || window.frameElement) return;
    
    let channel = request.nsIHttpChannel;
    if (!channel) return;

    let tab = utils.getTabForWindow(window);
    if (!tab || !tab.linkedBrowser.docShell) return;

    let loadInfo = channel.loadInfo;

    // loadInfo.externalContentPolicyType for FF version >= 44.0
    // loadInfo.contentPolicyType for FF version < 44.0
    if (loadInfo.contentPolicyType != Ci.nsIContentPolicy.TYPE_DOCUMENT && 
        loadInfo.externalContentPolicyType != Ci.nsIContentPolicy.TYPE_DOCUMENT)
    {
        return;
    }

    let originLocation = urls.URL(channel.originalURI.prePath + channel.originalURI.path);
    let destinationLocation = urls.URL(channel.URI.prePath + channel.URI.path);
    let referrerLocation = getReferrer(channel);

    let loadType = tab.linkedBrowser.docShell.loadType;
    let tabId = tab.linkedPanel;
    
    if (!currentRequests[tabId])
    {
        currentRequests[tabId] = { };
    }
    let currentRequest = currentRequests[tabId];
        
    if (stateFlags & Ci.nsIWebProgressListener.STATE_START &&
        stateFlags & Ci.nsIWebProgressListener.STATE_IS_WINDOW)
    {
        cancel(tabId);
        
        currentRequest.originLocation = originLocation;
        currentRequest.destinationLocation = destinationLocation;

        console.log("------------------- Request --------------------");
        console.log("tabId " + tabId);
        console.log("referrer " + ((referrerLocation) ? referrerLocation.href : "(null)"));
        console.log("origin " + originLocation.href);
        console.log("destination " + destinationLocation.href);
        console.log("stateFlags " + getStateFlags(stateFlags));
        console.log("loadType " + getLoadFlags(loadType));
        console.log("------------------------------------------------");

        let isAllowed = isRequestAllowed(loadType, referrerLocation, destinationLocation, false);
        if (isAllowed)
        {
            return;
        }

        suspend(tabId, request);
        notification.show(tabId, window, referrerLocation, destinationLocation);
        return;
    }
    
    if (stateFlags & Ci.nsIWebProgressListener.STATE_START &&
        currentRequest.originLocation &&
        currentRequest.originLocation.href == originLocation.href &&
        originLocation.href != destinationLocation.href)
    {
        cancel(tabId);
    
        let oldDestinationLocation = currentRequest.destinationLocation;
        currentRequest.destinationLocation = destinationLocation;

        console.log("------------------ Redirect --------------------");
        console.log("tabId " + tabId);
        console.log("referrer " + ((referrerLocation) ? referrerLocation.href : "(null)"));
        console.log("origin " + originLocation.href);
        console.log("destination (old) " + oldDestinationLocation.href);
        console.log("destination (new) " + destinationLocation.href);
        console.log("stateFlags " + getStateFlags(stateFlags));
        console.log("loadType " + getLoadFlags(loadType));
        console.log("------------------------------------------------");

        let isAllowed = isRequestAllowed(loadType, oldDestinationLocation, destinationLocation, true);
        if (isAllowed)
        {
            return;
        }

        suspend(tabId, request);
        notification.show(tabId, window, oldDestinationLocation, destinationLocation);
        return;
    }

    if (stateFlags & Ci.nsIWebProgressListener.STATE_STOP &&
        stateFlags & Ci.nsIWebProgressListener.STATE_IS_WINDOW)
    {
        currentRequest.originLocation = null;
        currentRequest.destinationLocation = null;

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
    
        let origin = gContextMenuContentData.documentURIObject.spec;
        let destination = gContextMenu.linkURI.spec;
        
        addClickedLink(origin, destination);
        return;
    }

    if (command == "context-viewimage")
    {
        if (!gContextMenuContentData.documentURIObject || !gContextMenuContentData.documentURIObject.spec) return;
        if (!gContextMenu.mediaURL) return;
        
        let origin = gContextMenuContentData.documentURIObject.spec;
        let destination = gContextMenu.mediaURL;
        
        addClickedLink(origin, destination);
        return;
    }
    
    if (command == "context-showonlythisframe" ||
        command == "context-openframeintab" ||
        command == "context-openframe")
    {
        if (!gContextMenuContentData.referrer) return;
        if (!gContextMenuContentData.docLocation) return;
    
        let origin = gContextMenuContentData.referrer;
        let destination = gContextMenuContentData.docLocation;
        
        addClickedLink(origin, destination);
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
        rules.add(data.origin, data.destination);
        resume(data.tabId);
        return;
    }
});