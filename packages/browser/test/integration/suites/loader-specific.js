// var loaderSpecific = ['loader-with-no-global-init', 'loader-with-no-global-init-lazy-no'];

// for (var idx in loaderSpecific) {
//   (function() {
//     var filename = loaderSpecific[idx];

//     describe(filename + '.html', function() {
//       this.timeout(30000);

//       beforeEach(function(done) {
//         this.iframe = createIframe(done, `variants/${filename}`);
//       });

//       afterEach(function() {
//         document.body.removeChild(this.iframe);
//       });

//       describe('Loader Specific Tests - With no Global init() call', function() {
//         it('should add breadcrumb from onLoad callback from undefined error', function(done) {
//           var iframe = this.iframe;

//           iframeExecute(
//             iframe,
//             done,
//             function() {
//               Sentry.onLoad(function() {
//                 initSDK();
//                 Sentry.addBreadcrumb({
//                   category: 'auth',
//                   message: 'testing loader',
//                   level: 'error',
//                 });
//               });
//               setTimeout(function() {
//                 setTimeout(done, 10);
//                 Sentry.captureMessage('test');
//               }, 10);
//               undefinedMethod(); //trigger error
//             },
//             function(sentryData) {
//               if (debounceAssertEventCount(sentryData, 1, done)) {
//                 var sentryData = iframe.contentWindow.sentryData[0];
//                 assert.ok(sentryData.breadcrumbs);
//                 assert.lengthOf(sentryData.breadcrumbs, 1);
//                 assert.equal(sentryData.breadcrumbs[0].message, 'testing loader');
//                 done();
//               }
//             }
//           );
//         });
//       });
//     });
//   })();
// }
