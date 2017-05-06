
// ----------------------------------------------------------------------------
//  A proxy to route api-host calls through the web application
// ----------------------------------------------------------------------------

//  proxy api-host calls through the web application
var ApiProxy = {

    call: function(verb, path, data, callback) {

        var params = {
            verb: verb,
            path: path,
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

    post: function(path, data, callback) {
        ApiProxy.call("POST", path, data, callback);
    },

    patch: function(path, data, callback) {
        ApiProxy.call("PATCH", path, data, callback);
    },

    put: function(path, data, callback) {
        ApiProxy.call("PUT", path, data, callback);
    },

    get: function(path, callback) {
        ApiProxy.call("GET", path, null, callback);
    },

    del: function(path, callback) {
        ApiProxy.call("DEL", path, null, callback);
    }
};
