describe.only("window.onerror", function() {
  it("should catch syntax errors", function() {
    return runInSandbox(sandbox, function() {
      eval("foo{};");
    }).then(function(events, breadcrumbs) {
      // ¯\_(ツ)_/¯
      if (isBelowIE11()) {
        assert.equal(events[0].exception.values[0].type, "Error");
      } else {
        assert.match(events[0].exception.values[0].type, /SyntaxError/);
      }
      assert.equal(events[0].exception.values[0].stacktrace.frames.length, 1); // just one frame
    });
  });

  it("should catch thrown strings", function() {
    return runInSandbox(sandbox, { manual: true }, function() {
      // intentionally loading this error via a script file to make
      // sure it is 1) not caught by instrumentation 2) doesn't trigger
      // "Script error"
      var script = document.createElement("script");
      script.src = "/base/subjects/throw-string.js";
      script.onload = function() {
        window.finalizeManualTest();
      };
      document.head.appendChild(script);
    }).then(function(events, breadcrumbs) {
      assert.match(events[0].exception.values[0].value, /stringError$/);
      assert.equal(events[0].exception.values[0].stacktrace.frames.length, 1); // always 1 because thrown strings can't provide > 1 frame

      // some browsers extract proper url, line, and column for thrown strings
      // but not all - falls back to frame url
      assert.match(
        events[0].exception.values[0].stacktrace.frames[0].filename,
        /(\/subjects\/throw-string.js|\/base\/variants\/)/
      );
      assert.match(
        events[0].exception.values[0].stacktrace.frames[0]["function"],
        /throwStringError|\?|global code/i
      );
    });
  });

  it("should catch thrown objects", function() {
    return runInSandbox(sandbox, { manual: true }, function() {
      // intentionally loading this error via a script file to make
      // sure it is 1) not caught by instrumentation 2) doesn't trigger
      // "Script error"
      var script = document.createElement("script");
      script.src = "/base/subjects/throw-object.js";
      script.onload = function() {
        window.finalizeManualTest();
      };
      document.head.appendChild(script);
    }).then(function(events, breadcrumbs) {
      assert.equal(events[0].exception.values[0].type, "Error");

      // #<Object> is covering default Android 4.4 and 5.1 browser
      assert.match(
        events[0].exception.values[0].value,
        /^(\[object Object\]|#<Object>)$/
      );
      assert.equal(events[0].exception.values[0].stacktrace.frames.length, 1); // always 1 because thrown objects can't provide > 1 frame

      // some browsers extract proper url, line, and column for thrown objects
      // but not all - falls back to frame url
      assert.match(
        events[0].exception.values[0].stacktrace.frames[0].filename,
        /(\/subjects\/throw-object.js|\/base\/variants\/)/
      );
      assert.match(
        events[0].exception.values[0].stacktrace.frames[0]["function"],
        /throwStringError|\?|global code/i
      );
    });
  });

  it("should catch thrown errors", function() {
    return runInSandbox(sandbox, { manual: true }, function() {
      // intentionally loading this error via a script file to make
      // sure it is 1) not caught by instrumentation 2) doesn't trigger
      // "Script error"
      var script = document.createElement("script");
      script.src = "/base/subjects/throw-error.js";
      script.onload = function() {
        window.finalizeManualTest();
      };
      document.head.appendChild(script);
    }).then(function(events, breadcrumbs) {
      // ¯\_(ツ)_/¯
      if (isBelowIE11()) {
        assert.equal(events[0].exception.values[0].type, "Error");
      } else {
        assert.match(events[0].exception.values[0].type, /^Error/);
      }
      assert.match(events[0].exception.values[0].value, /realError$/);
      // 1 or 2 depending on platform
      assert.isAtLeast(
        events[0].exception.values[0].stacktrace.frames.length,
        1
      );
      assert.isAtMost(
        events[0].exception.values[0].stacktrace.frames.length,
        2
      );
      assert.match(
        events[0].exception.values[0].stacktrace.frames[0].filename,
        /\/subjects\/throw-error\.js/
      );
      assert.match(
        events[0].exception.values[0].stacktrace.frames[0]["function"],
        /\?|global code|throwRealError/i
      );
    });
  });

  it("should NOT catch an exception already caught [but rethrown] via Sentry.captureException", function() {
    return runInSandbox(sandbox, function() {
      try {
        foo();
      } catch (e) {
        Sentry.captureException(e);
        throw e; // intentionally re-throw
      }
    }).then(function(events, breadcrumbs) {
      assert.equal(events.length, 1);
    });
  });
});
