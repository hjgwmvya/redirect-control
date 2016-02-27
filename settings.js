if (!require("sdk/simple-storage").storage) require("sdk/simple-storage").storage = { };
const storage = require("sdk/simple-storage").storage;

exports.getList = getSettings;
exports.set = setSetting;
exports.get = getSetting;
exports.addListener = addListener;

let listeners = [ ];

if (!storage.settings)
{
    storage.settings = { };
}

// default settings
let defaultSettings =
{
    allowSameDomain: true,
    allowSameBaseDomain: true,
    ignoreSubdomains: true,
    allowTriggeredByLinkClick: true,
};

function applyDefaultSettings()
{
    for (let settingName in defaultSettings)
    {
        if (storage.settings[settingName] === undefined)
        {
            console.log("Default setting applied: " + settingName + " = " + defaultSettings[settingName]);
            storage.settings[settingName] = defaultSettings[settingName];
        }
    }
}
applyDefaultSettings();

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
    for (let listener of listeners)
    {
        listener();
    }
}