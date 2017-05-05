import _routes = require('../routes/setup');
import _shopify = require('../lib/shopify');
import _dictionaries = require('./dictionaries');

export let routes = _routes;
export let shopify = _shopify;
export let dictionaries = _dictionaries;

let _flash = require('./flash');

export let flash = _flash;

export function renderError(req, res, message) {
    res.render('errorPage', { req: req, message: message ? message : 'Unknown error'});
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
