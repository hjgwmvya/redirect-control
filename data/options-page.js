let settings = [ ];
let rules = [ ];
let sortOption =
{
    direction: "down",
    columns: [ "source", "target" ],
};

$("#allow-same-domain").change(function(event)
 {
    changeSetting("allowSameDomain", $("#allow-same-domain").prop("checked"));
 });
$("#allow-same-base-domain").change(function(event)
{
    changeSetting("allowSameBaseDomain", $("#allow-same-base-domain").prop("checked"));
});
$("#ignore-subdomains").change(function(event)
{
    changeSetting("ignoreSubdomains", $("#ignore-subdomains").prop("checked"));
});
$("#allow-triggered-by-link-click").change(function(event)
{
     changeSetting("allowTriggeredByLinkClick", $("#allow-triggered-by-link-click").prop("checked"));
});
 
$("#head-source").on("click", function(event)
{
    event.preventDefault();

    setSorting([ "source", "target" ]);
});
$("#head-target").on("click", function(event)
{
    event.preventDefault();

    setSorting([ "target", "source" ]);
});
$("#button-add").on("click", function(event)
{
    event.preventDefault();

    addRule();
});

$("#import-rules").on("click", function(event)
{
    self.port.emit("import-rules");
});
$("#export-rules").on("click", function(event)
{
    self.port.emit("export-rules");
});

function changeSetting(name, value)
{
    self.port.emit("set-setting", { name: name, value: value });
}

function addRule()
{
    let source = $("#input-source").val();
    let target = $("#input-target").val();
    let regularExpression = $("#input-regular-expression").prop("checked");

    self.port.emit("add-rule", { source: source, target: target, regularExpression: regularExpression });
}

function deleteRule(rule)
{
    self.port.emit("delete-rule", rule);
}

function setSorting(columns)
{
    sortOption.direction = (sortOption.direction == "up") ? "down" : "up";
    sortOption.columns = columns;

    updateRules();
}

function sortRules()
{
    rules.sort(function(a, b)
    {
        let sortValue = 0;
        for (let columnIndex = 0; columnIndex < sortOption.columns.length; columnIndex++)
        {
            let column = sortOption.columns[columnIndex];
            if (a[column] == null && b[column] != null)
            {
                sortValue = -1;
                break;
            }

            if (a[column] != null && b[column] == null)
            {
                sortValue = 1;
                break;
            }
            
            if (a[column] < b[column])
            {
                sortValue = -1;
                break;
            }

            if (a[column] > b[column])
            {
                sortValue = 1;
                break;
            }
        }

        if (sortOption.direction == "up")
        {
            sortValue *= -1;
        }

        return sortValue;
    });
}

function escapeTags(unescaped)
{
    return unescaped.replace(/</, '&lt;').replace(/>/, '&gt;');
}

function updateSettings()
{
    $("#allow-same-domain").prop("checked", settings.allowSameDomain);
    $("#allow-same-base-domain").prop("checked", settings.allowSameBaseDomain);
    $("#ignore-subdomains").prop("checked", settings.ignoreSubdomains);
    $("#allow-triggered-by-link-click").prop("checked", settings.allowTriggeredByLinkClick);
}

function updateRules()
{
    $(".rule").remove();

    sortRules();

    for (let rule of rules)
    {
        const currentRule = rule;
    
        let cellSource = $("<td>" + escapeTags(rule.source) + "</td>");
        let cellTarget = $("<td>" + escapeTags(rule.target) + "</td>");
        let cellRegularExpression = $("<td><center><input type=\"checkbox\" disabled " + (rule.regularExpression ? "checked" : "") + " /><center></td>");
        let buttonDelete = $("<td><span class=\"remove-button\" title=\"Remove Rule\" data-l10n-id-title=\"options-page-remove-rule\" /></td>")
                            .on("click", function() { deleteRule(currentRule); });
        let rowRule = $("<tr class=\"rule\" />")
                        .append(cellSource)
                        .append(cellTarget)
                        .append(cellRegularExpression)
                        .append(buttonDelete);

        $("#rules").append(rowRule);
    }
}

self.port.on("set-settings", function(newSettings)
{
    settings = newSettings;

    updateSettings();
});

self.port.on("set-rules", function(newRules)
{
    rules = newRules;

    updateRules();
});
