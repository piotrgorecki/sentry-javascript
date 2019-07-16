function runInSandbox(sandbox, code) {
  var finalizeTest;
  var donePromise = new Promise(function(resolve) {
    finalizeTest = resolve;
  });

  sandbox.contentWindow.finalizeTest = finalizeTest;

  var collect = function() {
    Sentry.flush(2000).then(function() {
      window.finalizeTest(events, breadcrumbs);
    });
  };

  // use setTimeout so stack trace doesn't go all the way back to mocha test runner
  sandbox.contentWindow.eval(
    "window.originalBuiltIns.setTimeout.call(window, " +
      collect.toString() +
      ");"
  );
  sandbox.contentWindow.eval(
    "window.originalBuiltIns.setTimeout.call(window, " + code.toString() + ");"
  );

  return donePromise;
}

function createSandbox(done, file) {
  var sandbox = document.createElement("iframe");
  sandbox.style.display = "none";
  sandbox.src = "/base/variants/" + file + ".html";
  sandbox.onload = function() {
    done();
  };
  document.body.appendChild(sandbox);
  return sandbox;
}

var assertTimeout;
function debounceAssertEventCount(sentryData, count, done) {
  if (sentryData === undefined) {
    return false;
  }
  clearTimeout(assertTimeout);
  assertTimeout = setTimeout(function() {
    done(new Error("Did not receive " + count + " events"));
  }, 137);
  if (sentryData.length != count) {
    return false;
  }
  clearTimeout(assertTimeout);
  return true;
}

function optional(title, condition) {
  return condition ? "⚠ SKIPPED: " + title : title;
}

var anchor = document.createElement("a");
function parseUrl(url) {
  var out = { pathname: "", origin: "", protocol: "" };
  if (!url) anchor.href = url;
  for (var key in out) {
    out[key] = anchor[key];
  }
  return out;
}

function isBelowIE11() {
  return /*@cc_on!@*/ false == !false;
}

// Thanks for nothing IE!
// (╯°□°）╯︵ ┻━┻
function canReadFunctionName() {
  function foo() {}
  if (foo.name === "foo") return true;
  return false;
}

var variants = ["frame"];
// var variants = ["frame", "loader", "loader-lazy-no"];

function runVariant(variant) {
  var IS_LOADER = !!variant.match(/^loader/);
  var IS_ASYNC_LOADER = !!variant.match(/^loader$/);
  var IS_SYNC_LOADER = !!variant.match(/^loader-lazy-no$/);

  describe(variant, function() {
    // this.timeout(30000);

    var sandbox;

    beforeEach(function(done) {
      sandbox = createSandbox(done, variant);
    });

    afterEach(function() {
      document.body.removeChild(sandbox);
    });

    /**
     * This part will be replaced by the test runner
     */
    describe.only("config", function() {
  it("should allow to ignore specific errors", function() {
    return runInSandbox(sandbox, function() {
      Sentry.captureException(new Error("foo"));
      Sentry.captureException(new Error("ignoreErrorTest"));
      Sentry.captureException(new Error("bar"));
    }).then(function(events, breadcrumbs) {
      assert.equal(events[0].exception.values[0].type, "Error");
      assert.equal(events[0].exception.values[0].value, "foo");
      assert.equal(events[1].exception.values[0].type, "Error");
      assert.equal(events[1].exception.values[0].value, "bar");
    });
  });

  it("should allow to ignore specific urls", function() {
    return runInSandbox(sandbox, function() {
      /**
       * We always filter on the caller, not the cause of the error
       *
       * > foo.js file called a function in bar.js
       * > bar.js file called a function in baz.js
       * > baz.js threw an error
       *
       * foo.js is blacklisted in the `init` call (init.js), thus we filter it
       * */
      var urlWithBlacklistedUrl = new Error("filter");
      urlWithBlacklistedUrl.stack =
        "Error: bar\n" +
        " at http://localhost:5000/foo.js:7:19\n" +
        " at bar(http://localhost:5000/bar.js:2:3)\n" +
        " at baz(http://localhost:5000/baz.js:2:9)\n";

      /**
       * > foo-pass.js file called a function in bar-pass.js
       * > bar-pass.js file called a function in baz-pass.js
       * > baz-pass.js threw an error
       *
       * foo-pass.js is *not* blacklisted in the `init` call (init.js), thus we don't filter it
       * */
      var urlWithoutBlacklistedUrl = new Error("pass");
      urlWithoutBlacklistedUrl.stack =
        "Error: bar\n" +
        " at http://localhost:5000/foo-pass.js:7:19\n" +
        " at bar(http://localhost:5000/bar-pass.js:2:3)\n" +
        " at baz(http://localhost:5000/baz-pass.js:2:9)\n";

      Sentry.captureException(urlWithBlacklistedUrl);
      Sentry.captureException(urlWithoutBlacklistedUrl);
    }).then(function(events, breadcrumbs) {
      assert.lengthOf(events, 1);
      assert.equal(events[0].exception.values[0].type, "Error");
      assert.equal(events[0].exception.values[0].value, "pass");
    });
  });
});
 // prettier-ignore
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
 // prettier-ignore
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
 // prettier-ignore
    describe("wrapped built-ins", function() {
  it("should capture exceptions from event listeners", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        var div = document.createElement("div");
        document.body.appendChild(div);
        div.addEventListener(
          "click",
          function() {
            window.element = div;
            window.context = this;
            foo();
          },
          false
        );

        var click = new MouseEvent("click");
        div.dispatchEvent(click);
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          // Make sure we preserve the correct context
          assert.equal(
            iframe.contentWindow.element,
            iframe.contentWindow.context
          );
          delete iframe.contentWindow.element;
          delete iframe.contentWindow.context;
          assert.match(sentryData[0].exception.values[0].value, /baz/);
          done();
        }
      }
    );
  });

  it("should transparently remove event listeners from wrapped functions", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(done, 137);

        var div = document.createElement("div");
        document.body.appendChild(div);
        var fooFn = function() {
          foo();
        };
        div.addEventListener("click", fooFn, false);
        div.removeEventListener("click", fooFn);

        var click = new MouseEvent("click");
        div.dispatchEvent(click);
      },
      function() {
        var sentryData = iframe.contentWindow.sentryData[0];
        assert.equal(sentryData, null); // should never trigger error
        done();
      }
    );
  });

  it("should capture unhandledrejection with error", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        if (isChrome()) {
          Promise.reject(new Error("test2"));
        } else {
          done();
        }
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          assert.equal(sentryData[0].exception.values[0].value, "test2");
          assert.equal(sentryData[0].exception.values[0].type, "Error");
          assert.isAtLeast(
            sentryData[0].exception.values[0].stacktrace.frames.length,
            1
          );
          assert.equal(
            sentryData[0].exception.values[0].mechanism.handled,
            false
          );
          assert.equal(
            sentryData[0].exception.values[0].mechanism.type,
            "onunhandledrejection"
          );
          done();
        } else {
          // This test will be skipped if it's not Chrome Desktop
          done();
        }
      }
    );
  });

  it("should capture unhandledrejection with a string", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        if (isChrome()) {
          Promise.reject("test");
        } else {
          done();
        }
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          // non-error rejections doesnt provide stacktraces so we can skip the assertion
          assert.equal(sentryData[0].exception.values[0].value, '"test"');
          assert.equal(
            sentryData[0].exception.values[0].type,
            "UnhandledRejection"
          );
          assert.equal(
            sentryData[0].exception.values[0].mechanism.handled,
            false
          );
          assert.equal(
            sentryData[0].exception.values[0].mechanism.type,
            "onunhandledrejection"
          );
          done();
        } else {
          // This test will be skipped if it's not Chrome Desktop
          done();
        }
      }
    );
  });

  it("should capture unhandledrejection with a monster string", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        if (isChrome()) {
          Promise.reject("test".repeat(100));
        } else {
          done();
        }
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          // non-error rejections doesnt provide stacktraces so we can skip the assertion
          assert.equal(sentryData[0].exception.values[0].value.length, 253);
          assert.equal(
            sentryData[0].exception.values[0].type,
            "UnhandledRejection"
          );
          assert.equal(
            sentryData[0].exception.values[0].mechanism.handled,
            false
          );
          assert.equal(
            sentryData[0].exception.values[0].mechanism.type,
            "onunhandledrejection"
          );
          done();
        } else {
          // This test will be skipped if it's not Chrome Desktop
          done();
        }
      }
    );
  });

  it("should capture unhandledrejection with an object", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        if (isChrome()) {
          Promise.reject({ a: "b" });
        } else {
          done();
        }
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          // non-error rejections doesnt provide stacktraces so we can skip the assertion
          assert.equal(sentryData[0].exception.values[0].value, '{"a":"b"}');
          assert.equal(
            sentryData[0].exception.values[0].type,
            "UnhandledRejection"
          );
          assert.equal(
            sentryData[0].exception.values[0].mechanism.handled,
            false
          );
          assert.equal(
            sentryData[0].exception.values[0].mechanism.type,
            "onunhandledrejection"
          );
          done();
        } else {
          // This test will be skipped if it's not Chrome Desktop
          done();
        }
      }
    );
  });

  it("should capture unhandledrejection with an monster object", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        if (isChrome()) {
          var a = {
            a: "1".repeat("100"),
            b: "2".repeat("100"),
            c: "3".repeat("100"),
          };
          a.d = a.a;
          a.e = a;
          Promise.reject(a);
        } else {
          done();
        }
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          // non-error rejections doesnt provide stacktraces so we can skip the assertion
          assert.equal(sentryData[0].exception.values[0].value.length, 253);
          assert.equal(
            sentryData[0].exception.values[0].type,
            "UnhandledRejection"
          );
          assert.equal(
            sentryData[0].exception.values[0].mechanism.handled,
            false
          );
          assert.equal(
            sentryData[0].exception.values[0].mechanism.type,
            "onunhandledrejection"
          );
          done();
        } else {
          // This test will be skipped if it's not Chrome Desktop
          done();
        }
      }
    );
  });

  it("should capture exceptions inside setTimeout", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(function() {
          foo();
        });
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          assert.match(sentryData[0].exception.values[0].value, /baz/);
          done();
        }
      }
    );
  });

  it("should capture exceptions inside setInterval", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        var exceptionInterval = setInterval(function() {
          clearInterval(exceptionInterval);
          foo();
        }, 137);
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          assert.match(sentryData[0].exception.values[0].value, /baz/);
          done();
        }
      }
    );
  });

  it("should capture exceptions inside requestAnimationFrame", function(done) {
    var iframe = this.iframe;
    // needs to be visible or requestAnimationFrame won't ever fire
    iframe.style.display = "block";

    iframeExecute(
      iframe,
      done,
      function() {
        requestAnimationFrame(function() {
          foo();
        });
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          assert.match(sentryData[0].exception.values[0].value, /baz/);
          done();
        }
      }
    );
  });

  it("should capture exceptions from XMLHttpRequest event handlers (e.g. onreadystatechange)", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        var xhr = new XMLHttpRequest();

        // intentionally assign event handlers *after* XMLHttpRequest.prototype.open,
        // since this is what jQuery does
        // https://github.com/jquery/jquery/blob/master/src/ajax/xhr.js#L37

        xhr.open("GET", "/base/subjects/example.json");
        xhr.onreadystatechange = function() {
          setTimeout(done, 137);
          // replace onreadystatechange with no-op so exception doesn't
          // fire more than once as XHR changes loading state
          xhr.onreadystatechange = function() {};
          foo();
        };
        xhr.send();
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          assert.match(sentryData[0].exception.values[0].value, /baz/);
          done();
        }
      }
    );
  });

  it(
    optional(
      "should capture built-in's mechanism type as instrument",
      IS_LOADER
    ),
    function(done) {
      var iframe = this.iframe;

      iframeExecute(
        iframe,
        done,
        function() {
          setTimeout(function() {
            foo();
          });
        },
        function(sentryData) {
          if (debounceAssertEventCount(sentryData, 1, done)) {
            var sentryData = sentryData[0];

            if (IS_LOADER) {
              // The async loader doesn't wrap setTimeout
              // so we don't receive the full mechanism
              assert.ok(sentryData.exception.values[0].mechanism);
              return done();
            }

            var fn = sentryData.exception.values[0].mechanism.data.function;
            delete sentryData.exception.values[0].mechanism.data;

            if (canReadFunctionName()) {
              assert.equal(fn, "setTimeout");
            } else {
              assert.equal(fn, "<anonymous>");
            }

            assert.deepEqual(sentryData.exception.values[0].mechanism, {
              type: "instrument",
              handled: true,
            });
            done();
          }
        }
      );
    }
  );

  it("should capture built-in's handlers fn name in mechanism data", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        var div = document.createElement("div");
        document.body.appendChild(div);
        div.addEventListener(
          "click",
          function namedFunction() {
            foo();
          },
          false
        );

        var click = new MouseEvent("click");
        div.dispatchEvent(click);
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          var sentryData = sentryData[0];

          if (IS_LOADER) {
            // The async loader doesn't wrap addEventListener
            // so we don't receive the full mechanism
            assert.ok(sentryData.exception.values[0].mechanism);
            return done();
          }

          var handler = sentryData.exception.values[0].mechanism.data.handler;
          delete sentryData.exception.values[0].mechanism.data.handler;
          var target = sentryData.exception.values[0].mechanism.data.target;
          delete sentryData.exception.values[0].mechanism.data.target;

          if (canReadFunctionName()) {
            assert.equal(handler, "namedFunction");
          } else {
            assert.equal(handler, "<anonymous>");
          }

          // IE vs. Rest of the world
          assert.oneOf(target, ["Node", "EventTarget"]);
          assert.deepEqual(sentryData.exception.values[0].mechanism, {
            type: "instrument",
            handled: true,
            data: {
              function: "addEventListener",
            },
          });
          done();
        }
      }
    );
  });

  it("should fallback to <anonymous> fn name in mechanism data if one is unavailable", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        var div = document.createElement("div");
        document.body.appendChild(div);
        div.addEventListener(
          "click",
          function() {
            foo();
          },
          false
        );

        var click = new MouseEvent("click");
        div.dispatchEvent(click);
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          var sentryData = sentryData[0];

          if (IS_LOADER) {
            // The async loader doesn't wrap
            assert.ok(sentryData.exception.values[0].mechanism);
            return done();
          }

          var target = sentryData.exception.values[0].mechanism.data.target;
          delete sentryData.exception.values[0].mechanism.data.target;

          // IE vs. Rest of the world
          assert.oneOf(target, ["Node", "EventTarget"]);
          assert.deepEqual(sentryData.exception.values[0].mechanism, {
            type: "instrument",
            handled: true,
            data: {
              function: "addEventListener",
              handler: "<anonymous>",
            },
          });
          done();
        }
      }
    );
  });
});
 // prettier-ignore
    describe("breadcrumbs", function() {
  it(
    optional("should record an XMLHttpRequest with a handler", IS_LOADER),
    function(done) {
      var iframe = this.iframe;

      iframeExecute(
        iframe,
        done,
        function() {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", "/base/subjects/example.json");
          xhr.setRequestHeader("Content-type", "application/json");
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              done();
            }
          };
          xhr.send();
        },
        function() {
          if (IS_LOADER) {
            // The async loader doesn't wrap XHR
            return done();
          }
          var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

          assert.equal(breadcrumbs.length, 1);
          assert.equal(breadcrumbs[0].type, "http");
          assert.equal(breadcrumbs[0].category, "xhr");
          assert.equal(breadcrumbs[0].data.method, "GET");

          done();
        }
      );
    }
  );

  it(
    optional(
      "should record an XMLHttpRequest without any handlers set",
      IS_LOADER
    ),
    function(done) {
      var iframe = this.iframe;

      iframeExecute(
        iframe,
        done,
        function() {
          // I hate to do a time-based "done" trigger, but unfortunately we can't
          // set an onload/onreadystatechange handler on XHR to verify that it finished
          // - that's the whole point of this test! :(
          var xhr = new XMLHttpRequest();
          xhr.open("GET", "/base/subjects/example.json");
          xhr.setRequestHeader("Content-type", "application/json");
          xhr.send();
          setTimeout(done, 1001);
        },
        function() {
          if (IS_LOADER) {
            // Since we do a xhr as soon as the page loads
            // the async loader is not able to pick this
            return done();
          }
          var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

          assert.equal(breadcrumbs.length, 1);
          assert.equal(breadcrumbs[0].type, "http");
          assert.equal(breadcrumbs[0].category, "xhr");
          assert.equal(breadcrumbs[0].data.method, "GET");

          done();
        }
      );
    }
  );

  it(
    optional(
      "should transform XMLHttpRequests to the Sentry store endpoint as sentry type breadcrumb",
      IS_LOADER
    ),
    function(done) {
      var iframe = this.iframe;
      iframeExecute(
        iframe,
        done,
        function() {
          setTimeout(done, 137);
          var xhr = new XMLHttpRequest();
          xhr.open("GET", "https://example.com/api/1/store/");
          xhr.send('{"message":"someMessage","level":"warning"}');
        },
        function() {
          if (IS_LOADER) {
            // Since we do a xhr as soon as the page loads
            // the async loader is not able to pick this
            return done();
          }
          var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;
          assert.equal(breadcrumbs.length, 1);
          assert.equal(breadcrumbs[0].category, "sentry");
          assert.equal(breadcrumbs[0].level, "warning");
          assert.equal(breadcrumbs[0].message, "someMessage");
          done();
        }
      );
    }
  );

  it("should record a fetch request", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        fetch("/base/subjects/example.json").then(
          function() {
            Sentry.captureMessage("test");
          },
          function() {
            Sentry.captureMessage("test");
          }
        );
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap fetch, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }

        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;
        var breadcrumbUrl = "/base/subjects/example.json";

        if ("fetch" in window) {
          assert.equal(breadcrumbs.length, 1);
          assert.equal(breadcrumbs[0].type, "http");
          assert.equal(breadcrumbs[0].category, "fetch");
          assert.equal(breadcrumbs[0].data.method, "GET");
          assert.equal(breadcrumbs[0].data.url, breadcrumbUrl);
        } else {
          // otherwise we use a fetch polyfill based on xhr
          assert.equal(breadcrumbs.length, 1);
          assert.equal(breadcrumbs[0].type, "http");
          assert.equal(breadcrumbs[0].category, "xhr");
          assert.equal(breadcrumbs[0].data.method, "GET");
          assert.equal(breadcrumbs[0].data.url, breadcrumbUrl);
        }
        done();
      }
    );
  });

  it("should record a fetch request with Request obj instead of URL string", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        fetch(new Request("/base/subjects/example.json")).then(
          function() {
            Sentry.captureMessage("test");
          },
          function() {
            Sentry.captureMessage("test");
          }
        );
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap fetch, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;
        var breadcrumbUrl = "/base/subjects/example.json";

        if ("fetch" in window) {
          assert.equal(breadcrumbs.length, 1);
          assert.equal(breadcrumbs[0].type, "http");
          assert.equal(breadcrumbs[0].category, "fetch");
          assert.equal(breadcrumbs[0].data.method, "GET");
          // Request constructor normalizes the url
          assert.ok(breadcrumbs[0].data.url.indexOf(breadcrumbUrl) !== -1);
        } else {
          // otherwise we use a fetch polyfill based on xhr
          assert.equal(breadcrumbs.length, 1);
          assert.equal(breadcrumbs[0].type, "http");
          assert.equal(breadcrumbs[0].category, "xhr");
          assert.equal(breadcrumbs[0].data.method, "GET");
          assert.ok(breadcrumbs[0].data.url.indexOf(breadcrumbUrl) !== -1);
        }
        done();
      }
    );
  });

  it("should record a fetch request with an arbitrary type argument", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        fetch(123).then(
          function() {
            Sentry.captureMessage("test");
          },
          function() {
            Sentry.captureMessage("test");
          }
        );
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap fetch, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;
        var breadcrumbUrl = "123";

        if ("fetch" in window) {
          assert.equal(breadcrumbs.length, 1);
          assert.equal(breadcrumbs[0].type, "http");
          assert.equal(breadcrumbs[0].category, "fetch");
          assert.equal(breadcrumbs[0].data.method, "GET");
          // Request constructor normalizes the url
          assert.ok(breadcrumbs[0].data.url.indexOf(breadcrumbUrl) !== -1);
        } else {
          // otherwise we use a fetch polyfill based on xhr
          assert.equal(breadcrumbs.length, 1);
          assert.equal(breadcrumbs[0].type, "http");
          assert.equal(breadcrumbs[0].category, "xhr");
          assert.equal(breadcrumbs[0].data.method, "GET");
          assert.ok(breadcrumbs[0].data.url.indexOf(breadcrumbUrl) !== -1);
        }
        done();
      }
    );
  });

  it("should not fail with click or keypress handler with no callback", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(function() {
          Sentry.captureMessage("test");
        }, 137);

        var input = document.getElementsByTagName("input")[0];
        input.addEventListener("click", undefined);
        input.addEventListener("keypress", undefined);

        var click = new MouseEvent("click");
        input.dispatchEvent(click);

        var keypress = new KeyboardEvent("keypress");
        input.dispatchEvent(keypress);
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }

        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

        assert.equal(breadcrumbs.length, 2);

        assert.equal(breadcrumbs[0].category, "ui.click");
        assert.equal(
          breadcrumbs[0].message,
          'body > form#foo-form > input[name="foo"]'
        );

        assert.equal(breadcrumbs[1].category, "ui.input");
        assert.equal(
          breadcrumbs[1].message,
          'body > form#foo-form > input[name="foo"]'
        );

        // There should be no expection, if there is one it means we threw it
        assert.isUndefined(iframe.contentWindow.sentryData[0].exception);

        done();
      }
    );
  });

  it("should not fail with custom event", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(function() {
          Sentry.captureMessage("test");
        }, 137);

        var input = document.getElementsByTagName("input")[0];
        input.addEventListener("build", function(evt) {
          evt.stopPropagation();
        });

        var customEvent = new CustomEvent("build", { detail: 1 });
        input.dispatchEvent(customEvent);
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }

        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;
        // There should be no expection, if there is one it means we threw it
        assert.isUndefined(iframe.contentWindow.sentryData[0].exception);
        assert.equal(breadcrumbs.length, 0);

        done();
      }
    );
  });

  it("should not fail with custom event and handler with no callback", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(function() {
          Sentry.captureMessage("test");
        }, 137);

        var input = document.getElementsByTagName("input")[0];
        input.addEventListener("build", undefined);

        var customEvent = new CustomEvent("build", { detail: 1 });
        input.dispatchEvent(customEvent);
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }

        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;
        // There should be no expection, if there is one it means we threw it
        assert.isUndefined(iframe.contentWindow.sentryData[0].exception);
        assert.equal(breadcrumbs.length, 0);

        done();
      }
    );
  });

  it("should record a mouse click on element WITH click handler present", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(function() {
          Sentry.captureMessage("test");
        }, 137);

        // add an event listener to the input. we want to make sure that
        // our breadcrumbs still work even if the page has an event listener
        // on an element that cancels event bubbling
        var input = document.getElementsByTagName("input")[0];
        var clickHandler = function(evt) {
          evt.stopPropagation(); // don't bubble
        };
        input.addEventListener("click", clickHandler);

        // click <input/>
        var click = new MouseEvent("click");
        input.dispatchEvent(click);
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

        assert.equal(breadcrumbs.length, 1);

        assert.equal(breadcrumbs[0].category, "ui.click");
        assert.equal(
          breadcrumbs[0].message,
          'body > form#foo-form > input[name="foo"]'
        );
        done();
      }
    );
  });

  it("should record a mouse click on element WITHOUT click handler present", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(function() {
          Sentry.captureMessage("test");
        }, 137);

        // click <input/>
        var click = new MouseEvent("click");
        var input = document.getElementsByTagName("input")[0];
        input.dispatchEvent(click);
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

        assert.equal(breadcrumbs.length, 1);

        assert.equal(breadcrumbs[0].category, "ui.click");
        assert.equal(
          breadcrumbs[0].message,
          'body > form#foo-form > input[name="foo"]'
        );
        done();
      }
    );
  });

  it("should only record a SINGLE mouse click for a tree of elements with event listeners", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(function() {
          Sentry.captureMessage("test");
        }, 137);

        var clickHandler = function() {};

        // mousemove event shouldnt clobber subsequent "breadcrumbed" events (see #724)
        document
          .querySelector(".a")
          .addEventListener("mousemove", clickHandler);

        document.querySelector(".a").addEventListener("click", clickHandler);
        document.querySelector(".b").addEventListener("click", clickHandler);
        document.querySelector(".c").addEventListener("click", clickHandler);

        // click <input/>
        var click = new MouseEvent("click");
        var input = document.querySelector(".a"); // leaf node
        input.dispatchEvent(click);
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

        assert.equal(breadcrumbs.length, 1);

        assert.equal(breadcrumbs[0].category, "ui.click");
        assert.equal(breadcrumbs[0].message, "body > div.c > div.b > div.a");
        done();
      }
    );
  });

  it("should bail out if accessing the `type` and `target` properties of an event throw an exception", function(done) {
    // see: https://github.com/getsentry/sentry-javascript/issues/768
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(function() {
          Sentry.captureMessage("test");
        }, 137);

        // click <input/>
        var click = new MouseEvent("click");
        function kaboom() {
          throw new Error("lol");
        }
        Object.defineProperty(click, "type", { get: kaboom });
        Object.defineProperty(click, "target", { get: kaboom });

        var input = document.querySelector(".a"); // leaf node
        input.dispatchEvent(click);
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

        assert.equal(breadcrumbs.length, 1);
        assert.equal(breadcrumbs[0].category, "ui.click");
        assert.equal(breadcrumbs[0].message, "<unknown>");
        done();
      }
    );
  });

  it('should record consecutive keypress events into a single "input" breadcrumb', function(done) {
    var iframe = this.iframe;
    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(function() {
          Sentry.captureMessage("test");
        }, 137);

        // keypress <input/> twice
        var keypress1 = new KeyboardEvent("keypress");
        var keypress2 = new KeyboardEvent("keypress");

        var input = document.getElementsByTagName("input")[0];
        input.dispatchEvent(keypress1);
        input.dispatchEvent(keypress2);
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

        assert.equal(breadcrumbs.length, 1);

        assert.equal(breadcrumbs[0].category, "ui.input");
        assert.equal(
          breadcrumbs[0].message,
          'body > form#foo-form > input[name="foo"]'
        );
        done();
      }
    );
  });

  it(
    optional(
      "should flush keypress breadcrumbs when an error is thrown",
      IS_LOADER
    ),
    function(done) {
      var iframe = this.iframe;
      iframeExecute(
        iframe,
        done,
        function() {
          setTimeout(done, 137);
          // some browsers trigger onpopstate for load / reset breadcrumb state

          // keypress <input/>
          var keypress = new KeyboardEvent("keypress");

          var input = document.getElementsByTagName("input")[0];
          input.dispatchEvent(keypress);

          foo(); // throw exception
        },
        function() {
          if (IS_LOADER) {
            return done();
          }
          // TODO: don't really understand what's going on here
          // Why do we not catch an error here
          var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;
          assert.equal(breadcrumbs.length, 1);
          assert.equal(breadcrumbs[0].category, "ui.input");
          assert.equal(
            breadcrumbs[0].message,
            'body > form#foo-form > input[name="foo"]'
          );
          done();
        }
      );
    }
  );

  it("should flush keypress breadcrumb when input event occurs immediately after", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(function() {
          Sentry.captureMessage("test");
        }, 137);

        // 1st keypress <input/>
        var keypress1 = new KeyboardEvent("keypress");
        // click <input/>
        var click = new MouseEvent("click");
        // 2nd keypress
        var keypress2 = new KeyboardEvent("keypress");

        var input = document.getElementsByTagName("input")[0];
        input.dispatchEvent(keypress1);
        input.dispatchEvent(click);
        input.dispatchEvent(keypress2);
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

        assert.equal(breadcrumbs.length, 3);

        assert.equal(breadcrumbs[0].category, "ui.input");
        assert.equal(
          breadcrumbs[0].message,
          'body > form#foo-form > input[name="foo"]'
        );

        assert.equal(breadcrumbs[1].category, "ui.click");
        assert.equal(
          breadcrumbs[1].message,
          'body > form#foo-form > input[name="foo"]'
        );

        assert.equal(breadcrumbs[2].category, "ui.input");
        assert.equal(
          breadcrumbs[2].message,
          'body > form#foo-form > input[name="foo"]'
        );
        done();
      }
    );
  });

  it('should record consecutive keypress events in a contenteditable into a single "input" breadcrumb', function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        setTimeout(function() {
          setTimeout(done, 1001);
          Sentry.captureMessage("test");
        }, 1001);

        // keypress <input/> twice
        var keypress1 = new KeyboardEvent("keypress");
        var keypress2 = new KeyboardEvent("keypress");

        var div = document.querySelector("[contenteditable]");
        div.dispatchEvent(keypress1);
        div.dispatchEvent(keypress2);
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

        assert.equal(breadcrumbs.length, 1);

        assert.equal(breadcrumbs[0].category, "ui.input");
        assert.equal(
          breadcrumbs[0].message,
          "body > form#foo-form > div.contenteditable"
        );
        done();
      }
    );
  });

  it("should record click events that were handled using an object with handleEvent property and call original callback", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        var frame = this;
        frame.handleEventCalled = false;

        var input = document.getElementsByTagName("input")[0];
        input.addEventListener("click", {
          handleEvent: function() {
            frame.handleEventCalled = true;
          },
        });
        input.dispatchEvent(new MouseEvent("click"));

        Sentry.captureMessage("test");
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

        assert.equal(breadcrumbs.length, 1);
        assert.equal(breadcrumbs[0].category, "ui.click");
        assert.equal(
          breadcrumbs[0].message,
          'body > form#foo-form > input[name="foo"]'
        );

        assert.equal(iframe.contentWindow.handleEventCalled, true);

        done();
      }
    );
  });

  it("should record keypress events that were handled using an object with handleEvent property and call original callback", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        var frame = this;
        frame.handleEventCalled = false;

        var input = document.getElementsByTagName("input")[0];
        input.addEventListener("keypress", {
          handleEvent: function() {
            frame.handleEventCalled = true;
          },
        });
        input.dispatchEvent(new KeyboardEvent("keypress"));

        Sentry.captureMessage("test");
      },
      function() {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(iframe.contentWindow.sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

        assert.equal(breadcrumbs.length, 1);
        assert.equal(breadcrumbs[0].category, "ui.input");
        assert.equal(
          breadcrumbs[0].message,
          'body > form#foo-form > input[name="foo"]'
        );

        assert.equal(iframe.contentWindow.handleEventCalled, true);

        done();
      }
    );
  });

  it(
    optional(
      "should record history.[pushState|replaceState] changes as navigation breadcrumbs",
      IS_LOADER
    ),
    function(done) {
      var iframe = this.iframe;

      iframeExecute(
        iframe,
        done,
        function() {
          setTimeout(done, 137);

          history.pushState({}, "", "/foo");
          history.pushState({}, "", "/bar?a=1#fragment");
          history.pushState({}, "", {}); // pushState calls toString on non-string args
          history.pushState({}, "", null); // does nothing / no-op
          // can't call history.back() because it will change url of parent document
          // (e.g. document running mocha) ... instead just "emulate" a back button
          // press by calling replaceState
          history.replaceState({}, "", "/bar?a=1#fragment");
        },
        function() {
          if (IS_LOADER) {
            // The async loader doesn't wrap history
            return done();
          }
          var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;

          assert.equal(breadcrumbs.length, 4);
          assert.equal(breadcrumbs[0].category, "navigation"); // (start) => foo
          assert.equal(breadcrumbs[1].category, "navigation"); // foo => bar?a=1#fragment
          assert.equal(breadcrumbs[2].category, "navigation"); // bar?a=1#fragment => [object%20Object]
          assert.equal(breadcrumbs[3].category, "navigation"); // [object%20Object] => bar?a=1#fragment (back button)

          assert.ok(
            /\/base\/variants\/.*\.html$/.test(breadcrumbs[0].data.from),
            "'from' url is incorrect"
          );
          assert.ok(
            /\/foo$/.test(breadcrumbs[0].data.to),
            "'to' url is incorrect"
          );

          assert.ok(
            /\/foo$/.test(breadcrumbs[1].data.from),
            "'from' url is incorrect"
          );
          assert.ok(
            /\/bar\?a=1#fragment$/.test(breadcrumbs[1].data.to),
            "'to' url is incorrect"
          );

          assert.ok(
            /\/bar\?a=1#fragment$/.test(breadcrumbs[2].data.from),
            "'from' url is incorrect"
          );
          assert.ok(
            /\[object Object\]$/.test(breadcrumbs[2].data.to),
            "'to' url is incorrect"
          );

          assert.ok(
            /\[object Object\]$/.test(breadcrumbs[3].data.from),
            "'from' url is incorrect"
          );
          assert.ok(
            /\/bar\?a=1#fragment/.test(breadcrumbs[3].data.to),
            "'to' url is incorrect"
          );

          done();
        }
      );
    }
  );

  it(
    optional("should preserve native code detection compatibility", IS_LOADER),
    function(done) {
      var iframe = this.iframe;

      iframeExecute(
        iframe,
        done,
        function() {
          done();
        },
        function() {
          if (IS_LOADER) {
            // The async loader doesn't wrap anything
            return done();
          }
          assert.include(
            Function.prototype.toString.call(window.setTimeout),
            "[native code]"
          );
          assert.include(
            Function.prototype.toString.call(window.setInterval),
            "[native code]"
          );
          assert.include(
            Function.prototype.toString.call(window.addEventListener),
            "[native code]"
          );
          assert.include(
            Function.prototype.toString.call(window.removeEventListener),
            "[native code]"
          );
          assert.include(
            Function.prototype.toString.call(window.requestAnimationFrame),
            "[native code]"
          );
          if ("fetch" in window) {
            assert.include(
              Function.prototype.toString.call(window.fetch),
              "[native code]"
            );
          }
          done();
        }
      );
    }
  );

  it("should add breadcrumbs on thrown errors", function(done) {
    var iframe = this.iframe;

    iframeExecute(
      iframe,
      done,
      function() {
        window.allowConsoleBreadcrumbs = true;
        var logs = document.createElement("script");
        logs.src = "/base/subjects/console-logs.js";
        logs.onload = function() {
          done();
        };
        document.head.appendChild(logs);
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          if (IS_LOADER) {
            // The async loader doesn't capture breadcrumbs, but we should receive the event without them
            assert.lengthOf(iframe.contentWindow.sentryData, 1);
            return done();
          }

          var sentryData = iframe.contentWindow.sentryData[0];
          assert.ok(sentryData.breadcrumbs);
          assert.lengthOf(sentryData.breadcrumbs, 3);
          assert.deepEqual(sentryData.breadcrumbs[0].data.extra.arguments, [
            "One",
          ]);
          assert.deepEqual(sentryData.breadcrumbs[1].data.extra.arguments, [
            "Two",
            { a: 1 },
          ]);
          assert.deepEqual(sentryData.breadcrumbs[2].data.extra.arguments, [
            "Error 2",
            { b: { c: "[Array]" } },
          ]);
          done();
        }
      }
    );
  });
});
 // prettier-ignore
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
 // prettier-ignore
  });
}

for (var idx in variants) {
  (function() {
    runVariant(variants[idx]);
  })();
}

var loaderVariants = [
  "loader-with-no-global-init",
  "loader-with-no-global-init-lazy-no",
];

for (var idx in loaderVariants) {
  (function() {
    describe(loaderVariants[idx], function() {
      // this.timeout(30000);

      var sandbox;

      beforeEach(function(done) {
        sandbox = createSandbox(done, loaderVariants[idx]);
      });

      afterEach(function() {
        document.body.removeChild(this.iframe);
      });

      describe("Loader Specific Tests - With no Global init() call", function() {
        it("should add breadcrumb from onLoad callback from undefined error", function(done) {
          var iframe = this.iframe;

          iframeExecute(
            iframe,
            done,
            function() {
              Sentry.onLoad(function() {
                initSDK();
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
                assert.equal(
                  sentryData.breadcrumbs[0].message,
                  "testing loader"
                );
                done();
              }
            }
          );
        });
      });
    });
  })();
}
 // prettier-ignore
