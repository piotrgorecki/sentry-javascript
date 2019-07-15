/**
 * DOM4 MouseEvent and KeyboardEvent Polyfills
 *
 * References:
 * https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/MouseEvent
 * https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/MouseEvent#Polyfill
 * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/KeyboardEvent
 */
(function() {
  try {
    new MouseEvent("click");
    return false; // No need to polyfill
  } catch (e) {
    // Need to polyfill - fall through
  }

  var MouseEvent = function(eventType) {
    var mouseEvent = document.createEvent("MouseEvent");
    mouseEvent.initMouseEvent(
      eventType,
      true,
      true,
      window,
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      0,
      null
    );
    return mouseEvent;
  };

  MouseEvent.prototype = Event.prototype;
  window.MouseEvent = MouseEvent;
})();

(function() {
  try {
    new KeyboardEvent("keypress");
    return false; // No need to polyfill
  } catch (e) {
    // Need to polyfill - fall through
  }

  var KeyboardEvent = function(eventType) {
    var keyboardEvent = document.createEvent("KeyboardEvent");
    if (keyboardEvent.initKeyboardEvent)
      keyboardEvent.initKeyboardEvent(
        eventType,
        true,
        true,
        window,
        false,
        false,
        false,
        false,
        "a",
        0
      );
    if (keyboardEvent.initKeyEvent)
      keyboardEvent.initKeyEvent(
        eventType,
        true,
        true,
        window,
        false,
        false,
        false,
        false,
        "a"
      );
    return keyboardEvent;
  };

  KeyboardEvent.prototype = Event.prototype;
  window.KeyboardEvent = KeyboardEvent;
})();
