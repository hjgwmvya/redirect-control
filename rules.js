if (!require("sdk/simple-storage").storage) require("sdk/simple-storage").storage = { };
const storage = require("sdk/simple-storage").storage;

exports.get = getRules;
exports.add = addRule;
exports.remove = removeRule;
exports.exists = ruleExists;
exports.addListener = addListener;

if (!storage.rules || !Array.isArray(storage.rules)) 
{
    storage.rules = [ ];
    
    // example list
    addRule("mozilla.com", "mozilla.org");
    addRule("mozilla.org", "mozilla.com");
}

let listeners = [ ];

function getRules()
{
    return storage.rules;
}

function addRule(origin, destination)
{
    if (!origin) origin = null;
    if (!destination) destination = null;

    let index = storage.rules.findIndex(function(element, index, array)
    {
        return element.origin == origin && element.destination == destination;
    });
    if (index != -1) return;
    
    storage.rules.push(
    {
        origin: origin,
        destination: destination,
    });
    console.log("------------------- New Rule -------------------");
    console.log("origin: " + origin);
    console.log("destination: " + destination);
    console.log("------------------------------------------------");

    notifyListener();
}

function removeRule(origin, destination)
{
    if (!origin) origin = null;
    if (!destination) destination = null;

    let index = storage.rules.findIndex(function(element, index, array)
    {
        return element.origin == origin && element.destination == destination;
    });
    if (index == -1) return;
    
    storage.rules.splice(index, 1);
    
    notifyListener();
}

function ruleExists(origin, destination)
{
    if (!origin) origin = null;
    if (!destination) destination = null;

    let index = storage.rules.findIndex(function(element, index, array)
    {
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