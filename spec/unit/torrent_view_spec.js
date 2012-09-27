/*global describe, it, kettu*/

describe("TorrentView", function() {
  var ctx,
      torrent_view,
      torrent,
      timestamp,
      day;
  
  beforeEach(function() {
    ctx = {sanitizeNumber: function() {}};
    ctx.formatNextAnnounceTime = function() {};
    ctx.shorten = kettu.ApplicationHelpers.shorten;
    torrent = new kettu.Torrent({trackerStats: [], files: [], peers: [], fileStats: [], name: '', comment: ''});
    timestamp = "1265737984";
    day = (new Date()).getTimezoneOffset()/60 < -6 ? 10 : 9;
  });

  // describe("addFormattedTimes", function() {
  //   it("should add a formatted time for lastAnnounceTime", function() {
  //     torrent.set('trackerStats', [{lastAnnounceTime: timestamp}]);
  //     torrent_view = kettu.TorrentView(torrent, ctx);
  //     expect(torrent_view.trackerStats[0].lastAnnounceTimeFormatted).to.match(new RegExp("2/" + day + "/2010 \\d+:53"));
  //   });
  //   
  //   it("should add a formatted time for lastScrapeTime", function() {
  //     torrent.set('trackerStats', [{lastScrapeTime: timestamp}]);
  //     torrent_view = kettu.TorrentView(torrent, ctx);
  //     expect(torrent_view.trackerStats[0].lastScrapeTimeFormatted).to.match(new RegExp("2/" + day + "/2010 \\d+:53"));
  //   });
  // });
  // 
  // describe("addFormattedSizes", function() {
  //   describe("files", function() {
  //     it("should add a formatted size for length", function() {
  //       torrent.set('files', [{name: 'hans', length: 2048}]);
  //       torrent.set('fileStats', [{priority: 0}]);
  //       torrent_view = kettu.TorrentView(torrent, ctx);
  //       expect(torrent_view.files[0].lengthFormatted).to.equal('2.0 KB');
  //     });
  //   
  //     it("should add a percent done value", function() {
  //       torrent.set('files', [{name: 'hans', length: 2048, bytesCompleted: 512}]);
  //       torrent.set('fileStats', [{priority: 0}]);
  //       torrent_view = kettu.TorrentView(torrent, ctx);
  //       expect(torrent_view.files[0].percentDone).to.equal(25);
  //     });
  //   });
  //   
  //   describe("peers", function() {
  //     it("should add a percent done value", function() {
  //       torrent.set('peers', [{progress: 0.7}]);
  //       torrent_view = kettu.TorrentView(torrent, ctx);
  //       expect(torrent_view.peers[0].percentDone).to.equal(70);
  //     });
  //     
  //     it("should add a formatted upload value", function() {
  //       torrent.set('peers', [{rateToPeer: 20}]);
  //       torrent_view = kettu.TorrentView(torrent, ctx);
  //       expect(torrent_view.peers[0].uploadFormatted).to.equal('20 bytes');
  //     });
  //     
  //     it("should add an empty string if upload value is 0", function() {
  //       torrent.set('peers', [{rateToPeer: 0}]);
  //       torrent_view = kettu.TorrentView(torrent, ctx);
  //       expect(torrent_view.peers[0].uploadFormatted).to.equal('');
  //     });
  //     
  //     it("should add a formatted download value", function() {
  //       torrent.set('peers', [{rateToClient: 20}]);
  //       torrent_view = kettu.TorrentView(torrent, ctx);
  //       expect(torrent_view.peers[0].downloadFormatted).to.equal('20 bytes');
  //     });
  //   });
  // });
  // 
  // describe("sort peers", function() {
  //   beforeEach(function() {
  //     torrent.set('peers', [
  //       {'ip': '1.2.3.4', 'clientName': 'Transmission', 'progress': 10, 'rateToPeer': 10, 'rateToClient': 50},
  //       {'ip': '2.2.3.4', 'clientName': 'Beluge', 'progress': 30, 'rateToPeer': 50, 'rateToClient': 40},
  //       {'ip': '4.2.3.4', 'clientName': 'Vuze', 'progress': 20, 'rateToPeer': 40, 'rateToClient': 30},
  //       {'ip': '3.2.3.4', 'clientName': 'rtorrent', 'progress': 40, 'rateToPeer': 30, 'rateToClient': 20},
  //       {'ip': '5.2.3.4', 'clientName': 'BitComet', 'progress': 50, 'rateToPeer': 20, 'rateToClient': 10}
  //     ]);
  //   });
  //   
  //   it("should sort by client", function() {
  //     torrent_view = kettu.TorrentView(torrent, ctx);
  //     expect(torrent_view.peers[0].clientName).to.equal('Beluge');
  //     expect(torrent_view.peers[1].clientName).to.equal('BitComet');
  //     expect(torrent_view.peers[2].clientName).to.equal('rtorrent');
  //     expect(torrent_view.peers[3].clientName).to.equal('Transmission');
  //     expect(torrent_view.peers[4].clientName).to.equal('Vuze');
  //   });
  //   
  //   it("should sort by percent", function() {
  //     torrent_view = kettu.TorrentView(torrent, ctx, 'percent');
  //     expect(torrent_view.peers[0].clientName).to.equal('BitComet');
  //     expect(torrent_view.peers[1].clientName).to.equal('rtorrent');
  //     expect(torrent_view.peers[2].clientName).to.equal('Beluge');
  //     expect(torrent_view.peers[3].clientName).to.equal('Vuze');
  //     expect(torrent_view.peers[4].clientName).to.equal('Transmission');
  //   });
  //   
  //   it("should sort by upload", function() {
  //     torrent_view = kettu.TorrentView(torrent, ctx, 'upload');
  //     expect(torrent_view.peers[0].clientName).to.equal('Beluge');
  //     expect(torrent_view.peers[1].clientName).to.equal('Vuze');
  //     expect(torrent_view.peers[2].clientName).to.equal('rtorrent');
  //     expect(torrent_view.peers[3].clientName).to.equal('BitComet');
  //     expect(torrent_view.peers[4].clientName).to.equal('Transmission');
  //   });
  //   
  //   it("should sort by download", function() {
  //     torrent_view = kettu.TorrentView(torrent, ctx, 'download');
  //     expect(torrent_view.peers[0].clientName).to.equal('Transmission');
  //     expect(torrent_view.peers[1].clientName).to.equal('Beluge');
  //     expect(torrent_view.peers[2].clientName).to.equal('Vuze');
  //     expect(torrent_view.peers[3].clientName).to.equal('rtorrent');
  //     expect(torrent_view.peers[4].clientName).to.equal('BitComet');
  //   });
  // });
  // 
  describe("addIdsToFiles", function() {
    it("should add an id to the file", function() {
      torrent.set('files', [{name: "hans"}]);
      torrent.set('fileStats', [{priority: 0}]);
      torrent_view = kettu.TorrentView(torrent, ctx);
      expect(torrent_view.files[0].id).to.equal('file_0');
    });
    
    it("should add wanted if the file is wanted", function() {
      torrent.set('files', [{name: "hans"}, {name: "klaus"}]);
      torrent.set('fileStats', [{priority: 0, wanted: true}, {priority: 0}]);
      torrent_view = kettu.TorrentView(torrent, ctx);
      expect(torrent_view.files[0].wanted).to.equal(' checked="checked"');
    });
    
    it("should not add wanted if the file is not wanted", function() {
      torrent.set('files', [{name: "hans"}, {name: "klaus"}]);
      torrent.set('fileStats', [{priority: 0, wanted: false}, {priority: 0}]);
      torrent_view = kettu.TorrentView(torrent, ctx);
      expect(torrent_view.files[0].wanted).not.to.equal(' checked="checked"');
    });
    
    it("should add disabled if the file is done downloading", function() {
      torrent.set('files', [{name: "hans", length: 200, bytesCompleted: 200}]);
      torrent.set('fileStats', [{priority: 0}]);
      torrent_view = kettu.TorrentView(torrent, ctx);
      expect(torrent_view.files[0].disabled).to.equal(' disabled="disabled"');
    });
    
    it("should not add disabled if the file is not done downloading", function() {
      torrent.set('files', [{name: "hans", length: 200, bytesCompleted: 100}, {name: "klaus"}]);
      torrent.set('fileStats', [{priority: 0}, {priority: 0}]);
      torrent_view = kettu.TorrentView(torrent, ctx);
      expect(torrent_view.files[0].disabled).not.to.equal(' disabled="disabled"');
    });
    
    it("should add disabled if there is only one file", function() {
      torrent.set('files', [{name: "hans", length: 200, bytesCompleted: 100}]);
      torrent.set('fileStats', [{priority: 0}]);
      torrent_view = kettu.TorrentView(torrent, ctx);
      expect(torrent_view.files[0].disabled).to.equal(' disabled="disabled"');
    });
    
    it("should add wanted if the file is wanted", function() {
      torrent.set('files', [{name: "hans"}]);
      torrent.set('fileStats', [{priority: 0, wanted: false}]);
      torrent_view = kettu.TorrentView(torrent, ctx);
      expect(torrent_view.files[0].wanted).to.equal(' checked="checked"');
    });
  });
  
  describe("make strings shorter so they work in the mobile version", function() {
    it("should make the strings shorter if it's the mobile version and the string is too long", function() {
      kettu.app.mobile = true;
      torrent.set('comment', '1234567890123456789012345678901234567890');
      torrent_view = kettu.TorrentView(torrent, ctx);
      expect(torrent_view.comment).to.equal('123456789012345678901234567890123…');
    });
    
    it("should not make the strings shorter if it's not the mobile version", function() {
      kettu.app.mobile = false;
      torrent.set('comment', '1234567890123456789012345678901234567890');
      torrent_view = kettu.TorrentView(torrent, ctx);
      expect(torrent_view.comment).to.equal('1234567890123456789012345678901234567890');
    });
    
    it("should not make the strings shorter if they aren't too long", function() {
      kettu.app.mobile = true;
      torrent.set('comment', '1234567890');
      torrent_view = kettu.TorrentView(torrent, ctx);
      expect(torrent_view.comment).to.equal('1234567890');
    });
  });
});