let rules = [ ];
let sortOption =
{
    direction: "down",
    columns: [ "origin", "destination" ],
};

$("#head-origin").on("click", function(event)
{
    event.preventDefault();

    setSorting([ "origin", "destination" ]);
});
$("#head-destination").on("click", function(event)
{
    event.preventDefault();

    setSorting([ "destination", "origin" ]);
});
$("#button-add").on("click", function(event)
{
    event.preventDefault();

    addRule();
});

function addRule()
{
    let origin = $("#input-origin").val();
    let destination = $("#input-destination").val();

    self.port.emit("add-rule", { origin: origin, destination: destination });
}

function deleteRule(origin, destination)
{
    self.port.emit("delete-rule", { origin: origin, destination: destination });
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

function replaceNull(value)
{
    return (value) ? value : "(any)";
}

function updateRules()
{
    $(".rule").remove();

    sortRules();

    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++)
    {
        let rule = rules[ruleIndex];

        let cellOrigin = $("<td>" + escapeTags(replaceNull(rule.origin)) + "</td>");
        let cellDestination = $("<td>" + escapeTags(replaceNull(rule.destination)) + "</td>");
        let deleteButton = $("<td><span class=\"remove-button\" title=\"Remove Rule\" data-l10n-id-title=\"options-page-remove-rule\" /></td>")
                            .on("click", function() { deleteRule(rule.origin, rule.destination) });
        let ruleLine = $("<tr class=\"rule\" />")
                        .append(cellOrigin)
                        .append(cellDestination)
                        .append(deleteButton);

        $("#rules").append(ruleLine);
    }
}

self.port.on("set-rules", function(values)
{
    rules = [ ];

    for (let key in values)
    {
        rules.push(values[key]);
    }

    updateRules();
});
