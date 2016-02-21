if (!require("sdk/simple-storage").storage) require("sdk/simple-storage").storage = { };
const storage = require("sdk/simple-storage").storage;

exports.getRules = getRules;
exports.setRules = setRules;
exports.add = addRule;
exports.remove = removeRule;
exports.exists = ruleExists;
exports.addListener = addListener;

if (!storage.rules || !Array.isArray(storage.rules)) 
{
    storage.rules = [ ];
    
    // example list
    addRule("mozilla.com", "mozilla.org", false);
    addRule("mozilla.org", "mozilla.com", false);
    addRule("*.mozilla.com", "*.mozilla.com", false);
    addRule("^(.*\\.)?mozilla\\.(com|org)$", "^(.*\\.)?mozilla\\.(com|org)$", true);
}

var listeners = [ ];

function getRules()
{
    return storage.rules;
}

function setRules(rules)
{
    storage.rules = rules;
}

function addRule(origin, destination, regularExpression)
{
    if (!origin) origin = null;
    if (!destination) destination = null;

    let index = storage.rules.findIndex(function(element, index, array)
    {
        return element.origin == origin && element.destination == destination && element.regularExpression == regularExpression;
    });
    if (index != -1) return;
    
    storage.rules.push(
    {
        origin: origin,
        destination: destination,
        regularExpression: regularExpression,
    });
    console.log("------------------- New Rule -------------------");
    console.log("origin: " + origin);
    console.log("destination: " + destination);
    console.log("regularExpression: " + regularExpression);
    console.log("------------------------------------------------");

    notifyListener();
}

function removeRule(origin, destination, regularExpression)
{
    if (!origin) origin = null;
    if (!destination) destination = null;

    let index = storage.rules.findIndex(function(element, index, array)
    {
        return element.origin == origin && element.destination == destination && element.regularExpression == regularExpression;
    });
    if (index == -1) return;
    
    storage.rules.splice(index, 1);
    
    notifyListener();
}

function ruleExists(origin, destination)
{
    if (!origin) origin = null;
    if (!destination) destination = null;

    let makeRegEx = function(str)
    {
        return "^" + (str+'').replace(/[.?+^$[\]\\(){}|-]/g, "\\$&").replace(/[*]/, ".*") + "$";
    };
    
    let index = storage.rules.findIndex(function(element, index, array)
    {
        if (element.regularExpression)
        {
            try
            {
                let originMatched = (element.origin == null) || 
                    (origin != null && origin.match(new RegExp(element.origin, 'i')) != null);
                let destinationMatched = (element.destination == null) || 
                    (destination != null && destination.match(new RegExp(element.destination, 'i')) != null);
                return originMatched && destinationMatched;
            }
            catch (e)
            {
                console.error(e);
            }
            
            return false;
        }
        
        try
        {
            let originMatched = (element.origin == null) || 
                (origin != null && origin.match(new RegExp(makeRegEx(element.origin), 'i')) != null);
            let destinationMatched = (element.destination == null) || 
                (destination != null && destination.match(new RegExp(makeRegEx(element.destination), 'i')) != null);
            return originMatched && destinationMatched;
        }
        catch (e)
        {
            console.error(e);
        }
    
        return element.origin == origin && element.destination == destination;
    });
    
    return (index != -1);
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