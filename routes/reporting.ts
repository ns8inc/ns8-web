import restify = require('restify');
import utils = require("ns8-utils");
import express = require('express');
import api = require('ns8-api');
import projectRoutes = require('./projects');
import lib = require('../lib/index');
let http = require('http');
let fs = require('fs');
let os = require('os');
import {IApplication} from "ns8-web";

/*
 Set up routes - this script handles functions required reporting
 */

function getEndpoint(): string {
    return api.applications.items[utils.config.settings().appId].reporting.apiEndpoint;
}

export function getReport(application, req, res) {

    /*
     The id query string param is the report id in application.reports:  /report?id=log

     The options query string param is the customized version of the definition.  Its values take priority
     over the definition.

     To get the options:
     -   Get report definition from the id param, if it exists
     -   Override the report definition from the options.id param, if it exists
     -   Override the report definition options from the options param

     */

    let definition, qsOptions, metricOptions, elementOptions, filterOptions, attribOptions, id;

    qsOptions = req.query.options ? JSON.parse(req.query.options) : {};
    id = qsOptions.id || req.query.id;        //  there should not be two ids, but if there is, use the one in options

    //  get report definition
    if (id) {
        if (utils.isNumeric(id))
            definition = application.reports.definitions[+id];
        else
            definition = application.reports.definitions[application.reports.Types[id]];

        if (!definition) {
            res.render('message', {
                title: 'Error',
                message: 'No such report',
                settings: utils.config.settings(),
                application: application,
                dev: utils.config.dev(),
                req: req
            });
            return;
        }

        //  got to clone it so it is not modified elsewhere
        definition = utils.clone(definition);

        definition.initialState = definition.initialState || {};
        definition.initialState.id = id;
    } else {
        //  default definition
        definition = {
            settings: {
                renderView: 'report'
            },
            initialState: {}
        };

        //  fix up existing settings - this is to support prior formats
        if (qsOptions.entity || qsOptions.view)     //  view is legacy format
            definition.settings.entity = qsOptions.entity || qsOptions.view;

        if (qsOptions.renderView)
            definition.settings.renderView = qsOptions.renderView;

        if (qsOptions.title)
            definition.settings.title = qsOptions.title;

        if (qsOptions.hasOwnProperty('isLog'))
            definition.settings.isLog = qsOptions.isLog;

        if (!definition.settings.intervals)
            definition.settings.intervals = application.reports['intervals'];

        if (!definition.settings.ranges)
            definition.settings.ranges = application.reports['ranges'];
    }

    if (!definition.settings.entity) {
        res.render('message', {
            title: 'Error',
            message: 'No data entity specified for report',
            settings: utils.config.settings(),
            application: application,
            dev: utils.config.dev(),
            req: req
        });
        return;
    }

    //  call functions for dynamic settings
    if (typeof definition.initialState.filter == 'function')
        definition.initialState.filter = definition.initialState.filter(application, req);

    //  override options from definition with query string params
    if (req.query.options) {

        for (let key in qsOptions) {

            if (qsOptions.hasOwnProperty(key))
                definition.initialState[key] = qsOptions[key];
        }
    }

    let project: any = api.currentProject(req);

    if (!project)
        project = {};

    if (!project.data)
        project.data = {};

    if (!project.data.attributes)
        project.data.attributes = {};

    let customAttribs = project.data.attributes;

    let isLog = definition.settings.renderView == 'log';

    metricOptions = api.reporting.getAttributeOptions(definition.settings.entity, api.reporting.AttributeTypes.metrics, customAttribs, isLog);
    elementOptions = api.reporting.getAttributeOptions(definition.settings.entity, api.reporting.AttributeTypes.elements, customAttribs, isLog);
    filterOptions = api.reporting.getFilterOptions(definition.settings.entity, customAttribs, isLog);
    attribOptions = api.reporting.getAttributeOptions(definition.settings.entity, api.reporting.AttributeTypes.all, customAttribs, isLog);

    utils.noCache(res);

    //  any route that requires segments should call this first
    api.reporting.getSegments(req, false, definition.appId, function(err) {

        if (err)
            req.flash('error', err.message);

        let renderView = definition.settings.renderView;

        res.render(renderView || 'report', {
            settings: utils.config.settings(),
            application: application,
            dev: utils.config.dev(),
            req: req,
            definition: definition,
            segmentOptions: api.reporting.getSegmentOptions(req),
            metricOptions: metricOptions,
            elementOptions: elementOptions,
            filterOptions: filterOptions,
            attribOptions: attribOptions
        });
    });
}

export function setup(app: express.Application, application: IApplication, callback) {

    let statusCheck: any = typeof application.statusCheck == 'function' ? application.statusCheck : lib.statusCheckPlaceholder;

    app.post('/query', application.enforceSecure, api.authenticateNoRedirect, function (req: express.Request, res: express.Response) {

        //  This function manually checks auth status in order to send the proper status to the client ajax call.
        if (!req['session']) {
            api.REST.sendError(res, new api.errors.AuthenticationTimeoutError('Your session has timed out.'));
            return;
        }

        let endpoint, params = {
            accessToken: req['session'].accessToken,
            query: req.body
        };

        //  support change from 'view' to 'entity'
        if (params.query && params.query.view) {
            params.query.entity = params.query.view;
            delete params.query.view;
        }

        api.REST.client.post(getEndpoint() + 'query', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err, result ? result.data : null);
        });
    });

    //  typeahead support
    app.get('/search', application.enforceSecure, api.authenticateNoRedirect, function (req: express.Request, res: express.Response) {

        //  This function manually checks auth status in order to send the proper status to the client ajax call.
        if (!req['session']) {
            api.REST.sendError(res, new api.errors.AuthenticationTimeoutError('Your session has timed out.'));
            return;
        }

        api.REST.client.get(getEndpoint() + 'attributes/search?accessToken=' + req['session'].accessToken + '&attribute=' + encodeURIComponent(req.query.attribute) + '&projectId=' + req.query.projectId + '&value=' + encodeURIComponent(req.query.value), function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            res.json(result || []);
        });
    });

    app.get('/report', application.enforceSecure, api.authenticate, statusCheck, function (req: express.Request, res: express.Response) {
        getReport(application, req, res);
    });

    function exportCSV(req: express.Request, res: express.Response) {

        let params = {
            accessToken: req['session'].accessToken,
            query: JSON.parse(req.query.query)
        };

        params.query.format = req.query.format;
        params.query.limit = 1000;

        res.attachment('data.' + req.query.format);

        let cycles = 0, running: boolean = false;

        let interval = setInterval(function() {

            //  if this somehow gets into a loop that is too big, close it
            if (cycles++ >= 100000) {
                res.write('ERROR: Too many rows to download.  The limit is ' + (cycles * params.query.limit));
                res.end();
                clearInterval(interval);
                return;
            }

            if (running)
                return;

            running = true;

            api.REST.client.post(getEndpoint() + 'query', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

                if (err) {
                    clearInterval(interval);
                    res.write('ERROR: ' + err.message);
                    res.end();
                    return;
                }

                //  no headers after first chunk
                params.query.dataOnly = true;

                if (result && result.code == 200) {

                    if (req.query.format == 'csv') {

                        if (result.data.csv)
                            res.write(result.data.csv);
                        else
                            res.write('');

                    } else {
                        res.json(result.data);
                    }

                    //  add filter to continue after where the last chunk ended
                    if (result.data.nextClause) {
                        params.query.nextClause = result.data.nextClause;
                    } else {

                        //  all data has been sent
                        res.end();
                        clearInterval(interval);
                    }

                    running = false;

                } else {
                    res.write('ERROR: ' + JSON.stringify(result));
                    res.end();
                    clearInterval(interval);
                }
            });
        }, 50);
    }

    function exportPDF(req: express.Request, res: express.Response) {

        let phantomBin = 'phantomjs', dest = 'data.' + req.query.format, file = utils.guid() + '.pdf';

        const exec = require('child_process').exec;

        if (os.platform().substr(0, 3) == 'win') {
            phantomBin = '"../node_modules/ns8-web/bin/phantomjs-win"'
        }

        let reportUrl = application.current.consoleHost;

        if (utils.config.dev())
            reportUrl = application.settings.nodeUrl;

        reportUrl += '/report?format=pdf&accessToken=' + req['session'].accessToken + '&options=' + encodeURIComponent(req.query.options);

        const child = exec('cd phantomjs && ' + phantomBin + ' --ignore-ssl-errors=yes ../node_modules/ns8-web/lib/renderpdf.js "' + reportUrl + '" ' + file,
            (err, stdout, stderr) => {

                if (err !== null) {
                    api.log(err, "PDF download");
                    res.end("Internal error");
                } else {
                    res.download('phantomjs/' + file, 'report.pdf', function(err) {

                        try {

                            if (err){
                                api.log(err, "PDF download");
                                res.end("Internal error");
                            } else {
                                let stat = fs.statSync('phantomjs/' + file);

                                if (stat.isFile())
                                    fs.unlink('phantomjs/' + file);
                            }
                        } catch(err) {}
                    });
                }
            }
        );
    }

    app.get('/download', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        try {

            switch (req.query.format) {
                case 'csv':
                    exportCSV(req, res);
                    break;

                case 'pdf':
                    exportPDF(req, res);
                    break;

                default:
                    res.write('ERROR: No format');
                    res.end();
            }
        } catch(err) {
            api.log(err, "/download");
            res.end("Internal error");
        }
    });

    app.get('/visualizations/badtraffic', application.enforceSecure, api.authenticate, statusCheck, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  any route that requires segments should call this first
        api.reporting.getSegments(req, false, req.query.appId, function(err) {

            if (err)
                req.flash('error', err.message);

            res.render('badTraffic', {
                settings: utils.config.settings(),
                application: application,
                dev: utils.config.dev(),
                req: req
            });
        });
    });

    app.get('/person/profile', application.enforceSecure, api.authenticate, statusCheck, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        let params = {
            accessToken: req['session'].accessToken,
            projectId: req['session'].currentProjectId
        };

        if (req.query.person) {
            params['personId'] = req.query.person;
            params['days'] = req.query.days || 30;

            api.REST.client.post('/v1/analytics/person/profile', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

                if (!result)
                    req.flash('error', 'Internal error');
                else if (result.code != 200 || !result.data)
                    req.flash('error', result.message || 'Internal error');

                res.render('profile', {
                    params: params,
                    application: application,
                    personData: result.data && result.data.personData ? result.data.personData : null,
                    summary: result.data && result.data.summary && result.data.summary.rows ? result.data.summary.rows[0] || [] : [],
                    sessions: result.data && result.data.sessions && result.data.sessions.rows ? result.data.sessions.rows : [],
                    events: result.data && result.data.events && result.data.events.rows ? result.data.events.rows : [],
                    latestSession: result.data && result.data.latestSession && result.data.latestSession.rows ? result.data.latestSession.rows[0] || [] : [],
                    req: req
                });
            });
        } else {

            res.render('profile', {
                params: params,
                summary: null,
                sessions: null,
                events: null,
                latestSession: null,
                personData: null,
                application: application,
                req: req
            });
        }
    });

    app.get('/formatoptions', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        res.render('formatOptions', {
            settings: utils.config.settings(),
            application: application,
            req: req
        });
    });

    callback();
}

