// store references to original, unwrapped built-ins in order to:
// - get a clean, unwrapped setTimeout (so stack traces don't include
//   frames from mocha)
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

  // expose events so we can access them in our tests
  window.sentryData = [];
  window.sentryBreadcrumbs = [];
})();

Sentry.init({
  dsn: 'https://public@example.com/1',
  // debug: true,
  integrations: [new Sentry.Integrations.Dedupe()],
  attachStacktrace: true,
  // stub transport so we don't actually transmit any data
  transport: function DummyTransport() {
    this.sendEvent = function(event) {
      sentryData.push(event);
      done(sentryData);
      return Promise.resolve({
        status: 'success',
      });
    };
  },
  ignoreErrors: ['ignoreErrorTest'],
  blacklistUrls: ['foo.js'],
  // integrations: function(old) {
  //   return [new Sentry.Integrations.Debug({ stringify: true })].concat(old);
  // },
  beforeBreadcrumb: function(breadcrumb) {
    // Filter console logs as we use them for debugging *a lot* and they are not *that* important
    // But allow then if we explicitly say so (for one of integration tests)
    if (breadcrumb.category === 'console' && !window.allowConsoleBreadcrumbs) {
      return null;
    }

    // overlyComplicatedDebuggingMechanism 'aka' console.log driven debugging
    // console.log(JSON.stringify(breadcrumb, null, 2));

    // Filter internal Karma requests
    if (
      breadcrumb.type === 'http' &&
      (breadcrumb.data.url.indexOf('test.js') !== -1 || breadcrumb.data.url.indexOf('frame.html') !== -1)
    ) {
      return null;
    }

    // Filter "refresh" like navigation which occurs in Mocha when testing on Android 4
    if (breadcrumb.category === 'navigation' && breadcrumb.data.to === breadcrumb.data.from) {
      return null;
    }

    sentryBreadcrumbs.push(breadcrumb);

    return breadcrumb;
  },
});
