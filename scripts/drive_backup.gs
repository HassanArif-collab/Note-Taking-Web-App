/* ============================================================
 * MathNotes automatic backup - a Google Apps Script web app that keeps
 * the iPad's notes in YOUR Google Drive, folder "MathNotes backups":
 * the newest copy, and one a day for the last 30 days.
 *
 * Set up once, on a computer:
 *   script.google.com > New project > paste this over everything >
 *   Deploy > New deployment > type Web app > Execute as: Me,
 *   Who has access: Anyone > Deploy > Authorize > copy the Web app URL.
 *
 * The URL is the key to these backups: it goes to the iPad locked under
 * the restore code (scripts/lock_backup.js --drive), never in the open.
 *
 *   POST  (text/plain)   a MathNotes backup -> kept in Drive
 *   GET   ?what=last     { ok, at, size } of the newest copy
 *   GET   ?what=latest   the newest copy itself
 *   &cb=NAME             answer as NAME("...") for a <script> tag, which
 *                        is how iOS 9 can read it (JSONP)
 * ============================================================ */
var FOLDER = 'MathNotes backups';
var KEEP_DAYS = 30;

function doPost(e) {
  var txt = e && e.postData ? e.postData.contents : '', pack;
  try { pack = JSON.parse(txt); } catch (err) { return out_('not a backup'); }
  if (!pack || pack.mathnotes !== 1 || typeof pack.body !== 'string' || !pack.at) return out_('not a backup');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var dir = folder_(), name = 'MathNotes ' + String(pack.at).slice(0, 10) + '.json';
    var same = dir.getFilesByName(name), file;
    if (same.hasNext()) { file = same.next(); file.setContent(txt); }
    else file = dir.createFile(name, txt, 'application/json');
    PropertiesService.getScriptProperties().setProperties({ last: file.getId(), at: String(pack.at), size: String(txt.length) });
    prune_(dir);
  } finally { lock.releaseLock(); }
  return out_('ok ' + pack.at);
}

function doGet(e) {
  var p = (e && e.parameter) || {}, props = PropertiesService.getScriptProperties(), res;
  if (p.what === 'latest') {
    var id = props.getProperty('last');
    res = id ? DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8') : '';
  } else {
    res = JSON.stringify({ ok: 1, at: props.getProperty('at') || '', size: +(props.getProperty('size') || 0) });
  }
  var cb = /^[A-Za-z_$][\w$]{0,60}$/.test(p.cb || '') ? p.cb : '';
  if (!cb) return out_(res);
  /* a string literal an old JavaScript engine can read: no raw U+2028/9 */
  var lit = JSON.stringify(res).replace(/ /g, '\\u2028').replace(/ /g, '\\u2029');
  return ContentService.createTextOutput(cb + '(' + lit + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}
/* one file a day; the oldest beyond KEEP_DAYS go to the trash */
function prune_(dir) {
  var it = dir.getFiles(), list = [], f, i;
  while (it.hasNext()) {
    f = it.next();
    if (/^MathNotes \d{4}-\d\d-\d\d\.json$/.test(f.getName())) list.push(f);
  }
  list.sort(function (a, b) { return a.getName() < b.getName() ? 1 : -1; });
  for (i = KEEP_DAYS; i < list.length; i++) list[i].setTrashed(true);
}
function out_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }
