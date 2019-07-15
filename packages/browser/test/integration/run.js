#!/usr/bin/env node

const fs = require('fs');
const rimraf = require('rimraf');
const karma = require('karma');
const path = require('path');

const debugMode = process.argv.some(x => x === '--debug');
const watchMode = process.argv.some(x => x === '--watch');

function log(...message) {
  if (debugMode) {
    console.log(...message);
  }
}

log(`
╔═══════════════════════════════════╗
║ INFO: Preparing tests environment ║
╚═══════════════════════════════════╝
`);

function readFile(file) {
  return fs.readFileSync(path.resolve(__dirname, file), 'utf8');
}

function writeFile(file, data) {
  fs.writeFileSync(path.resolve(__dirname, file), data);
}

function copyFile(from, to) {
  log('Copying file:\n\t=> from:', from, '\n\t=> to:', to);
  fs.copyFileSync(path.resolve(__dirname, from), path.resolve(__dirname, to));
}

function concatFiles(outputFile, inputFiles) {
  log('Concatinating:\n\t=> from:', inputFiles.join(', '), '\n\t=> to:', outputFile);
  writeFile(outputFile, inputFiles.map(file => readFile(file)).join('\n'));
}

function replacePlaceholders(templateFile) {
  log('Replacing placeholders for file:', templateFile);

  return readFile(templateFile).replace(/\{\{ ?([a-zA-Z-_\.\/]+) ?\}\}/g, match => {
    const matchFile = match.slice(2, -2).trim();
    log('\t=> matched placeholder:', matchFile);
    return readFile(matchFile);
  });
}

function mkdir(dirpath) {
  fs.mkdirSync(path.resolve(__dirname, dirpath));
}

function rmdir(dirpath) {
  rimraf.sync(path.resolve(__dirname, dirpath));
}

rmdir('artifacts');
mkdir('artifacts');

concatFiles('artifacts/polyfills.js', [
  'polyfills/promise.js',
  'polyfills/fetch.js',
  'polyfills/raf.js',
  'polyfills/events.js',
]);
concatFiles('artifacts/setup.js', ['../../../integrations/build/dedupe.js', 'common/init.js', 'common/functions.js']);
copyFile('../../build/bundle.js', 'artifacts/sdk.js');
writeFile('artifacts/loader.js', readFile('../../src/loader.js').replace('../../build/bundle.js', '/artifacts/sdk.js'));

writeFile(
  'artifacts/tests.js',
  [
    readFile('suites/helpers.js'),
    replacePlaceholders('suites/shell.js') /**readFile('suites/loader-specific.js') */,
  ].join('\n'),
);

new karma.Server(
  karma.config.parseConfig(path.resolve(__dirname, 'karma.conf.js'), {
    singleRun: !watchMode,
    autoWatch: watchMode,
  }),
  exitCode => {
    // rmdir('artifacts');
    process.exit(exitCode);
  },
).start();
