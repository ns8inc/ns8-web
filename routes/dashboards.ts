import utils = require("ns8-utils");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import web = require('ns8-web');
import lib = require('../lib/index');

/*
 Set up routes - this script handles functions required for managing dashboards
 */

export function getDashboard(application, req, res) {
    utils.noCache(res);

    let dashboards, name = req.query.name, template = req.query.template, dashboard: any = {}, editable = true;

    //  find the dashboard to display
    if (template) {
        editable = false;
        dashboard = application['getDashboardTemplate'](template, req.query);
    } else if (name) {
        dashboards = api.reporting.currentDashboards(req);
        dashboard = dashboards[name];
    } else if (typeof application.defaultDashboard == 'function') {
        dashboard = application.defaultDashboard();
    }

    if (dashboard) {

        dashboard.pods = dashboard.pods || [];

        //  add static report settings to the pod config
        for (let i = 0; i < dashboard.pods.length; i++) {

            let pod = JSON.parse(dashboard.pods[i]);

            if (pod.state && pod.state.id) {
                let report: any = application.reports.definitions[application.reports.Types[pod.state.id]];
                pod.settings = report ? report.settings : {};

                //  fill in initial state from definition where not in pod definition
                if (report.initialState) {

                    for (let key in report.initialState) {

                        if (report.initialState.hasOwnProperty(key) && !pod.state.hasOwnProperty(key))
                            pod.state[key] = report.initialState[key];
                    }
                }
            }

            //  fix up existing settings - this is to support prior formats
            pod.settings = pod.settings || {};

            if (pod.state.renderView)
                pod.settings.renderView = pod.state.renderView;

            if (pod.state.title)
                pod.settings.title = pod.state.title;

            if (pod.state.hasOwnProperty('isLog'))
                pod.settings.isLog = pod.state.isLog;

            if (!pod.settings.intervals)
                pod.settings.intervals = application.reports['intervals'];

            if (!pod.settings.ranges)
                pod.settings.ranges = application.reports['ranges'];

            if (!pod.state.dateLabel && pod.settings.intervals && pod.settings.intervals.defaultRange)
                pod.state.dateLabel = pod.settings.intervals.defaultRange;
            else if (!pod.state.dateLabel)
                pod.state.dateLabel = 'Last 30 Days';

            if (!pod.state.dateInterval && pod.settings.intervals && pod.settings.intervals.defaultOption)
                pod.state.dateInterval = pod.settings.intervals.defaultOption;
            else if (!pod.state.dateInterval)
                pod.state.dateInterval = 'Daily';

            dashboard.pods[i] = JSON.stringify(pod);
        }
    } else {
        req.flash('error', 'No such dashboard');
    }

    let view = 'dashboard';

    res.render(view, {
        application: application,
        settings: utils.config.settings(),
        req: req,
        dashboardName: name,
        dashboard: dashboard,
        title: req.query.title || '',
        editable: editable
    });
}

export function setup(app: express.Application, application: web.IApplication, callback) {

    let statusCheck: any = typeof application.statusCheck == 'function' ? application.statusCheck : lib.statusCheckPlaceholder;

    //  get all dashboards for project and show list of them
    app.get('/setup/dashboards', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  always refresh the project list here, since all edits redir back here
        api.REST.client.get('/v1/projects?accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

            if (err)
                req.flash('error', err.message);
            else
                req['session'].projects = result.data.projects;

            res.render('dashboards',{
                application: application,
                settings: utils.config.settings(),
                dashboards: api.reporting.currentDashboards(req),
                req: req
            });
        });
    });

    //  update existing data
    app.put('/setup/dashboards', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        let params = {
            accessToken: req['session'].accessToken,
            projectId: req['session'].currentProjectId,
            dashboards: req.body.dashboards
        };

        api.REST.client.put('/v1/projects/dashboards', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err);
        });
    });

    //  add a pod to a dashboard
    app.post('/setup/dashboards/pods', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        let dashboards = api.reporting.currentDashboards(req);

        let pod = {
            display: req.body.display,
            title:  req.body.title,
            state: req.body.state
        };

        dashboards[req.body.name].pods = dashboards[req.body.name].pods || [];
        dashboards[req.body.name].pods.push(JSON.stringify(pod));   //  need to stringify it or mongo won't store it (the $'s are a problem)

        let params = {
            accessToken: req['session'].accessToken,
            projectId: req['session'].currentProjectId,
            dashboards: dashboards
        };

        api.REST.client.put('/v1/projects/dashboards', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err);
        });
    });

    //  update the pod display order
    app.post('/setup/dashboards/order', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        let dashboards = api.reporting.currentDashboards(req);

        let newOrder = [];

        for (let i = 0; i < req.body.order.length; i++) {

            if (dashboards[req.body.name].pods[req.body.order[i]])
                newOrder.push(utils.clone(dashboards[req.body.name].pods[req.body.order[i]]));
        }

        dashboards[req.body.name].pods = newOrder;

        let params = {
            accessToken: req['session'].accessToken,
            projectId: req['session'].currentProjectId,
            dashboards: dashboards
        };

        api.REST.client.put('/v1/projects/dashboards', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err);
        });
    });

    //  delete a pod
    app.delete('/setup/dashboards/pods', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        let dashboards = api.reporting.currentDashboards(req);
        let dashboard = dashboards[req.body.name];

        dashboard.pods.splice(+req.body.pod, 1);

        let params = {
            accessToken: req['session'].accessToken,
            projectId: req['session'].currentProjectId,
            dashboards: dashboards
        };

        api.REST.client.put('/v1/projects/dashboards', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err);
        });
    });


    //  display a dashboard
    app.get('/dashboard', application.enforceSecure, api.authenticate, statusCheck, function (req: express.Request, res: express.Response) {
        getDashboard(application, req, res);
    });

    callback();
}

