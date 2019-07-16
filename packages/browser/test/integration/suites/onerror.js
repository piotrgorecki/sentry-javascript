describe("window.onerror", function() {
  it("should catch syntax errors", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        eval("foo{};");
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          var sentryData = sentryData[0];
          // ¯\_(ツ)_/¯
          if (isBelowIE11()) {
            assert.equal(sentryData.exception.values[0].type, "Error");
          } else {
            assert.match(sentryData.exception.values[0].type, /SyntaxError/);
          }
          assert.equal(
            sentryData.exception.values[0].stacktrace.frames.length,
            1
          ); // just one frame
          done();
        }
      }
    );
  });

  it("should catch thrown strings", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        // intentionally loading this error via a script file to make
        // sure it is 1) not caught by instrumentation 2) doesn't trigger
        // "Script error"
        var script = document.createElement("script");
        script.src = "/base/subjects/throw-string.js";
        script.onload = function() {
          done();
        };
        document.head.appendChild(script);
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          var sentryData = sentryData[0];
          assert.match(sentryData.exception.values[0].value, /stringError$/);
          assert.equal(
            sentryData.exception.values[0].stacktrace.frames.length,
            1
          ); // always 1 because thrown strings can't provide > 1 frame

          // some browsers extract proper url, line, and column for thrown strings
          // but not all - falls back to frame url
          assert.match(
            sentryData.exception.values[0].stacktrace.frames[0].filename,
            /(\/subjects\/throw-string.js|\/base\/variants\/)/
          );
          assert.match(
            sentryData.exception.values[0].stacktrace.frames[0]["function"],
            /throwStringError|\?|global code/i
          );
          done();
        }
      }
    );
  });

  it("should catch thrown objects", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        // intentionally loading this error via a script file to make
        // sure it is 1) not caught by instrumentation 2) doesn't trigger
        // "Script error"
        var script = document.createElement("script");
        script.src = "/base/subjects/throw-object.js";
        script.onload = function() {
          done();
        };
        document.head.appendChild(script);
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          var sentryData = sentryData[0];
          assert.equal(sentryData.exception.values[0].type, "Error");

          // #<Object> is covering default Android 4.4 and 5.1 browser
          assert.match(
            sentryData.exception.values[0].value,
            /^(\[object Object\]|#<Object>)$/
          );
          assert.equal(
            sentryData.exception.values[0].stacktrace.frames.length,
            1
          ); // always 1 because thrown objects can't provide > 1 frame

          // some browsers extract proper url, line, and column for thrown objects
          // but not all - falls back to frame url
          assert.match(
            sentryData.exception.values[0].stacktrace.frames[0].filename,
            /(\/subjects\/throw-object.js|\/base\/variants\/)/
          );
          assert.match(
            sentryData.exception.values[0].stacktrace.frames[0]["function"],
            /throwStringError|\?|global code/i
          );
          done();
        }
      }
    );
  });

  it("should catch thrown errors", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        // intentionally loading this error via a script file to make
        // sure it is 1) not caught by instrumentation 2) doesn't trigger
        // "Script error"
        var script = document.createElement("script");
        script.src = "/base/subjects/throw-error.js";
        script.onload = function() {
          done();
        };
        document.head.appendChild(script);
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          var sentryData = iframe.contentWindow.sentryData[0];
          // ¯\_(ツ)_/¯
          if (isBelowIE11()) {
            assert.equal(sentryData.exception.values[0].type, "Error");
          } else {
            assert.match(sentryData.exception.values[0].type, /^Error/);
          }
          assert.match(sentryData.exception.values[0].value, /realError$/);
          // 1 or 2 depending on platform
          assert.isAtLeast(
            sentryData.exception.values[0].stacktrace.frames.length,
            1
          );
          assert.isAtMost(
            sentryData.exception.values[0].stacktrace.frames.length,
            2
          );
          assert.match(
            sentryData.exception.values[0].stacktrace.frames[0].filename,
            /\/subjects\/throw-error\.js/
          );
          assert.match(
            sentryData.exception.values[0].stacktrace.frames[0]["function"],
            /\?|global code|throwRealError/i
          );
          done();
        }
      }
    );
  });

  it("should NOT catch an exception already caught [but rethrown] via Sentry.captureException", function(done) {
    var iframe = this.iframe;
    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(done, 137);
        try {
          foo();
        } catch (e) {
          Sentry.captureException(e);
          throw e; // intentionally re-throw
        }
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          assert.equal(sentryData.length, 1);
          done();
        }
      }
    );
  });
});
