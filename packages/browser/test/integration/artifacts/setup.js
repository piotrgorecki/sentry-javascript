(function (__window) {
var exports = {};

Object.defineProperty(exports, '__esModule', { value: true });

/** Deduplication filter */
var Dedupe = /** @class */ (function () {
    function Dedupe() {
        /**
         * @inheritDoc
         */
        this.name = Dedupe.id;
    }
    /**
     * @inheritDoc
     */
    Dedupe.prototype.setupOnce = function (addGlobalEventProcessor, getCurrentHub) {
        addGlobalEventProcessor(function (currentEvent) {
            var self = getCurrentHub().getIntegration(Dedupe);
            if (self) {
                // Juuust in case something goes wrong
                try {
                    if (self._shouldDropEvent(currentEvent, self._previousEvent)) {
                        return null;
                    }
                }
                catch (_oO) {
                    return (self._previousEvent = currentEvent);
                }
                return (self._previousEvent = currentEvent);
            }
            return currentEvent;
        });
    };
    /** JSDoc */
    Dedupe.prototype._shouldDropEvent = function (currentEvent, previousEvent) {
        if (!previousEvent) {
            return false;
        }
        if (this._isSameMessageEvent(currentEvent, previousEvent)) {
            return true;
        }
        if (this._isSameExceptionEvent(currentEvent, previousEvent)) {
            return true;
        }
        return false;
    };
    /** JSDoc */
    Dedupe.prototype._isSameMessageEvent = function (currentEvent, previousEvent) {
        var currentMessage = currentEvent.message;
        var previousMessage = previousEvent.message;
        // If no event has a message, they were both exceptions, so bail out
        if (!currentMessage && !previousMessage) {
            return false;
        }
        // If only one event has a stacktrace, but not the other one, they are not the same
        if ((currentMessage && !previousMessage) || (!currentMessage && previousMessage)) {
            return false;
        }
        if (currentMessage !== previousMessage) {
            return false;
        }
        if (!this._isSameFingerprint(currentEvent, previousEvent)) {
            return false;
        }
        if (!this._isSameStacktrace(currentEvent, previousEvent)) {
            return false;
        }
        return true;
    };
    /** JSDoc */
    Dedupe.prototype._getFramesFromEvent = function (event) {
        var exception = event.exception;
        if (exception) {
            try {
                // @ts-ignore
                return exception.values[0].stacktrace.frames;
            }
            catch (_oO) {
                return undefined;
            }
        }
        else if (event.stacktrace) {
            return event.stacktrace.frames;
        }
        return undefined;
    };
    /** JSDoc */
    Dedupe.prototype._isSameStacktrace = function (currentEvent, previousEvent) {
        var currentFrames = this._getFramesFromEvent(currentEvent);
        var previousFrames = this._getFramesFromEvent(previousEvent);
        // If no event has a fingerprint, they are assumed to be the same
        if (!currentFrames && !previousFrames) {
            return true;
        }
        // If only one event has a stacktrace, but not the other one, they are not the same
        if ((currentFrames && !previousFrames) || (!currentFrames && previousFrames)) {
            return false;
        }
        currentFrames = currentFrames;
        previousFrames = previousFrames;
        // If number of frames differ, they are not the same
        if (previousFrames.length !== currentFrames.length) {
            return false;
        }
        // Otherwise, compare the two
        for (var i = 0; i < previousFrames.length; i++) {
            var frameA = previousFrames[i];
            var frameB = currentFrames[i];
            if (frameA.filename !== frameB.filename ||
                frameA.lineno !== frameB.lineno ||
                frameA.colno !== frameB.colno ||
                frameA.function !== frameB.function) {
                return false;
            }
        }
        return true;
    };
    /** JSDoc */
    Dedupe.prototype._getExceptionFromEvent = function (event) {
        return event.exception && event.exception.values && event.exception.values[0];
    };
    /** JSDoc */
    Dedupe.prototype._isSameExceptionEvent = function (currentEvent, previousEvent) {
        var previousException = this._getExceptionFromEvent(previousEvent);
        var currentException = this._getExceptionFromEvent(currentEvent);
        if (!previousException || !currentException) {
            return false;
        }
        if (previousException.type !== currentException.type || previousException.value !== currentException.value) {
            return false;
        }
        if (!this._isSameFingerprint(currentEvent, previousEvent)) {
            return false;
        }
        if (!this._isSameStacktrace(currentEvent, previousEvent)) {
            return false;
        }
        return true;
    };
    /** JSDoc */
    Dedupe.prototype._isSameFingerprint = function (currentEvent, previousEvent) {
        var currentFingerprint = currentEvent.fingerprint;
        var previousFingerprint = previousEvent.fingerprint;
        // If no event has a fingerprint, they are assumed to be the same
        if (!currentFingerprint && !previousFingerprint) {
            return true;
        }
        // If only one event has a fingerprint, but not the other one, they are not the same
        if ((currentFingerprint && !previousFingerprint) || (!currentFingerprint && previousFingerprint)) {
            return false;
        }
        currentFingerprint = currentFingerprint;
        previousFingerprint = previousFingerprint;
        // Otherwise, compare the two
        try {
            return !!(currentFingerprint.join('') === previousFingerprint.join(''));
        }
        catch (_oO) {
            return false;
        }
    };
    /**
     * @inheritDoc
     */
    Dedupe.id = 'Dedupe';
    return Dedupe;
}());

exports.Dedupe = Dedupe;


  __window.Sentry = __window.Sentry || {};
  __window.Sentry.Integrations = __window.Sentry.Integrations || {};
  Object.assign(__window.Sentry.Integrations, exports);
  
}(window));


// store references to original, unwrapped built-ins in order to:
// - get a clean, unwrapped setTimeout (so stack traces don't include frames from mocha)
// - make assertions re: wrapped functions
(function() {
  window.originalBuiltIns = {
    setTimeout: setTimeout,
    setInterval: setInterval,
    requestAnimationFrame: requestAnimationFrame,
    xhrProtoOpen: XMLHttpRequest.prototype.open,
    headAddEventListener: document.head.addEventListener, // use <head> 'cause body isn't closed yet
    headRemoveEventListener: document.head.removeEventListener,
    consoleDebug: console.debug,
    consoleInfo: console.info,
    consoleWarn: console.warn,
    consoleError: console.error,
    consoleLog: console.log,
  };
})();

// expose events so we can access them in our tests
window.sentryData = [];
window.sentryBreadcrumbs = [];

function initSDK() {
  Sentry.init({
    dsn: "https://public@example.com/1",
    integrations: [new Sentry.Integrations.Dedupe()],
    attachStacktrace: true,
    transport: function DummyTransport() {
      this.sendEvent = function(event) {
        sentryData.push(event);
        done(sentryData);
        return Promise.resolve({
          status: "success",
        });
      };
    },
    ignoreErrors: ["ignoreErrorTest"],
    blacklistUrls: ["foo.js"],
    beforeBreadcrumb: function(breadcrumb) {
      // Filter console logs as we use them for debugging *a lot* and they are not *that* important
      // But allow then if we explicitly say so (for one of integration tests)
      if (
        breadcrumb.category === "console" &&
        !window.allowConsoleBreadcrumbs
      ) {
        return null;
      }

      if (
        breadcrumb.type === "http" &&
        (breadcrumb.data.url.indexOf("test.js") !== -1 ||
          breadcrumb.data.url.indexOf("frame.html") !== -1)
      ) {
        return null;
      }

      // Filter "refresh" like navigation which occurs in Mocha when testing on Android 4
      if (
        breadcrumb.category === "navigation" &&
        breadcrumb.data.to === breadcrumb.data.from
      ) {
        return null;
      }

      sentryBreadcrumbs.push(breadcrumb);

      return breadcrumb;
    },
  });
}

// All the functions below can be called within the iframe under the test

function isChrome() {
  return (
    /Chrome/.test(navigator.userAgent) &&
    /Google Inc/.test(navigator.vendor) &&
    !/Android/.test(navigator.userAgent)
  );
}

function bar() {
  baz();
}

function foo() {
  bar();
}

function foo2() {
  // identical to foo, but meant for testing
  // different stack frame fns w/ same stack length
  bar();
}

function throwNonError() {
  try {
    throw { foo: "bar" };
  } catch (o_O) {
    Sentry.captureException(o_O);
  }
}

function throwError(message) {
  message = message || "foo";
  try {
    throw new Error(message);
  } catch (o_O) {
    Sentry.captureException(o_O);
  }
}

function throwRandomError() {
  try {
    throw new Error("Exception no " + (Date.now() + Math.random()));
  } catch (o_O) {
    Sentry.captureException(o_O);
  }
}

function throwSameConsecutiveErrors(message) {
  throwError(message);
  throwError(message);
}

function captureMessage(message) {
  message = message || "message";
  Sentry.captureMessage(message);
}

function captureRandomMessage() {
  Sentry.captureMessage("Message no " + (Date.now() + Math.random()));
}

function captureSameConsecutiveMessages(message) {
  captureMessage(message);
  captureMessage(message);
}
