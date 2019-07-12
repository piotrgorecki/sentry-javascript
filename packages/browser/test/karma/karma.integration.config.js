const sauceUsername = process.env.SAUCE_USERNAME;
const sauceAccessKey = process.env.SAUCE_ACCESS_KEY;
const isLocalRun = sauceUsername === undefined || sauceAccessKey === undefined;

if (isLocalRun) {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║ INFO: Running integration tests in the local environment ║
╚══════════════════════════════════════════════════════════╝`);
} else {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║ INFO: Running integration tests in the SauceLabs environment ║
╚══════════════════════════════════════════════════════════════╝`);
}

const customLaunchers = isLocalRun
  ? {}
  : {
      sl_chrome: {
        base: 'SauceLabs',
        platform: 'Windows 10',
        browserName: 'chrome',
        version: 'latest',
      },
      sl_firefox: {
        base: 'SauceLabs',
        platform: 'Windows 10',
        browserName: 'firefox',
        version: 'latest',
      },
      sl_edge: {
        base: 'SauceLabs',
        platform: 'Windows 10',
        browserName: 'microsoftedge',
        version: 'latest',
      },
      sl_ie_11: {
        base: 'SauceLabs',
        platform: 'Windows 10',
        browserName: 'internet explorer',
        version: '11',
      },
      sl_ie_10: {
        base: 'SauceLabs',
        platform: 'Windows 8',
        browserName: 'internet explorer',
        version: '10',
      },
      sl_safari: {
        base: 'SauceLabs',
        platform: 'macOS 10.13',
        browserName: 'safari',
        version: '12.1',
      },
      sl_ios: {
        base: 'SauceLabs',
        platform: 'iOS',
        device: 'iPhone X Simulator',
        browserName: 'safari',
        version: '12.2',
      },
      sl_android_8: {
        base: 'SauceLabs',
        platform: 'Android',
        device: 'Android Emulator',
        browserName: 'chrome',
        version: '8.0',
      },
      sl_android_6: {
        base: 'SauceLabs',
        platform: 'Android',
        device: 'Android Emulator',
        browserName: 'chrome',
        version: '6.0',
      },
      sl_android_5: {
        base: 'SauceLabs',
        platform: 'Android',
        device: 'Android Emulator',
        browserName: 'browser',
        version: '5.1',
      },
    };

const browsers = isLocalRun ? ['ChromeHeadless'] : Object.keys(customLaunchers);

const fs = require('fs');

fs.copyFileSync('../integrations/build/dedupe.js', './test/integration/dedupe.js');
fs.copyFileSync('../integrations/build/dedupe.js.map', './test/integration/dedupe.js.map');

const files = [
  { pattern: 'test/integration/polyfills/es6-promise-4.2.5.auto.js', included: false },
  { pattern: 'test/integration/polyfills/whatwg-fetch-3.0.0.js', included: false },
  { pattern: 'test/integration/123', included: false },
  { pattern: 'test/integration/console-logs.js', included: false },
  { pattern: 'test/integration/throw-string.js', included: false },
  { pattern: 'test/integration/throw-error.js', included: false },
  { pattern: 'test/integration/throw-object.js', included: false },
  { pattern: 'test/integration/example.json', included: false },
  { pattern: 'test/integration/frame.html', included: false },
  { pattern: 'test/integration/loader.html', included: false },
  { pattern: 'test/integration/loader-lazy-no.html', included: false },
  { pattern: 'test/integration/loader-with-no-global-init.html', included: false },
  { pattern: 'test/integration/loader-with-no-global-init-lazy-no.html', included: false },
  { pattern: 'test/integration/common.js', included: false },
  { pattern: 'src/loader.js', included: false },
  { pattern: 'test/integration/init.js', included: false },
  { pattern: 'build/bundle.js', included: false },
  { pattern: 'build/bundle.js.map', included: false },
  { pattern: 'test/integration/dedupe.js', included: false },
  { pattern: 'test/integration/dedupe.js.map', included: false },
  'test/integration/test.js',
];

const plugins = ['karma-mocha', 'karma-chai', 'karma-sinon', 'karma-mocha-reporter'];
const reporters = ['mocha'];

if (isLocalRun) {
  plugins.push('karma-chrome-launcher');
} else {
  plugins.push('karma-sauce-launcher');
  reporters.push('saucelabs');
}

module.exports = config => {
  config.set({
    logLevel: process.env.DEBUG ? config.LOG_DEBUG : config.LOG_INFO,
    colors: true,
    singleRun: true,
    autoWatch: false,
    basePath: process.cwd(),
    frameworks: ['mocha', 'chai', 'sinon'],
    files,
    plugins,
    reporters,
    customLaunchers,
    browsers,
    client: {
      mocha: {
        reporter: 'html',
        ui: 'bdd',
      },
    },
    build: process.env.TRAVIS_BUILD_NUMBER,
    // SauceLabs allows for 2 tunnels only, therefore some browsers will have to wait
    // rather long time. Plus mobile emulators tend to require a lot of time to start up.
    // 10 minutes should be more than enough to run all of them.
    browserNoActivityTimeout: 600000,
    captureTimeout: 600000,
    sauceLabs: {
      startConnect: !isLocalRun,
      // Just something "random" so we don't have to provide additional ENV var when running locally
      tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER || Math.ceil(Math.random() * 1337),
      testName: '@sentry/browser' + (process.env.TRAVIS_JOB_NUMBER ? ' #' + process.env.TRAVIS_JOB_NUMBER : ''),
      public: 'public',
      recordScreenshots: false,
      recordVideo: false,
    },
  });
};
