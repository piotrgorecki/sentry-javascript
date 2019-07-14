function iframeExecute(iframe, done, execute, assertCallback) {
  iframe.contentWindow.done = function(sentryData) {
    try {
      assertCallback(sentryData);
    } catch (e) {
      done(e);
    }
  };
  // use setTimeout so stack trace doesn't go all the way back to mocha test runner
  iframe.contentWindow.eval('window.originalBuiltIns.setTimeout.call(window, ' + execute.toString() + ');');
}

function createIframe(done, file) {
  var iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = './base/test/integration/' + file + '.html';
  iframe.onload = function() {
    done();
  };
  document.body.appendChild(iframe);
  return iframe;
}

var assertTimeout;
function debounceAssertEventCount(sentryData, count, done) {
  if (sentryData === undefined) {
    return false;
  }
  clearTimeout(assertTimeout);
  assertTimeout = setTimeout(function() {
    done(new Error('Did not receive ' + count + ' events'));
  }, 10);
  if (sentryData.length != count) {
    return false;
  }
  clearTimeout(assertTimeout);
  return true;
}

function optional(title, condition) {
  return condition ? '⚠️   Skipped: ' + title : title;
}

var anchor = document.createElement('a');
function parseUrl(url) {
  var out = { pathname: '', origin: '', protocol: '' };
  if (!url) anchor.href = url;
  for (var key in out) {
    out[key] = anchor[key];
  }
  return out;
}

function isChrome() {
  return (
    /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) && !/Android/.test(navigator.userAgent)
  );
}

function isBelowIE11() {
  return /*@cc_on!@*/ false == !false;
}

// Thanks for nothing IE!
// (╯°□°）╯︵ ┻━┻
function canReadFunctionName() {
  function foo() {}
  if (foo.name === 'foo') return true;
  return false;
}
