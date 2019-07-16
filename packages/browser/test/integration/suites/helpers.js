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
