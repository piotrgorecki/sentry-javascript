describe('config', function() {
  it('should allow to ignore specific errors', function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        Sentry.captureException(new Error('foo'));
        Sentry.captureException(new Error('ignoreErrorTest'));
        Sentry.captureException(new Error('bar'));
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 2, done)) {
          assert.equal(sentryData[0].exception.values[0].type, 'Error');
          assert.equal(sentryData[0].exception.values[0].value, 'foo');
          assert.equal(sentryData[1].exception.values[0].type, 'Error');
          assert.equal(sentryData[1].exception.values[0].value, 'bar');
          done();
        }
      },
    );
  });

  it('should allow to ignore specific urls', function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        /**
         * We always filter on the caller, not the cause of the error
         *
         * > foo.js file called a function in bar.js
         * > bar.js file called a function in baz.js
         * > baz.js threw an error
         *
         * foo.js is blacklisted in the `init` call (init.js), thus we filter it
         * */
        var urlWithBlacklistedUrl = new Error('filter');
        urlWithBlacklistedUrl.stack =
          'Error: bar\n' +
          ' at http://localhost:5000/foo.js:7:19\n' +
          ' at bar(http://localhost:5000/bar.js:2:3)\n' +
          ' at baz(http://localhost:5000/baz.js:2:9)\n';

        /**
         * > foo-pass.js file called a function in bar-pass.js
         * > bar-pass.js file called a function in baz-pass.js
         * > baz-pass.js threw an error
         *
         * foo-pass.js is *not* blacklisted in the `init` call (init.js), thus we don't filter it
         * */
        var urlWithoutBlacklistedUrl = new Error('pass');
        urlWithoutBlacklistedUrl.stack =
          'Error: bar\n' +
          ' at http://localhost:5000/foo-pass.js:7:19\n' +
          ' at bar(http://localhost:5000/bar-pass.js:2:3)\n' +
          ' at baz(http://localhost:5000/baz-pass.js:2:9)\n';

        Sentry.captureException(urlWithBlacklistedUrl);
        Sentry.captureException(urlWithoutBlacklistedUrl);
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          assert.equal(sentryData[0].exception.values[0].type, 'Error');
          assert.equal(sentryData[0].exception.values[0].value, 'pass');
          done();
        }
      },
    );
  });
});
