import utils = require("ns8-utils");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import {IApplication} from "ns8-web";

/*
 Set up routes - this script handles functions required for managing the API
 */

let client2: restify.Client = restify.createJsonClient({
    url: utils.config.settings()['apiUrl'],
    version: '*',
    signRequest: function(req) {
        req.headers = req._headers;
        req.setHeader('accessToken', 'we');
    }
});

export function setup(app: express.Application, application: IApplication, callback) {

    //  proxy client api calls to api-host
    app.post('/apiproxy', application.enforceSecure, api.authenticateNoRedirect, function (req: express.Request, res: express.Response) {

        if (!req.body || !req.body.verb || !req.body.path) {
            api.REST.sendError(res, new api.errors.MissingParameterError());
        } else if (!req.session || !req.session.accessToken) {
            api.REST.sendError(res, new api.errors.UnauthorizedError());
        } else {

            switch (req.body.verb.toUpperCase()) {

                case 'DEL':
                    api.client.del(req.body.path, function(err, apiRequest: restify.Request, apiResponse: restify.Response) {
                        api.REST.sendConditional(res, err);
                    });
                    break;

                case 'GET':
                    client2.get(req.body.path, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                        api.REST.sendConditional(res, err, result);
                    });
                    break;

                case 'POST':
                    api.client.post(req.body.path, req.body.data, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                        api.REST.sendConditional(res, err, result);
                    });
                    break;

                case 'PATCH':
                    api.client.patch(req.body.path, req.body.data, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                        api.REST.sendConditional(res, err, result);
                    });
                    break;

                case 'PUT':
                    api.client.put(req.body.path, req.body.data, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                        api.REST.sendConditional(res, err, result);
                    });
                    break;

                default:
                    api.REST.sendError(res, new api.errors.BadRequestError('No such verb'));
            }
        }
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

