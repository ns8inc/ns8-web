import utils = require("ns8-utils");

import _routes = require('../routes/setup');
import _shopify = require('../lib/shopify');
import _dictionaries = require('./dictionaries');

export let routes = _routes;
export let shopify = _shopify;
export let dictionaries = _dictionaries;

export function renderError(req, res, message) {
    res.render('errorPage', { req: req, message: message ? message : 'Unknown error'});
}

/**
 * Look for a partner id on the query string and drop a cookie to track partner signups.
 */
export function setPartnerCookie(req, res) {

    //  drop partner id cookie if passed in - this will be used to assign the partner from the install
    let partnerId =  req.query.partnerId || req.query.partnerid;

    if (partnerId) {
        res.cookie('partnerId', partnerId, { maxAge: 1000 * 3600 * 24 * 365 });  // one year expiration
    }
}

/**
 * Based on the user-agent, just return a 200.  This is to block certain bots.
 * @param req
 * @param res
 * @param {Function} next
 * @returns {any}
 */
export function blocker(req, res, next: Function) {
    if (req && req.headers && req.headers['user-agent']) {
        let blockedUAs = [
            'www.opensiteexplorer.org',
            'http://ahrefs.com',
            'ELB-HealthChecker',
            'SemrushBot',
            'CFNetwork'
        ];
        let ua = req.headers['user-agent'];

        for (let i = 0; i < blockedUAs.length; i++) {
            if (ua.indexOf(blockedUAs[i]) > -1) {
                res.sendStatus(200);
                return;
            }
        }
    }
    next();

}

//  An application can have a custom middleware.  If it doesn't, it uses this placeholder.
export function statusCheckPlaceholder(req, res, next: Function) {
    return next();
}

export class MenuLink {
    public title: string;
    public url: string;

    constructor(title: string, url: string) {
        this.title = title;
        this.url = url;
    }
}

export class MenuItem {
    public title: string;
    public iconClass: string;
    public link: MenuLink;
    public subItems: Array<MenuItem>;
    public target: string;

    constructor(title: string, iconClass: string, link: MenuLink, item) {

    }
}
