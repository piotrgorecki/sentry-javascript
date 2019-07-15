if (IS_LOADER) {
  describe("Loader Specific Tests", function() {
    it("should add breadcrumb from onLoad callback from undefined error", function(done) {
      var iframe = this.iframe;

      iframeExecute(
        iframe,
        done,
        function() {
          Sentry.onLoad(function() {
            Sentry.addBreadcrumb({
              category: "auth",
              message: "testing loader",
              level: "error",
            });
          });
          setTimeout(function() {
            setTimeout(done, 137);
            Sentry.captureMessage("test");
          }, 137);
          undefinedMethod(); //trigger error
        },
        function(sentryData) {
          if (debounceAssertEventCount(sentryData, 1, done)) {
            var sentryData = iframe.contentWindow.sentryData[0];
            if (IS_ASYNC_LOADER) {
              assert.notOk(sentryData.breadcrumbs);
            } else {
              if (sentryData.breadcrumbs) {
                assert.ok(sentryData.breadcrumbs);
                assert.lengthOf(sentryData.breadcrumbs, 1);
                assert.equal(
                  sentryData.breadcrumbs[0].message,
                  "testing loader"
                );
              } else {
                // This seems to be happening only in chrome
                assert.notOk(sentryData.breadcrumbs);
              }
            }
            done();
          }
        }
      );
    });

    it("should add breadcrumb from onLoad callback from undefined error with custom init()", function(done) {
      var iframe = this.iframe;

      iframeExecute(
        iframe,
        done,
        function() {
          Sentry.onLoad(function() {
            Sentry.init({ debug: true });
            Sentry.addBreadcrumb({
              category: "auth",
              message: "testing loader",
              level: "error",
            });
          });
          setTimeout(function() {
            setTimeout(done, 137);
            Sentry.captureMessage("test");
          }, 137);
          undefinedMethod(); //trigger error
        },
        function(sentryData) {
          if (debounceAssertEventCount(sentryData, 1, done)) {
            var sentryData = iframe.contentWindow.sentryData[0];
            assert.ok(sentryData.breadcrumbs);
            assert.lengthOf(sentryData.breadcrumbs, 1);
            assert.equal(sentryData.breadcrumbs[0].message, "testing loader");
            done();
          }
        }
      );
    });
  });
}
