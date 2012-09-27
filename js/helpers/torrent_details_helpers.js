/*global kettu, _*/

kettu.TorrentDetailsHelpers = {
  emptyAccumulationHash: function() {
    return {number_of_torrents: 0, size: 0, status_words: [], downloaded: 0, uploaded: 0, ratio: 0, secure: [],
            left_until_done: 0, rate_download: 0, rate_upload: 0, peers_upload: 0, peers_download: 0};
  },
  
  renderTorrentDetailsInView: function(rendered_view, torrent) {
    this.openInfo(rendered_view, 'details');
    this.startCountDownOnNextAnnounce();
    this.activateInfoInputs(torrent);
    this.activateFileInputs();
    this.activatePrioritySelects();
    if(this.params['sort_peers']) { $('#menu-item-peers').click(); }
  },
  
  updateTorrentDetailsInView: function(rendered_view) {
    rendered_view = $('<div>' + rendered_view + '</div>');
    
    _.each(['.activity', '.trackers', '.peers', '.eta'], function(clazz) {
      $('#info ' + clazz).html(rendered_view.find(clazz).html());
    });
    
    var updateFields = function(checkbox, field) {
      checkbox.siblings('.percent_done').html($(field).siblings('.percent_done').html());
      checkbox.siblings('.priority_hidden').replaceWith($(field).siblings('.priority_hidden'));
      checkbox.siblings('img.priority').attr('src', $(field).siblings('img.priority').attr('src'));
      checkbox.attr('checked', $(field).attr('checked'));      
    };
    
    $.each(rendered_view.find('.file'), function(idx, file) {
      var checkbox = $('#info #' + $(file).attr('id'));
      updateFields(checkbox, file);
    });
    
    $.each(rendered_view.find('.folder-check'), function(idx, folder) {
      var checkbox = $('#info .folder-check[name="' + $(folder).attr('name') + '"]');
      updateFields(checkbox, folder);
    });
    
    this.startCountDownOnNextAnnounce();
    
    if(this.params['sort_peers']) { $('#menu-item-peers').click(); }
  },
  
  accumulateTorrentsAndRenderResult: function(torrents, accumulation) {
    var context = this;
    
    if(torrents.length === 0) {
      var view = kettu.TorrentDetailsView(accumulation);
      context.render('templates/torrent_details/index.mustache', view, function(rendered_view) {
        context.openInfo(rendered_view, 'details');
        if(kettu.app.last_menu_item) { $('#' + kettu.app.last_menu_item).click(); }
      });      
    } else {
      var fields = kettu.Torrent.fields.concat(kettu.Torrent.infoFields),
        request = context.buildRequest('torrent-get', {ids: torrents.shift(), fields: fields});
      context.remoteQuery(request, function(response) {
        var torrent = new kettu.Torrent(response['torrents'][0]);
        accumulation.number_of_torrents += 1;
        accumulation.size += torrent.get('sizeWhenDone');
        accumulation.status_words.push(torrent.statusStringLocalized());
        accumulation.secure.push(torrent.isSecure());
        accumulation.downloaded += (torrent.get('sizeWhenDone') - torrent.get('leftUntilDone'));
        accumulation.uploaded += torrent.get('uploadedEver');
        accumulation.left_until_done += torrent.get('leftUntilDone');
        accumulation.rate_download += torrent.get('rateDownload');
        accumulation.rate_upload += torrent.get('rateUpload');
        accumulation.peers_upload += torrent.get('peersGettingFromUs');
        accumulation.peers_download += torrent.get('peersSendingToUs');
        context.accumulateTorrentsAndRenderResult(torrents, accumulation);
      });
    }
  }
};