/* ============================================================
 * harness.js - load the real index.html into Node behind a DOM
 * stub, so the actual palm-rejection engine can be driven with
 * synthetic touches and asserted on. index.html is NOT modified.
 *
 * The app is one IIFE that wires touch handlers onto #canvasWrap
 * and persists through localStorage, so the stub only has to
 * record handlers and keep a storage map. Every decision the
 * engine makes is then observable by flushing a save.
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

/* ---------- virtual clock ----------
 * The app timestamps every input with Date.now(). Overriding it
 * lets a test lay down a stroke at an exact speed without
 * sleeping in real time. */
var _clock = null;
var _realNow = Date.now;
function setClock(ms) { _clock = ms; }
function realNow() { return _realNow.call(Date); }
Date.now = function () { return _clock === null ? _realNow.call(Date) : _clock; };

/* a canvas 2D context that accepts anything and does nothing */
function mockCtx() {
  return new Proxy({}, {
    get: function (t, k) {
      if (k === 'measureText') return function (s) { return { width: String(s).length * 7 }; };
      if (k === 'toDataURL') return function () { return 'data:image/png;base64,'; };
      if (Object.prototype.hasOwnProperty.call(t, k)) return t[k];
      return function () {};
    },
    set: function (t, k, v) { t[k] = v; return true; }
  });
}

function mkEl(id) {
  var el = {
    id: id, _h: {}, children: [], style: {}, className: '', innerHTML: '',
    textContent: '', value: '', width: 0, height: 0, disabled: false,
    addEventListener: function (t, fn) { (this._h[t] = this._h[t] || []).push(fn); },
    removeEventListener: function () {},
    appendChild: function (c) { this.children.push(c); return c; },
    removeChild: function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    setAttribute: function (k, v) { this['attr_' + k] = v; },
    getAttribute: function (k) { return this['attr_' + k]; },
    getContext: function () { this._ctx = this._ctx || mockCtx(); return this._ctx; },
    /* on the element, not the context - the photo path re-encodes
       through canvas.toDataURL and silently failed without this */
    toDataURL: function (type) {
      return 'data:' + (type || 'image/png') + ';base64,SCALED#' +
             (this.width || 0) + 'x' + (this.height || 0);
    },
    getBoundingClientRect: function () {
      return { left: this._left || 0, top: this._top || 0, width: this._w || 1024, height: this._h2 || 712 };
    },
    getElementsByTagName: function (tag) {
      var out = [], i;
      for (i = 0; i < this.children.length; i++) {
        if (String(this.children[i].tagName || '').toLowerCase() === String(tag).toLowerCase()) out.push(this.children[i]);
      }
      return out;
    },
    querySelector: function () { return this.children[0] || null; },
    querySelectorAll: function () { return this.children.slice(); },
    focus: function () {}, blur: function () {}, select: function () {},
    _fire: function (type, ev) {
      var hs = this._h[type] || [];
      for (var i = 0; i < hs.length; i++) hs[i].call(this, ev);
    }
  };
  Object.defineProperty(el, 'clientWidth',  { get: function () { return this._w  || 1024; } });
  Object.defineProperty(el, 'clientHeight', { get: function () { return this._h2 || 712; } });
  Object.defineProperty(el, 'offsetWidth',  { get: function () { return this._w  || 1024; } });
  Object.defineProperty(el, 'offsetHeight', { get: function () { return this._h2 || 712; } });
  return el;
}

/* ---------- the driving surface ---------- */
function App(doc, win, storage, wrap, rafQueue) {
  this.doc = doc; this.win = win; this.storage = storage;
  this.wrap = wrap; this.rafQueue = rafQueue;
  this._t = 100000;
  this._live = {};
  setClock(this._t);
}

App.prototype.flushFrames = function (n) {
  n = n || 3;
  for (var i = 0; i < n; i++) {
    var q = this.rafQueue.splice(0, this.rafQueue.length);
    for (var j = 0; j < q.length; j++) { try { q[j](); } catch (e) {} }
  }
  return this;
};

App.prototype._touchList = function () {
  var out = [], k;
  for (k in this._live) {
    if (Object.prototype.hasOwnProperty.call(this._live, k)) out.push(this._live[k]);
  }
  return out;
};

/* the app reads e.type to tell touchend from touchcancel, so the stub
   has to carry it - without it the cancel path was untestable */
App.prototype._ev = function (changed, type) {
  return {
    type: type || 'touchmove',
    touches: this._touchList(),
    targetTouches: this._touchList(),
    changedTouches: changed,
    preventDefault: function () {},
    stopPropagation: function () {}
  };
};

App.prototype.now = function () { return this._t; };
App.prototype.tick = function (ms) { this._t += ms; setClock(this._t); return this; };

App.prototype.down = function (id, x, y, radiusX) {
  var t = { identifier: id, clientX: x, clientY: y, radiusX: radiusX || 0, radiusY: radiusX || 0 };
  this._live[id] = t;
  this.wrap._fire('touchstart', this._ev([t], 'touchstart'));
  return this;
};

/* A hand landing delivers several contacts in ONE touchstart. down()
 * fires them one at a time, which never exercises the burst path. */
App.prototype.downMulti = function (list) {
  var changed = [], i, t;
  for (i = 0; i < list.length; i++) {
    t = { identifier: list[i][0], clientX: list[i][1], clientY: list[i][2], radiusX: 0, radiusY: 0 };
    this._live[list[i][0]] = t;
    changed.push(t);
  }
  this.wrap._fire('touchstart', this._ev(changed, 'touchstart'));
  return this;
};

App.prototype.moveTo = function (id, x, y) {
  var t = { identifier: id, clientX: x, clientY: y, radiusX: 0, radiusY: 0 };
  this._live[id] = t;
  this.wrap._fire('touchmove', this._ev([t], 'touchmove'));
  return this;
};

App.prototype.up = function (id, cancel) {
  var t = this._live[id];
  if (!t) return this;
  delete this._live[id];
  var kind = cancel ? 'touchcancel' : 'touchend';
  this.wrap._fire(kind, this._ev([t], kind));
  return this;
};

/* Lay down a contact travelling from (x0,y0) toward (x1,y1) at
 * `speed` px/ms, sampled every `dt` ms (iPad 3 delivers ~16-33ms).
 * `hold` keeps the contact still for that long before moving. */
App.prototype.stroke = function (o) {
  var id = o.id, dt = o.dt || 16, speed = o.speed;
  var x0 = o.x0, y0 = o.y0, x1 = o.x1, y1 = o.y1;
  var len = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
  var ux = len ? (x1 - x0) / len : 0, uy = len ? (y1 - y0) / len : 0;
  this.down(id, x0, y0, o.radiusX);
  if (o.hold) { this.tick(o.hold); this.moveTo(id, x0, y0); }
  var travelled = 0, guard = 0;
  while (travelled < len && guard++ < 4000) {
    travelled = Math.min(len, travelled + speed * dt);
    this.tick(dt);
    var jx = o.wobble ? (Math.sin(travelled / 7) * o.wobble) : 0;
    this.moveTo(id, x0 + ux * travelled - uy * jx, y0 + uy * travelled + ux * jx);
  }
  if (o.linger) this.tick(o.linger);
  if (!o.keepDown) this.up(id);
  return this;
};

/* Click a row in the kebab menu by its label. The menu is rebuilt
 * from moreRowDefs each time, so this is how a test reaches settings
 * that live inside the IIFE. */
App.prototype.clickMenu = function (label) {
  var menu = this.els.moreMenu;
  if (!menu) return false;
  for (var i = 0; i < menu.children.length; i++) {
    if (String(menu.children[i].innerHTML).indexOf(label) >= 0) {
      menu.children[i]._fire('click', {});
      return true;
    }
  }
  return false;
};

/* The recorder is always on, so this just reads the ring back.
 * window.__mnTrace is the app's tooling hook. */
App.prototype.trace = function () {
  if (typeof this.win.__mnTrace !== 'function') return null;
  return this.win.__mnTrace();
};

/* window.prompt is how pages and folders ask their question; queue the
 * answers a test wants to give. */
App.prototype.answer = function (v) {
  this.win.prompt = function () { return v; };
  return this;
};
App.prototype.confirmAll = function (yes) {
  this.win.confirm = function () { return yes !== false; };
  return this;
};

/* Pretend the user picked a photo out of the camera roll. `url` may
 * carry a #WxH marker, which the Image stub reads as its dimensions. */
App.prototype.pickPhoto = function (url) {
  this.clickMenu('Insert photo');
  var input = this.els.photoInput;
  input.files = [{ name: 'photo.jpg', _url: url }];
  input._fire('change', {});
  this.flushFrames();
  return this;
};

/* a two-finger tap: both down, both up, no movement */
App.prototype.twoFingerTap = function (ax, ay, bx, by, driftPx) {
  this.down(901, ax, ay);
  this.down(902, bx, by);
  this.tick(60);
  if (driftPx) {
    this.moveTo(901, ax - driftPx, ay);
    this.moveTo(902, bx + driftPx, by);
    this.tick(60);
  }
  this.up(901); this.up(902);
  return this;
};

/* every stroke in the collection, not just the open note */
App.prototype.allStrokes = function () {
  var st = this.state(), out = [], i, n;
  if (!st || !st.noteIds) return out;
  for (i = 0; i < st.noteIds.length; i++) {
    n = this.note(st.noteIds[i]);
    if (n && n.strokes) out = out.concat(n.strokes);
  }
  return out;
};

/* Drive the real backup panel rather than reaching into the IIFE, so
 * the tests exercise the same path the user's fingers do. */
App.prototype.exportBackup = function () {
  this.clickMenu('Backup and restore');
  this.els.backupExportBtn._fire('click', {});
  return this.els.backupText.value;
};

/* returns {ok:true} when the restore was applied, or the message the
 * panel showed the user when it was refused */
App.prototype.importBackup = function (txt) {
  this.clickMenu('Backup and restore');
  this.els.backupText.value = txt;
  this.els.backupImportBtn._fire('click', {});
  if (String(this.els.backupOverlay.className).indexOf('on') < 0) return { ok: true };
  return this.els.backupInfo.textContent;
};

/* Requests the app attempted through XMLHttpRequest. */
App.prototype.requests = function () { return this.win._xhr || []; };

/* flush the debounced save and read back what the engine committed */
/* v5 keeps a small index plus one key per note, so reading back means
 * following the index - the same thing the app does on load. */
App.prototype.state = function () {
  var hs = (this.win._h && this.win._h.pagehide) || [];
  for (var i = 0; i < hs.length; i++) hs[i]();
  var raw = this.storage.getItem('mathnotes_v5');
  return raw ? JSON.parse(raw) : null;
};

App.prototype.note = function (id) {
  var raw = this.storage.getItem('mathnotes_v5_n_' + id);
  return raw ? JSON.parse(raw) : null;
};

App.prototype.strokes = function () {
  var s = this.state();
  if (!s || !s.cur || !s.cur.note) return [];
  var n = this.note(s.cur.note);
  return n && n.strokes ? n.strokes : [];
};

/* strokes are only visible after any queued tap-dot timer fires */
App.prototype.settle = function (cb) {
  var self = this;
  setTimeout(function () { self.flushFrames(); cb(self.strokes()); }, 350);
};

/* ---------- build the app in a sandbox ---------- */
function load(opts) {
  opts = opts || {};
  var htmlPath = opts.html || path.join(__dirname, '..', 'index.html');
  var html = fs.readFileSync(htmlPath, 'utf8');
  var m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no inline <script> found in ' + htmlPath);
  var js = m[1];

  var els = {};
  var store = {};
  var rafQueue = [];

  var doc = {
    _els: els, _h: {},
    body: mkEl('body'),
    getElementById: function (id) { return els[id] || (els[id] = mkEl(id)); },
    createElement: function (tag) { var e = mkEl('<' + tag + '>'); e.tagName = tag; return e; },
    addEventListener: function (t, fn) { (this._h[t] = this._h[t] || []).push(fn); }
  };

  var win = {
    _h: {},
    devicePixelRatio: opts.dpr || 2,
    requestAnimationFrame: function (fn) { rafQueue.push(fn); return rafQueue.length; },
    addEventListener: function (t, fn) { (this._h[t] = this._h[t] || []).push(fn); },
    alert: function () {}, confirm: function () { return true; }, prompt: function () { return null; }
  };

  var storage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    clear: function () { store = {}; }
  };
  if (opts.seed) { for (var sk in opts.seed) storage.setItem(sk, opts.seed[sk]); }

  /* the editor canvas sits under a 56px header */
  var wrap = doc.getElementById('canvasWrap');
  wrap._left = 0; wrap._top = 56;
  wrap._w = opts.viewW || 1024; wrap._h2 = opts.viewH || 712;

  /* record what the app tries to send instead of hitting the network */
  win._xhr = [];
  function FakeXHR() { this.readyState = 0; }
  FakeXHR.prototype.open = function (m, u) { this.method = m; this.url = u; this.headers = {}; };
  FakeXHR.prototype.setRequestHeader = function (k, v) { this.headers[k] = v; };
  FakeXHR.prototype.send = function (body) {
    win._xhr.push({ method: this.method, url: this.url, headers: this.headers, body: body });
    this.readyState = 4;
    this.status = opts.xhrStatus || 201;
    this.responseText = '{}';
    if (this.onreadystatechange) this.onreadystatechange();
  };

  var sandbox = {
    document: doc, window: win, localStorage: storage,
    navigator: { userAgent: opts.ua ||
      'Mozilla/5.0 (iPad; CPU OS 9_3_5 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G36 Safari/601.1' },
    XMLHttpRequest: FakeXHR,
    /* Image decodes synchronously here; the size comes from the fake
       data URL so a test can pretend to hand over a 3000px photo. */
    Image: function () {
      var self = this;
      this.width = 0; this.height = 0;
      Object.defineProperty(this, 'src', {
        set: function (v) {
          this._src = v;
          var m = /#(\d+)x(\d+)/.exec(v || '');
          self.width = m ? +m[1] : 1600;
          self.height = m ? +m[2] : 1200;
          if (self.onload) self.onload();
        },
        get: function () { return this._src; }
      });
    },
    FileReader: function () {
      var self = this;
      this.readAsDataURL = function (f) {
        self.result = f && f._url ? f._url : 'data:image/jpeg;base64,AAAA#1600x1200';
        if (self.onload) self.onload();
      };
    },
    btoa: function (b) { return Buffer.from(b, 'binary').toString('base64'); },
    unescape: unescape, encodeURIComponent: encodeURIComponent,
    setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval,
    Date: Date, Math: Math, JSON: JSON, parseInt: parseInt, parseFloat: parseFloat,
    isNaN: isNaN, String: String, Number: Number, Array: Array, Object: Object,
    RegExp: RegExp, Error: Error, Proxy: Proxy,
    console: opts.quiet ? { log: function () {} } : console
  };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox, { filename: 'index.html' });

  var app = new App(doc, win, storage, wrap, rafQueue);
  app.els = els;
  app.sandbox = sandbox;
  return app;
}

module.exports = { load: load, setClock: setClock, realNow: realNow, mkEl: mkEl };
