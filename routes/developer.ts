import utils = require("ns8-utils");
import express = require('express');
import api = require('ns8-api');
import {IApplication} from "../lib";

let gator = require('ns8-data-services');

/*
 Set up routes - this script handles functions required for managing developer routes
 */

export function setup(app: express.Application, application: IApplication, callback) {

    app.get('/developer/overview', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('overview',{
                settings: utils.config.settings(),
                application: application,
                req: req,
            });
        });
    });

    app.get('/developer/web/gettingstarted', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('gettingStarted',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/web/events', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('events',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/web/ecommerce', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('ecommerceEvents',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/web/outboundlinks', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('links',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/web/formposts', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('formPosts',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/web/multipleprojects', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('multipleProjects',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/web/javascriptapi', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('javascriptApi',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/entities', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('entities',{
                settings: utils.config.settings(),
                application: application,
                req: req,
                entities: api.reporting.entities
            });
        });
    });

    app.get('/developer/tools/querytester', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        if (req.query.query) {
            req.params.query = JSON.parse(req.query.query as string);
        }

        if (!req.params.query) {
            req.params.query = JSON.stringify({
                entity: 'sessions',
                projectId: req['session'].currentProjectId,
                timezone: req['session'].user.timezoneId,
                timeframe: 'today',
                group: 'browser',
                sort: { 'sessions': -1 },
                attributes: "sessions"
            });
        }

        res.render('queryTester', {
            application: application,
            req: req
        });
    });

    app.get('/developer/rest', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('restOverview',{
                settings: utils.config.settings(),
                application: application,
                req: req,
                timezones: utils.epoch.timezones
            });
        });
    });

    app.get('/developer/querylanguage', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('queryLanguage',{
                settings: utils.config.settings(),
                application: application,
                req: req,
                timezones: utils.epoch.timezones
            });
        });
    });

    app.get('/developer/accesstokens', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('accessTokensHelp',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/scoring', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('scoringHelp',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/scoring/node', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('scoringNode',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/scoring/dotnet', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('scoringDotnet',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/scoring/https', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('scoringHttps',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/scoring/curl', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            res.render('scoringCurl',{
                settings: utils.config.settings(),
                application: application,
                req: req
            });
        });
    });

    app.get('/developer/scoring/test', application.enforceSecure, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  non authenticated access is allowed
        req['noRedirect'] = true;

        api.authenticate(req, req, function () {

            let options: any = {
                accessToken: 'cB9nC1h5OHB19ABdePAyLiJgT0BN1JMm',
                ip: utils.ip.remoteAddress(req),
                ua: req.headers['user-agent'],
                referrer: req.headers['referer'],
                url: req.hostname,
                timeout: 900
            };

            if (process.env['NODE_ENV'] == 'local') {
                options.apiHost = '127.0.0.5';
                options.apiPort =8080;
                options.apiProtocol= 'http';
                options.ip = '72.23.32.45';
            }
            gator.score(options, function(err, result) {

                if (err)
                    result = err;
                else if (!result)
                    result = { code: 500, message: 'No result returned' };

                delete options.accessToken;

                res.render('scoringTest',{
                    settings: utils.config.settings(),
                    application: application,
                    req: req,
                    result: result,
                    options: options
                });
            });
        });
    });

    callback();
}

