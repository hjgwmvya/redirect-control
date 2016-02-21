const self = require("sdk/self");
const _ = require("sdk/l10n").get;
const utils = require("./../utils.js");
const settings = require("./../settings.js");
const rules = require("./../rules.js");

exports.show = showNotification;
exports.addListener = addListener;

let listeners = [ ];

function shortUrl(url)
{
    let maxLength = 100;
    if (url.length < maxLength)
    {
        return url;
    }

    let partLength = maxLength / 2 - 2;
    return url.substr(0, partLength) + "..." + url.substr(-partLength, partLength);
}

function addMenuItem(document, menuPopup, id, label, callback)
{
    let menuItem = document.getElementById(id);
    if (!menuItem)
    {
        menuItem = document.createElement("menuitem");
        menuItem.setAttribute("id", id);
        menuPopup.appendChild(menuItem);
    }

    menuItem.setAttribute("label", label);
    menuItem.onclick = callback;
}

function showNotification(tabId, contentWindow, originLocation, destinationLocation)
{
    let ignoreSubdomains = settings.get("ignoreSubdomains");

    let originBaseDomain = (ignoreSubdomains) ? utils.getBaseDomainFromHost(originLocation.host) : originLocation.host;
    let destinationBaseDomain = (ignoreSubdomains) ? utils.getBaseDomainFromHost(destinationLocation.host) : destinationLocation.host;

    let chromeWindow = utils.getChromeWindow(contentWindow);
    let notificationBox = chromeWindow.getNotificationBox(contentWindow);

    let menuPopupId = self.name + "_menupoup";

    let menuPopup = notificationBox.ownerDocument.getElementById(menuPopupId);
    if (!menuPopup)
    {
        menuPopup = notificationBox.ownerDocument.createElement("menupopup");
        menuPopup.setAttribute("id", menuPopupId);
        notificationBox.appendChild(menuPopup);
    }

    addMenuItem(notificationBox.ownerDocument, menuPopup, menuPopupId + "_item_from_to",
        _("notification-allways-allow-from-to", originBaseDomain, destinationBaseDomain),
        function()
        {
            notifyListeners("add-rule", { tabId: tabId, origin: originBaseDomain, destination: destinationBaseDomain });
        });
    addMenuItem(notificationBox.ownerDocument, menuPopup, menuPopupId + "_item_from",
        _("notification-allways-allow-from", originBaseDomain),
        function()
        {
            notifyListeners("add-rule", { tabId: tabId, origin: originBaseDomain, destination: null });
        });
    addMenuItem(notificationBox.ownerDocument, menuPopup, menuPopupId + "_item_to",
        _("notification-allways-allow-to", destinationBaseDomain),
        function()
        {
            notifyListeners("add-rule", { tabId: tabId, origin: null, destination: destinationBaseDomain });
        });

    let notificationValue = "{BFFE6EEF-CEC8-43D6-9E77-F83EB9169A26}";
    let notificationLabel = _("notification-allow-redirect-from-to", shortUrl(originLocation.href), shortUrl(destinationLocation.href));

    let buttonAddRule =
    {
        label: _("notification-add-rule"),
        accessKey: _("notification-add-rule-hotkey"),
        popup: menuPopupId,
        callback: null,
    };
    let buttonYes =
    {
        label: _("notification-yes"),
        accessKey: _("notification-yes_hotkey"),
        popup : null,
        callback : function()
        {
            notifyListeners("allow", { tabId: tabId });
        }
    };
    let buttonNo =
    {
        label: _("notification-no"),
        accessKey: _("notification-no_hotkey"),
        popup: null,
        callback: function()
        {
            notifyListeners("deny", { tabId: tabId });
        }
    };

    let notification = notificationBox.getNotificationWithValue(notificationValue);
    if (notification)
    {
        notificationBox.removeNotification(notification);
    }
    notificationBox.appendNotification(notificationLabel, notificationValue, self.data.url("images/redirect-16.png"), notificationBox.PRIORITY_WARNING_MEDIUM, [ buttonAddRule, buttonYes, buttonNo ]);
}

function addListener(listener)
{
    listeners.push(listener);
}

function notifyListeners(event, data)
{
    for (let listener of listeners)
    {
        listener(event, data);
    }
}