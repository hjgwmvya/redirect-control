const unload = require("sdk/system/unload");
const addon = require("./../package.json");
const _ = require("sdk/l10n").get;

const { Ci, Cc } = require("chrome");

const promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);

unload.when(function(reason)
{
    if (reason != "disable") return;

    let checkState = { value: true }; 
    promptService.alertCheck(null, _("uninstall-cleanup-title", addon.title), _("uninstall-cleanup-text", addon.title), _("uninstall-cleanup-keep-settings"), checkState);
    if (!checkState.value)
    {
        require("sdk/simple-storage").storage = null;
    }
});