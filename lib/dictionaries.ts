//    Static dictionaries used to hold common data.

//  This creates two arrays, so that items are indexable by both key and code.
export class Dictionary<T extends Item> {
    public keys = [];
    public codes = {};

    public add(item: T): void {
        this.keys[item.key] = item;
        this.codes[item.code] = item;
    }

    public find(index): T {

        if (typeof index == "number") {
            return this.keys[index];
        } else {
            return this.codes[index];
        }
    }

    public findDescription(description) {

        for (var i = 0; i < this.keys.length; i++)
            if (this.keys[i].description == description)
                return this.keys[i];
    }

    public list(sort: boolean = true) {
        var list = [];

        for (var key in this.codes) {

            if (this.codes.hasOwnProperty(key)) {
                list.push(this.codes[key].description);
            }
        }

        if (sort)
            return list.sort();
        else
            return list;
    }

    public codeList(sort: boolean = true) {
        var list = [];

        for (var key in this.codes) {

            if (this.codes.hasOwnProperty(key)) {
                list.push(key);
            }
        }

        if (sort)
            return list.sort();
        else
            return list;
    }
}

export class Item {

    constructor(key: number, code: string, description?: string) {
        this.key = key;
        this.code = code;

        if (description == null) {
            this.description = code;
        }
        else {
            this.description = description;
        }
    }

    key: number;
    code: string;
    description: string;
}

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

export var monitorTypes = new Dictionary<Item>();

monitorTypes.add(new Item(MonitorTypes.website, 'website', 'Website'));
monitorTypes.add(new Item(MonitorTypes.DBL, 'DBL', 'Domain Blocklist'));
monitorTypes.add(new Item(MonitorTypes.email, 'email', 'Email Blocklists'));
monitorTypes.add(new Item(MonitorTypes.GSB, 'GSB', 'Google Safe Browsing'));
monitorTypes.add(new Item(MonitorTypes.performance, 'performance', 'Real User Performance'));
monitorTypes.add(new Item(MonitorTypes.scoring, 'scoring', 'Malicious Bot/User Detection'));
monitorTypes.add(new Item(MonitorTypes.DNS, 'DNS', 'DNS Expected Values'));
monitorTypes.add(new Item(MonitorTypes.certificate, 'certificate', 'Certificate Validity'));
monitorTypes.add(new Item(MonitorTypes.ping, 'ping', 'Ping'));
monitorTypes.add(new Item(MonitorTypes.port, 'port', 'TCP Port'));
monitorTypes.add(new Item(MonitorTypes.portScan, 'portScan', 'Port Scan'));


