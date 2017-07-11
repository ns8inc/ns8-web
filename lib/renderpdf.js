"use strict";
var page = require('webpage').create(), system = require('system'), address, output;

address = system.args[1];
output = system.args[2];

//  custom
page.viewportSize = { width: 1200, height: 800 };
page.paperSize = {
    width: '1200px',
    height: '1320px',
    margin: '0px'
};

//  this makes the flot charts the right size - I don't know why
page.zoomFactor = .9;

page.onCallback = function(data) {

    //  give it a small amount of time after loading to finish drawing the screen
    setTimeout(function() {
        page.render(output);
        phantom.exit();
    }, 200)
};

page.open(address, function (status) {
    if (status !== 'success') {
        console.log('Unable to load the address!');
        phantom.exit(1);
    } else {

        //  give it time to process, but kill it after 10 minutes
        setTimeout(function() {
            phantom.exit(1);
        }, 10 * 60 * 1000);
    }
});

page.onError = function (msg, trace) {
    console.log(msg);
    trace.forEach(function(item) {
        console.log('  ', item.file, ':', item.line);
    });
};