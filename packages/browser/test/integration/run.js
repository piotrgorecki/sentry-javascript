#!/usr/bin/env node

const fs = require('fs');
const rimraf = require('rimraf');
const karma = require('karma');
const path = require('path');

function concat(output, input) {
  fs.writeFileSync(
    path.resolve(__dirname, output),
    input.map(file => fs.readFileSync(path.resolve(__dirname, file))).join('\n'),
  );
}

function copy(from, to) {
  fs.copyFileSync(path.resolve(__dirname, from), path.resolve(__dirname, to));
}

const artifactsDir = path.resolve(__dirname, './artifacts');

rimraf.sync(artifactsDir);
fs.mkdirSync(artifactsDir);

concat('./artifacts/polyfills.js', [
  './polyfills/promise.js',
  './polyfills/fetch.js',
  './polyfills/raf.js',
  './polyfills/events.js',
]);
concat('./artifacts/setup.js', ['../../../integrations/build/dedupe.js', './common/init.js', './common/methods.js']);
copy('../../src/loader.js', './artifacts/loader.js');
copy('../../build/bundle.js', './artifacts/sdk.js');

const testsShell = fs.readFileSync(path.resolve(__dirname, './suites/shell.js'), 'utf8');
const helpers = fs.readFileSync(path.resolve(__dirname, './suites/helpers.js'));
const loaderSpecificTests = fs.readFileSync(path.resolve(__dirname, './suites/loader-specific.js'));

const generatedTests = testsShell
  .replace('// suites/config.js', fs.readFileSync(path.resolve(__dirname, './suites/config.js')))
  .replace('// suites/api.js', fs.readFileSync(path.resolve(__dirname, './suites/api.js')))
  .replace('// suites/onerror.js', fs.readFileSync(path.resolve(__dirname, './suites/onerror.js')))
  .replace('// suites/builtins.js', fs.readFileSync(path.resolve(__dirname, './suites/builtins.js')))
  .replace('// suites/breadcrumbs.js', fs.readFileSync(path.resolve(__dirname, './suites/breadcrumbs.js')))
  .replace('// suites/loader-specific.js', fs.readFileSync(path.resolve(__dirname, './suites/loader-specific.js')));

fs.writeFileSync(
  path.resolve(__dirname, './artifacts/tests.js'),
  [helpers, generatedTests, loaderSpecificTests].join('\n'),
);

new karma.Server(
  karma.config.parseConfig(path.resolve(__dirname, 'karma.conf.js'), {
    // singleRun: false,
  }),
  exitCode => {
    console.log('Karma has exited with ' + exitCode);
    rimraf.sync(artifactsDir);
  },
).start();
