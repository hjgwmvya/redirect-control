const { Cc, Ci } = require("chrome");
const self = require("sdk/self");
const unload = require("sdk/system/unload");
const pageMod = require("sdk/page-mod");
const windows = require("sdk/windows").browserWindows;
const tabs = require("sdk/tabs");
const winUtils = require("sdk/window/utils");
const _ = require("sdk/l10n").get;

const settings = require("./../settings.js");
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

settings.addListener(function()
{
    for (let worker of workers)
    {
        worker.port.emit("set-settings", settings.getList());
    }
});
rules.addListener(function()
{
    for (let worker of workers)
    {
        worker.port.emit("set-rules", rules.getRules());
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
            let index = workers.indexOf(worker);
            if(index != -1)
            {
                workers.splice(index, 1);
            }
        });

        worker.port.on("translate", function(id)
        {
            worker.port.emit("translated-" + id, _(id));
        });

        worker.port.on("set-setting", function(setting)
        {
            settings.set(setting.name, setting.value);
        });
        worker.port.emit("set-settings", settings.getList());
        
        worker.port.on("add-rule", function(rule)
        {
            rules.add(rule);
        });
        worker.port.on("delete-rule", function(rule)
        {
            rules.remove(rule);
        });
        worker.port.emit("set-rules", rules.getRules());
        
        worker.port.on("import-rules", function()
        {
            importRules();
            worker.port.emit("set-rules", rules.getRules());
        });
        worker.port.on("export-rules", function()
        {
            exportRules();
        });
    },
});

function importRules()
{
    let nsIFilePicker = Ci.nsIFilePicker;
    let filePicker = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    let stream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
    let streamIO = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
    
    let recentWindow = winUtils.getMostRecentBrowserWindow();
    filePicker.init(recentWindow, _("options-page-import-rules"), nsIFilePicker.modeOpen);
    filePicker.defaultExtension = "json";
    filePicker.defaultString = "redirectcontrol-rules.json";
    filePicker.appendFilters(nsIFilePicker.filterAll);
    
    if (filePicker.show() != nsIFilePicker.returnCancel)
    {
        stream.init(filePicker.file, 0x01, parseInt("0444", 8), null);
        streamIO.init(stream);
        let input = streamIO.read(stream.available());
        streamIO.close();
        stream.close();       
        
        try
        {
            let importedRules = [ ];            
            for (let rule of JSON.parse(input))
            {
                importedRules.push({
                    source: rule.source.toString(),
                    target: rule.target.toString(),
                    regularExpression: (rule.regularExpression == true)
                });
            }
            rules.setRules(importedRules);
        }
        catch (e)
        {
            console.error(e);
            recentWindow.alert(_("options-page-failed-to-import-rules"));
        }
    }
    
    return null;
}

function exportRules()
{
    let nsIFilePicker = Ci.nsIFilePicker;
    let filePicker = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    let stream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
    
    let recentWindow = winUtils.getMostRecentBrowserWindow();
    filePicker.init(recentWindow, _("options-page-export-rules"), nsIFilePicker.modeSave);
    filePicker.defaultExtension = "json";
    filePicker.defaultString = "redirectcontrol-rules.json";
    filePicker.appendFilters(nsIFilePicker.filterAll);
    
    if (filePicker.show() != nsIFilePicker.returnCancel)
    {
        let file = filePicker.file;
        if (!/\.json$/.test(file.leafName.toLowerCase()))
            file.leafName += ".json";
        if (file.exists())
            file.remove(true);
        file.create(file.NORMAL_FILE_TYPE, parseInt("0666", 8));
        stream.init(file, 0x02, 0x200, null);
    
        let patternItems = JSON.stringify(rules.getRules());
    
        stream.write(patternItems, patternItems.length)
    
        stream.close();
    }
}