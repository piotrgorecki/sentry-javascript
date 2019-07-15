// store references to original, unwrapped built-ins in order to:
// - get a clean, unwrapped setTimeout (so stack traces don't include frames from mocha)
// - make assertions re: wrapped functions
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
