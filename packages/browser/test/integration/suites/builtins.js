// describe('wrapped built-ins', function() {
//   it('should capture exceptions from event listeners', function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         var div = document.createElement('div');
//         document.body.appendChild(div);
//         div.addEventListener(
//           'click',
//           function() {
//             window.element = div;
//             window.context = this;
//             foo();
//           },
//           false,
//         );

//         var click = new MouseEvent('click');
//         div.dispatchEvent(click);
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           // Make sure we preserve the correct context
//           assert.equal(iframe.contentWindow.element, iframe.contentWindow.context);
//           delete iframe.contentWindow.element;
//           delete iframe.contentWindow.context;
//           assert.match(sentryData[0].exception.values[0].value, /baz/);
//           done();
//         }
//       },
//     );
//   });

//   it('should transparently remove event listeners from wrapped functions', function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         setTimeout(done, 10);

//         var div = document.createElement('div');
//         document.body.appendChild(div);
//         var fooFn = function() {
//           foo();
//         };
//         div.addEventListener('click', fooFn, false);
//         div.removeEventListener('click', fooFn);

//         var click = new MouseEvent('click');
//         div.dispatchEvent(click);
//       },
//       function() {
//         var sentryData = iframe.contentWindow.sentryData[0];
//         assert.equal(sentryData, null); // should never trigger error
//         done();
//       },
//     );
//   });

//   it('should capture unhandledrejection with error', function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         if (isChrome()) {
//           Promise.reject(new Error('test2'));
//         } else {
//           done();
//         }
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           assert.equal(sentryData[0].exception.values[0].value, 'test2');
//           assert.equal(sentryData[0].exception.values[0].type, 'Error');
//           assert.isAtLeast(sentryData[0].exception.values[0].stacktrace.frames.length, 1);
//           assert.equal(sentryData[0].exception.values[0].mechanism.handled, false);
//           assert.equal(sentryData[0].exception.values[0].mechanism.type, 'onunhandledrejection');
//           done();
//         } else {
//           // This test will be skipped if it's not Chrome Desktop
//           done();
//         }
//       },
//     );
//   });

//   it('should capture unhandledrejection with a string', function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         if (isChrome()) {
//           Promise.reject('test');
//         } else {
//           done();
//         }
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           // non-error rejections doesnt provide stacktraces so we can skip the assertion
//           assert.equal(sentryData[0].exception.values[0].value, '"test"');
//           assert.equal(sentryData[0].exception.values[0].type, 'UnhandledRejection');
//           assert.equal(sentryData[0].exception.values[0].mechanism.handled, false);
//           assert.equal(sentryData[0].exception.values[0].mechanism.type, 'onunhandledrejection');
//           done();
//         } else {
//           // This test will be skipped if it's not Chrome Desktop
//           done();
//         }
//       },
//     );
//   });

//   it('should capture unhandledrejection with a monster string', function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         if (isChrome()) {
//           Promise.reject('test'.repeat(100));
//         } else {
//           done();
//         }
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           // non-error rejections doesnt provide stacktraces so we can skip the assertion
//           assert.equal(sentryData[0].exception.values[0].value.length, 253);
//           assert.equal(sentryData[0].exception.values[0].type, 'UnhandledRejection');
//           assert.equal(sentryData[0].exception.values[0].mechanism.handled, false);
//           assert.equal(sentryData[0].exception.values[0].mechanism.type, 'onunhandledrejection');
//           done();
//         } else {
//           // This test will be skipped if it's not Chrome Desktop
//           done();
//         }
//       },
//     );
//   });

//   it('should capture unhandledrejection with an object', function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         if (isChrome()) {
//           Promise.reject({ a: 'b' });
//         } else {
//           done();
//         }
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           // non-error rejections doesnt provide stacktraces so we can skip the assertion
//           assert.equal(sentryData[0].exception.values[0].value, '{"a":"b"}');
//           assert.equal(sentryData[0].exception.values[0].type, 'UnhandledRejection');
//           assert.equal(sentryData[0].exception.values[0].mechanism.handled, false);
//           assert.equal(sentryData[0].exception.values[0].mechanism.type, 'onunhandledrejection');
//           done();
//         } else {
//           // This test will be skipped if it's not Chrome Desktop
//           done();
//         }
//       },
//     );
//   });

//   it('should capture unhandledrejection with an monster object', function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         if (isChrome()) {
//           var a = {
//             a: '1'.repeat('100'),
//             b: '2'.repeat('100'),
//             c: '3'.repeat('100'),
//           };
//           a.d = a.a;
//           a.e = a;
//           Promise.reject(a);
//         } else {
//           done();
//         }
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           // non-error rejections doesnt provide stacktraces so we can skip the assertion
//           assert.equal(sentryData[0].exception.values[0].value.length, 253);
//           assert.equal(sentryData[0].exception.values[0].type, 'UnhandledRejection');
//           assert.equal(sentryData[0].exception.values[0].mechanism.handled, false);
//           assert.equal(sentryData[0].exception.values[0].mechanism.type, 'onunhandledrejection');
//           done();
//         } else {
//           // This test will be skipped if it's not Chrome Desktop
//           done();
//         }
//       },
//     );
//   });

//   it('should capture exceptions inside setTimeout', function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         setTimeout(function() {
//           foo();
//         });
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           assert.match(sentryData[0].exception.values[0].value, /baz/);
//           done();
//         }
//       },
//     );
//   });

//   it('should capture exceptions inside setInterval', function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         var exceptionInterval = setInterval(function() {
//           clearInterval(exceptionInterval);
//           foo();
//         }, 10);
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           assert.match(sentryData[0].exception.values[0].value, /baz/);
//           done();
//         }
//       },
//     );
//   });

//   it('should capture exceptions inside requestAnimationFrame', function(done) {
//     var iframe = this.iframe;
//     // needs to be visible or requestAnimationFrame won't ever fire
//     iframe.style.display = 'block';

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         requestAnimationFrame(function() {
//           foo();
//         });
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           assert.match(sentryData[0].exception.values[0].value, /baz/);
//           done();
//         }
//       },
//     );
//   });

//   it('should capture exceptions from XMLHttpRequest event handlers (e.g. onreadystatechange)', function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         var xhr = new XMLHttpRequest();

//         // intentionally assign event handlers *after* XMLHttpRequest.prototype.open,
//         // since this is what jQuery does
//         // https://github.com/jquery/jquery/blob/master/src/ajax/xhr.js#L37

//         xhr.open('GET', 'example.json');
//         xhr.onreadystatechange = function() {
//           setTimeout(done, 10);
//           // replace onreadystatechange with no-op so exception doesn't
//           // fire more than once as XHR changes loading state
//           xhr.onreadystatechange = function() {};
//           foo();
//         };
//         xhr.send();
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           assert.match(sentryData[0].exception.values[0].value, /baz/);
//           done();
//         }
//       },
//     );
//   });

//   it(optional("should capture built-in's mechanism type as instrument", IS_LOADER), function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         setTimeout(function() {
//           foo();
//         });
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           var sentryData = sentryData[0];

//           if (IS_LOADER) {
//             // The async loader doesn't wrap setTimeout
//             // so we don't receive the full mechanism
//             assert.ok(sentryData.exception.values[0].mechanism);
//             return done();
//           }

//           var fn = sentryData.exception.values[0].mechanism.data.function;
//           delete sentryData.exception.values[0].mechanism.data;

//           if (canReadFunctionName()) {
//             assert.equal(fn, 'setTimeout');
//           } else {
//             assert.equal(fn, '<anonymous>');
//           }

//           assert.deepEqual(sentryData.exception.values[0].mechanism, {
//             type: 'instrument',
//             handled: true,
//           });
//           done();
//         }
//       },
//     );
//   });

//   it("should capture built-in's handlers fn name in mechanism data", function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         var div = document.createElement('div');
//         document.body.appendChild(div);
//         div.addEventListener(
//           'click',
//           function namedFunction() {
//             foo();
//           },
//           false,
//         );

//         var click = new MouseEvent('click');
//         div.dispatchEvent(click);
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           var sentryData = sentryData[0];

//           if (IS_LOADER) {
//             // The async loader doesn't wrap addEventListener
//             // so we don't receive the full mechanism
//             assert.ok(sentryData.exception.values[0].mechanism);
//             return done();
//           }

//           var handler = sentryData.exception.values[0].mechanism.data.handler;
//           delete sentryData.exception.values[0].mechanism.data.handler;
//           var target = sentryData.exception.values[0].mechanism.data.target;
//           delete sentryData.exception.values[0].mechanism.data.target;

//           if (canReadFunctionName()) {
//             assert.equal(handler, 'namedFunction');
//           } else {
//             assert.equal(handler, '<anonymous>');
//           }

//           // IE vs. Rest of the world
//           assert.oneOf(target, ['Node', 'EventTarget']);
//           assert.deepEqual(sentryData.exception.values[0].mechanism, {
//             type: 'instrument',
//             handled: true,
//             data: {
//               function: 'addEventListener',
//             },
//           });
//           done();
//         }
//       },
//     );
//   });

//   it('should fallback to <anonymous> fn name in mechanism data if one is unavailable', function(done) {
//     var iframe = this.iframe;

//     iframeExecute(
//       iframe,
//       done,
//       function() {
//         var div = document.createElement('div');
//         document.body.appendChild(div);
//         div.addEventListener(
//           'click',
//           function() {
//             foo();
//           },
//           false,
//         );

//         var click = new MouseEvent('click');
//         div.dispatchEvent(click);
//       },
//       function(sentryData) {
//         if (debounceAssertEventCount(sentryData, 1, done)) {
//           var sentryData = sentryData[0];

//           if (IS_LOADER) {
//             // The async loader doesn't wrap
//             assert.ok(sentryData.exception.values[0].mechanism);
//             return done();
//           }

//           var target = sentryData.exception.values[0].mechanism.data.target;
//           delete sentryData.exception.values[0].mechanism.data.target;

//           // IE vs. Rest of the world
//           assert.oneOf(target, ['Node', 'EventTarget']);
//           assert.deepEqual(sentryData.exception.values[0].mechanism, {
//             type: 'instrument',
//             handled: true,
//             data: {
//               function: 'addEventListener',
//               handler: '<anonymous>',
//             },
//           });
//           done();
//         }
//       },
//     );
//   });
// });
