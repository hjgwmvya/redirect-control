const addon = require("./../package.json");
const self = require("sdk/self");
const ui = require("sdk/ui");
const windows = require("sdk/windows").browserWindows;
const tabs = require("sdk/tabs");
const simplePrefs = require("sdk/simple-prefs");
const _ = require("sdk/l10n").get;

simplePrefs.on("addon-page", function()
{
    openOptionsPage();
});

ui.ActionButton(
{
    id: self.name + "-option-button",
    label: _("options-button-open-options", addon.title),
    icon: "./images/redirect-32.png",
    onClick: function(state)
    {
        openOptionsPage();
    }
});

function openOptionsPage()
{
    let opened = false;
    for (let window of windows)
    {
        for (let tab of window.tabs)
        {
            if (tab.url == self.data.url("options-page.html"))
            {
                window.activate();
                tab.activate();
                opened = true;
                break;
            }
        }

        if (opened)
        {
            break;
        }
    }

    if (!opened)
    {
        tabs.open("./options-page.html");
    }
}