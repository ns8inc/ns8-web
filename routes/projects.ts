import utils = require("ns8-utils");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import {IApplication} from "../lib";

/*
 Set up routes - this script handles functions required for managing projects
 */

export function setup(app: express.Application, application: IApplication, callback) {

    //  set the current project id as a session variable
    app.get('/defaultproject/:id/', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);
        req['session']['currentProjectId'] = req.params.id;

        let params = {
            accessToken: req['session']['accessToken'],
            projectId: req.params.id
        };

        api.REST.client.post('/v1/users/defaultproject', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            res.send('OK');
        });
    });

    //  get all projects for account and show list of them
    app.get('/setup/projects', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  always refresh the project list here, since all edits redir back here
        api.REST.client.get('/v1/projects?accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

            if (err)
                req.flash('error', err.message);
            else
                req['session'].projects = result.data.projects;

            //  make sure the default project exists in the project list
            let found = false;

            if (req['session'].currentProjectId && req['session'].projects) {

                for (let p = 0; p < req['session'].projects.length; p++) {
                    if (req['session'].projects[p].id == req['session'].currentProjectId) {
                        found = true;
                        break;
                    }
                }
            }

            if (!found) {

                if (req['session'].projects.length > 0)
                    req['session'].currentProjectId = req['session'].projects[0].id;
            }

            res.render('projects',{
                application: application,
                settings: utils.config.settings(),
                existingProjects: result && result.data ? (result.data.projects ? result.data.projects : []) : [],
                req: req
            });
        });
    });

    //  display maintenance form
    app.get('/setup/projects/form', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  get project to edit
        let projects = req['session']['projects'], project = null;

        project = api.getProject(req, req.query.id);

        if (!req['session'].projects)
            req['session'].projects = [];

        res.render('projectsForm', {
            settings: utils.config.settings(),
            application: application,
            dev: utils.config.dev(),
            req: req,
            newUser: req.query.new ? true : false,
            dataObj: project
        });
    });

    //  create a new project
    app.post('/setup/projects', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        let params = {
            accessToken: req['session'].accessToken,
            name: req.body.name,
            type: +req.body.type,
            crossDomain: req.body.crossDomain == "true" ? true : false
        };

        api.REST.client.post('/v1/projects', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

            if (!err) {
                req['session'].currentProjectId = result.data.project.id;

                //  successful project creation, so add default dashboard
                let params = {
                    accessToken: req['session'].accessToken,
                    projectId: result.data.project.id,
                    dashboards: application.defaultDashboard(+req.body.type)
                };

                api.REST.client.put('/v1/projects/dashboards', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                    api.REST.sendConditional(res, err);
                });
            } else {
                api.REST.sendConditional(res, err);
            }
        });
    });

    //  update an existing project
    app.put('/setup/projects', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        let params = {
            id: +req.body.id,
            accessToken: req['session'].accessToken,
            name: req.body.name,
            type: +req.body.type,
            enabled: req.body.enabled,
            crossDomain: req.body.crossDomain == "true" ? true : false
        };

        api.REST.client.put('/v1/projects', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err);
        });
    });

    app.delete('/setup/projects/:id/', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        api.REST.client.del('/v1/projects/' + req.params['id'] + '?accessToken=' + req['session'].accessToken, function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response) {
            api.REST.sendConditional(res, err);
        });
    });

    //  get all shares for a project and show list of them
    app.get('/setup/projectshares', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        if (!req.query.projectId) {
            res.redirect('/setup/projects');
            return;
        }

        //  always refresh the project shares list here
        api.REST.client.get('/v1/projectshares?projectId=' + req.query.projectId + '&accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

            //  get project to edit
            let projectShares = [], project = api.getProject(req, req.query.projectId);

            if (err)
                req.flash('error', err.message);
            else
                projectShares = result.data.projectShares;

            res.render('projectShares',{
                application: application,
                settings: utils.config.settings(),
                projectShares: projectShares,
                project: project,
                req: req
            });
        });
    });

    //  display maintenance form
    app.get('/setup/projectshares/form', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  get project share to edit
        let project = api.getProject(req, req.query.projectId);

        if (req.query.userId) {
            api.REST.client.get('/v1/projectshares?userId=' + req.query.userId + '&projectId=' + req.query.projectId + '&accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

                res.render('projectSharesForm', {
                    settings: utils.config.settings(),
                    application: application,
                    dev: utils.config.dev(),
                    req: req,
                    project: project,
                    dataObj: result.data.projectShares[0]
                });
            });
        } else {

            res.render('projectSharesForm', {
                settings: utils.config.settings(),
                application: application,
                dev: utils.config.dev(),
                req: req,
                project: project,
                dataObj: null
            });
        }
    });

    //  update project share
    app.post('/setup/projectshares', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        let params = {
            accessToken: req['session'].accessToken,
            projectId: req.body.projectId,
            userName: req.body.userName,
            permissions: req.body.permissions
        };

        api.REST.client.post('/v1/projectshares', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err);
        });
    });

    app.delete('/setup/projectshares', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        api.REST.client.del('/v1/projectshares?userName=' + encodeURIComponent(req.query['userName']) + '&projectId=' + req.query['projectId'] + '&accessToken=' + req['session'].accessToken, function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response) {
            api.REST.sendConditional(res, err);
        });
    });

    callback();
}

