import utils = require("ns8-utils");
import Utils = require("../lib/utils");
import web = require("ns8-web");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import dictionaries = require('../lib/dictionaries');
import {IApplication} from "ns8-web";

export function getStations(req, res, application: IApplication) {

    api.REST.client.get('/v1/monitoring/stations', function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

        if (err)
            req.flash('error', err.message);

        res.render('stations', {
            settings: utils.config.settings(),
            application: application,
            dev: utils.config.dev(),
            req: req,
            stations: result.data || []
        });
    });
}

export function setup(app: express.Application, application: IApplication, callback) {

    /*
     Stations
     */

    try {

        app.get('/stations', application.enforceSecure, api.authenticate, function(req: any, res) {
            getStations(req, res, application);
        });

        app.get('/stations/data', application.enforceSecure, api.authenticate, function(req: any, res) {

            utils.noCache(res);

            //  always refresh the station list here, since all edits redir back here
            api.REST.client.get('/v1/monitoring/stations', function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

                //  flatten data for use in UI
                if (result.data) {
                    let stations = [], project = api.getProject(req, req['session'].currentProjectId), disabled = [];

                    if (project && project.data && project.data.disabledStations) {
                        disabled = project.data.disabledStations;
                    }

                    for (let key in result.data) {

                        if (result.data.hasOwnProperty(key)) {
                            let item = result.data[key];
                            item.id = +key;

                            if (disabled.indexOf(+key) > -1)
                                item.disabled = true;

                            stations.push(item)
                        }
                    }
                    result.data = stations;
                }
                api.REST.sendConditional(res, err, result ? result.data : null);
            });
        });

        app.get('/stations/enable/:id/', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

            api.REST.client.get('/v1/monitoring/stations/enable/' + req.params['id'] + '?projectId=' + req['session'].currentProjectId + '&accessToken=' + req['session'].accessToken, function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response) {

                if (!err) {

                    let project = api.getProject(req, req['session'].currentProjectId);

                    if (!project.data)
                        project.data = {};

                    if (!project.data.disabledStations)
                        project.data.disabledStations = [];

                    let index = project.data.disabledStations.indexOf(+req.params['id']);

                    if (index > -1)
                        project.data.disabledStations.splice(index, 1);
                }

                api.REST.sendConditional(res, err);
            });
        });

        app.get('/stations/disable/:id/', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

            api.REST.client.get('/v1/monitoring/stations/disable/' + req.params['id'] + '?projectId=' + req['session'].currentProjectId + '&accessToken=' + req['session'].accessToken, function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response) {

                if (!err) {

                    let project = api.getProject(req, req['session'].currentProjectId);

                    if (!project.data)
                        project.data = {};

                    if (!project.data.disabledStations)
                        project.data.disabledStations = [];

                    project.data.disabledStations.push(+req.params['id']);
                }

                api.REST.sendConditional(res, err);
            });
        });

        callback();
    } catch (err) {
        console.dir(err);
        callback(err);
    }
}
