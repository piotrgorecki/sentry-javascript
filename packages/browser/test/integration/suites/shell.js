var frames = ['frame'];
// var frames = ['frame', 'loader', 'loader-lazy-no'];

for (var idx in frames) {
  (function() {
    var filename = frames[idx];
    var IS_LOADER = !!filename.match(/^loader/);
    var IS_ASYNC_LOADER = !!filename.match(/^loader$/);
    var IS_SYNC_LOADER = !!filename.match(/^loader-lazy-no$/);

    describe(filename + '.html', function() {
      this.timeout(30000);

      beforeEach(function(done) {
        this.iframe = createIframe(done, `variants/${filename}`);
      });

      afterEach(function() {
        document.body.removeChild(this.iframe);
      });

      /**
       * This part will be replaced by the test runner
       */

      // suites/config.js
      // suites/api.js
      // suites/onerror.js
      // suites/builtins.js
      // suites/breadcrumbs.js
      // suites/loader-specific.js
    });
  })();
}
