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
    app.get('/shopify/realmchanged', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        res.render('realmChanged', {
            settings: utils.config.settings(),
            application: application,
            dev: utils.config.dev(),
            req: req
        });
    });

    callback();
}

