/*global kettu, _*/

(function() {
  var formatTime = function(timestamp) {
    if(timestamp === 0) { return 'N/A'; }

    var current = new Date(parseInt(timestamp, 10) * 1000);
    if(current) {
      var date = (current.getMonth() + 1) + '/' + current.getDate() + '/' + current.getFullYear();
      var time = current.getHours() + ':' + (current.getMinutes() < 10 ? '0' + current.getMinutes() : current.getMinutes());
      return date + ' ' + time;      
    } else {
      return timestamp;
    }      
  };

  var addFormattedTimes = function(view, context) {
    if(view.trackerStats) {
      view.trackerStats = _.map(view.trackerStats, function(stat) {
        stat.lastAnnounceTimeFormatted = formatTime(stat.lastAnnounceTime);
        stat.nextAnnounceTimeFormatted = context.formatNextAnnounceTime(stat.nextAnnounceTime);
        stat.lastScrapeTimeFormatted = formatTime(stat.lastScrapeTime);
        stat.lastScrapeDidNotSucceed = !view.lastScrapeSucceeded;
        stat.lastAnnounceDidNotSucceed = !view.lastAnnounceSucceeded;
        
        return stat;
      });
    }
  };

  var addFormattedSizes = function(view) {
    if(view.files) {
      view.files = _.map(view.files, function(file) {
        file.lengthFormatted = Math.formatBytes(file['length']);
        file.percentDone = Math.formatPercent(file['length'], file['length'] - file.bytesCompleted);
        return file;
      });
    }
    
    if(view.peers) {
      view.peers = _.map(view.peers, function(peer) {
        peer.uploadFormatted = peer['rateToPeer'] !== 0 ? Math.formatBytes(peer['rateToPeer']) : '';
        peer.downloadFormatted = peer['rateToClient'] !== 0? Math.formatBytes(peer['rateToClient']) : '';
        peer.percentDone = Math.formatPercent(100, 100 - (peer['progress'] * 100));
        return peer;
      });
    }

    view.rateDownloadFormatted = Math.formatBytes(view.rateDownload) + '/s';
    view.rateUploadFormatted = Math.formatBytes(view.rateUpload) + '/s';
  };

  var sortPeers = function(view) {
    if(view.peers) {
      var peers = view.peers;
      var peer_sort_function = function() {};

      switch(view.sort_peers) {
        case 'client':
          peer_sort_function = function(a, b) {
            var a_name = a.clientName.toUpperCase();
            var b_name = b.clientName.toUpperCase();
            return (a_name < b_name) ? -1 : (a_name > b_name) ? 1 : 0;
          };
          break;
        case 'percent':
          peer_sort_function = function(a, b) {
            return b.percentDone - a.percentDone;
          };
          break;
        case 'upload':
          peer_sort_function = function(a, b) {
            return b.rateToPeer - a.rateToPeer;
          };
          break;
        case 'download':
          peer_sort_function = function(a, b) {
            return b.rateToClient - a.rateToClient;
          };
          break;
      }

      view.peers = peers.sort(peer_sort_function);
    }
  };

  var addIdsToFiles = function(view) {
    if(view.files) {
      view.files = _.map(view.files, function(file, idx) {
        var disabled = (file.length - file.bytesCompleted) === 0;

        file.id = 'file_' + idx;
        file.wanted = (view.fileStats[idx].wanted || disabled) ? ' checked="checked"' : '';
        file.disabled = disabled ? ' disabled="disabled"' : '';
        
        return file;
      });

      if(view.files.length == 1) {
        view.files[0]['disabled'] = ' disabled="disabled"';
        view.files[0]['wanted'] = ' checked="checked"';
      }
    }
  };

  var joinFileName = function(name) {
    name = name.join('/');

    if(name.length > 27) {
      return name.substr(0, 23) + '…' + name.substr(-3, 3);
    } else {
      return name;
    }
  };

  var folderizeFiles = function(view) {
    view.folderless_files = [];
    view.folders = [];

    if(view.files) {
      _.each(view.files, function(file) {
        var name = file['name'].split('/');
        var i = view.folders.length;

        if(name.length > 1) {
          name.shift(); 
        }

        if(name.length === 1) {
          file['name'] = joinFileName(name);
          view.folderless_files.push(file);
        } else {
          var folder = name.shift();
          file['name'] = joinFileName(name);

          if(view.folders[i] && view.folders[i].name === folder) {
            view.folders[i].files.push(file);
            view.folders[i].lengthFormatted += file.length;
            view.folders[i].bytesCompleted += file.bytesCompleted;
          } else {
            view.folders.push({
              name: folder,
              files: [file],
              lengthFormatted: file.length,
              bytesCompleted: file.bytesCompleted
            });
          }
        }
      });
    }
  };

  var formatFolders = function(view) {
    _.each(view.folders, function(folder) {
      var wantedFiles = 0, completeFiles = 0, highPriorityFiles = 0, lowPriorityFiles = 0;

      _.each(folder.files, function(file) {
        if(!_.isEmpty(file.wanted)) { wantedFiles += 1; }
        if(!_.isEmpty(file.disabled)) { completeFiles += 1; }
        if(file.priorityArrow == "up") { highPriorityFiles += 1; }
        if(file.priorityArrow == "down") { lowPriorityFiles += 1; }
      });

      folder.percentDone = Math.formatPercent(folder.lengthFormatted, folder.lengthFormatted - folder.bytesCompleted);
      folder.lengthFormatted = Math.formatBytes(folder.lengthFormatted);
      folder.wanted = wantedFiles > 0 ? ' checked="checked"' : '';
      folder.disabled = completeFiles === folder.files.length ? ' disabled="disabled"' : '';

      if(highPriorityFiles === folder.files.length) {
        folder.priorityArrow = "up";
      } else if(lowPriorityFiles === folder.files.length) {
        folder.priorityArrow = "down";
      } else {
        folder.priorityArrow = "normal";
      }
    });
  };

  var addPriorityStringToFiles = function(view, torrent) {
    _.each(view.fileStats, function(stat) {
      var id = view.fileStats.indexOf(stat),
          arrows = {'0': 'normal', '1': 'up', '-1': 'down'};

      view.files[id]['priorityArrow'] = arrows[stat.priority.toString()];

      if(view.files[id]['length'] - view.files[id]['bytesCompleted'] === 0) {
        view.files[id]['priorityArrow'] = 'done';
      }
    });
    view.show_select_all = view.files.length > 1 && !torrent.isDoneDownloading();
  };

  var sanitizeNumbers = function(view, context) {
    view.uploadRatio = context.sanitizeNumber(view.uploadRatio);
    if(view.trackerStats !== undefined) {
      var i = 0;
      _.each(view.trackerStats, function(stat) {
        view.trackerStats[i]['seederCount'] = context.sanitizeNumber(stat.seederCount);
        view.trackerStats[i]['leecherCount'] = context.sanitizeNumber(stat.leecherCount);
        view.trackerStats[i]['downloadCount'] = context.sanitizeNumber(stat.downloadCount);
        i += 1;
      });
      view.trackerStats = view.trackerStats.slice(0, 2);
    }
  };

  var loadLocations = function(view) {
    view.showLocations = false;

    if(_.isArray(kettu.config.locations) && kettu.config.locations.length > 0) {
      if(kettu.app.settings) {
        view.locations = [{name: "Default", path: kettu.app.settings['download-dir']}];          
      } else {
        view.locations = [{}];
      }

      _.each(kettu.config.locations, function(location) {
        if(location.path != view.locations[0].path) {
          view.locations.push(location);
        }
      });

      view.showLocations = true;
    }      
  };

  kettu.TorrentView = function(torrent, context, sort_peers) {
    var view = torrent.toJSON();
    view.sort_peers = sort_peers || 'client';

    addFormattedTimes(view, context);
    addFormattedSizes(view);    
    sortPeers(view);
    addPriorityStringToFiles(view, torrent);
    sanitizeNumbers(view, context);
    addIdsToFiles(view);
    folderizeFiles(view);
    formatFolders(view);
    loadLocations(view);

    view.isMobile = kettu.app.mobile;

    if(kettu.app.mobile) {
      view.name = context.shorten(view.name, 27);
      view.comment = context.shorten(view.comment, 33);
    }

    return view;
  };  
})();