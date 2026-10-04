/*
 * password.js
 * Include on every page, ideally in <head> so there's no flash of content:
 *   <script src="/js/password.js"></script>
 *
 * The SHA-256 hash of the password is read from /assets/config.json:
 *   { "password-hash": "951d96...", ... }
 *
 * NOTE: This is client-side only. It keeps casual visitors out, but anyone
 * who views your page source can bypass it. Don't use it to protect
 * anything truly sensitive.
 */
(function () {
  'use strict';

  var CONFIG_URL = '/assets/config.json';
  var CONFIG_KEY = 'password-hash';
  var STORAGE_KEY = 'siteAccessGranted'; // global.js's logout button uses this same key
  var EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // one week

  // ---------- localStorage helpers (wrapped: can throw in private mode) ----------
  function isAuthorized() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var savedAt = parseInt(raw, 10);
      if (isNaN(savedAt)) return false;
      if (Date.now() - savedAt > EXPIRY_MS || savedAt > Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function saveAuthorization() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Already unlocked: do nothing at all.
  if (isAuthorized()) return;

  // ---------- Hide the page immediately so protected content never flashes ----------
  var hideStyle = document.createElement('style');
  hideStyle.id = 'pw-gate-hide';
  hideStyle.textContent = 'html{visibility:hidden !important;}';
  (document.head || document.documentElement).appendChild(hideStyle);

  // ---------- Load the password hash from config.json ----------
  // Started right away so it's usually ready by the time someone types.
  // Resolves to the lowercase hex hash string, rejects if it can't be read.
  var hashPromise = null;

  function loadHash() {
    if (!hashPromise) {
      hashPromise = fetch(CONFIG_URL, { cache: 'no-cache' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (config) {
          var hash = config && config[CONFIG_KEY];
          if (typeof hash !== 'string' || !hash.trim()) {
            throw new Error('"' + CONFIG_KEY + '" missing from ' + CONFIG_URL);
          }
          return hash.trim().toLowerCase();
        });
      // Avoid an "unhandled rejection" warning; the submit handler deals with errors.
      hashPromise.catch(function () {});
    }
    return hashPromise;
  }

  loadHash();

  // ---------- SHA-256 ----------
  // Uses the browser's built-in crypto when available (HTTPS / localhost),
  // otherwise falls back to a small pure-JS implementation.
  function sha256Fallback(message) {
    var bytes = unescape(encodeURIComponent(message)); // UTF-8 as binary string
    var K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

    var len = bytes.length;
    var bitLen = len * 8;
    bytes += String.fromCharCode(0x80);
    while ((bytes.length % 64) !== 56) bytes += String.fromCharCode(0);
    bytes += String.fromCharCode(0, 0, 0, 0);
    bytes += String.fromCharCode((bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);

    for (var off = 0; off < bytes.length; off += 64) {
      var w = new Array(64);
      for (var i = 0; i < 16; i++) {
        w[i] = (bytes.charCodeAt(off + i * 4) << 24) | (bytes.charCodeAt(off + i * 4 + 1) << 16) |
               (bytes.charCodeAt(off + i * 4 + 2) << 8) | bytes.charCodeAt(off + i * 4 + 3);
      }
      for (i = 16; i < 64; i++) {
        var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[i] + w[i]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var hex = '';
    for (i = 0; i < 8; i++) hex += ('00000000' + (H[i] >>> 0).toString(16)).slice(-8);
    return hex;
  }

  function sha256(message) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(message)).then(function (buf) {
        var arr = new Uint8Array(buf), hex = '';
        for (var i = 0; i < arr.length; i++) hex += ('0' + arr[i].toString(16)).slice(-2);
        return hex;
      });
    }
    return Promise.resolve(sha256Fallback(message));
  }

  // ---------- Prompt UI ----------
  // The prompt reuses your styles.css classes (.container, .btn) and variables
  // (--card, --text, --highlight, --settings-border), so it follows the
  // light/dark theme automatically. These rules only add what's missing.
  var PROMPT_CSS =
    '.pw-card{max-width:420px;}' +
    '.pw-card h1{font-size:2rem;margin:0 0 12px;}' +
    '.pw-card p{margin:0 0 20px;}' +
    '.pw-card input{width:100%;padding:12px 16px;font:inherit;font-size:1rem;box-sizing:border-box;text-align:center;' +
    'color:var(--text);background:var(--card);border:2px solid var(--settings-border);border-radius:999px;' +
    'outline:none;transition:border-color .2s;}' +
    '.pw-card input:focus{border-color:var(--highlight);}' +
    '.pw-card .btn{width:100%;cursor:pointer;font-family:inherit;box-sizing:border-box;}' +
    '.pw-card .btn:disabled{opacity:.6;cursor:default;transform:none;box-shadow:none;}' +
    '.pw-error{min-height:1.25rem;margin-top:14px;color:#ef4444;font-size:.95rem;font-weight:bold;}';

  function showPrompt() {
    // Wipe the page, but keep:
    //  - the existing .topbar (global.js builds the breadcrumb and gear inside it)
    //  - any <script> tags, so a deferred global.js that hasn't run yet still runs
    var topbar = document.querySelector('.topbar');
    if (topbar && topbar.parentNode) topbar.parentNode.removeChild(topbar);
    var scripts = Array.prototype.slice.call(document.body.querySelectorAll('script'));

    document.body.innerHTML = '';

    if (!topbar) {
      // This page has no topbar markup, so give global.js one to build on.
      topbar = document.createElement('div');
      topbar.className = 'topbar';
      topbar.innerHTML = '<div class="topbar-inner"><span id="breadcrumb"></span></div>';
    }
    document.body.appendChild(topbar);
    scripts.forEach(function (s) { document.body.appendChild(s); });

    var style = document.createElement('style');
    style.textContent = PROMPT_CSS;
    document.head.appendChild(style);

    var form = document.createElement('form');
    form.className = 'container pw-card';
    form.setAttribute('autocomplete', 'off');
    form.innerHTML =
      '<h1>Password required</h1>' +
      '<p>Enter the password to view this site.</p>' +
      '<input type="password" name="pw" placeholder="Password" aria-label="Password" autofocus>' +
      '<button type="submit" class="btn">Enter</button>' +
      '<div class="pw-error" role="alert"></div>';
    document.body.appendChild(form);

    // Blank footer; global.js fills it in from config.json.
    document.body.appendChild(document.createElement('footer'));

    var input = form.querySelector('input');
    var button = form.querySelector('button');
    var error = form.querySelector('.pw-error');

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      error.textContent = '';
      button.disabled = true;

      Promise.all([sha256(input.value), loadHash()])
        .then(function (results) {
          if (results[0] === results[1]) {
            saveAuthorization();
            location.reload(); // reload so the real page renders normally
          } else {
            error.textContent = 'Incorrect password';
            input.value = '';
            input.focus();
            button.disabled = false;
          }
        })
        .catch(function (err) {
          console.warn('Password check failed:', err);
          hashPromise = null; // let the next attempt re-fetch the config
          loadHash();
          error.textContent = 'Could not load password settings. Try again.';
          button.disabled = false;
        });
    });

    // global.js (deferred) runs right after this and builds the topbar,
    // breadcrumb and footer. Reveal the page once everything has loaded,
    // or after 1.5s at the latest so it can never stay blank.
    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      var hide = document.getElementById('pw-gate-hide');
      if (hide) hide.parentNode.removeChild(hide);
      input.focus();
    }
    window.addEventListener('load', reveal);
    setTimeout(reveal, 1500);
  }

  // Run the moment parsing finishes, which is just BEFORE deferred scripts
  // like global.js execute. That way global.js finds the topbar/footer markup
  // we leave behind and builds on it exactly as it does on a normal page.
  if (document.readyState === 'loading') {
    document.addEventListener('readystatechange', function onReady() {
      if (document.readyState === 'loading') return;
      document.removeEventListener('readystatechange', onReady);
      showPrompt();
    });
  } else {
    showPrompt();
  }
})();
