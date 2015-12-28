const { windows } = require('sdk/window/utils');
const { observer } = require('sdk/windows/observer');

function ContextMenu()
{
    registered = false;
    listeners = [ ];
    
    this.register = function()
    {
        if (registered) return;
    
        registered = true;
        
        observer.on('open', handleWindowOpened);
        observer.on('close', handleWindowClosed);
        
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            handleWindowOpened(window);
        }
    };
    this.unregister = function()
    {
        if (!registered) return;
    
        registered = false;
        
        observer.off('open', handleWindowOpened);
        observer.off('close', handleWindowClosed);
        
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            handleWindowClosed(window);
        }
    };
    
    this.addListener = function(listener)
    {
        listeners.push(listener);
    };
        
    isBrowserWindow = function(window)
    {
        if (!window.document || !window.document.documentElement) return false;
            
        return (window.document.documentElement.getAttribute('windowtype') == "navigator:browser");
    };
        
    handleWindowOpened = function(window)
    {
        if (!isBrowserWindow(window)) return;
    
        let contextMenu = window.document.getElementById("contentAreaContextMenu");

        contextMenu.addEventListener("command", handleCommand, true);
    };
    handleWindowClosed = function(window)
    {
        if (!isBrowserWindow(window)) return;
    
        let contextMenu = window.document.getElementById("contentAreaContextMenu");
        
        contextMenu.removeEventListener("command", handleCommand, true);        
    };
    
    handleCommand = function(event)
    {
        if (event.sourceEvent)
        {
            event = event.sourceEvent;
        }
    
        for (let listener of listeners)
        {
            listener(event);
        }
    };
};

exports.create = function()
{
    return new ContextMenu();
};
