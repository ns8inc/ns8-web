import utils = require("ns8-utils");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import web = require('ns8-web');

/*
 Set up routes - this script handles functions required for managing access tokens
 */

export function setup(app: express.Application, application: web.IApplication, callback) {

    app.get('/accesstokens', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        let projectFilter = req.query.projectId ? '&projectId=' + req.query.projectId : '';

        api.REST.client.get('/v1/accesstokens?accessToken=' + req['session'].accessToken + 
            '&type=api' + projectFilter, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

            let tokens = [];

            if (err) {
                req.flash('error', err.message);
            } else {
                tokens = result.data.accessTokens;
            }

            tokens.forEach(function(token) {

                if (new Date(Date.parse(token.expiration)).getFullYear() > 2900)
                    token.expiration = 'N/A';
            });

            res.render('accessTokens', {
                req: req,
                application: application,
                accessTokens: tokens,
                projectId: req.query.projectId || 0,
                projectName: req.query.projectName || ''
            });
        });
    });

    app.post('/accesstokens', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        if (!req.body.expires) {
            req.body.expires = new Date(Date.parse('3000-01-01'));
        }

        let permissions = [];

        if (req.body.pushAccess == 'true')
            permissions.push('push');

        if (req.body.queryAccess == 'true')
            permissions.push('query');

        let params: any = {
            accessToken: req['session']['accessToken'],
            accountId: req['session'].account.id,
            permissions: permissions,
            expiration: req.body.expires,
            type: 'api'
        };

        if (req.body.projectId)
            params.projectId = req.body.projectId;

        api.REST.client.post('/v1/accesstokens', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err, result);
        });
    });

    app.delete('/accesstokens', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        api.REST.client.del('/v1/accesstokens/' + req.body['accessToken'] + '?accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response) {
            api.REST.sendConditional(res, err);
        });
    });

    callback();
}

