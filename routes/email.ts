import utils = require("ns8-utils");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import {IApplication} from "../lib";

/*
 Set up routes - this script handles functions required for managing access tokens
 */

export function setup(app: express.Application, application: IApplication, callback) {

    app.get('/email/unsubscribe', function (req: express.Request, res: express.Response) {

        res.render('./api/unsubscribe', {
            application: application,
            settings: utils.config.settings(),
            req: req
        });
    });

    app.post('/email/unsubscribe', function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        var params: any = {
            lid: req.body.lid,
            cid: req.body.cid,
            sid: req.body.sid,
            uid: req.body.uid,
            aid: req.body.aid
        };

        api.REST.client.post('/v1/email/unsubscribe', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
            api.REST.sendConditional(res, err, result);
        });
    });

    callback();
}

