import utils = require("ns8-utils");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import {IApplication} from "ns8-web";

/*
 Set up routes - this script handles functions required for managing segments
 */

export function setup(app: express.Application, application: IApplication, callback) {

    //  get all segments for the current account
    app.get('/shopify/realmchanged', application.enforceSecure, api.authenticate, (req: express.Request, res: express.Response) => {

        let url = 'https://' + req.query.shop + '/admin/apps';
        let app: any = api.applications.items[utils.config.settings().appId];

        if (app && app.data && app.data.shopifyAppId)
            url += '/' + app.data.shopifyAppId;

        res.render('realmChanged', {
            settings: utils.config.settings(),
            application: application,
            dev: utils.config.dev(),
            req: req,
            url: url
        });
    });

    app.post('/shopify/cust/redact', (req: express.Request, res: express.Response) => {
        res.sendStatus(200);
    });

    app.post('/shopify/shop/delete', (req: express.Request, res: express.Response) => {
        res.sendStatus(200);
    });

    callback();
}

