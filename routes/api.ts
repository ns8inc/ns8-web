import utils = require("ns8-utils");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import {IApplication} from "ns8-web";

/*
 Set up routes - this script handles functions required for managing the API
 */

export function setup(app: express.Application, application: IApplication, callback) {

    app.post('/api/', application.enforceSecure, function (req: express.Request, res: express.Response) {

        //  specifying the appId will pull the user's account object into the authObject
        api.login(req.body['username'], req.body['password'], application.settings.appId, function(err, authObject) {

            if (!err)
                req.session.auth = authObject;

            api.REST.sendConditional(res, err, null, 'success');
        });
    });

    app.get('/developer/rest/:id', application.enforceSecure, function (req: express.Request, res: express.Response) {

        res.render('./developer/swagger', {
            req: req,
            application: application,
            dev: utils.config.dev(),
            spec: utils.config.settings().apiUrl + '/' + utils.config.settings().apiVersion + '/' + req.params['id'] + '.js'
        });
    });

    app.get('/login', application.enforceSecure, function (req: express.Request, res: express.Response) {

        //  check for a remote login
        if (req.query.accessToken) {
            res.redirect(application.branding.postLoginUrl + '?accessToken=' + req.query.accessToken);
            return;
        }

        res.render('./api/login', {
            req: req,
            application: application,
            dev: utils.config.dev()
        });
    });

    app.post('/login', application.enforceSecure, function (req: express.Request, res: express.Response) {

        //  specifying the appId will pull the user's account object into the authObject
        api.login(req.body['username'], req.body['password'], application.settings.appId, function(err, authObject) {

            if (!err)
                api.setSessionAuth(req, authObject);

            api.REST.sendConditional(res, err, null, 'success');
        });
    });

    //  reset password
    app.get('/reset', application.enforceSecure, function(req, res) {
        res.render('./api/reset', {
            req: req,
            application: application,
            dev: utils.config.dev()
        });
    });

    app.post('/reset', application.enforceSecure, function(req, res) {
        
        api.REST.client.get('/v1/reset/' + application.settings.appId + '/' + req.body.username, function(err, apiRequest: restify.Request, apiResponse: restify.Response) {
            api.REST.sendConditional(res, err, null, 'success');         
        });
    });

    app.get('/reset/change', application.enforceSecure, function(req, res) {
        res.render('./api/resetChange', {
            req: req,
            application: application,
            dev: utils.config.dev()
        });
    });

    app.post('/reset/change', application.enforceSecure, function(req, res) {

        api.REST.client.post('/v1/reset', req.body, function(err, apiRequest: restify.Request, apiResponse: restify.Response) {
            api.REST.sendConditional(res, err, null, 'success');
        });
    });

    app.get('/register', application.enforceSecure, function(req, res) {
        res.render('./api/register', {
            req: req,
            application: application,
            dev: utils.config.dev()
        });
    });

    app.post('/register', application.enforceSecure, function(req, res) {

        api.signup(req.body, function(err, authObject) {

            if (err) {
                api.REST.sendError(res, err);
            } else {
                api.setSessionAuth(req, authObject);
                api.REST.sendConditional(res, err);
            }
        });
    });

    //  handle logout
    app.get('/logout', application.enforceSecure, function(req: any, res) {
        api.logout(req, res);
    });

    callback();
}

