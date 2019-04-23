import utils = require("ns8-utils");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import {IApplication} from "../lib";

export function getContactParams(req) {
    let items, params: any = req.body;

    if (params.id)
        params.id = +params.id;

    if (params.delayOption == 'immediate')
        delete params.alertDelay;

    params.projectId = req['session'].currentProjectId;
    params.accessToken = req['session'].accessToken;
    params.endpoints = [];

    if (params.emailList) {
        items = params.emailList.split(',');

        for (let e = 0; e < items.length; e++) {
            params.endpoints.push({ type: 'email', value: items[e] });
        }
    }

    if (params.SMSList) {
        items = params.SMSList.split(',');

        for (let e = 0; e < items.length; e++) {
            params.endpoints.push({ type: 'SMS', value: items[e] });
        }
    }

    delete params.emailList;
    delete params.SMSList;

    return params;
}

export function setup(app: express.Application, application: IApplication, callback) {

    /*
     Contacts
     */

    try {

        app.get('/contacttypes', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
            res.render('contactTypes', {
                settings: utils.config.settings(),
                application: application,
                dev: utils.config.dev(),
                req: req,
            });
        });

        app.get('/contacts', application.enforceSecure, application.statusCheck, api.authenticate, function(req: any, res) {

            utils.noCache(res);

            res.render('contacts', {
                settings: utils.config.settings(),
                application: application,
                dev: utils.config.dev(),
                req: req
            });
        });

        app.get('/contacts/data', application.enforceSecure, api.authenticate, function(req: any, res) {

            utils.noCache(res);

            //  always refresh the project list here, since all edits redir back here
            api.REST.client.get('/v1/monitoring/contacts?projectId=' + req['session'].currentProjectId + '&accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                api.REST.sendConditional(res, err, result ? result.data : []);
            });
        });

        app.delete('/contacts/:id/', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

            api.REST.client.del('/v1/monitoring/contacts/' + req.params['id'] + '?accessToken=' + req['session'].accessToken, function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response) {
                api.REST.sendConditional(res, err);
            });
        });

        //  create a new contact
        app.post('/contacts', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
            utils.noCache(res);

            let params = getContactParams(req);

            api.REST.client.post('/v1/monitoring/contacts', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                api.REST.sendConditional(res, err);
            });
        });

        //  update an existing contact
        app.put('/contacts', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

            let params = getContactParams(req);

            api.REST.client.put('/v1/monitoring/contacts', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                api.REST.sendConditional(res, err);
            });
        });

        app.get('/contacts/test/:id/', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

            api.REST.client.get('/v1/monitoring/contacts/test/' + req.params['id'] + '?accessToken=' + req['session'].accessToken, function(err: Error, apiRequest: restify.Request, apiResponse: restify.Response) {
                api.REST.sendConditional(res, err);
            });
        });

        callback();
    } catch (err) {
        console.dir(err);
        callback(err);
    }
}
