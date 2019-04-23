import utils = require("ns8-utils");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import web = require('ns8-web');

/*
 Set up routes - this script handles functions required for managing segments
 */

export function setup(app: express.Application, application: web.IApplication, callback) {

    //  get all segments for the current account
    app.get('/setup/segments', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  any route that requires segments should call this first
        api.reporting.getSegments(req, false, req['session'].account.appId, function(err) {

            if (err)
                req.flash('error', err.message);

            res.render('segments', {
                settings: utils.config.settings(),
                application: application,
                dev: utils.config.dev(),
                req: req
            });
        });
    });

    //  display for segment maintenance form
    app.get('/setup/segments/form', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        var projects = req['session']['projects'], projectIds = [];

        //  build list of projects
        if (projects) {

            for (var p = 0; p < projects.length; p++) {
                projectIds.push({ text: projects[p].name, value: projects[p].id });
            }
        }

        //  get segment to edit
        var segments = req['session']['segments'], segment = null;

        if (segments && req.query.id) {

            segments.forEach(function(item) {
                if (item.id == +req.query.id) {
                    segment = item;
                }
            });
        }

        res.render('segmentsForm', {
            settings: utils.config.settings(),
            application: application,
            dev: utils.config.dev(),
            req: req,
            projectIds: projectIds,
            dataObj: segment,
            filterOptions: api.reporting.getFilterOptions('sessions', false, false)
        });
    });

    //  create a new segment
    app.post('/setup/segments', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        var params: any = {
            accessToken: req['session'].accessToken,
            name: req.body.name,
            query: req.body.query || {}
        };

        if (req.body.projectId) {
            params.projectId = +req.body.projectId;
        }

        api.REST.client.post('/v1/analytics/segments', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err);
        });
    });

    //  update an existing segment
    app.put('/setup/segments', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        var params: any = {
            id: +req.body.id,
            accessToken: req['session'].accessToken,
            name: req.body.name,
            query: req.body.query || {}
        };

        if (req.body.projectId) {
            params.projectId = +req.body.projectId;
        }

        api.REST.client.put('/v1/analytics/segments', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err);
        });
    });

    app.delete('/setup/segments/:id/', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        api.REST.client.del('/v1/analytics/segments/' + req.params['id'] + '?accessToken=' + req['session'].accessToken, function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response) {
            api.REST.sendConditional(res, err);
        });
    });

    callback();
}

