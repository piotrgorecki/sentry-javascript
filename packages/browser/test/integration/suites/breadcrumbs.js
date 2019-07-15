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
          xhr.open("GET", "/subjects/example.json");
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
          xhr.open("GET", "/subjects/example.json");
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
        fetch("/subjects/example.json").then(
          function() {
            Sentry.captureMessage("test");
          },
          function() {
            Sentry.captureMessage("test");
          }
        );
      },
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap fetch, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
          return done();
        }

        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;
        var breadcrumbUrl = "/subjects/example.json";

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
        fetch(new Request("/subjects/example.json")).then(
          function() {
            Sentry.captureMessage("test");
          },
          function() {
            Sentry.captureMessage("test");
          }
        );
      },
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap fetch, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
          return done();
        }
        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;
        var breadcrumbUrl = "/subjects/example.json";

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
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap fetch, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
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
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
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
        assert.isUndefined(sentryData[0].exception);

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
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
          return done();
        }

        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;
        // There should be no expection, if there is one it means we threw it
        assert.isUndefined(sentryData[0].exception);
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
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
          return done();
        }

        var breadcrumbs = iframe.contentWindow.sentryBreadcrumbs;
        // There should be no expection, if there is one it means we threw it
        assert.isUndefined(sentryData[0].exception);
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
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
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
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
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
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
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
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
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
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
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
        function(sentryData) {
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
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
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
          setTimeout(done, 137);
          Sentry.captureMessage("test");
        }, 1001);

        // keypress <input/> twice
        var keypress1 = new KeyboardEvent("keypress");
        var keypress2 = new KeyboardEvent("keypress");

        var div = document.querySelector("[contenteditable]");
        div.dispatchEvent(keypress1);
        div.dispatchEvent(keypress2);
      },
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
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
          handleEvent() {
            frame.handleEventCalled = true;
          },
        });
        input.dispatchEvent(new MouseEvent("click"));

        Sentry.captureMessage("test");
      },
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
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
          handleEvent() {
            frame.handleEventCalled = true;
          },
        });
        input.dispatchEvent(new KeyboardEvent("keypress"));

        Sentry.captureMessage("test");
      },
      function(sentryData) {
        if (IS_LOADER) {
          // The async loader doesn't wrap event listeners, but we should receive the event without breadcrumbs
          assert.lengthOf(sentryData, 1);
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
        function(sentryData) {
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
            /\/variants\/.*\.html$/.test(breadcrumbs[0].data.from),
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
        logs.src = "/subjects/console-logs.js";
        logs.onload = function() {
          done();
        };
        document.head.appendChild(logs);
      },
      function(sentryData) {
        if (debounceAssertEventCount(sentryData, 1, done)) {
          if (IS_LOADER) {
            // The async loader doesn't capture breadcrumbs, but we should receive the event without them
            assert.lengthOf(sentryData, 1);
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
