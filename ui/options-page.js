const self = require("sdk/self");
const unload = require("sdk/system/unload");
const pageMod = require("sdk/page-mod");
const windows = require("sdk/windows").browserWindows;
const tabs = require("sdk/tabs");
const _ = require("sdk/l10n").get;

const rules = require("./../rules.js");

let workers = [ ];

unload.when(function(reason)
{
    for (let window of windows)
    {
        for (let tab of window.tabs)
        {
            if (tab.url == self.data.url("options-page.html"))
            {
                tab.close();
            }
        }
    }
});

rules.addListener(function()
{
    for (let worker of workers)
    {
        worker.port.emit("set-rules", rules.get());
    }
});

pageMod.PageMod(
{
    include: self.data.url("options-page.html"),
    contentScriptFile: [ "./jquery-2.1.4.js", "./translate.js", "./options-page.js" ],
    onAttach: function(worker)
    {
        workers.push(worker);
        worker.on("detach", function()
        {
            var index = workers.indexOf(worker);
            if(index != -1)
            {
                workers.splice(index, 1);
            }
        });

        worker.port.on("translate", function(id)
        {
            worker.port.emit("translated-" + id, _(id));
        });

        worker.port.on("add-rule", function(rule)
        {
            rules.add(rule.origin, rule.destination);
        });
        worker.port.on("delete-rule", function(rule)
        {
            rules.remove(rule.origin, rule.destination);
        });
        worker.port.emit("set-rules", rules.get());
    },
});
