import utils = require("ns8-utils");
import api = require("ns8-api");

/*
    Shopify OAuth and API helpers
 */

//  the API host Shopify should use.  In local mode, it is an Ngrok tunnel to the development machine
export function apiHost(): string {
    return utils.config.env() == 'local' ? 'https://api-host.ngrok.io' : utils.config.settings().apiUrl;
}

//  Launch a Shopify app.  Return whether app launch/login was successful.  Possible outcomes are errors, an OAuth redirect or success.
export function launch(application, req, res, callback?: (launched: boolean) => void) {

    let params = {
        appId: application.current.id,
        query: req.query,
        redirect_uri: utils.config.dev() ? 'https://' + req.headers['host'] + '/shopify/install' : 'https://' + utils.config.settings().domain + '/shopify/install'
    };

    //  this checks for a valid user name equal to the shop name and that the shop has the app installed
    api.REST.client.post('/v1/shopify/launch', params, function (err, apiRequest, apiResponse, result) {

        //  if the user does not exist or the app is not installed, redirect to the app's authorization or billing activation url
        if (apiResponse && apiResponse.statusCode == 300 && result && result.location) {
            res.redirect(result.location);

            if (callback)
                callback(false);

        } else if (err) {
            res.sendStatus(500);

            if (callback)
                callback(false);
        } else {
            api.setSessionAuth(req, result.data);

            //  refresh the project list
            api.REST.client.get('/v1/projects?accessToken=' + result.data.accessToken, function(err, apiRequest, apiResponse, result: any) {

                if (err)
                    req.flash('error', err.message);
                else
                    req['session'].projects = result.data.projects;

                res.redirect(application.branding.postLoginUrl);

                if (callback)
                    callback(true);
            });
        }
    });
}

export function install(application, req, res, callback: (err?: api.errors.APIError) => void) {

    let params = {
        appId: application.current.id,
        query: req.query,
        uri: utils.config.dev() ? 'https://' + req.headers['host'] : 'https://' + utils.config.settings().domain,
        partnerId: req.cookies ? req.cookies.partnerId : null
    };

    //  perform base install/authentication
    api.REST.client.post('/v1/shopify/install', params, function (err, apiRequest, apiResponse, result) {

        if (err) {
            callback(err);
        } else {
            api.setSessionAuth(req, result.data);
            callback();
        }
    });
}

export function uninstall(application, req, res, callback: (err?: api.errors.APIError) => void) {

    let params = {
        appId: application.current.id,
        headers: req.headers,
        body: req['rawBody'],
    };

    //  perform uninstall
    api.REST.client.post('/v1/shopify/uninstall', params, function (err, apiRequest, apiResponse, result) {
        callback(err);
    });
}
