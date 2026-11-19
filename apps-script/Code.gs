var SHEET_NAME = 'Signups';   // tab to write to; falls back to the first tab
var PLACES = 100;             // size of the "first hundred"

// Abuse limits: at most this many new signups across the whole site per window.
var RATE_WINDOW_SECONDS = 600;
var RATE_MAX_SIGNUPS = 30;
var SEGMENTS = ['revived', 'kolam', 'coedwig', 'story'];

var HEADERS = ['Signed up', 'List no.', 'Email', 'Status', 'Interest', 'Headline variant',
  'Source', 'Medium', 'Campaign', 'Referrer', 'Form used', 'Page', 'Consent wording',
  'Device', 'Signup ID', 'Notes', 'GA client ID'];

function doGet() {
  var sh = sheet_();
  return json_({ ok: true, places: PLACES, remaining: remaining_(sh) });
}

function doPost(e) {
  var p = (e && e.parameter) || {};

  // Hidden field that people never see. If it is filled in, it's a bot: pretend it worked.
  if (p.website) return json_({ ok: true });

  var cache = CacheService.getScriptCache();
  var id = clean_(p.id, 40);

  // Interest answer: only accepted for a Signup ID issued by this script in the last 30 minutes,
  // and only one of the known options, so nobody can rewrite another person's row.
  if (p.action === 'segment') {
    var seg = String(p.segment || '');
    var rowForId = id ? Number(cache.get('sid:' + id)) : 0;
    if (!rowForId || SEGMENTS.indexOf(seg) < 0) return json_({ ok: true });
    var lockS = LockService.getScriptLock();
    try { lockS.waitLock(20000); } catch (err) { return json_({ ok: false, error: 'busy' }); }
    try {
      var shS = sheet_();
      var colS = columns_(shS);
      if (colS['Interest']) shS.getRange(rowForId, colS['Interest']).setValue(seg);
      return json_({ ok: true });
    } finally {
      lockS.releaseLock();
    }
  }

  var email = String(p.email || '').trim().toLowerCase();
  // Strict address check: letters, digits and . _ % + - only, so nothing can be read as a formula.
  if (email.length > 254 || !/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(email) || /^[=+\-@]/.test(email)) {
    return json_({ ok: false, error: 'invalid-email' });
  }

  // Site-wide flood limit, so a bot cannot fill the first hundred or the sheet.
  var bucket = 'rate:' + Math.floor(Date.now() / 1000 / RATE_WINDOW_SECONDS);
  var count = Number(cache.get(bucket) || 0);
  if (count >= RATE_MAX_SIGNUPS) return json_({ ok: false, error: 'busy' });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  }

  try {
    var sh = sheet_();
    var col = columns_(sh);
    if (!col['GA client ID']) {   // add the column once, at the end of the header row
      sh.getRange(1, sh.getLastColumn() + 1).setValue('GA client ID');
      col = columns_(sh);
    }

    var existing = findRow_(sh, col['Email'], email);
    if (existing) {
      // Same person again. Let this visit answer the interest question for their row,
      // but give the same reply as any signup so the form can't be used to test who is on the list.
      if (id) cache.put('sid:' + id, String(existing), 1800);
      return json_({ ok: true, remaining: remaining_(sh) });
    }

    cache.put(bucket, String(count + 1), RATE_WINDOW_SECONDS);

    var position = sh.getLastRow();          // header is row 1, so the next row's number is lastRow
    var row = [];
    for (var i = 0; i < sh.getLastColumn(); i++) row.push('');
    function set(name, value) { if (col[name]) row[col[name] - 1] = value; }
    set('Signed up', new Date());
    set('List no.', position);
    set('Email', clean_(email, 254));
    set('Status', position <= PLACES ? 'First hundred' : 'Wider list');
    set('Headline variant', clean_(p.variant, 40));
    set('Source', clean_(p.source, 100));
    set('Medium', clean_(p.medium, 100));
    set('Campaign', clean_(p.campaign, 100));
    set('Referrer', clean_(p.referrer, 300));
    set('Form used', clean_(p.place, 20));
    set('Page', clean_(p.page, 300));
    set('Consent wording', clean_(p.consent, 300));
    set('Device', clean_(p.ua, 300));
    set('Signup ID', id);
    set('GA client ID', clean_(p.ga_client_id, 40));   // anonymous Google Analytics ID, joins this lead to BigQuery user_pseudo_id
    sh.appendRow(row);
    if (id) cache.put('sid:' + id, String(position + 1), 1800);

    return json_({ ok: true, position: position, remaining: remaining_(sh) });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- helpers ---------- */

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Map of header name to column number, so columns can be reordered or added in the sheet. */
function columns_(sh) {
  var names = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < names.length; i++) map[String(names[i]).trim()] = i + 1;
  return map;
}

function findRow_(sh, column, value) {
  if (!column || !value) return 0;
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var values = sh.getRange(2, column, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).replace(/^'/, '').trim().toLowerCase() === value.toLowerCase()) return i + 2;
  }
  return 0;
}

function remaining_(sh) {
  return Math.max(0, PLACES - (sh.getLastRow() - 1));
}

/** Trim, cap length, and stop a value being read by Sheets as a formula. */
function clean_(v, max) {
  var s = String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
