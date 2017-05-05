import utils = require("ns8-utils");
import web = require("ns8-web");
import express = require('express');
import api = require('ns8-api');
import {IApplication} from "ns8-web";

import _apiRoutes = require('./api');
import _projectRoutes = require('./projects');
import _reportingRoutes = require('./reporting');
import _segmentRoutes = require('./segments');
import _campaignRoutes = require('./campaigns');
import _dashboardRoutes = require('./dashboards');
import _bookmarkRoutes = require('./bookmarks');
import _developerRoutes = require('./developer');
import _attributeRoutes = require('./attributes');
import _paymentRoutes = require('./payments');
import _emailRoutes = require('./email');
import _accessTokenRoutes = require('./accessTokens');
import _contactRoutes = require('./contacts');
import _monitorRoutes = require('./monitors');
import _stationRoutes = require('./stations');

export let apiRoutes = require('./api');
export let projectRoutes = require('./projects');
export let reportingRoutes = require('./reporting');
export let segmentRoutes = require('./segments');
export let campaignRoutes = require('./campaigns');
export let dashboardRoutes = require('./dashboards');
export let bookmarkRoutes = require('./bookmarks');
export let developerRoutes = require('./developer');
export let attributeRoutes = require('./attributes');
export let paymentRoutes = require('./payments');
export let emailRoutes = require('./email');
export let accessTokenRoutes = require('./accessTokens');
export let contactRoutes = require('./contacts');
export let monitorRoutes = require('./monitors');
export let stationRoutes = require('./stations');

export function setup(app: express.Application, application: IApplication, callback) {

    /*
     Set up routes - this script handles module admin functions
     */

    try {

        accessTokenRoutes.setup(app, application, function() {

            apiRoutes.setup(app, application, function(){

                attributeRoutes.setup(app, application, function(){

                    bookmarkRoutes.setup(app, application, function() {

                        dashboardRoutes.setup(app, application, function() {

                            campaignRoutes.setup(app, application, function() {

                                projectRoutes.setup(app, application, function() {

                                    reportingRoutes.setup(app, application, function() {

                                        developerRoutes.setup(app, application, function() {

                                            segmentRoutes.setup(app, application, function() {

                                                paymentRoutes.setup(app, application, function() {

                                                    emailRoutes.setup(app, application, function() {                                                        
                                                        callback();
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                     });
                });
            });
        });
    } catch (err) {
        console.dir(err);
        callback(err);
    }
}