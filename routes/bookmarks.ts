import utils = require("ns8-utils");
import express = require('express');
import restify = require('restify');
import api = require('ns8-api');
import {IApplication} from "../lib";

/*
 Set up routes - this script handles functions required for managing bookmarks
 */

export function setup(app: express.Application, application: IApplication, callback) {

    //  show all bookmarks for the current account
    app.get('/setup/bookmarks', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  always refresh the project list here, since all edits redir back here
        api.REST.client.get('/v1/projects?accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

            if (err)
                req.flash('error', err.message);
            else
                req['session'].projects = result.data.projects;

            res.render('bookmarks',{
                settings: utils.config.settings(),
                application: application,
                bookmarks: api.reporting.currentBookmarks(req),
                req: req
            });
        });
    });

    //  create a new bookmark
    app.post('/setup/bookmarks', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {

        if (!req.body.name || !req.body.query)
            api.REST.sendError(res, new api.errors.MissingParameterError('You must specify a name and destination.'));
        else {

            //  refresh data prior to updating data
            api.REST.client.get('/v1/projects?accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

                if (!err)
                    req['session'].projects = result.data.projects;
                else {
                    api.REST.sendError(res, new api.errors.InternalError());
                    return;
                }

                var bookmarks = api.reporting.currentBookmarks(req);
                bookmarks[req.body.name] = req.body.query;

                var params = {
                    accessToken: req['session'].accessToken,
                    projectId: req['session'].currentProjectId,
                    bookmarks: bookmarks
                };

                api.REST.client.put('/v1/projects/bookmarks', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                    api.REST.sendConditional(res, err);
                });
            });
        }
    });

    //  delete a bookmark and update the account
    app.delete('/setup/bookmarks', application.enforceSecure, api.authenticate, function (req: express.Request, res: express.Response) {
        utils.noCache(res);

        //  refresh data prior to updating data
        api.REST.client.get('/v1/projects?accessToken=' + req['session']['accessToken'], function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {

            if (!err)
                req['session'].projects = result.data.projects;
            else {
                api.REST.sendError(res, new api.errors.InternalError());
                return;
            }

            var bookmarks = api.reporting.currentBookmarks(req);

            delete bookmarks[req.query['name']];

            var params = {
                accessToken: req['session'].accessToken,
                projectId: req['session'].currentProjectId,
                bookmarks: bookmarks
            };

            api.REST.client.put('/v1/projects/bookmarks', params, function(err, apiRequest: restify.Request, apiResponse: restify.Response, result: any) {
                api.REST.sendConditional(res, err);
            });
        });
    });

    callback();
}

