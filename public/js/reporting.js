/**
*   Reporting functions
*/
var runningQueries = 0;
var ALL_SEGMENT = '-1000';

var ReportGlobals = {
    theme: null,
    themes: {
        base: {
            successColor: '#1cb14f',
            warningColor: '#ffc309',
            infoColor: '#00aeef',
            dangerColor: 'rgba(228,30,66,.7)',
            reportColors: [
                {color: "#1cb14f", highlight: "#1cb14f"},
                {color: "#00aeef", highlight: "#00aeef"},
                {color: "rgba(248,172,89,0.8)", highlight: "rgba(248,172,89,1)"},
                {color: "rgba(172,148,198,0.8)", highlight: "rgba(172,148,198,1)"},
                {color: "#7ea7b5", highlight: "#475188"},
                {color: "rgba(26,179,128,0.8)", highlight: "rgba(26,179,148,1)"},
                {color: "rgba(41,41,41,0.7)", highlight: "rgba(41,41,41,.9)"},
                {color: "rgba(30,65,155,0.8)", highlight: "rgba(30,65,155,1)"},
                {color: "rgba(242,229,88,0.8)", highlight: "rgba(242,229,88,1)"},
                {color: "rgba(99,99,99,0.7)", highlight: "rgba(99,99,99,.9)"},
                {color: "rgba(99,98,166,0.7)", highlight: "rgba(99,98,166,.9)"},
                {color: "rgba(228,30,66,0.4)", highlight: "rgba(228,30,66,.7)"},
                {color: "rgba(28,132,198,0.5)", highlight: "rgba(28,132,198,0.8)"},
                {color: "rgba(26,179,148,0.5)", highlight: "rgba(26,179,148,0.8)"}
            ]
        },
        shopify: {
            successColor: 'rgba(118,192,68,1)',
            warningColor: '#ffc309',
            infoColor: '#607f8e',
            dangerColor: '#eb1762',
            reportColors: [
                {color: "rgba(118,192,68,0.8)", highlight: "rgba(118,192,68,1)"},
                {color: "#00aeef", highlight: "#00aeef"},
                {color: "rgba(248,172,89,0.8)", highlight: "rgba(248,172,89,1)"},
                {color: "rgba(172,148,198,0.8)", highlight: "rgba(172,148,198,1)"},
                {color: "#7ea7b5", highlight: "#475188"},
                {color: "rgba(26,179,128,0.8)", highlight: "rgba(26,179,148,1)"},
                {color: "rgba(41,41,41,0.7)", highlight: "rgba(41,41,41,.9)"},
                {color: "rgba(30,65,155,0.8)", highlight: "rgba(30,65,155,1)"},
                {color: "rgba(242,229,88,0.8)", highlight: "rgba(242,229,88,1)"},
                {color: "rgba(99,99,99,0.7)", highlight: "rgba(99,99,99,.9)"},
                {color: "rgba(99,98,166,0.7)", highlight: "rgba(99,98,166,.9)"},
                {color: "rgba(228,30,66,0.4)", highlight: "rgba(228,30,66,.7)"},
                {color: "rgba(28,132,198,0.5)", highlight: "rgba(28,132,198,0.8)"},
                {color: "rgba(26,179,148,0.5)", highlight: "rgba(26,179,148,0.8)"}
            ]
        }
    }
};

ReportGlobals.setTheme = function(theme) {
    ReportGlobals.theme = ReportGlobals.themes[theme];
};

ReportGlobals.setTheme('base');

function Report() {

    //  Options specific to the page calling the report, like the projectId, timezone, and HTML elements to target.  These
    //  are not persisted.
    this.pageOptions = {};

    //  static settings for the report, like renderView, ranges, intervals, etc.  These come from the report definition.
    this.settings = {
        title: null,
        renderView: null,
        intervals: null,
        ranges: null,
        limit: null,
        map: null,
        segmentation: null,
        entity: null            //  the data entity (like sessions, events, users or pages)
    };

    //  The report configuration options and the UI state (selected series, sort order, etc.).  This is what should be persisted on a push state call.
    this.state = {
        id: null,       //  the report id from the definition
        isLog: null,    //  if it's a log report, don't group results
        title: null,
        dateStart: null,
        dateEnd: null,
        dateLabel: Toolbar.dateLabel,
        dateInterval: null,
        attributes: null,
        having: null,
        group: null,
        sort: null,
        segments: null,
        filter: null,
        customSegments: null,
        customCount: null,
        tableOrder: null,
        plotKeys: null,
        pageLength: null,
        eventSteps: null,
        activeStep: null,
        hiddenSeries: null
    };

    this.dataTablesObject = null;
    this.currentType = null;
    this.nextClause = null;

    //  The data used to populate the table
    this.tableData = null;

    //  The data used to populate the chart - if there is no element grouping, this is the same as tableResult
    this.chartData = null;
    this.plotRows = [];

    this.getColors = function(i, column) {

        //  if grouping by an element, then use system colors to display metrics
        if (!this.snapshot() && this.state.group)
            return ReportGlobals.theme.reportColors[i % ReportGlobals.theme.reportColors.length];

        if (column && column.chartOptions && column.chartOptions.colors) {
            return column.chartOptions.colors;
        } else {
            return ReportGlobals.theme.reportColors[i % ReportGlobals.theme.reportColors.length];
        }
    };

    this.run = function(callback) {

        try {

            //  if report is going from snapshot to timeline, only plot the first key to prevent excessive lines
            if (this.currentType == 'snapshot' && !this.snapshot()) {

                this.state.hiddenSeries = this.state.hiddenSeries || {};
                var found = false;

                for (c = 0; c < this.tableData.columns.length; c++) {
                    var metric = this.tableData.columns[c];

                    if (metric.isMetric) {

                        if (!this.state.hiddenSeries[metric.baseName] && !found)
                            found = true;
                        else
                            this.state.hiddenSeries[metric.baseName] = true;
                    }
                }
            }

            this.currentType = this.snapshot() ? 'snapshot' : 'timeline';

            var that = this, tableQuery;

            if (!this.pageOptions.apiUrl)
                this.pageOptions.apiUrl = '/query';

            if (!this.state.segments)
                this.state.segments = '-1000';   //  default to all data

            runningQueries++;

            if (this.pageOptions.showLoading != false)
                Page.showLoading();

            //  If a hard-coded query is passed in, use it
            if (this.pageOptions.query)
                tableQuery = this.pageOptions.query;
            else
                tableQuery = this.getTableQuery();

            $.post(this.pageOptions.apiUrl, tableQuery, function(result) {
                runningQueries--;

                if (runningQueries <= 0)
                    Page.doneLoading();

                if (result.data) {

                    that.tableData = result.data;
                    that.chartData = result.data;

                    //  if grouping by an element, the chart will have a different query and result - get it now
                    if (!that.snapshot() && that.state.group && that.pageOptions.chartContainer) {

                        runningQueries++;

                        if (that.pageOptions.showLoading != false)
                            Page.showLoading();

                        $.post(that.pageOptions.apiUrl, that.getChartQuery(), function(result) {
                            runningQueries--;

                            if (runningQueries <= 0)
                                Page.doneLoading();

                            that.chartData = result.data;
                            that.consolidateDates(that.chartData);
                            that.render();

                            if (callback)
                                callback();
                        }, 'json').error(function(result) {
                            that.tableData = null;
                            that.chartData = null;

                            runningQueries--;
                            Page.doneLoading();

                            if (result && result.status == 404) {
                                Page.alert('Not Found', 'No data has been tracked yet for this project.', 'info');
                            } else if (result && (result.status == 419 || result.status == 401)) {
                                window.location = '/login';
                            } else if (result && result.responseJSON && result.responseJSON.message) {
                                Page.alert('Error', result.responseJSON.message, 'error');
                            } else {
                                Page.alert('Error', 'Internal server error', 'error');
                            }

                            if (callback)
                                callback(new Error('Internal error'));
                        });
                    } else {
                        that.render();

                        if (callback)
                            callback();
                    }
                } else {
                    that.tableData = null;
                    that.chartData = null;

                    Page.showMessage('Internal server error');

                    if (callback)
                        callback(new Error('Internal error'));
                }
            }, 'json').error(function(result) {
                that.tableData = null;
                that.chartData = null;

                runningQueries--;
                Page.doneLoading();

                if (result && result.status == 404) {
                    Page.alert('Not Found', 'No data has been tracked yet for this project.', 'info');
                } else if (result && (result.status == 419 || result.status == 401)) {
                    window.location = '/login';
                } else if (result && result.responseJSON && result.responseJSON.message) {
                    Page.alert('Error', result.responseJSON.message, 'error');
                } else {
                    Page.alert('Error', 'Internal server error', 'error');
                }

                if (callback)
                    callback(new Error('Internal error'));
            });
        } catch(err) {

            if (callback)
                callback(err);
        }
    }
}

Report.prototype.timeframe = function(label, dateStart, dateEnd) {
    switch (label) {
        case 'Today':
            return 'today';
        case 'Yesterday':
            return 'yesterday';
        case 'Last 24 Hours':
            return 'last24Hours';
        case 'Last 7 Days':
            return 'last7Days';
        case 'Last 30 Days':
            return 'last30Days';
        case 'This Month':
            return 'thisMonth';
        case 'Last Month':
            return 'lastMonth';
        case 'Last 60 Minutes':
            return 'last60Minutes';
        default:

            //  if timeframe not standard, look for a custom timeframe
            if (this.settings.ranges) {

                for (var r = 0; r < this.settings.ranges.length; r++) {
                    var range = this.settings.ranges[r];

                    if (typeof range == 'object') {
                        var key = Object.keys(range)[0];

                        if (key == label) {
                            return [ range[key][0], range[key][1] ];
                        }
                    }
                }
            }

            return [ dateStart, dateEnd ];
    }
};

Report.prototype.intervalAttribute = function(interval) {

    if (this.settings.intervals && this.settings.intervals.options) {
        var options = this.settings.intervals.options;

        if (options[interval])
            return options[interval];
        else if (this.settings.intervals.defaultOption && options[this.settings.intervals.defaultOption])
            return options[this.settings.intervals.defaultOption];
    }

    if (this.settings.intervals && this.settings.intervals.defaultAttribute)
        return this.settings.intervals.defaultAttribute;
};

Report.prototype.columnEnum = function(data) {
    var val = {};

    for (var c = 0; c < data.columns.length; c++) {
        val[data.columns[c].name] = data.columns[c];
        val[data.columns[c].name]['index'] = c;

        val[c] = data.columns[c];
    }

    return val;
};

Report.prototype.getBaseQuery = function() {
    var state = this.state;

    var query = {
        entity: this.settings.entity || this.state.view,     //  view is legacy
        projectId: this.state.projectId || this.pageOptions.projectId,  //  state can hardcode projectid
        attributes: state.attributes,
        timeframe: this.timeframe(state.dateLabel, state.dateStart, state.dateEnd)
    };

    if (state.eventSteps)
        query['eventSteps'] = state.eventSteps;

    if (state.sort)
        query['sort'] = state.sort;
    else
        query['sort'] = this.intervalAttribute(state.dateInterval);     //  default to sorting by time ranges if not grouping by element

    if (state.filter)
        query['filter'] = state.filter;

    if (state.having)
        query['having'] = state.having;

    if (this.nextClause) {
        query['nextClause'] = this.nextClause;
    }

    if (!state.isLog)
        query['group'] = this.intervalAttribute(state.dateInterval);

    var segments = [], segmentsArray = state.segments.split(',');

    for (var s = 0; s < segmentsArray.length; s++) {
        var segment = segmentsArray[s];

        if (segment.substr(0, 6) == 'custom') {
            segments.push({ name: state.customSegments[segment].text, query: state.customSegments[segment].query });
        } else {
            segments.push({ id: +segment });
        }
    }

    if (segments.length > 0)
        query.segments = segments;

    return query;
};

Report.prototype.download = function(format) {

    if (format == 'csv')
        window.location = '/download?format=' + format + '&query=' + encodeURIComponent(JSON.stringify(this.getTableQuery()));
    else
        window.location = '/download?' + window.location.search.substr(1) + '&format=' + format;
};

Report.prototype.getTableQuery = function() {
    var state = this.state;

    var query = this.getBaseQuery();

    if (state.isLog) {
        query.limit = 100;

        //  make sure coordinates are returned for map on log reports
        if (this.pageOptions.mapContainer || this.state.map) {

            if (query.attributes.indexOf('longitude') == -1)
                query.attributes += ',longitude';

            if (query.attributes.indexOf('latitude') == -1)
                query.attributes += ',latitude';
        }
    }

    if (!state.isLog && state.hasOwnProperty('group')) {
        query.group = state.group;

        query['sort'] = {};

        if (state.sort)
            query['sort'] = state.sort;
        else
            query['sort'][state.attributes.split(',')[0]] = -1;    }

    return query;
};

Report.prototype.getChartQuery = function() {
    var state = this.state, query = this.getBaseQuery(), pk, filter;

    query.group = this.intervalAttribute(state.dateInterval) + ',' + state.group;
    query.sort = query.group;

    if (state.group) {

        var $or = [], $in = [], plotKeys = state.plotKeys;

        if (!plotKeys) {
            plotKeys = this.getPlotKeys([0, 1, 2, 3]);    //  default to top 4 elements
        }

        //  for one element grouping, make a more efficient query using $in instead of $or
        if (state.group.split(',').length == 1) {

            for (pk = 0; pk < plotKeys.length; pk++) {

                if (typeof plotKeys[pk][state.group] != 'undefined')
                    $in.push(plotKeys[pk][state.group]);
            }

            filter = {};
            filter[state.group] = { $in: $in };
        } else {

            for (pk = 0; pk < plotKeys.length; pk++) {

                if (typeof plotKeys[pk] != 'undefined')
                    $or.push(plotKeys[pk]);
            }

            filter = { $or: $or };
        }

        //  if a filter has been created for plot keys, merge it with the existing filter, if it exists
        if (filter) {
            query.filterIncludesPlotKeys = true;

            if (query.filter) {
                query.filter = { $and: [query.filter, filter ]}
            } else {
                query.filter = filter;
            }
        }
    }

    return query;
};

//  For a report with elements, consolidate the query on dates
Report.prototype.consolidateDates = function(data) {

    if (data.rows && data.rows.length > 0) {

        var columnEnum = this.columnEnum(data);
        var newRows = [], groupBys = this.groupByArray(data), key;
        var time = data.rows[0][groupBys[0]];
        var newRow = {}, newColumns = {};
        newRow[[groupBys[0]]] = data.rows[0][groupBys[0]];

        //  Build new columns
        newColumns[groupBys[0]] = Utils.clone(columnEnum[groupBys[0]]);

        //  Consolidate rows
        for (var r = 0; r < data.rows.length; r++) {
            var row = data.rows[r];

            if (time != row[groupBys[0]]) {
                newRows.push(newRow);

                newRow = {};
                newRow[[groupBys[0]]] = data.rows[r][groupBys[0]];
                time = row[groupBys[0]];
            }

            var prefix = [];

            for (var g = 1; g < groupBys.length; g++)
                prefix.push(this.dotValue(row, groupBys[g]));

            prefix = prefix.join('-');

            for (key in row) {

                if (row.hasOwnProperty(key) && groupBys.indexOf(key) == -1 && columnEnum[key]) {
                    var newColumn = Utils.clone(columnEnum[key]);
                    newColumn.baseName = newColumn.name;
                    newColumn.name = prefix + '-' + key;
                    newColumn.title = prefix + ': ' + newColumn.title;
                    delete newColumn.total;
                    delete newColumn.totalBy;

                    newColumns[newColumn.name] = newColumn;
                    newRow[newColumn.name] = row[key];
                }
            }
        }
        newRows.push(newRow);

        //  Rebuild columns for result
        data.columns = [];

        for (key in newColumns) {
            if (newColumns.hasOwnProperty(key)) {
                data.columns.push(newColumns[key]);
            }
        }

        data.query.group = groupBys[0];     //  restrict grouping to date
        data.rows = newRows;
    }
};

Report.dataTypes = [];
Report.dataTypes[Report.dataTypes["string"] = 0] = "string";
Report.dataTypes[Report.dataTypes["integer"] = 1] = "integer";
Report.dataTypes[Report.dataTypes["numeric"] = 2] = "numeric";
Report.dataTypes[Report.dataTypes["currency"] = 3] = "currency";
Report.dataTypes[Report.dataTypes["percent"] = 4] = "percent";
Report.dataTypes[Report.dataTypes["date"] = 5] = "date";
Report.dataTypes[Report.dataTypes["object"] = 6] = "object";
Report.dataTypes[Report.dataTypes["boolean"] = 7] = "boolean";
Report.dataTypes[Report.dataTypes["array"] = 8] = "array";

Report.prototype.render = function() {

    if (this.pageOptions.chartContainer)
        this.renderChart();

    if (this.pageOptions.tableContainer)
        this.renderTable();

    if (this.pageOptions.mapContainer)
        this.renderMap();

    //  clear nextClause so it doesn't become part of every query
    this.nextClause = null;

    Page.clearMessage();
};

//  Format the query's group by into an array
Report.prototype.groupByArray = function (data) {

    var groupBy = data.query.group || [];

    if (!Utils.isArray(groupBy))
        groupBy = groupBy.split(',');

    for (g = 0; g < groupBy.length; g++)
        groupBy[g] = groupBy[g].trim();

    return groupBy;
};

Report.prototype.snapshot = function () {

    var start = this.state.dateStart, end = this.state.dateEnd;

    if ((this.state.dateLabel == 'This Month' || this.state.dateLabel == 'Last Month') && this.state.dateInterval == 'Monthly')
        return true;

    if ((this.state.dateLabel == 'Today' || this.state.dateLabel == 'Yesterday') && this.state.dateInterval == 'Daily')
        return true;

    if (this.state.dateLabel.substr(0, 4) == 'Last' || this.state.dateLabel.substr(0, 4) == 'This')
        return false;

    if (start) {
        if (start == end && (this.state.dateInterval == 'Daily' || this.state.dateInterval == 'Weekly' || this.state.dateInterval == 'Monthly'))
            return true;
    } else {
        var tframe = this.timeframe(this.state.dateLabel, this.state.dateStart, this.state.dateEnd);

        if (tframe[0] == tframe[1] && (this.state.dateInterval == 'Daily' || this.state.dateInterval == 'Weekly' || this.state.dateInterval == 'Monthly'))
            return true;
    }

    return false;
};

Report.prototype.renderChart = function () {

    if (this.chartData.rows.length > 0) {

        if (this.snapshot())
            this.renderSnapshot();
        else
            this.renderTimeline();
    } else {
        $('#' + this.pageOptions.chartContainer).html('');
    }
};

Report.prototype.renderTimeline = function () {

    var data = this.chartData, i, c, g, r, column, query = data.query, that = this, chartMetrics = [], state = this.state, colors = [];
    var datasets = [], groupBy = this.groupByArray(data), colorIndex = 0, chartData = [];
    var columnEnum = this.columnEnum(data);

    for (c = 0; c < data.columns.length; c++) {

        if (!data.columns[c].baseName)
            data.columns[c].baseName = data.columns[c].name;

        //  Hide 'All Data' column if user removed it from segments field
        if (this.visibleColumn(data.columns[c])) {
            if (data.columns[c].isMetric)
                chartMetrics.push({ name: data.columns[c].name, baseName: data.columns[c].baseName, max: data.columns[c].max, yaxis: null });
        }
    }

    //  Figure out axis groupings by metric max values
    var yaxes = [], ax, positionRight = false;

    //  Group max values of the same magnitude into the same axis
    for (c = 0; c < chartMetrics.length; c++) {

        if (!state.hiddenSeries || !state.hiddenSeries[chartMetrics[c].baseName]) {

            for (i = 0; i < yaxes.length; i++) {

                if (chartMetrics[c].max == 0 || (yaxes[i].dataMax / chartMetrics[c].max < 20 && yaxes[i].dataMax / chartMetrics[c].max > .05)) {
                    chartMetrics[c].yaxis = i + 1;
                    break;
                }
            }

            if (!chartMetrics[c].yaxis) {
                ax = { min: 0, dataMax: chartMetrics[c].max };

                if (positionRight)
                    ax.position = 'right';

                positionRight = !positionRight;

                yaxes.push(ax);
                chartMetrics[c].yaxis = yaxes.length;
            }
        }
    }

    if (chartMetrics.length == 0) {
        yaxes = [ { min: 0 } ],
        datasets = [
            {
                label: "No data for selected metric(s)",
                data: []
            }
        ]
    }

    for (c = 0; c < chartMetrics.length; c++) {
        var metric = chartMetrics[c];

        if (!this.state.hiddenSeries || !this.state.hiddenSeries[metric.baseName]) {
            column = columnEnum[metric.name];

            if (column) {

                colors.push(this.getColors(colorIndex, column).color);

                var dataset = {
                    label: column.title,
                    yaxis: metric.yaxis,
                    data: []
                };

                if (column.chartOptions && column.chartOptions.draw) {
                    if (column.chartOptions.draw.points)
                        dataset.points = column.chartOptions.draw.points;

                    if (column.chartOptions.draw.lines)
                        dataset.lines = column.chartOptions.draw.lines;

                    if (column.chartOptions.draw.bars)
                        dataset.bars = column.chartOptions.draw.bars;
                } else {
                    dataset.points = {show: true};
                    dataset.lines = {show: true};
                }

                for (i = 0; i < data.rows.length; i++) {

                    switch (column.chartOptions ? column.chartOptions.gapType : null) {
                        case 'open':
                            //  if data is missing, create open gap
                            dataset.data.push([i, data.rows[i][column.name]]);
                            break;
                        case 'openZeroes':
                            //  if data is missing or zero, create open gap
                            if (data.rows[i][column.name] == 0)
                                dataset.data.push([i, null]);
                            else
                                dataset.data.push([i, data.rows[i][column.name]]);
                            break;
                        case 'drawOver':
                            //  timeline draws over gaps
                            if (data.rows[i].hasOwnProperty(column.name))
                                dataset.data.push([i, data.rows[i][column.name]]);
                            break;
                        default:    //  zeroFill is default
                            dataset.data.push([i, data.rows[i][column.name] || 0]);
                    }
                }
                datasets.push(dataset);
            }
        }
        colorIndex++;
    }

    var legendOptions = {
        show: false
    };

    //  show the legend if the element is specified in the pageOptions and it is a grouped report
    if (this.pageOptions.legendContainer)
        $('#' + this.pageOptions.legendContainer).html('');

    if (this.pageOptions.legendContainer && (!this.pageOptions.tableContainer || state.group))
        legendOptions = {
            show: true,
            container: '#' + this.pageOptions.legendContainer, noColumns: 6
        };

    var plotOptions, html = '<div id="' + this.pageOptions.chartContainer + '-container" class="flot-container">';

    html += '<div id="' + this.pageOptions.chartContainer + '-0" class="flot-placeholder"></div></div><div id="results-legend" style="width:100%;margin-top:10px"></div>';

    plotOptions = {
        yaxes: yaxes,
        yaxis: {
            tickFormatter: function (val, axis) {
                return val.toLocaleString();
            }
        },
        legend: legendOptions,
        colors: colors,
        grid: {
            clickable: true,
            tickColor: this.pageOptions.tickColor ? this.pageOptions.tickColor : "#eee",
            borderWidth: 0,
            hoverable: true //IMPORTANT! this is needed for tooltip to work
        },
        bars: {
            align: "center",
            barWidth: 0.33
        },
        xaxis: {
            minTickSize: 1,
            tickFormatter: function (val, axis) {

                if (data.rows[val]) {

                    var label = [];

                    for (g = 0; g < groupBy.length; g++) {
                        if (that.state.dateInterval == 'Hourly' && columnEnum[groupBy[g]].dataType == 'date')
                            label.push(Report.formatValue(data.rows[val][groupBy[g]], columnEnum[groupBy[g]].dataType, 'M-DD h A'));
                        else if (that.state.dateInterval == 'Minute' && columnEnum[groupBy[g]].dataType == 'date')
                            label.push(Report.formatValue(data.rows[val][groupBy[g]], columnEnum[groupBy[g]].dataType, 'h:mm A'));
                        else
                            label.push(Report.formatValue(data.rows[val][groupBy[g]], columnEnum[groupBy[g]].dataType, columnEnum[groupBy[g]].format));
                    }

                    return label.join(' / ');
                } else {
                    return '';
                }
            }
        },
        selection: {
            mode: "x"
        }
    };

    $('#' + this.pageOptions.chartContainer).html(html);

    var plot = $.plot(
        $('#' + this.pageOptions.chartContainer + '-0'),
        datasets,
        plotOptions
    );

    $('#' + this.pageOptions.chartContainer + '-container').resizable();

    $('#' + this.pageOptions.chartContainer + '-0').bind("plotselected", function (event, ranges) {

        // do the zooming
        $.each(plot.getXAxes(), function(_, axis) {
            var opts = axis.options;
            opts.min = ranges.xaxis.from;
            opts.max = ranges.xaxis.to;
        });
        plot.setupGrid();
        plot.draw();
        plot.clearSelection();
    });

    $("<div id='chart-tooltip' class='chart-tooltip'></div>").appendTo("body");

    $('#' + this.pageOptions.chartContainer + '-0').unbind("plothover");
    $('#' + this.pageOptions.chartContainer + '-0').unbind("mouseout");

    $('#' + this.pageOptions.chartContainer + '-0').bind("mouseout", function (event, pos, item) {
        $("#chart-tooltip").hide();
    });

    $('#' + this.pageOptions.chartContainer + '-0').bind("plothover", function (event, pos, item) {

        if (item) {
            var tooltip = '<b>';

            for (g = 0; g < groupBy.length; g++)
                tooltip += data.rows[item.datapoint[0]][groupBy[g]] + ' / ';

            tooltip = tooltip.substr(0, tooltip.length - 3) + '</b><table>';
            colorIndex = 0;

            for (c = 0; c < chartMetrics.length; c++) {

                if (!state.hiddenSeries || !state.hiddenSeries[chartMetrics[c].baseName]) {

                    column = columnEnum[chartMetrics[c].name];
                    var total = column.total, pct = '';

                    if (column.hasOwnProperty('totalBy') && column.totalBy == 'sum') {

                        if (total) {
                            if (data.rows[item.datapoint[0]].hasOwnProperty(chartMetrics[c].name))
                                pct = ' (' + (data.rows[item.datapoint[0]][chartMetrics[c].name] / total * 100).toFixed(2) + '%)';
                            else
                                pct = ' (0.00%)';
                        }
                    }

                    tooltip += '<tr><td><span class="fa fa-square" style="color:' + that.getColors(colorIndex, column).highlight + '"></span>&nbsp; ' +
                        column.title + ':&nbsp; </td><td style="text-align:right">' +
                        (Report.formatValue(data.rows[item.datapoint[0]][chartMetrics[c].name], column.dataType, column.format) || '0') + pct + '</td></tr>';
                }
                colorIndex++;
            }

            $("#chart-tooltip").html(tooltip + '</table>')
                .css({
                    top: item.pageY + 5,
                    left: item.pageX - 55 - (item.dataIndex + 1 > data.rows.length * .9 ? 100 * (item.dataIndex / data.rows.length) : 0)
                })
                .show();
        } else {
            $("#chart-tooltip").hide();
        }
    });
};

Report.prototype.renderSnapshot = function () {
    var i, g, data = this.tableData, chartMetrics = [], c, numCharts = 0, colors = [], state = this.state, datasets = [], groupBy = this.groupByArray(data);
    var plotOptions = [], chartType, maxCharts = 4;

    if (this.pageOptions.style == 'dashboard')
        maxCharts = 2;

    for (c = 0; c < data.columns.length && numCharts < maxCharts; c++) {

        if (!data.columns[c].baseName)
            data.columns[c].baseName = data.columns[c].name;

        //  Hide 'All Data' column if user removed if from segments field
        if (this.visibleColumn(data.columns[c])) {

            if (!state.hiddenSeries || !state.hiddenSeries[data.columns[c].baseName]) {

                if (data.columns[c].isMetric) {
                    numCharts++;
                    chartMetrics.push(data.columns[c]);
                }
            }
        }
    }

    for (c = 0; c < ReportGlobals.theme.reportColors.length; c++)
        colors.push(this.getColors(c).color);

    var colSize = 12 / numCharts;
    var html = '<div class="row white-bg">';
    var barColorIndex = 0;

    for (c = 0; c < chartMetrics.length; c++) {
        var metric = chartMetrics[c];

        if (!this.state.hiddenSeries || !this.state.hiddenSeries[metric.baseName]) {
            html += '<div class="col-xs-12 col-sm-12 col-md-12 col-lg-' + colSize + '"><h2 class="text-center">' + metric.title + '</h2>' +
                '<div class="flot-container flot-container-pie"><div id="' + this.pageOptions.chartContainer + '-' + c + '" class="flot-placeholder"></div></div>' +
                '</div>';

            chartType = metric.totalBy == 'sum' ? 'pie' : 'bar';
            var maxPoints = metric.totalBy == 'sum' ? 5 : 5;

            var dataset = [], ticks = [], subTotal = 0;

            for (i = 0; i < data.rows.length && i < maxPoints; i++) {

                var label = '', value = data.rows[i][metric.name] || 0;

                for (g = 0; g < groupBy.length; g++)
                    label += this.dotValue(data.rows[i], groupBy[g]) + ' / ';

                label = label.substr(0, label.length - 3);
                subTotal += value;

                if (label.length > 35)
                    label = label.substr(0, 32) + '...';

                if (chartType == 'pie') {

                    if (value != 0) {
                        dataset.push({ label: label, data: value });
                    }
                } else {
                    var index = data.rows.length - i - 1, barColor = this.getColors(0, metric).color;
                    ticks.push([index, label]);

                    //  color score bars
                    if (metric.name == 'score') {

                        if (value <= 100)
                            barColor = 'red';
                        else if (value <= 300)
                            barColor = '#f0ed00';
                    }

                    dataset.push({ label: label, color: barColor, data: [[ value, index ]] });
                }
            }

            if (chartType == 'bar') {
                barColorIndex++;
            }

            //  if remaining unplotted data
            if (metric.total > subTotal && chartType == 'pie')
                dataset.push( { label: 'Other', data: metric.total - subTotal });

            //  if no data
            if (metric.total == 0 && chartType == 'pie')
                dataset.push( { label: 'No data', data: 1, color: '#ddd' });

            datasets.push(dataset);

            if (chartType == 'pie') {

                plotOptions.push({
                    legend: {
                        show: true,
                        labelFormatter: function (label, series) {

                            if (label == 'No data')
                                return 'No data';

                            return '<table><tr>' +
                                '<td style="width:29px;text-align:right;font-size:13px;padding:2px">' + Math.round(series.percent) + '%</td>' +
                                '<td style="text-align:right;font-size:13px;padding:2px;padding-left:5px">' + label + '</td>' +
                                '</tr></table>';
                        }
                    },
                    colors: colors,
                    grid: {
                        hoverable: true
                    },
                    series: {
                        pie: {
                            innerRadius: 0.7,
                            radius: .95,
                            show: true
                        }
                    }
                });
            } else {

                plotOptions.push({
                    legend: {
                        show: false
                    },
                    xaxis: {
                        min: 0,
                        show: true
                    },
                    yaxis: {
                        ticks: ticks,
                        axisLabelFontSizePixels: 13,
                        show: true,
                        tickLength: 0
                    },
                    grid: {
                        hoverable: true,
                        borderWidth: 1,
                        borderColor: '#aaa'
                    },
                    series: {
                        bars: {
                            show: true
                        }
                    },
                    bars: {
                        align: "center",
                        horizontal: true,
                        barWidth: .5,
                        lineWidth: 1
                    }
                });
            }
        }
    }

    html += '</div>';

    $('#' + this.pageOptions.chartContainer).html(html);
    $("<div id='chart-tooltip' class='chart-tooltip'></div>").appendTo("body");

    for (var plotNum = 0; plotNum < chartMetrics.length; plotNum++) {

        var plot = $.plot(
            $('#' + this.pageOptions.chartContainer + '-' + plotNum),
            datasets[plotNum],
            plotOptions[plotNum]
        );

        $('#' + this.pageOptions.chartContainer + '-' + plotNum).unbind("plothover");
        $('#' + this.pageOptions.chartContainer + '-' + plotNum).unbind("mouseout");

        $('#' + this.pageOptions.chartContainer + '-' + plotNum).bind("mouseout", function (event, pos, item) {
            $("#chart-tooltip").hide();
        });

        $('#' + this.pageOptions.chartContainer + '-' + plotNum).bind("plothover", function (event, pos, item) {

            if (item) {
                var tooltip;

                if (item.series.pie && item.series.pie.show) {        //  if pie
                    tooltip = item.series.label;

                    if (tooltip != 'No data') {
                        tooltip +=  ': ' + item.series.data[0][1];

                        if (item.series.hasOwnProperty('percent'))
                            tooltip += ' (' + Math.round(item.series.percent) + '%)';
                    }
                } else {                        //  bar

                    tooltip = item.series.yaxis.ticks[item.seriesIndex].label + ': ' + item.datapoint[0];
                }

                $("#chart-tooltip").html(tooltip)
                    .css({
                        top: pos.pageY + 5,
                        left: pos.pageX - 55
                    })
                    .show();
            } else {
                $("#chart-tooltip").hide();
            }
        });
    }
};

//  Generic formatting for table cells.  These can be overridden on a column by column basis using the 'formatters' object.
Report.prototype.configureColumn = function(newCol, column) {
    var reportData = this.tableData, that = this;

    switch (Report.dataTypes[column.dataType]) {
        case Report.dataTypes.percent:
        case Report.dataTypes.integer:
        case Report.dataTypes.numeric:
        case Report.dataTypes.currency:
            newCol['className'] = 'dt-body-right';
    }

    //  See if there is a formatter for this column.  If so, use it, otherwise do generic formatting.
    if (typeof this.formatters[column.name] == 'function') {

        newCol.render = function(data, type, row) {
            return that.formatters[column.name](data, type, row);
        };

        return;
    }

    switch (Report.dataTypes[column.dataType]) {

        case Report.dataTypes.string:
            newCol.render = function(data, type, row) {

                if (data && data.length > 100)
                    return data.substr(0, 97) + '<a href="#" onclick="return false" title="' + data + '">...</a>';
                else
                    return data;
            };
            break;
        case Report.dataTypes.array:
        case Report.dataTypes.object:
            newCol.render = function(data, type, row) {

                if (typeof data == 'string' || typeof data == 'number')
                    return data;
                else
                    return '<pre>' + (YAML ? YAML.stringify(data) : JSON.stringify(data, null, 4)) + '</pre>';
            };
            break;
        case Report.dataTypes.percent:
            newCol.render = function(data, type, row) {
                return Report.formatValue(data, Report.dataTypes.percent, column.format);
            };
            break;
        case Report.dataTypes.integer:
        case Report.dataTypes.numeric:
        case Report.dataTypes.currency:
            newCol.render = function(data, type, row, meta) {
                var colNo = meta.col - (that.plotKeysEnabled() ? 1 : 0);

                data = data || 0;

                if (colNo < reportData.columns.length) {

                    if (reportData.columns[colNo].hasOwnProperty('totalBy') && reportData.columns[colNo].totalBy == 'sum') {
                        var total = reportData.columns[colNo].total;

                        if (total)
                            //  the hidden span is for sorting formatted cells
                            return '<span style="display:none">' + ('0000000000000' + data).slice(-13) + '</span>' + data.toLocaleString() +
                                '<div style="display:inline-block; font-size:.825em;font-weight:500;min-width:47px !important">&nbsp; (' + (data / total * 100).toFixed(2) + '%)</div>';
                        else
                            return Report.formatValue(data, Report.dataTypes[column.dataType], column.format);
                    } else {
                        return Report.formatValue(data, Report.dataTypes[column.dataType], column.format);
                    }
                }
                return data;
            };
            break;
        case Report.dataTypes.date:

            newCol.render = function(data, type, row) {

                //  this is for formatting the value used for sorting
                if (type != 'display' && type != 'filter') {
                    return new Date(data).getTime() ;
                }

                return Report.formatValue(data, Report.dataTypes.date, column.format);
            };
            break;
    }
};

Report.prototype.visibleColumn = function (column) {
    if (column.name == 'longitude' || column.name == 'latitude')
        return false;

    return (this.state.segments && this.state.segments.split(',').indexOf(ALL_SEGMENT) > -1) || !column.isMetric || column.fromSegment;
};

Report.prototype.plotKeysEnabled = function () {
    return !this.snapshot() && this.pageOptions.style != 'dashboard' && this.state.group && this.pageOptions.chartContainer;
};

Report.prototype.renderMap = function () {

    var data = this.tableData, that = this, rows = data.rows, columns = data.columns;
    var markers = [];

    for (r = 0; r < rows.length; r++) {

        var row = rows[r], tooltip = '<table class="map-tooltip">';

        for (var c = 0; c < columns.length; c++) {

            if (columns[c]['name'] != 'longitude' && columns[c]['name'] != 'latitude') {
                tooltip += '<tr><td>' + columns[c]['title'] + '</td><td>';

                if (this.formatters && typeof this.formatters[columns[c]['name']] == 'function')
                    tooltip += this.formatters[columns[c]['name']](this.dotValue(row, columns[c]['name']));
                else
                    tooltip += Report.formatValue(this.dotValue(row, columns[c]['name']), columns[c].dataType, columns[c].format);

                tooltip += '</td></tr>';
            }
        }
        tooltip += '</table>';

        if (row.longitude && row.latitude)
            markers.push({name: 'point', latLng: [row.latitude, row.longitude], tooltip: tooltip });
    }

    if (this.mapObject)
        this.mapObject.remove();

    $('#' + this.pageOptions.mapContainer).vectorMap({
        map: 'world_mill',
        markers: markers,
        markerStyle: {
            initial: {
                image: '/images/marker.png'
            }
        },
        backgroundColor: 'none',
        regionStyle: {
            initial: {
                fill: '#1cb14f',
                "fill-opacity": 1,
                stroke: 'none',
                "stroke-width": 0,
                "stroke-opacity": 1
            }
        },
        onMarkerTipShow: function(e, el, code){
            el.html(markers[code].tooltip);
            el.css('z-index', 10000);
        }
    });

    this.mapObject = $('#' + this.pageOptions.mapContainer).vectorMap('get', 'mapObject');
};

Report.prototype.renderTable = function () {

    var data = this.tableData, that = this, rows = data.rows, columns = data.columns;
    var g, i, e, r, s, o, newRow, pass, found, key, state = this.state;
    var tableId = this.pageOptions.tableContainer + '-table';
    var columnEnum = this.columnEnum(data);

    //  wipe out existing dataTables object if it already exists
    if (this.dataTablesObject) {
        this.dataTablesObject.DataTable().destroy();
        $('#' + tableId).empty();
    }

    $('#' + this.pageOptions.tableContainer).html('<table id="' + tableId + '" class="table table-striped table-bordered table-hover" style="width:100%; margin:0">' +
        '</table>');

    var attributes = Utils.isArray(data.query.attributes) ? data.query.attributes : data.query.attributes.split(',');
    var order = [], tableRows = [], tableCols = [], colorIndex = 0;

    var numVisibleCols = 0;

    //  plot refresh cell definition
    if (this.plotKeysEnabled()) {
        tableCols.push({
            title: '<span class="fa fa-refresh" style="font-size:1.3em; cursor:pointer" onclick="runQuery(); return false;"></span>',
            width: '18px',
            searchable: false,
            orderable: false,
            sClass: 'hidden-print'
        });
    }

    for (e = 0; e < columns.length; e++) {

        var data_color, col = columns[e];

        //  Hide 'All Data' column if user removed if from segments field
        if (this.visibleColumn(col)) {
            numVisibleCols++;

            var newCol = {
                title: '<span title="' + col.description + '">' + col.title + '</span>'
            };

            //  Make metric columns toggle-able (unless grouping)
            if (this.pageOptions.style != 'dashboard') {

                if (col.isMetric) {

                    if (state.group)
                        data_color = '#aaa';
                    else
                        data_color = this.getColors(colorIndex++, col).color;

                    var icon = this.state.hiddenSeries && this.state.hiddenSeries[col.name] ? 'fa-square-o' : 'fa-check-square';
                    var stateColor = this.state.hiddenSeries && this.state.hiddenSeries[col.name] ? '#888' : data_color;

                    if (this.pageOptions.chartContainer)
                        newCol.title = '<span id="column-toggle-' + this.pageOptions.tableContainer + '-' + col.name + '" data-color="' + data_color + '" data-column="' + col.name + '" ' +
                            'title="Toggle chart display" class="hidden-print column-toggle fa ' + icon + '" style="width:18px; position:relative; top:1px; font-size:1.3em; color:' +
                            stateColor + '"></span> ' + newCol.title;
                }
            }

            if (col.hasOwnProperty('total')) {
                var formattedTotal;

                if (this.formatters && typeof this.formatters[col.name] == 'function')
                    formattedTotal = this.formatters[col.name](col.total);
                else
                    formattedTotal = Report.formatValue(col.total, col.dataType, col.format);

                newCol.title += ' <br><div style="font-weight:500;font-size:1.4em;padding-top:3px">' + formattedTotal;

                //  If this is from a segment, add the percentage to the header
                if (col.baseColumnName) {

                    var baseCol = columnEnum[col.baseColumnName];

                    if (baseCol.total && baseCol.totalBy == 'sum') {
                        newCol.title += '<div style="display:inline-block; font-size:.7em;font-weight:500;min-width:47px !important">&nbsp; (' +
                            (col.total / baseCol.total * 100).toFixed(2) + '% of ' + baseCol.title + ')</div>';
                    }
                } else if (col.basis && col.totalBy == 'sum' && col.basis != col.total) {

                    //  If this has a basis total, show it
                    newCol.title += '<div style="display:inline-block; font-size:.7em;font-weight:500;min-width:47px !important">&nbsp; (';

                    if (col.basisRelationship == 'ratio')
                        newCol.title += (col.total / col.basis).toFixed(2) + ' per ' + col.basisColumnTitle + ')</div>';
                    else
                        newCol.title += (col.total / col.basis * 100).toFixed(2) + '% of ' + col.basisColumnTitle + ')</div>';

                }

                newCol.title += '</div>';
            }
            this.configureColumn(newCol, col);

            tableCols.push(newCol);

            //  if the ordering was not part of the state, check for sorting on the query and use that
            if (order.length == 0) {

                for (key in data.query.sort) {

                    if (data.query.sort.hasOwnProperty(key)) {

                        if (key == col.name)
                            order.push([e + (this.plotKeysEnabled() ? 1 : 0), data.query.sort[key] == -1 ? "desc" : "asc"]);
                    }
                }
            }
        }
    }

    //  make sure ordering column exists
    if (state.tableOrder && state.tableOrder.length) {

        for (var t = 0; t < state.tableOrder.length; t++) {

            if (state.tableOrder[t] > numVisibleCols) {
                delete state.tableOrder;        //  ordering is off table, so kill it
                break;
            }
        }
    }

    if (state.tableOrder)
        order = Utils.clone(state.tableOrder);

    //  Add rows to output
    for (r = 0; r < rows.length; r++) {
        newRow = [];

        //  add plot key selection checkbox
        if (this.plotKeysEnabled()) {

            var rowIcon = 'fa-square-o', rowColor = '#888';

            //  See if row should be marked as plotted
            if (state.plotKeys) {

                for (var pk = 0; pk < state.plotKeys.length; pk++) {

                    if (Utils.isEqual(this.getKey(r), state.plotKeys[pk])) {
                        rowIcon = 'fa-check-square';
                        rowColor = '#1cb14f';

                        if (this.plotRows.indexOf(r) == -1)
                            this.plotRows.push(r);
                    }
                }
            }

            newRow.push('<span id="row-toggle-' + r + '" data-row="' + r + '" ' +
                'title="Toggle chart display" class="row-toggle fa ' + rowIcon + '" style="width:18px; position:relative;top:1px;left:2px;font-size:1.3em;color:' + rowColor + '"></span>');
        }

        for (e = 0; e < columns.length; e++) {

            if (this.visibleColumn(columns[e])) {
                if (!this.propertyExists(rows[r], columns[e].name)) {

                    if (!columns[e].isMetric && columns[e].dataType != 'numeric' && columns[e].dataType != 'integer' && columns[e].dataType != 'currency') {
                        newRow.push('');
                    } else {
                        newRow.push(0);
                    }
                } else {
                    newRow.push(this.dotValue(rows[r], columns[e].name));
                }
            }
        }
        tableRows.push(newRow);
    }

    if (!order)
        order = [[this.plotKeysEnabled() ? 2 : 1, 'asc']];

    //  check if any ordering is off table, since it causes an exception
    for (i = 0; i < order.length; i++) {

        if (order[i][0] >= tableCols.length) {
            order = [];
            break;
        }
    }

    $('#' + this.pageOptions.tableContainer + '-container').css('visibility', 'visible');

    var dom = 'lfrtip';

    if (this.pageOptions.style == 'dashboard') {
        dom = 't';
        state.pageLength = 100;
    }

    this.dataTablesObject = $('#' + tableId).dataTable({
        order: order,
        data: tableRows,
        columns: tableCols,
        lengthMenu: [ 10, 25, 50, 100, 1000 ],
        pageLength: state.pageLength || 10,
        dom: dom,
        responsive: true,

        //  hook into app-level create row
        createdRow: function(row, data, dataIndex) {
            if (typeof that.createdRow == 'function') {
                that.createdRow(row, data, dataIndex, that.tableData);
            }
        }
    }).on('order.dt', function () {
        that.state.tableOrder = Utils.clone($('#' + tableId).DataTable().order());

        if (typeof that.pageOptions.onStateChange == 'function')
            that.pageOptions.onStateChange();
    }).on('draw.dt', function () {
        that.setupRowToggles();
    }).on('length.dt', function (e, settings, len) {
        that.state.pageLength = len;

        if (typeof that.pageOptions.onStateChange == 'function')
            that.pageOptions.onStateChange();
    });

    this.setupRowToggles();

    //  unbind click handlers
    $('.column-toggle').unbind('click');

    //  add toggle event handlers after creating dataTable
    $('.column-toggle').click(function(e) {
        e.preventDefault();
        e.stopPropagation();

        //  set flag to show/hide series
        var colName = e.target.dataset.column;

        if (state.hiddenSeries && state.hiddenSeries[colName]) {
            delete state.hiddenSeries[colName];
            $('#' + e.target.id).removeClass('fa-square-o');
            $('#' + e.target.id).addClass('fa-check-square');
            $('#' + e.target.id).css('color', $('#' + e.target.id).attr('data-color'));
        } else {
            if (!state.hiddenSeries)
                state.hiddenSeries = {};

            state.hiddenSeries[colName] = true;
            $('#' + e.target.id).removeClass('fa-check-square');
            $('#' + e.target.id).addClass('fa-square-o');
            $('#' + e.target.id).css('color', '#888');
        }

        that.renderChart();

        if (typeof that.pageOptions.onStateChange == 'function')
            that.pageOptions.onStateChange();
    });

    /*  Hide elements when printing  */
    $('#' + tableId + '_length').addClass('hidden-print');
    $('[name="' + tableId + '_length"]').removeClass('form-control');
    $('#' + tableId + '_filter').addClass('hidden-print');
    $('#' + tableId + '_paginate').addClass('hidden-print');

    if (data.nextClause && this.pageOptions.style != 'dashboard') {
        $('#' + this.pageOptions.tableContainer).append('<div class="hidden-print">' +
            '<a href="#" onclick="report.nextClause = report.tableData.nextClause; runQuery(); return false">Show more...</a>' +
            '</div>');
    }
};

//  get the value of an attribute from a attribute name that may contain a dot (like event.firstName)
Report.prototype.dotValue = function(obj, str) {

    if (!obj)
        return null;

    if (str.indexOf('.') == -1)
        return obj[str];

    str = str.split(".");

    for (var i = 0; i < str.length; i++) {
        obj = obj[str[i]];

        if (typeof obj == 'undefined')
            return null;
    }

    return obj;
};

Report.prototype.propertyExists = function(row, name) {

    if (name.indexOf('.') > -1)
        return this.dotValue(row, name) ? true : false;
    else
        return row.hasOwnProperty(name);

};

Report.prototype.setupRowToggles = function() {
    var that = this;

    $('.row-toggle').unbind('click');

    $('.row-toggle').click(function(e) {
        e.preventDefault();
        e.stopPropagation();

        //  set flag to show/hide plot keys
        var row = +e.target.dataset.row;

        if (that.plotRows.indexOf(row) == -1) {
            that.plotRows.push(row);

            $('#' + e.target.id).removeClass('fa-square-o');
            $('#' + e.target.id).addClass('fa-check-square');
            $('#' + e.target.id).css('color', '#1cb14f');
        } else {

            that.plotRows.splice(that.plotRows.indexOf(row), 1);

            $('#' + e.target.id).removeClass('fa-check-square');
            $('#' + e.target.id).addClass('fa-square-o');
            $('#' + e.target.id).css('color', '#888');
        }

        that.state.plotKeys = that.getPlotKeys(that.plotRows);

        that.renderChart();

        if (typeof that.pageOptions.onStateChange == 'function')
            that.pageOptions.onStateChange();
    });
};

//  Return the key (based on the group by) for the row
Report.prototype.getKey = function(row) {
    var groupBy = this.groupByArray(this.tableData), key = {};

    for (var g = 0; g < groupBy.length; g++) {

        //  if codes exist for the values, use them
        if (this.tableData.codes && this.tableData.codes[row] && this.tableData.codes[row][groupBy[g]])
            key[groupBy[g]] = this.tableData.codes[row][groupBy[g]];
        else
            key[groupBy[g]] = this.dotValue(this.tableData.rows[row], groupBy[g]);
    }

    return key;
};

//  Return the currently selected plot keys on the table
Report.prototype.getPlotKeys = function(rows) {
    var keys = [], useRows = rows;

    if (useRows.length == 0)
        useRows = [0, 1, 2, 3, 4];

    for (var row = 0; row < useRows.length; row++) {

        if (this.tableData.rows[row])
            keys.push(this.getKey(useRows[row]));
    }

    return keys;
};


//  Set the plot keys on the table based on state
Report.prototype.setPlotKeys = function() {
    var rows = this.tableData.rows, keys = this.state.plotKeys;

    if (!keys && keys.length == 0 || !rows || rows.length == 0)
        return;

    for (var row = 0; row < rows.length; row++) {
        keys.push(this.getKey(rows[row]));
    }

    return keys;
};

//  Turn a JSON query object into a string that is more readable
Report.explainQuery = function(json) {
    var text;

    if (typeof json == 'string')
        json = eval('(' + json + ')');

    if (json['$and'] && json['$and'].length == 1)
        json = json['$and'][0];

    if (json['$or'] && json['$or'].length == 1)
        json = json['$or'][0];

    text = JSON.stringify(json);

    text = Utils.replaceAll(text, '"\\$in":', 'in ');
    text = Utils.replaceAll(text, '"\\$eq":', '= ');
    text = Utils.replaceAll(text, '"\\$ne":', 'not equal to ');
    text = Utils.replaceAll(text, '"\\$gt":', '> ');
    text = Utils.replaceAll(text, '"\\$gte":', '>= ');
    text = Utils.replaceAll(text, '"\\$lt":', '< ');
    text = Utils.replaceAll(text, '"\\$lte":', '<= ');
    text = Utils.replaceAll(text, '"\\$regex":', 'contains ');

    text = Utils.replaceAll(text, '\\$', '');
    text = Utils.replaceAll(text, '{', '');
    text = Utils.replaceAll(text, '}', '');
    text = Utils.replaceAll(text, ':', ': ');
    text = Utils.replaceAll(text, ',', ', ');
    text = Utils.replaceAll(text, '"', '');
    return '<pre>' + text + '</pre>';
};

Report.formatValue = function(value, dataType, format) {

    switch (Report.dataTypes[dataType]) {
        case Report.dataTypes.object:
        case "object":

            if (value == undefined)
                return '(not set)';

            return JSON.stringify(value, null, 4);

            break;
        case Report.dataTypes.percent:
        case "percent":

            if (value == undefined || value == null)
                return '0.00%';

            if (Utils.isNumber(value))
                return value.toFixed(2) + '%';
            else
                return value;

            break;
        case Report.dataTypes.numeric:
        case Report.dataTypes.currency:
        case "numeric":
        case "currency":

            if (value == undefined || value == null)
                return '';

            if (format)
                return numeral(value).format(format);

            return value.toFixed(2);
            break;
        case Report.dataTypes.integer:
        case "integer":

            if (value == undefined || value == null)
                return '';

            if (format)
                return numeral(value).format(format);

            return value.toLocaleString();

            break;
        case Report.dataTypes.date:
        case "date":
            if (format)
                return moment.utc(value).format(format);
            else
                return value;
        default:
            return value || '(not set)';
    }
};

/*  ----------  Filter routines  ----------
 Functions that manage filters
 */
var Filter = {

    init: function(containerId, appId, projectId, dataObj, filterOptions) {

        if (filterOptions) {

            //  Setup selectize to work with the builder
            for (var f = 0; f < filterOptions.length; f++) {
                var filter = filterOptions[f];

                //  set up selectize plugin for 'in' types
                if (filter.operators[0] == 'in') {
                    filter['plugin'] = 'selectize';
                    filter['plugin_config'] = {
                        create: true,
                        closeAfterSelect: true,
                        multiple: true,
                        maxItems: 8,
                        plugins: ['remove_button'],
                        onItemAdd: function () {
                            this.blur();
                        }
                    };

                    filter.valueSetter = function(rule, value) {
                        rule.$el.find('.rule-value-container select')[0].selectize.setValue(value);
                    };
                }
            }
        }

        $('#' + containerId).queryBuilder({
            filters: filterOptions,
            rules: null,
            plugins: {
                'filter-description': { mode: 'popover' }
            }
        });

        if (dataObj && dataObj.hasOwnProperty('query')) {
            Filter.setRules(containerId, dataObj.query);
        }

        $('#' + containerId).on('afterUpdateRuleOperator.queryBuilder', function(e, rule, error, value) {
            Filter.styleValue(rule, appId, projectId);
        });

        $('#' + containerId).on('afterUpdateRuleFilter.queryBuilder', function(e, rule, error, value) {
            Filter.styleValue(rule, appId, projectId);
        });
    },

    setRules: function(containerId, rules) {

        if (rules) {

            //  querybuilder needs a filter that begins with $and or $or
            if (!rules.$and && !rules.$or)
                rules = { $and: [ rules ] };

            $('#' + containerId).queryBuilder('setRulesFromMongo', rules);
        }
    },

    reset: function(containerId) {
        $('#' + containerId).queryBuilder('reset');
    },
    
    styleValue: function(rule, appId, projectId) {

        switch (rule.filter.type) {
            case 'string':

                if (rule.filter.searchable && (rule.operator.type == 'equal' || rule.operator.type == 'not_equal')) {

                    var matcher = function(query, sync, async) {
                        var url = '/search?attribute=' + rule.filter.id + '&projectId=' + projectId + '&value=' + encodeURIComponent(query) + '&appId=' + appId;

                        $.ajax(url, {
                                success: function(data, status){
                                    async(data);
                                }
                            }
                        );
                    };

                    $('input[name*="' + rule.id + '_value_"]').typeahead('destroy');
                    $('input[name*="' + rule.id + '_value_"]').typeahead({ minLength: 0 }, {
                        name: 'kvs',
                        limit: 20,
                        source: matcher
                    });

                    $('input[name*="' + rule.id + '_value_"]').bind('typeahead:select', function(ev, suggestion) {
                        $('input[name*="' + rule.id + '_value_"]').trigger("change");   //  typeahead needs to fire this or builder doesn't see change
                    });
                }
                break;
            case 'date':
                //  default to ISO date format if not specified on attribute
                var format = rule.filter.validation ? rule.filter.validation.format : 'YYYY-MM-DD';
                var timePicker = format.toLowerCase().indexOf('h') > -1;

                var drOptions = {
                    singleDatePicker: true,
                    autoUpdateInput: false,
                    timePicker: timePicker,
                    minDate: '1999-01-01',
                    maxDate: '2100-01-01',  // do not remove - dateRangePicker needs it
                    locale: {
                        "format": format
                    }
                };

                $('input[name*="' + rule.id + '_value_0"]').daterangepicker(drOptions,
                    function(start, end, label) {
                        $('input[name*="' + rule.id + '_value_0"]').val(start.format(format)).change();
                    }
                );

                $('input[name*="' + rule.id + '_value_0"]').on('apply.daterangepicker', function(ev, picker) {
                    $('input[name*="' + rule.id + '_value_0"]').val(picker.startDate.format(format)).change();
                });

                //  if the second element exists (for betweens)
                if ($('input[name*="' + rule.id + '_value_1"]').length) {
                    $('input[name*="' + rule.id + '_value_1"]').daterangepicker(drOptions,
                        function(start, end, label) {
                            $('input[name*="' + rule.id + '_value_1"]').val(start.format(format)).change();
                        }
                    );

                    $('input[name*="' + rule.id + '_value_1"]').on('apply.daterangepicker', function(ev, picker) {
                        $('input[name*="' + rule.id + '_value_1"]').val(picker.startDate.format(format)).change();
                    });
                }
                break;
        }
    },

    //  Validate a filter component - empty is ok.
    validate: function(element) {

        var filterModel = $('#' + element).queryBuilder('getModel');

        //  only validate if all rules are filled in
        if (filterModel.rules.length > 1 || (filterModel.rules.length == 1 && filterModel.rules[0].filter)) {
            if (!$('#' + element).queryBuilder('validate')) {
                return false;
            }
        }

        return true;
    },

    //  For filters that are embedded into a page, set up the UI interactions here
    configureEmbeddedFilter: function(element) {

        //  when a rule is updated on the filter (and it's valid), refresh the screen
        var ruleUpdated = function(rule) {

            if (rule.operator.type == 'is_null' || rule.operator.type == 'is_not_null') {
                runQuery();
                return;
            }

            if (rule.value == undefined || rule.value == '' || (Utils.isArray(rule.value) && rule.value.length == 0))
                return;

            //  check 'between' values are blank
            if (Utils.isArray(rule.value) && rule.value.length == 2) {
                if (!rule.value[0] || !rule.value[1])
                    return;
            }

            runQuery();
        };

        //  set up refresh of report when the value of filter changes
        $('#' + element).on('afterUpdateRuleValue.queryBuilder', function(e, rule, error) {
            ruleUpdated(rule);
        });

        //  set up refresh of report when the operator of filter changes
        $('#' + element).on('afterUpdateRuleOperator.queryBuilder', function(e, rule, error) {
            ruleUpdated(rule);
        });

        //  refresh report when a rule is deleted
        $('#' + element).on('afterDeleteRule.queryBuilder', function(e, rule, error) {
            runQuery();
        });

        //  refresh report when a group is deleted
        $('#' + element).on('afterDeleteGroup.queryBuilder', function(e, rule, error) {
            runQuery();
        });

        //  the filter is allowed to be empty when validating
        $('#' + element).on('validationError.queryBuilder', function(e, node, error, value) {
            if ((error[0] == 'no_filter' || error[0] == 'empty_group') && node.model.root.rules.length <= 1) {
                e.preventDefault();

                if (node.model.root.rules.length == 0)
                    $('#' + element).queryBuilder('reset');
            }
        });
    }
};

var Toolbar = {
    intervals: null,
    ranges: null,
    customRanges: {},
    dateStart: 0,
    dateEnd: 0,
    dateLabel: '',
    dateInterval: '',

    init: function(report) {
        var settings = (report ? report.settings : {}) || {};
        var state = (report ? report.state : {}) || {};

        Toolbar.intervals = settings.intervals;
        Toolbar.ranges = Utils.clone(settings.ranges) || ['Today', 'Yesterday', 'Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month'];

        var ranges = {};

        for (var r = 0; r < Toolbar.ranges.length; r++) {

            if (typeof Toolbar.ranges[r] == 'string') {
                ranges[Toolbar.ranges[r]] = Toolbar.range(Toolbar.ranges[r]);
            } else {

                //  create a custom range
                var rkey = Object.keys(Toolbar.ranges[r])[0];
                ranges[rkey] = [ Toolbar.ranges[r][rkey][0], Toolbar.ranges[r][rkey][1] ];
                Toolbar.ranges[r] = rkey;
                Toolbar.customRanges[rkey] = ranges[rkey];
            }
        }

        $('#reportRange').daterangepicker({
            alwaysShowCalendars: settings.alwaysShowCalendars,
            showCustomRangeLabel: settings.showCustomRangeLabel,
            autoUpdateInput: false,
            linkedCalendars: false,
            startDate: moment().subtract(29, 'days'),
            endDate: moment(),
            minDate: '1999-01-01',
            maxDate: '2100-01-01',
            timePicker: true,
            ranges: ranges,
            opens: 'left',
            drops: 'down',
            buttonClasses: ['btn', 'btn-sm'],
            applyClass: 'btn-primary',
            cancelClass: 'btn-default',
            separator: ' to ',
            locale: {
                format: 'YYYY-MM-DD h:mm A',
                applyLabel: 'Apply',
                cancelLabel: 'Cancel',
                fromLabel: 'From',
                toLabel: 'To',
                customRangeLabel: 'Custom',
                daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr','Sa'],
                monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
                firstDay: 1
            }
        }, function(start, end, label) {
            Toolbar.rangeChanged(start, end, label);
        });

        $('#reportRange').on('apply.daterangepicker', function(ev, picker) {
            Toolbar.rangeChanged(picker.startDate, picker.endDate, picker.chosenLabel);
            runQuery();
        });

        Toolbar.dateStart = state.dateStart;
        Toolbar.dateEnd = state.dateEnd;

        if (state.dateLabel)
            Toolbar.dateLabel = state.dateLabel;
        else if (Toolbar.intervals && Toolbar.intervals.defaultRange)
            Toolbar.dateLabel = Toolbar.intervals.defaultRange;
        else
            Toolbar.dateLabel = 'Last 30 Days';

        if (state.dateInterval)
            Toolbar.dateInterval = state.dateInterval;
        else if (Toolbar.intervals && Toolbar.intervals.defaultOption)
            Toolbar.dateInterval = Toolbar.intervals.defaultOption;
        else
            Toolbar.dateInterval = 'Daily';

        Toolbar.calculateDates();
        Toolbar.draw();
    },

    initLog: function(report) {
        var settings = (report ? report.settings : {}) || {};
        var state = (report ? report.state : {}) || {};

        Toolbar.dateInterval = 'Minute';

        $('#reportRange').daterangepicker({
            autoUpdateInput: false,
            linkedCalendars: false,
            timePicker: true,
            startDate: moment(),
            endDate: moment(),
            minDate: '1999-01-01',
            maxDate: '2100-01-01',  // do not remove - dateRangePicker needs it
            ranges: {
                'Last 24 Hours': Toolbar.range('Last 24 Hours')
            },
            opens: 'left',
            drops: 'down',
            buttonClasses: ['btn', 'btn-sm'],
            applyClass: 'btn-primary',
            cancelClass: 'btn-default',
            separator: ' to ',
            locale: {
                format: 'YYYY-MM-DD h:mm A',
                applyLabel: 'Apply',
                cancelLabel: 'Cancel',
                fromLabel: 'From',
                toLabel: 'To',
                customRangeLabel: 'Custom',
                daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr','Sa'],
                monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
                firstDay: 1
            }
        }, function(start, end, label) {
            Toolbar.rangeChanged(start, end, label);
        });

        $('#reportRange').on('apply.daterangepicker', function(ev, picker) {
            Toolbar.rangeChanged(picker.startDate, picker.endDate, picker.chosenLabel);
            runQuery();
        });

        Toolbar.dateStart = state.dateStart;
        Toolbar.dateEnd = state.dateEnd;

        if (settings.dateLabel)
            Toolbar.dateLabel = settings.dateLabel;
        else
            Toolbar.dateLabel = 'Last 24 Hours';

        Toolbar.calculateDates();
        Toolbar.draw();
    },

    rangeChanged: function(start, end, label) {
        Toolbar.dateLabel = label;

        if (label == 'Custom') {
            var format = Toolbar.momentFormat(Toolbar.dateInterval);
            Toolbar.dateStart = moment(start).format(format);
            Toolbar.dateEnd = moment(end).format(format);
        } else {

            switch (label) {
                case 'This Month':
                case 'Last Month':
                    if (!Toolbar.intervals || !Toolbar.intervals.options || Toolbar.intervals.options.Daily)
                        Toolbar.dateInterval = 'Daily';
                    else
                        Toolbar.dateInterval = 'Monthly';
                    break;
                case 'Custom':
                case 'Last 7 Days':
                case 'Last 30 Days':
                case 'Today':
                case 'Yesterday':
                    Toolbar.dateInterval = 'Daily';
                    break;
                case 'Last 24 Hours':
                    Toolbar.dateInterval = 'Hourly';
                    break;
                case 'Last 60 Minutes':
                    Toolbar.dateInterval = 'Minute';
                    break;
            }
        }
        Toolbar.draw();
    },

    intervalChanged: function(interval) {
        Toolbar.dateInterval = interval;
        Toolbar.draw();
        runQuery();
    },

    draw: function() {
        Toolbar.calculateDates();

        //  draw range
        if (Toolbar.dateLabel && Toolbar.dateLabel != 'Custom')
            $('#reportRange').val(Toolbar.dateLabel);
        else {
            var friendlyHour = 'YYYY-MM-DD hA';
            var friendlyMinute = 'MM-DD h:mmA';
            var format = Toolbar.momentFormat();

            if (Toolbar.dateInterval == 'Daily' && Toolbar.dateStart == Toolbar.dateEnd)
                $('#reportRange').val(moment(Toolbar.dateStart).format(format));
            else if (Toolbar.dateInterval == 'Hourly')
                $('#reportRange').val(moment(Toolbar.dateStart, friendlyHour).format(friendlyHour) + ' to ' + moment(Toolbar.dateEnd, friendlyHour).format(friendlyHour));
            else if (Toolbar.dateInterval == 'Minute')
                $('#reportRange').val(moment(Toolbar.dateStart).format(friendlyMinute) + ' to ' + moment(Toolbar.dateEnd).format(friendlyMinute));
            else

                if (Toolbar.dateStart == Toolbar.dateEnd)
                    $('#reportRange').val(moment(Toolbar.dateStart).format(format));
                else
                    $('#reportRange').val(moment(Toolbar.dateStart).format(format) + ' to ' + moment(Toolbar.dateEnd).format(format));
        }

        if (Toolbar.intervals && Toolbar.intervals.options && Object.keys(Toolbar.intervals.options).length == 1)
            $('#toolbar-interval').addClass('hidden');

        //  draw interval
        $('#reportIntervalTitle').html(Toolbar.dateInterval);

        //  set next/prior enabling
        switch (Toolbar.dateLabel) {
            case 'Today':
            case 'Last 24 Hours':
            case 'Last 7 Days':
            case 'Last 30 Days':
            case 'Last 60 Minutes':
            case 'This Month':
                $('#toolbar-next-btn').addClass('disabled');
                $('#toolbar-next-btn').attr('disabled', true);
                break;
            default:
                $('#toolbar-next-btn').removeClass('disabled');
                $('#toolbar-next-btn').attr('disabled', false);
        }

        //  reset interval menu item display status
        $('#intervalMenuItemMinute').removeClass('hidden');
        $('#intervalMenuItemHour').removeClass('hidden');
        $('#intervalMenuItemDay').removeClass('hidden');
        $('#intervalMenuItemWeek').removeClass('hidden');
        $('#intervalMenuItemMonth').removeClass('hidden');

        switch (Toolbar.dateLabel) {
            case 'Last 30 Days':
            case 'Last 7 Days':
                $('#intervalMenuItemWeek').addClass('hidden');
                $('#intervalMenuItemMonth').addClass('hidden');
                $('#intervalMenuItemMinute').addClass('hidden');
                break;
            case 'This Month':
            case 'Last Month':
                $('#intervalMenuItemWeek').addClass('hidden');
                $('#intervalMenuItemMinute').addClass('hidden');
                break;
            case 'Last 60 Minutes':
                $('#intervalMenuItemHour').addClass('hidden');
                $('#intervalMenuItemDay').addClass('hidden');
                $('#intervalMenuItemWeek').addClass('hidden');
                break;
            case 'Last 24 Hours':
                $('#intervalMenuItemDay').addClass('hidden');
                $('#intervalMenuItemWeek').addClass('hidden');
                break;
            case 'Today':
            case 'Yesterday':
                $('#intervalMenuItemWeek').addClass('hidden');
                $('#intervalMenuItemMonth').addClass('hidden');
                break;
        }
    },

    next: function() {
        var diff, start, end, label;

        switch (Toolbar.dateLabel) {
            case 'Yesterday':
                label = 'Today';
                break;
            case 'Last Month':
                label = 'This Month';
                break;
            default:
                var diffInterval = Toolbar.momentInterval(Toolbar.dateInterval);
                var format = Toolbar.momentFormat(diffInterval);
                diff = moment(Toolbar.dateEnd, format).diff(moment(Toolbar.dateStart, format), diffInterval) + 1;

                start = moment(Toolbar.dateStart, format).add(diff, diffInterval);
                end = moment(Toolbar.dateEnd, format).add(diff, diffInterval);
                label = 'Custom';
        }
        Toolbar.rangeChanged(start, end, label);
        runQuery();
    },

    prior: function() {
        var diff, start, end, label;

        switch (Toolbar.dateLabel) {
            case 'Today':
                label = 'Yesterday';
                break;
            case 'This Month':
                label = 'Last Month';
                break;
            default:
                var diffInterval = Toolbar.momentInterval(Toolbar.dateInterval);
                var format = Toolbar.momentFormat(diffInterval);
                diff = moment(Toolbar.dateEnd, format).diff(moment(Toolbar.dateStart, format), diffInterval) + 1;

                start = moment(Toolbar.dateStart, format).subtract(diff, diffInterval);
                end = moment(Toolbar.dateEnd, format).subtract(diff, diffInterval);
                label = 'Custom';
        }

        Toolbar.rangeChanged(start, end, label);
        runQuery();
    },

    addToDashboard: function() {
        var data = {
            name: $('#dashboard-name').val(),
            title: $('#pod-title').val(),
            display: $('input[name=pod-type]:checked').val(),
            state: report.state
        };

        $.ajax({
            type: 'POST',    //  if the data object has an id, PUT the update
            url: '/setup/dashboards/pods',
            data: data,
            success: function (data, status) {
                window.location = '/dashboard?name=' + encodeURIComponent($('#dashboard-name').val());
            },
            error: function (request, status, error) {
                Data.showError(request, status, error);
            }
        });
    },

    createBookmark: function() {

        if (report && report.settings) {
            report.settings.title = $('#bookmarkName').val();
            pushState();
        }

        var query = window.location.pathname + window.location.search;

        var val = $('#bookmarkName').val();

        if (!val) {
            $('#bookmarkName').addClass('has-error');
            return;
        }

        if (val.indexOf('\'') > -1 || val.indexOf('"') > -1 || val.indexOf('&') > -1 || val.indexOf('<') > -1 || val.indexOf('>') > -1) {
            Page.alert('Bookmark names cannot contain \' " & < >.');
            return false;
        }

        var frm = {
            name: $('#bookmarkName').val(),
            query: query
        };

        Data.submitForm('/setup/bookmarks/', frm, function(result){

            if (result) {
                Page.showMessage(frm.name + " was created.");

                //  add bookmark
                for (var i = 0; i < Page.menuItems.length; i++) {

                    if (Page.menuItems[i].title == 'Bookmarks') {

                        if (!Page.menuItems[i].items)
                            Page.menuItems[i].items = [];

                        Page.menuItems[i].items.push({ title: frm.name, url: query });
                    }
                }
                Page.renderMenu();
            }
            $('#bookmarkName').val('');
            $('#bookmarkCreateModal').modal('hide');
        });
    },

    setValues: function(label, start, end, interval) {

        var format = Toolbar.momentFormat(interval);

        if (start)
            Toolbar.dateStart = moment(start).format(format);

        if (end)
            Toolbar.dateEnd = moment(end).format(format);

        if (label)
            Toolbar.dateLabel = label;
        
        if (interval)
            Toolbar.dateInterval = interval;
    },

    momentInterval: function(interval) {

        switch (interval) {
            case 'Minute':
                return 'minute';
            case 'Hourly':
                return 'hour';
            case 'Daily':
                return 'day';
            case 'Monthly':
                return 'month';
        }
    },

    //  These are in the where format the API can tell what the grouping is
    momentFormat: function(interval) {

        if (!interval)
            interval = Toolbar.dateInterval;

        switch (interval) {
            case 'Second':
            case 'second':
                return 'YYYY-MM-DD HH:mm:ss';
            case 'Minute':
            case 'minute':
                return 'YYYY-MM-DD HH:mm';
            case 'Hourly':
            case 'hour':
                return 'YYYY-MM-DD HH';
            case 'Daily':
            case 'day':
                return 'YYYY-MM-DD';
            case 'Monthly':
            case 'month':
                return 'YYYY-MM';
            case 'Yearly':
            case 'year':
                return 'YYYY';
        }
    },

    range: function(label) {
        var format = Toolbar.momentFormat(Toolbar.dateInterval);

        switch (label) {
            case 'Today':
                return [moment().startOf('day').format(format), moment().endOf('day').format(format)];
            case 'Yesterday':
                return [moment().subtract(1, 'days').startOf('day').format(format), moment().subtract(1, 'days').endOf('day').format(format)];
            case 'Last 24 Hours':
                if (Toolbar.dateInterval == 'Minute')
                    return [moment().subtract(1439, 'minutes').format(format), moment().format(format)];
                else
                    return [moment().subtract(23, 'hours').format(format), moment().format(format)];
            case 'Last 7 Days':
                if (Toolbar.dateInterval == 'Minute')
                    return [moment().subtract(10079, 'minutes').format(format), moment().format(format)];
                if (Toolbar.dateInterval == 'Hourly')
                    return [moment().subtract(167, 'hours').format(format), moment().format(format)];
                else
                    return [moment().subtract(6, 'days').format(format), moment().format(format)];
            case 'Last 30 Days':
                if (Toolbar.dateInterval == 'Minute')
                    return [moment().subtract(43199, 'minutes').format(format), moment().format(format)];
                if (Toolbar.dateInterval == 'Hourly')
                    return [moment().subtract(719, 'hours').format(format), moment().format(format)];
                else
                    return [moment().subtract(29, 'days').format(format), moment().format(format)];
            case 'This Month':
                return [moment().startOf('month').format(format), moment().endOf('month').format(format)];
            case 'Last Month':
                return [moment().subtract(1, 'month').startOf('month').format(format), moment().subtract(1, 'month').endOf('month').format(format)];
            case 'Last 60 Minutes':
                return [moment().subtract(59, 'minutes').format(format), moment().format(format)];
            case 'Custom':
                return;
            default:

                if (Toolbar.customRanges[label]) {
                    return [Toolbar.customRanges[label][0], Toolbar.customRanges[label][1]];
                }
        }
    },

    calculateDates: function() {

        var range = Toolbar.range(Toolbar.dateLabel);

        if (range) {
            Toolbar.dateStart = range[0];
            Toolbar.dateEnd = range[1];
        } else {
            var format = Toolbar.momentFormat(Toolbar.dateInterval);
            Toolbar.dateStart = moment(Toolbar.dateStart).format(format);
            Toolbar.dateEnd = moment(Toolbar.dateEnd).format(format);
        }
    }
};

Report.elapsedTime = function(seconds) {
    var sec_num = parseInt(seconds, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var secs = sec_num - (hours * 3600) - (minutes * 60);

    if (hours < 10) { hours = "0" + hours; }
    if (minutes < 10) { minutes = "0" + minutes; }
    if (secs < 10) { secs = "0" + secs; }
    return hours + ':' + minutes + ':' + secs;
};

/*
    These functions format report data to HTML.  They are used for displaying formatted data in the table primarily, but can be used anywhere.

    These are report specific, so they can be replaced on a report by report basis.
 */
Report.prototype.formatters = {

    /*
        add formatting functions, like:
            
            columnName: function(value) {
                return value + '%';
            }
     */
};
