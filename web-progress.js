const { Class } = require("sdk/core/heritage");
const { Unknown } = require("sdk/platform/xpcom");
const { Cc, Ci } = require("chrome");

const webProgress = Cc["@mozilla.org/docloaderservice;1"].getService(Ci.nsIWebProgress);

let WebProgressListener = Class(
{
    extends: Unknown,
    interfaces: [ "nsIWebProgressListener", "nsIWebProgressListener2", "nsISupportsWeakReference" ],

    registered: false,
    stateChangedListeners: [ ],
    refreshAttemptedListeners: [ ],
    
    register: function register()
    {
        if (this.registered) return;

        this.registered = true;
        webProgress.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_STATE_ALL | Ci.nsIWebProgress.NOTIFY_REFRESH);
    },
    unregister: function()
    {
        if (!this.registered) return;

        this.registered = false;
        webProgress.removeProgressListener(this);
    },

    addStateChangedListener: function(listener)
    {
        this.stateChangedListeners.push(listener);
    },
    addRefreshAttemptedListeners: function(listener)
    {
        this.refreshAttemptedListeners.push(listener);
    },

    onStateChange: function(webProgress, request, stateFlags, status)
    {
        for (let listener of this.stateChangedListeners)
        {
            listener(webProgress, request, stateFlags, status);
        }
    },
    
    onRefreshAttempted: function(aWebProgress, aRefreshURI, aMillis, aSameURI)
    {
        for (let listener of this.refreshAttemptedListeners)
        {
            listener(aWebProgress, aRefreshURI, aMillis, aSameURI);
        }
        
        return true;
    },
});

exports.create = function()
{
    return new WebProgressListener();
};