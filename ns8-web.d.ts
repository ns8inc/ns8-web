declare module 'ns8-web' {
    import api = require('ns8-api');

    export class Item {
        constructor(key: number, code: string, description?: string);
        key: number;
        code: string;
        description: string;
    }

    export class Dictionary<T extends Item> {
        keys: Array<Item>;
        codes: any;
        find(index): T
    }

    export module dictionaries {

        export enum MonitorTypes {
            website = 0,
            DBL = 1,
            email = 2,
            GSB = 3,
            performance = 4,
            scoring = 5,
            DNS = 6,
            certificate = 7,
            ping = 8,
            port = 9,
            portScan = 10
        }
        export let monitorTypes: Dictionary<Item>
    }

    export interface IBranding {
        productName: string;
        companyName: string;
        scriptName: string;
        logoDarkBackground: string;
        logoLightBackground: string;
        logoMenu: string;
        logoMenuSmall: string;
        supportEmail: string;
        salesEmail: string;
        salesPhone: string;
        address1: string;
        address2: string;
        primaryColor: string;
        signupUrl: string;
        postSignupUrl: string;
        loginUrl: string;
        postLoginUrl: string;
    }

    //  Dashboard pod
    export class Pod {
        display: string;
        title: string;
        state: Object;
    }

    export class Dashboard {
        createdDate: any;
        pods: Array<string>;
    }

    export function blocker(req, res, next: Function);
    export function renderError(req, res, message);

    export class MenuLink {
        public title: string;
        public url: string;
        constructor(title: string, url: string);
    }

    export class MenuItem {
        public title: string;
        public iconClass: string;
        public link: MenuLink;
        public subItems: Array<MenuItem>;
        public target: string;
        constructor(title: string, iconClass: string, link: MenuLink, item);
    }

    export interface Report {
        description?: string;
        options: Object;
    }

    export interface Reports {
        Types: Object;
        definitions: Array<Report>;
    }

    export interface IApplication {
        settings: api.ISettings;
        api: any;
        current: any;
        branding: IBranding;
        projectTypes?: Object;
        projectDesc?(type): string;
        defaultDashboard(type): Object;
        menuItems?(user, account, project): Array<MenuItem>;
        enforceSecure(req, res, next: Function);
        statusCheck(req, res, next: Function);
        reports: Reports;
    }

    export let trackingProjectId: number;
    export let GATrackingId: string;
    export let GARemarketingId: string;
    export let GATagManagerId: string;

    module routes {
        export function setup(app, application, callback);

        module apiRoutes {
            export function setup(app, application, callback);
        }

        module accessTokenRoutes {
            export function setup(app, application, callback);
        }

        module paymentRoutes {
            export function setup(app, application, callback);
        }

        module bookmarkRoutes {
            export function setup(app, application, callback);
        }

        module projectRoutes {
            export function setup(app, application, callback);
        }

        module dashboardRoutes {
            export function setup(app, application, callback);
        }

        module campaignRoutes {
            export function setup(app, application, callback);
        }

        module reportingRoutes {
            export function setup(app, application, callback);
            export function getReport(application, req, res);
        }

        module emailRoutes {
            export function setup(app, application, callback);
        }

        module contactRoutes {
            export function setup(app, application, callback);
        }

        module monitorRoutes {
            export function setup(app, application, callback);
        }

        module stationRoutes {
            export function setup(app, application, callback);
        }

        module shopifyRoutes {
            export function setup(app, application, callback);
        }

        module systemRoutes {
            export function setup(app, application, callback);
        }
    }

    module shopify {
        export function launch(application: IApplication, req, res, callback?: (launched: boolean) => void);
        export function install(application: IApplication, req, res, callback: (err?: api.errors.APIError) => void);
        export function uninstall(application: IApplication, req, res, callback: (err?: api.errors.APIError) => void);
        export function apiHost(): string;
    }
}

