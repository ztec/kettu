kettu.Torrents = Backbone.Collection.extend({
  model: kettu.Torrent,
  fetchParams: {
    method: 'torrent-get',
    arguments: {
      fields: kettu.Torrent.allFields
    }
  }
});