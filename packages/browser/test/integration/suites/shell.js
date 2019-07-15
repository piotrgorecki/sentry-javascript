var variants = ["frame", "loader", "loader-lazy-no"];

for (var idx in variants) {
  (function() {
    var filename = variants[idx];
    var IS_LOADER = !!filename.match(/^loader/);
    var IS_ASYNC_LOADER = !!filename.match(/^loader$/);
    var IS_SYNC_LOADER = !!filename.match(/^loader-lazy-no$/);

    describe(filename + ".html", function() {
      this.timeout(30000);

      beforeEach(function(done) {
        this.iframe = createIframe(done, filename);
      });

      afterEach(function() {
        document.body.removeChild(this.iframe);
      });

      /**
       * This part will be replaced by the test runner
       */
      {{ suites/config.js }} // prettier-ignore
      {{ suites/api.js }} // prettier-ignore
      {{ suites/onerror.js }} // prettier-ignore
      {{ suites/builtins.js }} // prettier-ignore
      {{ suites/breadcrumbs.js }} // prettier-ignore
      {{ suites/loader.js }} // prettier-ignore
    });
  })();
}
