import utils = require("ns8-utils");
import Utils = require("../lib/utils");
import web = require("ns8-web");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import dictionaries = require('../lib/dictionaries');
import {IApplication} from "ns8-web";

export let stationList;

let monitorTypes = dictionaries.MonitorTypes;

export function getMonitorParams(req) {
    let params: any = req.body;

    if (params.id)
        params.id = +params.id;

    params.projectId = req['session'].currentProjectId;

    if (params.stationsOptions == 'select' && params.stations)
        params.stations = params.stations.split(',');
    else
        delete params.stations;

    params.data = {};
    params.accessToken = req['session'].accessToken;

    //  only create data properties relevant to the monitor type
    switch (+req.body.type) {
        case monitorTypes.email:
            params.data.checkExploitsLists = req.body.checkExploitsLists == 'on';
            params.data.checkBlocklists = req.body.checkBlocklists == 'on';
            break;
        case monitorTypes.DNS:
            params.data.recordType = req.body.recordType;
            params.data.expectedValues = req.body.expectedValues;
            break;
        case monitorTypes.website:

            if (req.body.matchPhrase)
                params.data.matchPhrase = req.body.matchPhrase;

            if (req.body.userName)
                params.data.userName = req.body.userName;

            if (req.body.password)
                params.data.password = req.body.password;

            if (req.body.userAgent)
                params.data.userAgent = req.body.userAgent;
            break;
        case monitorTypes.certificate:
            params.data.allowAuthorizationErrors = req.body.allowAuthorizationErrors == 'on';
            params.data.daysLeft = +req.body.daysLeft;
            break;
        case monitorTypes.scoring:
            params.data.minimumScore = +req.body.score;
            break;
        case monitorTypes.performance:
            params.data.timingMinimum = +req.body.timingMinimum;
            break;
        case monitorTypes.portScan:
            params.data.ports = req.body.ports;
            params.interval = req.body.longInterval;
            break;
    }
    return params;
}

export function getMonitors(req, res, application: IApplication) {
    utils.noCache(res);

    //  get contacts for form
    api.REST.client.get('/v1/monitoring/contacts?projectId=' + req['session'].currentProjectId + '&accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

        if (err) {
            res.render('message', {
                settings: utils.config.settings(),
                application: application,
                req: req,
                message: 'An unknown error has occurred.',
                title: 'Error'
            });
        } else {
            let contacts = result.data;

            //  get stations
            api.REST.client.get('/v1/monitoring/stations?projectId=' + req['session'].currentProjectId, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                let stations = result.data;

                if (err)
                    req.flash('error', err.message);

                //  refresh station list
                if (result && result.data)
                    stationList = result.data;

                api.REST.client.get('/v1/monitoring/monitors?projectId=' + req['session'].currentProjectId + '&accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

                    if (err)
                        req.flash('error', err.message);

                    res.render('monitors', {
                        settings: utils.config.settings(),
                        application: application,
                        dev: utils.config.dev(),
                        req: req,
                        monitors: result ? result.data : [],
                        monitorTypes: dictionaries.MonitorTypes,
                        monitorDescriptions: dictionaries.monitorTypes.codes,
                        contacts: contacts,
                        stations: stations
                    });
                });
            });
        }
    });
}

export function setup(app: express.Application, application: IApplication, callback) {

    /*
     Monitors
     */

    try {

        app.get('/certificates', application.enforceSecure, api.authenticate, function(req: any, res) {

            utils.noCache(res);
            //  get stations
            api.REST.client.get('/v1/monitoring/stations?projectId=' + req['session'].currentProjectId, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                let stations = result.data;

                //  always refresh the monitors list here, since all edits redir back here
                api.REST.client.get('/v1/monitoring/monitors?projectId=' + req['session'].currentProjectId + '&accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

                    if (err)
                        req.flash('error', err.message);

                    res.render('certificates', {
                        settings: utils.config.settings(),
                        application: application,
                        dev: utils.config.dev(),
                        req: req,
                        monitors: result.data || [],
                        stations: stations
                    });
                });
            });
        });

        app.get('/monitors', application.enforceSecure, api.authenticate, function(req: any, res) {
            getMonitors(req, res, application);
        });

        app.get('/monitors/types', application.enforceSecure, api.authenticate, function(req: any, res) {

            res.render('monitorTypes', {
                settings: utils.config.settings(),
                application: application,
                dev: utils.config.dev(),
                req: req
            });
        });

        app.get('/monitors/data', application.enforceSecure, api.authenticate, function(req: any, res) {

            utils.noCache(res);

            //  always refresh the monitor list here, since all edits redir back here
            api.REST.client.get('/v1/monitoring/monitors?projectId=' + req['session'].currentProjectId + '&accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                api.REST.sendConditional(res, err, result ? result.data : null);
            });
        });

        //  get down monitors
        app.get('/monitors/down/data', application.enforceSecure, api.authenticate, function(req: any, res) {

            utils.noCache(res);

            //  always refresh the project list here, since all edits redir back here
            api.REST.client.get('/v1/monitoring/monitors/down?projectId=' + req['session'].currentProjectId + '&accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                api.REST.sendConditional(res, err, result ? result.data : null);
            });
        });

        //  create a new monitor
        app.post('/monitors', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
            utils.noCache(res);

            let params = getMonitorParams(req);

            api.REST.client.post('/v1/monitoring/monitors', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                api.REST.sendConditional(res, err, result);
            });
        });

        //  update an existing monitor
        app.put('/monitors', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
            utils.noCache(res);

            let params = getMonitorParams(req);

            api.REST.client.put('/v1/monitoring/monitors', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                api.REST.sendConditional(res, err);
            });
        });

        app.delete('/monitors/:id/', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

            api.REST.client.del('/v1/monitoring/monitors/' + req.params['id'] + '?accessToken=' + req['session'].accessToken, function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response) {
                api.REST.sendConditional(res, err);
            });
        });

        app.get('/monitors/enable/:id/', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

            api.REST.client.get('/v1/monitoring/monitors/enable/' + req.params['id'] + '?accessToken=' + req['session'].accessToken, function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response) {
                api.REST.sendConditional(res, err);
            });
        });

        app.get('/monitors/disable/:id/', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

            api.REST.client.get('/v1/monitoring/monitors/disable/' + req.params['id'] + '?accessToken=' + req['session'].accessToken, function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response) {
                api.REST.sendConditional(res, err);
            });
        });

        app.get('/monitors/test', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
            utils.noCache(res);

            api.REST.client.get('/v1/monitoring/monitors/test/' + req.query['monitorId'] + '?accessToken=' + req['session'].accessToken + '&stationId=' + req.query['stationId'], function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                api.REST.sendConditional(res, err, result);
            });
        });

        //  test a url as a website test
        app.get('/test/website', application.enforceSecure, function (req: express.Request, res: express.Response) {
            utils.noCache(res);

            api.REST.client.get('/v1/monitoring/test/website?url=' + encodeURIComponent(req.query['url']) + '&stationId=' + req.query['stationId'], function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                api.REST.sendConditional(res, err, result);
            });
        });

        callback();

    } catch (err) {
        console.dir(err);
        callback(err);
    }
}
