/*global Sammy, Backbone*/

(function() {
  var rpc = {
    url: '/transmission/rpc',
    session_id: ''
  };

  Sammy.TransmissionRPC = function(app) {
    app.helpers({
      remoteSessionId: function() {
        return rpc.session_id;
      }
    });
  };

  Backbone.sync = function(method, model, options) {
    options = options || {};

    var data, params;

    if(method === "read") {
      data = JSON.stringify(model.fetchParams);
    } else {
      data = JSON.stringify(model.createParams());
    }
    
    params = {
      type: 'POST',
      url: rpc.url,
      dataType: 'json',
      data: data,
      processData: false,
      beforeSend: function(xhr) {
        xhr.setRequestHeader('X-Transmission-Session-Id', rpc.session_id);
      },
      success: function(response, status, xhr) {
        if(!response) {
          Sammy.log('RPC Connection Failure.');
          Sammy.log('You need to run this web client within the Transmission web server.');
        }

        if(options.success) {
          options.success(response['arguments']['torrents'], status, xhr);
        }
        model.trigger('sync', model, response['arguments']['torrents'], options);
      },
      error: function(xhr, ajaxOptions, thrownError) {
        rpc.session_id = xhr.getResponseHeader('X-Transmission-Session-Id');
        if(xhr.status === 409 && rpc.session_id.length > 0) {
          Backbone.sync(method, model, options);
        } else {
          Sammy.log('RPC Connection Failure.');
          Sammy.log(xhr.responseText);
          model.trigger('error', model, xhr, options);
        }        
      }
    };

    return Backbone.ajax(params);
  };  
})();