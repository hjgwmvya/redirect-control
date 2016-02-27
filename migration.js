const self = require("sdk/self");

if (!require("sdk/simple-storage").storage) require("sdk/simple-storage").storage = { };
const storage = require("sdk/simple-storage").storage;

let addonVersion = self.version;
let dataVersion = (storage.dataVersion) ? storage.dataVersion : "<= 0.1.0";

console.log("addon version: " + addonVersion);
console.log("data version: " + dataVersion);

if (storage.settings)
{
    if (dataVersion == "<= 0.1.0")
    {
        console.log("migrate data from " + dataVersion + " to " + addonVersion);
        
        storage.settings.allowSameBaseDomain = (storage.settings.allowSameBaseDomain === undefined) ? storage.settings.allowBaseDomain : storage.settings.allowSameBaseDomain;
        delete storage.settings.allowBaseDomain;
        
        for (let rule of storage.rules)
        {
            rule.source = (rule.source === undefined) ? rule.origin : rule.source;
            delete rule.origin;
            rule.target = (rule.target === undefined) ? rule.destination : rule.target;
            delete rule.destination;
            
            rule.source = (rule.source) ? rule.source : ((!rule.regularExpression) ? "*" : ".*");
            rule.target = (rule.target) ? rule.target : ((!rule.regularExpression) ? "*" : ".*");
        }
    }

    storage.dataVersion = addonVersion;
}