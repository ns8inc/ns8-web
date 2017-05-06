
// ----------------------------------------------------------------------------
//  A proxy to route api-host calls through the web application
// ----------------------------------------------------------------------------

//  proxy api-host calls through the web application
var ApiProxy = {

    get: function(url, successFunction, errorFunction) {
        var params = {
            verb: 'get',
            url: url,
        };

        $.ajax({
            type: "POST",
            cache: false,
            url: '/apiproxy',
            success: function (data, textStatus, jqXHR) {

                if (successFunction)
                    successFunction(data, textStatus, jqXHR);
            },
            error: function (jqXHR, textStatus, errorThrown ) {
                if (errorFunction)
                    errorFunction(data, textStatus, errorThrown);
            }
        });
    }
};
