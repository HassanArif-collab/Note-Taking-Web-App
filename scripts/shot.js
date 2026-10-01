/* ============================================================
 * shot.js - a screenshot of a page (the app, or a drawing of some ink)
 * from headless Chrome, after running some steps in it. The browser pane
 * in the desktop app is too small to judge a layout by; this is not.
 *
 *   node scripts/shot.js <url> <out.png> [steps.js] [width] [height]
 *
 * steps.js is the body of an async function run in the page. A line
 * "//RELOAD" splits it: the part before runs, the page loads again, the
 * rest runs. With START=<url> set, the first part runs on that page
 * instead - one of the same site that is not the app, so storage can be
 * seeded without the app saving over it on its way out.
 * ============================================================ */
'use strict';
var spawn = require('child_process').spawn;
var fs = require('fs'), path = require('path'), os = require('os');
var args = process.argv.slice(2);
var url = args[0], out = args[1], stepsFile = args[2], W = args[3] || '1024', H = args[4] || '768';
var CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
              'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(function (p) { return fs.existsSync(p); })[0];
var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
var port = 9400 + Math.floor(Math.random() * 400);
var proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + dir,
  '--window-size=' + W + ',' + H, '--hide-scrollbars', '--no-first-run', 'about:blank']);
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function wsUrl() {
  for (var i = 0; i < 60; i++) {
    try {
      var j = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
      var p = j.filter(function (t) { return t.type === 'page'; })[0];
      if (p) return p.webSocketDebuggerUrl;
    } catch (e) {}
    await sleep(200);
  }
  throw new Error('chrome did not start');
}
(async function () {
  var ws = new WebSocket(await wsUrl());
  await new Promise(function (r) { ws.onopen = r; });
  var id = 0, pending = {};
  ws.onmessage = function (m) { var d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } };
  function send(method, params) {
    return new Promise(function (r) { var i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method: method, params: params || {} })); });
  }
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.enable');
  async function run(code) {
    var r = await send('Runtime.evaluate', { expression: '(async () => {' + code + '\n})()', awaitPromise: true, returnByValue: true });
    var v = r.result && r.result.exceptionDetails ? 'ERROR ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400)
                                                  : JSON.stringify(r.result && r.result.result && r.result.result.value);
    if (v && v !== 'undefined') console.log(v);
  }
  await send('Page.navigate', { url: process.env.START || url });
  await sleep(process.env.START ? 400 : 1500);
  var parts = stepsFile ? fs.readFileSync(stepsFile, 'utf8').split('//RELOAD') : [];
  for (var k = 0; k < parts.length; k++) {
    if (k > 0) { await send('Page.navigate', { url: url }); await sleep(1500); }
    await run(parts[k]);
  }
  var shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log('saved ' + out);
  ws.close();
  proc.kill();
  process.exit(0);
})().catch(function (e) { console.error(e); proc.kill(); process.exit(1); });
