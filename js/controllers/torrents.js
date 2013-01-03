/*global kettu, _*/

kettu.TorrentsController = function(transmission) {
  transmission.get('#/torrents', function(context) {
    context.setAndSaveModes(context);
    
    if(kettu.app.torrents_interval_id) { clearInterval(kettu.app.torrents_interval_id); }
    kettu.app.trigger('get-torrents', {rerender: true});
    kettu.app.torrents_interval_id = setInterval(function() {
      kettu.app.trigger('get-torrents');
    }, kettu.app.reloadInterval);
    
    if(kettu.app.settings_interval_id) { clearInterval(kettu.app.settings_interval_id); }
    kettu.app.trigger('get-settings');
    kettu.app.settings_interval_id = setInterval(function() {
      kettu.app.trigger('get-settings');
    }, (kettu.app.reloadInterval * 2));
  });
    
  transmission.get('#/torrents/new', function(context) {
    this.render('templates/torrents/new.mustache', {isMobile: kettu.app.mobile}, function(rendered_view) {
      context.openInfo(rendered_view, 'new');
    });
  });
  
  transmission.get('#/torrents/add', function(context) {
    var torrent = new kettu.Torrent();
    torrent.save({filename: context.params.url, paused: false}, {
      success: function() {
        context.renderConfigForNewTorrents(torrent);
      }
    });
  });
  
  transmission.del('#/torrents', function(context) {
    var ids = _.map(context.params.ids.split(','), function(id) {
      return parseInt(id, 10);
    });
    
    kettu.torrents.destroy(kettu.torrents.select(function(torrent) {
      return _.contains(ids, torrent.get('id'));
    }), {delete_local_data: !!this.params.delete_data}, {
      success: function() {
        kettu.app.trigger('flash', 'Torrents removed successfully.');
        _.each(ids, function(id) { $('#' + id).remove(); });
      }
    });
  });
  
  transmission.post('#/torrents', function(context) {
    if(context.params.url.length > 0) {
      var torrent = new kettu.Torrent();
      torrent.save({filename: context.params.url, paused: !kettu.app.mobile}, {
        success: function() {
          if(kettu.app.mobile) {
            kettu.app.trigger('flash', 'Torrent added successfully.');
            context.closeInfo();
          } else {
            context.renderConfigForNewTorrents(torrent);
          }
        }
      });
    } else {
      context.submitAddTorrentForm(context, true);
    }    
  });
  
  transmission.put('#/torrents/:id', function(context) {
    var id = parseInt(context.params.id, 10),
        torrent = kettu.torrents.find(function(torrent) { return torrent.id === id; }),
        request = context.parseRequestFromPutParams(context.params, id);

    torrent.saveWithRequest(request, {
      success: function() {
        setTimeout(function() {
          torrent.fetch({
            success: function() {
              console.log(torrent.get('status'));
              if(request.method.match(/torrent-set/)) {
                kettu.app.trigger('flash', 'Torrent updated successfully.');
              } else {
                context.renderTorrent(torrent);
              }
            }
          });
        }, 100);
      }
    });
    
    if(context.params['start_download']) {
      torrent.start({
        success: function() {
          context.renderTorrent(torrent);          
        }
      });
    }

    if(context.params.location) {
      torrent.setLocation(context.params['location']);
    }
  });
  
  transmission.put('#/torrents', function(context) {
    var ids = $.map(context.params['ids'].split(','), function(id) {return parseInt(id, 10);});
    if(!ids[ids.length - 1] > 0) { delete ids[ids.length - 1]; }

    var request = context.buildRequest(context.params['method'], { ids: ids });
    context.remoteQuery(request, function(response) {
      _.each(ids, function(id) {
        context.getTorrent(id);
      });
    });
  });
  
  transmission.bind('get-torrents', function(e, params) {
    kettu.torrents = new kettu.Torrents();
    kettu.torrents.fetch({
      success: _.bind(function() {
        this.trigger('refreshed-torrents', {
          torrents: kettu.torrents,
          rerender: params && params.rerender
        });
      }, this)
    });
  });
  
  transmission.bind('refreshed-torrents', function(e, params) {
    params.torrents.filterByMode(kettu.app.filterMode);
    params.torrents.sortByMode(kettu.app.sortMode, kettu.app.reverse_sort);
    this.updateViewElements(params.torrents, params.rerender, kettu.app.settings || {});
  });
  
  transmission.bind('refreshed-torrent', function(e, torrent) {
    this.updateInfo(torrent);
  });
};