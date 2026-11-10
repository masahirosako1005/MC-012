/* 観光客端末の乱数キー。氏名は使わず、このブラウザだけに置く。 */
(function (root) {
  "use strict";

  var STORAGE_KEY = "matatabi-v010-device";

  function toBase64Url(bytes) {
    var binary = "";
    for (var index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return root.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function makeKey() {
    if (!root.crypto || typeof root.crypto.getRandomValues !== "function" || typeof root.btoa !== "function") {
      return "";
    }
    var bytes = new Uint8Array(32);
    root.crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
  }

  function readKey() {
    try {
      var stored = root.localStorage.getItem(STORAGE_KEY);
      return typeof stored === "string" && /^[A-Za-z0-9_-]{22,64}$/.test(stored) ? stored : "";
    } catch (error) {
      return "";
    }
  }

  function ensure() {
    var current = readKey();
    if (current) return current;
    var created = makeKey();
    if (!created) return "";
    try {
      root.localStorage.setItem(STORAGE_KEY, created);
    } catch (error) {
      return "";
    }
    return created;
  }

  root.MataTabiDeviceKey = {
    ensure: ensure,
    read: readKey
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
