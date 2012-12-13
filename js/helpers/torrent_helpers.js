/*global kettu, _*/

(function() {
  var updateSortDropdown = function() {
    var sortMode = kettu.app.sortMode.charAt(0).toUpperCase() + kettu.app.sortMode.slice(1);
    $('#sort_link').text('Sort by ' + (sortMode || '…'));    
  };

  var updateFilterList = function() {
    $('#filters a').removeClass('active');
    $('#filters .' + kettu.app.filterMode).addClass('active');
  };

  kettu.TorrentHelpers = {
    buildRequest: function(method, arguments) {
      return({
        method: method,
        arguments: arguments
      });
    },

    renderConfigForNewTorrents: function(torrent_added) {
      var context = this;

      if(torrent_added) {
        kettu.torrents.fetch({
          success: function() {
            context.closeInfo();
            var newest = context.getNewestTorrents(context, kettu.torrents);
            if(newest.length > 1) {
              context.render('templates/torrents/new_multiple.mustache', {torrents: newest}, function(rendered_view) {
                $.facebox(rendered_view);
              });
            } else {
              context.getTorrent(newest[0].id, function(torrent) {
                context.render('templates/torrents/new_with_data.mustache', kettu.TorrentView(torrent, context, context.params['sort_peers']), function(rendered_view) {
                  $.facebox(rendered_view);
                  context.initLocations(torrent);
                });          
              });
            }            
          }
        });
        context.redirect('#/torrents');
      } else {
        kettu.app.trigger('flash', 'Torrent could not be added.');
      }
    },

    getTorrent: function(id, callback) {
      var fields = kettu.Torrent.fields.concat(kettu.Torrent.infoFields),
        request = this.buildRequest('torrent-get', { ids: id, fields: fields }),
        context = this;

      callback = callback || this.renderTorrent;

      this.remoteQuery(request, function(response) {
        callback.call(context, new kettu.Torrent(response['torrents'][0]));
      });
    },

    renderTorrent: function(torrent) {
      var template = (kettu.app.viewMode == 'compact') ? 'show_compact' : 'show';
      this.render('templates/torrents/' + template + '.mustache', kettu.TorrentsView(torrent, this), function(rendered_view) {
        $(kettu.app.element_selector).find('#' + torrent.id).replaceWith(rendered_view);
        kettu.app.trigger('refreshed-torrent', torrent);
      });
    },

    setAndSaveModes: function(context) {
      var params = context.params;

      if(params['sort'] == 'reverse') {
        kettu.app.reverse_sort = !kettu.app.reverse_sort;
        $('#reverse_link').attr('href', '#/torrents?sort=reverse&random=' + new Date().getTime());
        delete params['sort'];
      }

      _.each([{key: 'view', def: 'normal'}, {key: 'filter', def: 'all'}, {key: 'sort', def: 'name'}], function(item) {
        var key = item.key, def = item.def;
        kettu.app[key + 'Mode'] = params[key] || context.store.get(key + 'Mode') || def;
        context.store.set(key + 'Mode', kettu.app[key + 'Mode']);
      });

      updateSortDropdown();
      updateFilterList();

      $('.torrent').show();
    },

    submitAddTorrentForm: function(context, paused) {
      $('#add_torrent_form').ajaxSubmit({
    	  url: '/transmission/upload?paused=' + paused,
    	  type: 'POST',
    	  data: { 'X-Transmission-Session-Id' : context.remoteSessionId() },
    	  dataType: 'xml',
        iframe: true,
    	  success: function(response) {
    	    context.renderConfigForNewTorrents(JSON.parse($(response).children(':first').text()).success);
    	  }
  	});  
    },

    getNewestTorrents: function(context, torrents) {
      var now = parseInt(new Date().getTime().toString().substr(0, 10), 10);      
      return torrents.select(function(torrent) {
        return parseInt(torrent.get('addedDate'), 10) - now > -2;
      });
    },

    globalUpAndDownload: function(torrents) {
      var uploadRate = 0.0, downloadRate = 0.0;

      torrents.each(function(torrent) {
        uploadRate += torrent.get('rateUpload');
        downloadRate += torrent.get('rateDownload');
      });

      return new kettu.Torrent({}).downAndUploadRateString(downloadRate, uploadRate);
    },

    makeNewTorrent: function(torrent, view) {
      var template = (kettu.app.viewMode == 'compact') ? 'show_compact' : 'show';
      var rendered_view = this.mustache(this.cache(template), kettu.TorrentsView(torrent, this));
      $('#torrents').append(rendered_view);
      this.updateInfo(torrent);
      rendered_view = null;
    },

    updateStatus: function(old_torrent, torrent) {
      old_torrent.removeClass('downloading seeding paused').addClass(torrent.statusWord());
      old_torrent.find('input.pauseAndActivateButton').removeClass('downloading seeding paused').addClass(torrent.statusWord());
      if(kettu.app.mobile) {
        if(torrent.statusWord() === 'paused') {
          old_torrent.find('input.pauseAndActivateButton').val('Resume');
          old_torrent.find('input[name="method"]').val('torrent-start');
          old_torrent.find('.statusString').hide();
        } else {
          old_torrent.find('input.pauseAndActivateButton').val('Pause');
          old_torrent.find('input[name="method"]').val('torrent-stop');
          old_torrent.find('.statusString').show();
        }
      }
    },

    updateTorrent: function(torrent) {
      var old_torrent = $('#' + torrent.id);
      old_torrent.find('.progressDetails').html(torrent.progressDetails());
      old_torrent.find('.progressbar').html(torrent.progressBar());
      old_torrent.find('.statusString').html(torrent.statusString());
      this.updateStatus(old_torrent, torrent);
      old_torrent = null;
    },

    addOrUpdateTorrents: function(torrents) {
      var context = this;
      torrents.each(function(torrent) {
        if(!$('#' + torrent.id.toString()).get(0)) {
          context.makeNewTorrent(torrent);
        } else {
          context.updateTorrent(torrent);
        }
      });
    },

    removeOldTorrents: function(torrents) {
      var old_ids = $.map($('.torrent'), function(torrent) { return $(torrent).attr('id'); }),
          new_ids = torrents.map(function(torrent) { return torrent.id; });

      _.each(old_ids, function(id) {
        if(new_ids.indexOf(parseInt(id, 10)) < 0) {
          $('#' + id).remove();
        }
      });
    },

    updateTorrents: function(torrents, rerender) {
      this.cachePartials();

      if(torrents && rerender) {
        $('.torrent').remove();
        this.addOrUpdateTorrents(torrents);
      } else if(torrents) {
        this.removeOldTorrents(torrents);
        this.addOrUpdateTorrents(torrents);
      }
    },

    updateSpeedLimitMode: function(speed_limit_mode_enabled, context) {
      if(context.speed_limit_mode_enabled == speed_limit_mode_enabled) { return; }

      var form = $('#speed_limit_mode_form');
      if(speed_limit_mode_enabled) {
        $('#speed_limit_mode').addClass('active').text('Disable Speed Limit Mode');
        form.find('input:first').attr('value', 'false');
      } else {
        $('#speed_limit_mode').removeClass('active').text('Enable Speed Limit Mode');
        form.find('input:first').attr('value', 'true');      
      }

      context.speed_limit_mode_enabled = speed_limit_mode_enabled;
    },

    updateViewElements: function(torrents, rerender, settings) {
      this.updateTorrents(torrents, rerender);
      this.updateSpeedLimitMode(settings['alt-speed-enabled'], this);
      $('#globalUpAndDownload').html(this.globalUpAndDownload(torrents));
    },

    cachePartials: function() {
      var context = this;
      _.each(['delete_data', 'show', 'show_compact'], function(partial) {
        context.cachePartial('templates/torrents/' + partial + '.mustache', partial, context);
      });
    },

    formatNextAnnounceTime: function(timestamp) {
      if(timestamp === 0 || timestamp === '0') { return 'not scheduled'; }

      var now = new Date().getTime(),
          current = new Date(parseInt(timestamp, 10) * 1000 - now);

      if(current) {
        return current.getMinutes() + ' min, ' + current.getSeconds() + ' sec';
      } else {
        return timestamp;
      }
    },

    parseRequestFromPutParams: function(params, id) {
      var request;

      if(params['method']) {
        request = {
          'method': params['method'],
          'arguments': {'ids': id}
        };
      } else if(params['location']) {
        var updatable_settings = [
          "bandwidthPriority", "downloadLimit", "downloadLimited",
          "location", "peer-limit", "seedRatioLimit", "seedRatioMode",
          "uploadLimit", "uploadLimited"
        ];

        request = {
          'method': 'torrent-set',
          'arguments': {'ids': id}
        };

        _.each(updatable_settings, function(setting) {
          if(params.hasOwnProperty(setting)) {          
            request['arguments'][setting] = params[setting] ? true : false;
            if(params[setting] && params[setting].match(/^-?\d+$/)) {
              request['arguments'][setting] = parseInt(params[setting], 10);
            } else if(params[setting] && params[setting] != "on") {
              request['arguments'][setting] = params[setting];
            }
          }
        });
      } else {
        var files = {};

        files.wanted = $.map($('.file:checked'), function(file) {
          return parseInt($(file).attr('name').split('_')[1], 10);
        });

        files.unwanted = $.map($('.file:not(:checked)'), function(file) {
          return parseInt($(file).attr('name').split('_')[1], 10);
        });

        files.high = [];
        files.low = [];
        files.normal = [];

        $.each($('.priority_file'), function(idx, priority) {
          var $priority = $(priority),
              id = parseInt($priority.attr('data-id').split('_')[1], 10);

          if($priority.val() == "up") {
            files.high.push(id);
          } else if($priority.val() == "down") {
            files.low.push(id);
          } else {
            files.normal.push(id);
          }
        });

        request = {
          'method': 'torrent-set',
          'arguments': { 'ids': id, 'files-unwanted': files.unwanted }
        };
        if(files.wanted.length > 0) {
          request['arguments']['files-wanted'] = files.wanted;
        }
        _.each(['high', 'low', 'normal'], function(priority) {
          if(files[priority].length > 0) {
            request['arguments']['priority-' + priority] = files[priority];
          }
        });
      }
      return request; 
    }
  };
})();