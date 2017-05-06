
// ----------------------------------------------------------------------------
//  A proxy to route api-host calls through the web application
// ----------------------------------------------------------------------------

//  proxy api-host calls through the web application
var ApiProxy = {

    call: function(verb, url, data, callback) {

        var params = {
            verb: verb,
            url: url,
            data: data
        };

        $.ajax({
            type: 'POST',
            cache: false,
            data: params,
            url: '/apiproxy',
            success: function (data, textStatus, jqXHR) {

                if (callback)
                    callback(null, data.data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (callback)
                    callback(new Error(errorThrown), jqXHR.responseJSON);
            }
        });
    },

    post: function(url, data, callback) {
        ApiProxy.call("POST", url, data, callback);
    },

    patch: function(url, data, callback) {
        ApiProxy.call("PATCH", url, data, callback);
    },

    put: function(url, data, callback) {
        ApiProxy.call("PUT", url, data, callback);
    },

    get: function(url, callback) {
        ApiProxy.call("GET", url, null, callback);
    },

    del: function(url, callback) {
        ApiProxy.call("DEL", url, null, callback);
    }
};
