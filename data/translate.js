function _(id, callback)
{
    self.port.once("translated-" + id, callback);
    self.port.emit("translate", id);
}

function translateText(root)
{
    root.find("*[data-l10n-id-text]").each(function()
    {
        let self = $(this);
        let id = self.attr("data-l10n-id-text");
        _(id, function(text)
        {
            if (self.text() != text)
            {
                self.text(text);
            }
        });
    });
}
function translateTitle(root)
{
    root.find("*[data-l10n-id-title]").each(function()
    {
        let self = $(this);
        let id = self.attr("data-l10n-id-title");
        _(id, function(text)
        {
            if (self.attr("title") != text)
            {
                self.attr("title", text);
            }
        });
    });
}

translateText($(":root"));
translateTitle($(":root"));

let observer = new window.MutationObserver(function(mutations)
{
    mutations.forEach(function(mutation)
    {
        if (mutation.type == "childList")
        {
            translateText($(mutation.addedNodes));
            translateTitle($(mutation.addedNodes));
        }
        else if (mutation.type == "attributes" && (mutation.attributeName == "data-l10n-id-text" || mutation.attributeName == "data-l10n-id-title"))
        {
            translateText($(mutation.target));
            translateTitle($(mutation.target));
        }
    });
});
observer.observe(document.body, { attributes: true, childList: true, subtree: true });