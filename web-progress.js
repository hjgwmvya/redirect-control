const { Class } = require("sdk/core/heritage");
const { Unknown } = require("sdk/platform/xpcom");
const { Cc, Ci } = require("chrome");

const webProgress = Cc["@mozilla.org/docloaderservice;1"].getService(Ci.nsIWebProgress);

var WebProgressListener = Class(
{
    extends: Unknown,
    interfaces: [ "nsIWebProgressListener", "nsISupportsWeakReference" ],

    registered: false,
    listeners: [ ],

    register: function register()
    {
        if (this.registered) return;

        this.registered = true;
        webProgress.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_STATE_ALL);
    },
    unregister: function()
    {
        if (!this.registered) return;

        this.registered = false;
        webProgress.removeProgressListener(this);
    },

    addListener: function(listener)
    {
        this.listeners.push(listener);
    },

    onStateChange: function(webProgress, request, stateFlags, status)
    {
        for (let listener of this.listeners)
        {
            listener(webProgress, request, stateFlags, status);
        }
    },
});

exports.create = function()
{
    return new WebProgressListener();
};