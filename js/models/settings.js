kettu.Settings = Backbone.Model.extend({
  fetchParams: function() {
    return {
      method: 'session-get',
      arguments: {}      
    };
  }
});
