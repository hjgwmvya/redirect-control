if (!require("sdk/simple-storage").storage) require("sdk/simple-storage").storage = { };
const storage = require("sdk/simple-storage").storage;

exports.getRules = getRules;
exports.setRules = setRules;
exports.add = addRule;
exports.remove = removeRule;
exports.exists = ruleExists;
exports.addListener = addListener;

let listeners = [ ];

if (!storage.rules || !Array.isArray(storage.rules)) 
{
    storage.rules = [ ];
    
    // example list
    addRule({ source: "mozilla.com", target: "mozilla.org", regularExpression: false });
    addRule({ source: "mozilla.org", target: "mozilla.com", regularExpression: false });
    addRule({ source: "*.mozilla.com", target: "*.mozilla.com", regularExpression: false });
    addRule({ source: "^(.*\\.)?mozilla\\.(com|org)$", target: "^(.*\\.)?mozilla\\.(com|org)$", regularExpression: true });
}

function getRules()
{
    return storage.rules;
}

function setRules(rules)
{
    storage.rules = rules;
}

function addRule(rule)
{
    rule.source = (rule.source) ? rule.source : ((rule.regularExpression) ? ".*" : "*");
    rule.target = (rule.target) ? rule.target : ((rule.regularExpression) ? ".*" : "*");

    let index = storage.rules.findIndex(function(currentRule, index, array)
    {
        return currentRule.source == rule.source && 
            currentRule.target == rule.target && 
            currentRule.regularExpression == rule.regularExpression;
    });
    if (index != -1) return;
    
    storage.rules.push(rule);
    console.log("------------------- New Rule -------------------");
    console.log("source: " + rule.source);
    console.log("target: " + rule.target);
    console.log("regularExpression: " + rule.regularExpression);
    console.log("------------------------------------------------");

    notifyListener();
}

function removeRule(rule)
{
    let index = storage.rules.findIndex(function(currentRule, index, array)
    {
        return currentRule.source == rule.source && 
            currentRule.target == rule.target && 
            currentRule.regularExpression == rule.regularExpression;
    });
    if (index == -1) return;
    
    storage.rules.splice(index, 1);
    
    notifyListener();
}

function ruleExists(source, target)
{
    if (!source || !target) return false;

    let makeRegExp = function(str)
    {
        return "^" + (str + '').replace(/[.?+^$[\]\\(){}|-]/g, "\\$&").replace(/[*]/, ".*") + "$";
    };
    
    let index = storage.rules.findIndex(function(rule, index, array)
    {   
        if (rule.regularExpression)
        {
            try
            {
                let sourceMatched = source.match(new RegExp(rule.source, 'i')) != null;
                let targetMatched = target.match(new RegExp(rule.target, 'i')) != null;
                return sourceMatched && targetMatched;
            }
            catch (e)
            {
                console.warn(e);
            }
            
            return false;
        }
        else
        {
            try
            {
                let sourceMatched = source.match(new RegExp(makeRegExp(rule.source), 'i'));
                let targetMatched = target.match(new RegExp(makeRegExp(rule.target), 'i'));
                return sourceMatched && targetMatched;
            }
            catch (e)
            {
                console.warn(e);
            }
        
            return rule.source == source && rule.destination == target;
        }
    });
    
    return (index != -1);
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