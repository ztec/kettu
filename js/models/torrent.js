/*global kettu, _, Backbone*/

(function() {
  var capitalize = function(string) {
    return _.map(string.split('_'), function(substr) {
      return substr.charAt(0).toUpperCase() + substr.slice(1);
    }).join('');
  };

  kettu.Torrent = Backbone.Model.extend({
    initialize: function() {
      this.convertByteFields();
      this.initializeStatusFunctions();
    },
    
    toJSON: function() {
      var copiedAttributes = _.clone(this.attributes),
          keepInJSON = _.union(kettu.Torrent.byteFields, ['have', 'status']);
      
      _.each(keepInJSON, _.bind(function(field) {
        copiedAttributes[field + 'String'] = this[field + 'String']();
      }, this));

      return copiedAttributes;
    },
    
    status: function() {
      return parseInt(this.get('status'), 10);
    },
    
    convertByteFields: function() {
      _.each(kettu.Torrent.byteFields, _.bind(function(field) {
        this[field + 'String'] = _.bind(function() {
          return Math.formatBytes(this.get(field));
        }, this);
      }, this));
    },

    initializeStatusFunctions: function() {
      _.each(kettu.Torrent.stati, _.bind(function(status, name) {
        this['is' + capitalize(name)] = _.bind(function() {
          return this.status() === status;
        }, this);
      }, this));
    },
    
    isSecure: function() {
      return this.get('isPrivate') ? 'Private Torrent' : 'Public Torrent';
    },
    
    isActive: function() {
      return this.isDownloading() || this.isSeeding();
    },

    isDoneDownloading: function() {
      return this.isSeeding() || this.get('leftUntilDone') === 0;
    },
    
    isVerifying: function() {
      return this.isChecking() || this.isWaitingToCheck();
    },
    
    hasError: function() {
      return this.get('error') > 0;
    },

    needsMetaData: function() { 
      return this.get('metadataPercentComplete') < 1; 
    },
    
    percentDone: function() {
      return Math.formatPercent(this.get('sizeWhenDone'), this.get('leftUntilDone'));
    },
    
    progressDetails: function() {
      var progressDetails;

      if(this.needsMetaData()) {
        progressDetails = this.metaDataProgress();
      } else if(!this.isDoneDownloading()) {
        progressDetails = this.downloadingProgress();
        if(this.isActive()) {
          progressDetails += ' - ' + this.etaString();
        }
      } else {
        progressDetails = this.uploadingProgress();
        if(this.get('seedRatioMode') === 1) {
          progressDetails += ' - ' + this.etaString();
        }
      }

      return progressDetails;
    },

    downloadingProgress: function() {
      return Math.formatBytes(this.get('sizeWhenDone') - this.get('leftUntilDone')) +
        " of " + this.sizeWhenDoneString() + " (" + this.percentDone() + "%)";
    },

    uploadingProgress: function() {
      return this.sizeWhenDoneString() + ", uploaded " + this.uploadedEverString() +
        " (Ratio: " + kettu.ViewHelpers.sanitizeNumber(this.get('uploadRatio')) + ")";
    },

    metaDataProgress: function() {
      var percentRetrieved = (Math.floor(this.get('metadataPercentComplete') * 10000) / 100).toFixed(1);
      return "Magnetized transfer - retrieving metadata (" + percentRetrieved + "%)";
    },

    progressBar: function() {
      var status, value = this.percentDone();
    
      if(this.isActive() && this.needsMetaData()) {
        status = 'meta';
        value = 100;
      } else if(this.isVerifying()) {
        status = 'verifying';
      } else if(this.isActive() && !this.isDoneDownloading()) {
        status = 'downloading';
      } else if(this.isActive() && this.isDoneDownloading()) {
        if(this.get('seedRatioMode') === 1) {
          value = this.get('uploadRatio')/this.get('seedRatioLimit') * 100;
        }
        status = 'uploading';
      } else {
        status = 'paused';
      }
    
      // NOTE: creating the progressbar via $('<div></div>').progressbar({}); seems to lead to a memory leak in safari

      return '<div class="ui-progressbar-value ui-widget-header-' + status + ' ui-corner-left" style="width: ' + value + '%; "></div>';
    },

    etaString: function() {
      if(this.get('eta') < 0) {
        return "remaining time unknown";
      } else {
        return Math.formatSeconds(this.get('eta')) + ' ' + 'remaining';
      }
    },

    statusStringLocalized: function(status) {
      var localized_stati = {},
          stati = kettu.Torrent.stati;
    
      localized_stati[stati['paused']] = 'Paused';
      localized_stati[stati['waiting_to_check']] = 'Waiting to verify';
      localized_stati[stati['checking']] = 'Verifying local data';
      localized_stati[stati['downloading']] = 'Downloading';
      localized_stati[stati['waiting_to_download']] = 'Waiting to download';
      localized_stati[stati['waiting_to_seed']] = 'Waiting to seed';
      localized_stati[stati['seeding']] = 'Seeding';

      return localized_stati[this.status()] ? localized_stati[this.status()] : 'Unknown status';
    },

    statusString: function() {
      var currentStatus = this.statusStringLocalized(this.status());

      if(this.isActive()) {
        currentStatus += ' - ';
        if(this.isDoneDownloading()) {
          currentStatus += this.uploadRateString(this.get('rateUpload'));
        } else {
          currentStatus += this.downAndUploadRateString(
            this.get('rateDownload'), this.get('rateUpload'));
        }
      }
      if(this.hasError()) {
        currentStatus = 'Tracker returned an error: ' + this.get('errorString') + '.';
      }
      if(this.isVerifying()) {
        currentStatus += ' - ' + (this.get('recheckProgress') * 100).toFixed(2) + '%';
      }
      if(kettu.app.mobile && currentStatus.match(/ - /)) {
        currentStatus = currentStatus.split(' - ')[1];
      }

      return currentStatus;
    },

    statusWord: function() {
      for(var i in kettu.Torrent.stati) {
        if(kettu.Torrent.stati[i] == this.status()) { return i; }
      }
    },

    uploadRateString: function(uploadRate) {
      return 'UL: ' + (uploadRate / 1000).toFixed(1) + ' KB/s';
    },

    downAndUploadRateString: function(downloadRate, uploadRate) {
      return 'DL: ' + (downloadRate / 1000).toFixed(1) + ' KB/s, ' + this.uploadRateString(uploadRate);
    },

    activity: function() {
      return this.get('rateDownload') + this.get('rateUpload');
    },

    haveString: function() {
      return Math.formatBytes(this.get('haveValid') + this.get('haveUnchecked')) +
        ' (' + Math.formatBytes(this.get('haveValid')) + ' verified)';
    }
  }, {
    byteFields: [
      'totalSize', 'downloadedEver', 'uploadedEver',
      'pieceSize', 'corruptEver', 'sizeWhenDone'
    ],

    stati: {
      'paused': 0,
      'waiting_to_check': 1,
      'checking': 2,
      'waiting_to_download': 3,
      'downloading': 4,
      'waiting_to_seed': 5,
      'seeding': 6
    },
    
    fields: [
      'id', 'name', 'status', 'totalSize', 'sizeWhenDone', 'haveValid', 
      'leftUntilDone', 'haveUnchecked', 'eta', 'uploadedEver', 'uploadRatio', 
      'rateDownload', 'rateUpload', 'metadataPercentComplete', 'addedDate', 
      'trackerStats', 'error', 'errorString', 'recheckProgress', 
      'bandwidthPriority', 'seedRatioMode', 'seedRatioLimit'
    ],

    infoFields: [
      'downloadDir', 'creator', 'hashString', 'comment', 'isPrivate', 
      'downloadedEver', 'errorString', 'peersGettingFromUs', 
      'peersSendingToUs', 'files', 'pieceCount', 'pieceSize', 'peers', 
      'fileStats', 'peer-limit', 'downloadLimited', 'uploadLimit', 
      'uploadLimited', 'downloadLimit', 'corruptEver'
    ]
  });
})();