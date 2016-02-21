if (!require("sdk/simple-storage").storage) require("sdk/simple-storage").storage = { };
const storage = require("sdk/simple-storage").storage;

exports.getList = getSettings;
exports.set = setSetting;
exports.get = getSetting;
exports.addListener = addListener;

if (!storage.settings)
{
    storage.settings = { };
}

// default settings
if (storage.settings.allowBaseDomain === undefined)
{
    storage.settings.allowBaseDomain = true;
}
if (storage.settings.ignoreSubdomains === undefined)
{
    storage.settings.ignoreSubdomains = true;
}
if (storage.settings.allowTriggeredByLinkClick === undefined)
{
    storage.settings.allowTriggeredByLinkClick = true;
}

var listeners = [ ];

function getSettings()
{
    return storage.settings;
}

function setSetting(name, value)
{
    storage.settings[name] = value;

    console.log("--------------- Setting Changed ----------------");
    console.log("name: " + name);
    console.log("value: " + value);
    console.log("------------------------------------------------");

    notifyListener();
}

function getSetting(name, value)
{
    return storage.settings[name];
}

function addListener(listener)
{
    listeners.push(listener);
}

function notifyListener()
{
    for (let key in listeners)
    {
        listeners[key]();
    }
}