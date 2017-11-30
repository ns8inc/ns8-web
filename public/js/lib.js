
// ----------------------------------------------------------------------------
//  Common javascript routines
// ----------------------------------------------------------------------------

//  Set up namespace and add all functions to namespace to prevent conflicts

//  set by top panel
var projects = null;

/*  ----------  Data routines  ----------
 Functions that get/create/update/delete data objects
 */

var Data = {

    //  show the error from an ajax call
    showError: function(request, status, error, inline) {
        //  find the most relevant error
        var message;

        if (request && request.responseJSON && request.responseJSON.message)
            message = request.responseJSON.message;
        else if (error)
            message = error;
        else if (request && request.statusText)
            message = request.statusText;
        else
            message = 'Internal error';

        if (inline)
            Page.showMessage(message);
        else
            Page.alert({ title: 'Error', text: message, type: 'error' });
    },

    //  Call the API methods PUT (to update) or POST (to create) form data.
    submitForm: function (url, data, successFunction) {
        $.ajax({
            type: data.hasOwnProperty('id') && data.id ? "PUT" : "POST",    //  if the data object has an id, PUT the update
            url: url,
            data: data,
            success: function (data, status) {
                successFunction(data);
            },
            error: function (request, status, error) {
                Data.showError(request, status, error);
            }
        });
    },

    //  delete a data object - this call expects the id of the data object to be part of the path
    delete: function (url, successFunction) {
        $.ajax({
            type: "DELETE",
            url: url,
            success: function (data, status) {
                successFunction(data);
            },
            error: function (request, status, error) {
                Data.showError(request, status, error);
            }
        });
    }
};

/*  ----------  Page routines  ----------
 These routines depend on a page structure that has:
 - jQuery
 - Bootstrap
 - A div for messages: id = messagePlaceholder
 - A div for a preloader: id = preloader
 */
var Page = {

    alert: function(params) {
        swal.apply(this, arguments);
    },

    confirm: function(title, text, okCallback) {
        swal({
                title: title,
                text: text,
                type: "warning",
                showCancelButton: true,
                confirmButtonClass: "btn-danger",
                confirmButtonText: 'Confirm'
            },
            function() {setTimeout(okCallback, 100)}  // delay is for multiple dialogs
        );
    },

    showMessage: function(message) {
        var messageHtml = '<div class="alert alert-warning alert-dismissable"><button aria-hidden="true" data-dismiss="alert" class="close" type="button">' +
            '<span style="font-size:16px">x</span></button>' +
            message + '</div>';
        $('#messagePlaceholder').html(messageHtml);
    },

    clearMessage: function () {
        $('#messagePlaceholder').html('');
    },

    showLoading: function () {
        $('#preloader').css("visibility", "visible");
    },

    doneLoading: function () {
        $('#preloader').css("visibility", "hidden");
    },

    menuItems: {},
    menuLogo: '',
    menuLogoSmall: '',
    intro: null,

    startIntro: function() {
        var intro = introJs();
        intro.setOptions(Page.intro);
        intro.start();
    },

    renderMenu: function(logo, logoSmall) {

        //  build html for menu
        var menuHtml = function() {
            var html = '<ul class="nav" id="side-menu">';

            if (Page.menuLogo) {

                html += '<li class="nav-header">' +
                    '  <div class="dropdown profile-element">' +
                    '    <a href="/"><img alt="image" src="' + Page.menuLogo + '" style="width:150px;margin-top:-10px" /></a>' +
                    '  </div>' +
                    '  <div class="logo-element">' +
                    '    <a href="/"><img alt="image" src="' + Page.menuLogoSmall + '" style="width:40px;margin-top:-10px" /></a>' +
                    '  </div>' +
                    '</li>';
            }

            for (var m = 0; m < Page.menuItems.length; m++) {
                html += menuItemHtml(Page.menuItems[m])
            }

            if (Page.intro)
                html +=  menuItemHtml({
                    title: 'Tour Page',
                    icon: 'fa fa-play-circle',
                    url: 'javascript:Page.startIntro();'
                });

            return html + '</ul>';
        };

        var menuItemHtml = function(item) {
            var html = '', isActive = localStorage.activeMenu == item.title;

            if (isActive)
                html += '<li class="active">';
            else
                html += '<li>';

            html += '<a href="' + (item.url || '#') + '" ' + (item.target ? 'target="' + item.target + '" ' : '') + 'onclick="localStorage.activeMenu = \'' + item.title + '\'">';

            if (item.icon)
                html += '<i class="' + item.icon + '"></i> ';

            html += '<span class="nav-label">' + item.title + '</span>';

            if (item.items)
                html += '<span class="fa arrow"></span>';

            html += '</a>';

            if (item.items) {
                html += '<ul class="nav nav-second-level' +  (isActive ? '' : ' collapse') + '">';

                for (var l2 = 0; l2 < item.items.length; l2++) {
                    var item2 = item.items[l2];
                    var isSubActive = localStorage.activeSubMenu == item2.title;

                    if (isActive && isSubActive && item2.items)
                        html += '<li class="active">';
                    else
                        html += '<li>';

                    html += '<a href="' + (item2.url || '#') + '" ' + (item2.target ? 'target="' + item2.target + '" ' : '') + 'onclick="localStorage.activeSubMenu = \'' + item2.title + '\'">' + item2.title;

                    if (item2.items)
                        html += ' <span class="fa arrow"></span>';

                    html += '</a>';

                    //  max 3 levels
                    if (item2.items) {
                        html += '<ul class="nav nav-third-level' +  (isActive && isSubActive ? '' : ' collapse') + '">';

                        for (var l3 = 0; l3 < item2.items.length; l3++) {
                            var item3 = item2.items[l3];

                            html += '<li><a href="' + (item3.url || '#') + '"' + (item3.target ? ' target="' + item3.target + '" ' : '') + '>' + item3.title + '</a></li>';
                        }
                        html += '</ul>';
                    }
                    html += '</li>';
                }
                html += '</ul>';
            }
            return html + '</li>';
        };

        $('#side-menu-container').html(menuHtml());
        $('#side-menu').metisMenu();
    }
};

//  ----------  Utility routines  ----------
var Utils = {

    getCookie: function(name) {
        var name = name + "=";
        var ca = document.cookie.split(';');

        for(var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
        }
        return "";
    },

    setCookie: function (name, val, days) {
        var expires = '';

        if (days) {
            var d = new Date();
            d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "expires="+d.toUTCString();
        }
        document.cookie = name + "=" + val + "; " + expires;
    },

    //  SHALLOW clone an object into a new object.  No functions will be carried over.
    clone: function(o) {

        var copy = Object.create(o.constructor.prototype);

        if (!o || typeof (o) != 'object')
            return o;

        return JSON.parse(JSON.stringify(o));
    },

    //  Shallow object equivalence test.  Does not support embedded objects, NaN or functions
    isEqual: function (a, b) {
        var aProps = Object.getOwnPropertyNames(a);
        var bProps = Object.getOwnPropertyNames(b);

        if (aProps.length != bProps.length) {
            return false;
        }

        for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];

            if (a[propName] !== b[propName]) {
                return false;
            }
        }

        return true;
    },

    //  return whether an object is an array or not
    isArray: function (obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    },

    replaceAll: function (str, find, replace) {
        return str ? str.replace(new RegExp(find, 'g'), replace) : '';
    },

    dateDiff: function (date1, date2) {
        var datediff = Date.parse(date2) - Date.parse(date1);
        return Math.round(datediff / (24 * 60 * 60 * 1000));
    },

    isNumber: function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },

    getParam: function (key, query) {
        if (!query)
            query = window.location.search;
        var re = new RegExp("[?|&]" + key + "=(.*?)&");
        var matches = re.exec(query + "&");
        if (!matches || matches.length < 2)
            return "";
        return decodeURIComponent(matches[1].replace("+", " "));
    },

    stripParam: function (key, query) {
        if (!query)
            query = window.location.search;

        var pos2, pos = query.indexOf('?' + key + '='), delim = '?';

        if (pos == -1) {
            delim = '&';
            pos = query.indexOf('&' + key + '=');
        }

        if (pos > -1) {
            pos2 = query.indexOf('&', pos + 1);

            if (pos2 == -1) {
                pos2 = query.indexOf('#', pos + 1);
            }

            if (pos2 == -1) {
                query = query.substr(0, pos);
            }
            else {
                query = query.substr(0, pos) + delim + query.substr(pos2 + 1);
            }
        }

        return query;
    },

    setParam: function (key, value, query, doNotEncode) {

        query = query || window.location.search;

        query = Utils.stripParam(key, query);
        var anchor = '';

        if (query.indexOf('#') > -1) {
            anchor = query.substr(query.indexOf('#'));
            query = query.substr(query, query.indexOf('#'));
        }

        if (query.indexOf('?') > -1 || query.indexOf('&') > -1) {
            return query + "&" + key + '=' + (doNotEncode ? value : encodeURI(value)) + anchor;
        }
        else {
            return query + "?" + key + '=' + (doNotEncode ? value : encodeURI(value)) + anchor;
        }
    }
};

/*
    A simple form to display and edit JSON data
 */
function JSONForm(data, target) {
    var html = '<form role="form">';

    for (var prop in data) {

        if (data.hasOwnProperty(prop)) {
            html += '<div class="form-group"><label>' + prop + '</label> <input type="email" placeholder="Enter email" class="form-control"></div>';
        }
    }

    $('#' + target).html(html);
    return html + '</form>'
}

//  Global setup function after document is ready
$(document).ready(function() {
    $('[data-toggle="tooltip"]').tooltip();
    
    //  check for partnerid
    if (localStorage && Utils.getParam('partnerid')) 
        localStorage['partnerId'] = Utils.getParam('partnerid');
    
});