/*global kettu, Backbone, _*/

kettu.Torrents = Backbone.Collection.extend({
  model: kettu.Torrent,
  fetchParams: function() {
    return {
      method: 'torrent-get',
      arguments: {
        fields: kettu.Torrent.allFields
      }      
    };
  },
  filterByMode: function(filterMode) {
    if(filterMode === 'activity') {
      this.reset(this.filter(function(torrent) {
        return torrent.activity();
      }));
    } else if(filterMode !== 'all') {
      var stati = kettu.Torrent.stati;
      this.reset(this.filter(function(torrent) {
        return torrent.status() === stati[filterMode];
      }));
    }    
  },
  sortByMode: function(sortMode, reverse) {
    var comparator = function() {};

    switch(sortMode) {
      case 'name':
        comparator = function(a, b) {
          var a_name = a.get('name').toUpperCase();
          var b_name = b.get('name').toUpperCase();
          return (a_name < b_name) ? -1 : (a_name > b_name) ? 1 : 0;
        };
        break;
      case 'activity':
        comparator = function(a, b) {
          return a.activity() - b.activity();
        };
        break;
      case 'age':
        comparator = function(a, b) {
          return b.get('addedDate') - a.get('addedDate');
        };
        break;
      case 'progress':
        comparator = function(a, b) {
          if(a.percentDone() != b.percentDone()) {
            return a.percentDone() - b.percentDone();
          } else {
           var a_ratio = Math.ratio(a.get('uploadedEver'), a.get('downloadedEver'));
           var b_ratio = Math.ratio(b.get('uploadedEver'), b.get('downloadedEver'));
           return a_ratio - b_ratio;            
          }
        };
        break;
      case 'queue':
        comparator = function(a, b) {
          return a.id - b.id;
        };
        break;
      case 'state':
        comparator = function(a, b) {
          return a.status() - b.status();
        };
        break;
    }

    this.models.sort(_.bind(comparator, this));
    if(reverse) { this.models.reverse(); }
    return this;
  }
});