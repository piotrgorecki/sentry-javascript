it('should work', function(done) {
  var iframe = this.iframe;

  iframeExecute(
    iframe,
    done,
    function() {
      done();
    },
    function() {
      assert.equal(true, true);
      done();
    },
  );
});
