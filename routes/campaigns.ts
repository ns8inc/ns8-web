import utils = require("ns8-utils");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import {IApplication} from "ns8-web";

/*
 Set up routes - this script handles functions required for managing campaigns
 */

export function setup(app: express.Application, application: IApplication, callback) {

    /*
        Campaign referrers
     */

    //  get all campaign referrers for project and show list of them
    app.get('/setup/campaignreferrers/:projectId', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        let projectId = req.params.projectId;

        if (projectId == 'current')
            projectId = req.session.currentProjectId;

        //  always refresh the project list here, since all edits redir back here
        api.REST.client.get('/v1/projects?accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

            if (err)
                req.flash('error', err.message);
            else
                req['session'].projects = result.data.projects;

            let project = api.getProject(req, +projectId);

            res.render('campaignReferrers', {
                application: application,
                settings: utils.config.settings(),
                campaignReferrers: project.data && project.data.campaignReferrers ? project.data.campaignReferrers : [],
                req: req
            });
        });
    });

    //  update existing data
    app.put('/setup/campaignreferrers/:projectId', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        let projectId = req.params.projectId;

        if (projectId == 'current')
            projectId = req.session.currentProjectId;

        let project = api.getProject(req, +projectId);

        let params = {
            accessToken: req['session'].accessToken,
            projectId: project.id,
            campaignReferrers: req.body.campaignReferrers
        };

        api.REST.client.put('/v1/analytics/campaignreferrers', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err);
        });
    });


    /*
         Campaign ids
      */

    //  get all campaign ids for account and show list of them
    app.get('/setup/campaignids/:projectId', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        let projectId = req.params.projectId;

        if (projectId == 'current')
            projectId = req.session.currentProjectId;

        //  always refresh the project list here, since all edits redir back here
        api.REST.client.get('/v1/projects?accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

            if (err)
                req.flash('error', err.message);
            else
                req['session'].projects = result.data.projects;

            let project = api.getProject(req, +projectId);

            res.render('campaignIds',{
                application: application,
                settings: utils.config.settings(),
                campaignIds: project.data && project.data.campaignIds ? project.data.campaignIds.join(',') : '',
                req: req
            });
        });
    });

    //  update existing data
    app.put('/setup/campaignids/:projectId', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        let projectId = req.params.projectId;

        if (projectId == 'current')
            projectId = req.session.currentProjectId;

        let project = api.getProject(req, +projectId);

        let params = {
            accessToken: req['session'].accessToken,
            projectId: project.id,
            campaignIds: req.body.campaignIds.split(',')
        };

        api.REST.client.put('/v1/analytics/campaignids', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err);
        });
    });

    callback();
}