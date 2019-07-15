describe("API", function() {
  it("should capture Sentry.captureMessage", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        Sentry.captureMessage("Hello");
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          var sentryData = sentryData[0];
          assert.equal(sentryData.message, "Hello");
          done();
        }
      }
    );
  });

  it("should capture Sentry.captureException", function(done) {
    var iframe = this.iframe;
    iframeExecute(
      iframe,
      done,
      function() {
        try {
          foo();
        } catch (e) {
          Sentry.captureException(e);
        }
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          var sentryData = sentryData[0];
          assert.isAtLeast(
            sentryData.exception.values[0].stacktrace.frames.length,
            2
          );
          assert.isAtMost(
            sentryData.exception.values[0].stacktrace.frames.length,
            4
          );
          done();
        }
      }
    );
  });

  it("should generate a synthetic trace for captureException w/ non-errors", function(done) {
    var iframe = this.iframe;
    iframeExecute(
      iframe,
      done,
      function() {
        throwNonError();
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          var sentryData = sentryData[0];
          assert.isAtLeast(sentryData.stacktrace.frames.length, 1);
          assert.isAtMost(sentryData.stacktrace.frames.length, 3);
          done();
        }
      }
    );
  });

  it("should have correct stacktrace order", function(done) {
    var iframe = this.iframe;
    iframeExecute(
      iframe,
      done,
      function() {
        try {
          foo();
        } catch (e) {
          Sentry.captureException(e);
        }
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          var sentryData = sentryData[0];
          assert.equal(
            sentryData.exception.values[0].stacktrace.frames[
              sentryData.exception.values[0].stacktrace.frames.length - 1
            ].function,
            "bar"
          );
          assert.isAtLeast(
            sentryData.exception.values[0].stacktrace.frames.length,
            2
          );
          assert.isAtMost(
            sentryData.exception.values[0].stacktrace.frames.length,
            4
          );
          done();
        }
      }
    );
  });

  it("should have exception with type and value", function(done) {
    var iframe = this.iframe;
    iframeExecute(
      iframe,
      done,
      function() {
        Sentry.captureException("this is my test exception");
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          var sentryData = sentryData[0];
          assert.isNotEmpty(sentryData.exception.values[0].value);
          assert.isNotEmpty(sentryData.exception.values[0].type);
          done();
        }
      }
    );
  });

  it("should reject duplicate, back-to-back errors from captureException", function(done) {
    var iframe = this.iframe;
    iframeExecute(
      iframe,
      done,
      function() {
        // Different exceptions, don't dedupe
        for (var i = 0; i < 2; i++) {
          throwRandomError();
        }

        // Same exceptions and same stacktrace, dedupe
        for (var i = 0; i < 2; i++) {
          throwError();
        }

        // Same exceptions, different stacktrace (different line number), don't dedupe
        throwSameConsecutiveErrors("bar");
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 5, done)) {
          assert.match(
            sentryData[0].exception.values[0].value,
            /Exception no \d+/
          );
          assert.match(
            sentryData[1].exception.values[0].value,
            /Exception no \d+/
          );
          assert.equal(sentryData[2].exception.values[0].value, "foo");
          assert.equal(sentryData[3].exception.values[0].value, "bar");
          assert.equal(sentryData[4].exception.values[0].value, "bar");
          done();
        }
      }
    );
  });

  it("should not reject back-to-back errors with different stack traces", function(done) {
    var iframe = this.iframe;
    iframeExecute(
      iframe,
      done,
      function() {
        // same error message, but different stacks means that these are considered
        // different errors

        // stack:
        //   bar
        try {
          bar(); // declared in frame.html
        } catch (e) {
          Sentry.captureException(e);
        }

        // stack (different # frames):
        //   bar
        //   foo
        try {
          foo(); // declared in frame.html
        } catch (e) {
          Sentry.captureException(e);
        }

        // stack (same # frames, different frames):
        //   bar
        //   foo2
        try {
          foo2(); // declared in frame.html
        } catch (e) {
          Sentry.captureException(e);
        }
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 3, done)) {
          // NOTE: regex because exact error message differs per-browser
          assert.match(sentryData[0].exception.values[0].value, /baz/);
          assert.equal(
            sentryData[0].exception.values[0].type,
            "ReferenceError"
          );
          assert.match(sentryData[1].exception.values[0].value, /baz/);
          assert.equal(
            sentryData[1].exception.values[0].type,
            "ReferenceError"
          );
          assert.match(sentryData[2].exception.values[0].value, /baz/);
          assert.equal(
            sentryData[2].exception.values[0].type,
            "ReferenceError"
          );
          done();
        }
      }
    );
  });

  it("should reject duplicate, back-to-back messages from captureMessage", function(done) {
    var iframe = this.iframe;
    iframeExecute(
      iframe,
      done,
      function() {
        // Different messages, don't dedupe
        for (var i = 0; i < 2; i++) {
          captureRandomMessage();
        }

        // Same messages and same stacktrace, dedupe
        for (var i = 0; i < 2; i++) {
          captureMessage("same message, same stacktrace");
        }

        // Same messages, different stacktrace (different line number), don't dedupe
        captureSameConsecutiveMessages("same message, different stacktrace");
      },
      function(sentryData) {
        var eventCount = 5;
        if (IS_LOADER) {
          // On the async loader since we replay all messages from the same location
          // we actually only receive 4 events
          eventCount = 4;
        }
        if (debounceAssertEventCount(sentryData, eventCount, done)) {
          assert.match(sentryData[0].message, /Message no \d+/);
          assert.match(sentryData[1].message, /Message no \d+/);
          assert.equal(sentryData[2].message, "same message, same stacktrace");
          assert.equal(
            sentryData[3].message,
            "same message, different stacktrace"
          );
          !IS_LOADER &&
            assert.equal(
              sentryData[4].message,
              "same message, different stacktrace"
            );
          done();
        }
      }
    );
  });
});
