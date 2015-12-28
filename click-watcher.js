const { windows } = require('sdk/window/utils');
const { observer } = require('sdk/windows/observer');

function ClickWatcher()
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
            
        window.gBrowser.addEventListener("click", handleClick, true);
    };
    handleWindowClosed = function(window)
    {
        if (!isBrowserWindow(window)) return;
        
        window.gBrowser.removeEventListener("click", handleClick, true);        
    };
    
    handleClick = function(event)
    {
        for (let listener of listeners)
        {
            listener(event);
        }
    };
};

exports.create = function()
{
    return new ClickWatcher();
};