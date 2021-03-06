import utils = require("ns8-utils");
import api = require("ns8-api");
import url = require('url');

/*
    Shopify OAuth and API helpers
 */

/**
 * The API host Shopify should use.  In local mode, it is an Ngrok tunnel to the development machine.
 * @returns {string}
 */
export function apiHost(): string {
    return utils.config.env() == 'local' ? 'https://api-host.ngrok.io' : utils.config.settings().apiUrl;
}

/**
 * Launch a Shopify app.  Return whether app launch/login was successful.  Possible outcomes are errors, an OAuth redirect or success.
 * @param application
 * @param req
 * @param res
 * @param callback
 */
export function launch(application, req, res, callback?: (launched: boolean) => void) {

    let params = {
        env: utils.config.env(),
        appId: application.current.id,
        query: req.query,
        redirect_uri: utils.config.dev() ? 'https://' + req.headers['host'] + '/shopify/install' : 'https://' + utils.config.settings().domain + '/shopify/install'
    };

    //  this checks for a valid user name equal to the shop name and that the shop has the app installed
    api.REST.client.post('/v1/shopify/launch', params, function (err, apiRequest, apiResponse, result) {

        //  if the user does not exist or the app is not installed, redirect to the app's authorization or billing activation url
        if (apiResponse && apiResponse.statusCode == 300 && result && result.location) {

            //  if the redirect is to a location that needs to be outside of the iframe, do a client based redirect to top
            if (result.top) {

                res.render('message', {
                    title: 'Redirecting',
                    message: "<script>window.top.location = '" + result.location + "'</script>",
                    settings: utils.config.settings(),
                    application: application,
                    req: req,
                    dev: utils.config.dev()
                });
            } else {
                res.redirect(result.location);
            }

            if (callback)
                callback(false);

        } else if (err) {
            api.logger.error('/v1/shopify/launch', req, err, params, result);
            res.status(500).send(err.message);

            if (callback)
                callback(false);
        } else {
            api.setSessionAuth(req, result.data);
            res.cookie('currentRealm', result.data.user.name, { secure: "auto", sameSite: "None" });

            //  refresh the project list
            api.REST.client.get('/v1/projects?accessToken=' + result.data.accessToken, function(err, apiRequest, apiResponse, result: any) {

                if (err)
                    req.flash('error', err.message);
                else
                    req['session'].projects = result.data.projects;

                let url = utils.appendQueryString(application.branding.postLoginUrl, 'shopifyqs', JSON.stringify(req.query));

                res.redirect(url);

                if (callback)
                    callback(true);
            });
        }
    });
}

/**
 * Call API to install an app.
 * @param application
 * @param req
 * @param res
 * @param callback
 */
export function install(application, req, res, callback: (err?: api.errors.APIError) => void) {

    let params = {
        appId: application.current.id,
        query: req.query,
        uri: utils.config.dev() ? 'https://' + req.headers['host'] : 'https://' + utils.config.settings().domain,
        partnerId: req.cookies ? req.cookies.partnerId || req.cookies.partnerid : null
    };

    //  perform base install/authentication
    api.REST.client.post('/v1/shopify/install', params, function (err, apiRequest, apiResponse, result) {

        if (err) {
            callback(err);
        } else {
            api.setSessionAuth(req, result.data);
            res.cookie('currentRealm', result.data.user.name);

            callback();
        }
    });
}

/**
 * Call API to uninstall an app.
 * @param application
 * @param req
 * @param res
 * @param callback
 */
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

/**
 * The only time a user should get to here is if they are running a browser that does not accept cookies in an iframe,
 * like Safari.  Therefore, we can't track session state.  The only way to fix this is to get the domain whitelisted by
 * the user (not through code) launching a window that sets a cookie.  So, this page explains the situation.
 *
 * @param application
 * @param req
 * @param res
 */
export function renderCookiesIssue(application, req, res) {
    let shop, returnUrl;

    //  look for the shop in the query params appended by the launch call - if it's not there, this page was accessed incorrectly
    if (req && req.query && req.query.shopifyqs) {
        shop = JSON.parse(req.query.shopifyqs).shop;
    } else if (req && req.headers && req.header('referrer')) {
        shop = url.parse(req.header('referrer')).host;
    }

    if (shop) {
        returnUrl = 'https://' + shop + '/admin/apps/';

        if (req.header('user-agent') && req.header('user-agent').indexOf('Shopify') > -1) {

            res.render('./api/cookiesUnsupported', {
                returnUrl: returnUrl,
                settings: utils.config.settings(),
                application: application,
                req: req,
                dev: utils.config.dev()
            });
        } else {

            res.render('./api/login', {
                returnUrl: returnUrl,
                settings: utils.config.settings(),
                application: application,
                req: req,
                dev: utils.config.dev()
            });
        }
    } else {

        res.render('message', {
            title: 'Launch Issue',
            message: 'We cannot determine which shop this app was launched from.  Please re-login to Shopify and re-launch the app',
            settings: utils.config.settings(),
            application: application,
            req: req,
            dev: utils.config.dev()
        });
    }
}

/**
 * Display the approved page, which redirects to the user's apps to relaunch the app.
 * @param application
 * @param req
 * @param res
 */
export function renderCookiesApproval(application, req, res) {

    res.render('./api/cookiesApproved', {
        returnUrl: req.query.returnurl,
        settings: utils.config.settings(),
        application: application,
        req: req,
        dev: utils.config.dev()
    });
}
