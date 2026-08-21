/**
 * Wainono Farm Monitor - Web App Backend (Fixed)
 *
 * Complete script. Select all in the Apps Script editor and paste this over
 * the top, then Deploy > Manage deployments > edit > New version > Deploy.
 *
 * Differences from the original version:
 *   1. doGet     - added the 'units' branch
 *   2. doPost    - added the 'save_units' branch
 *   3. getUnits / saveUnits functions at the bottom (Farm Units)
 *   4. getFeedSettings - 'silage' added to the JSON-parse whitelist
 *   5. Herd grass allocation (m2/cow/day) and magnesium / calcium dosing:
 *      normalizeHerds keeps the new fields typed, getFeedSettings no longer
 *      hands the app an empty herd list when the cell is blank, and
 *      saveFeedSettings mirrors the herds into a readable "Herds" sheet.
 *   6. Herd numbers log: doGet 'herd_log' branch, doPost 'herd_log' branch and
 *      getHerdLog / appendHerdLog, backed by a new append-only "HerdLog" sheet.
 *   7. Cow numbers are now owned by the sheet. doPost 'herd_cows' applies one
 *      add / remove / set at a time under the script lock and writes the log row
 *      itself, and saveFeedSettings no longer takes herdCows from the payload,
 *      so a phone holding an old page cannot overwrite everyone else's counts.
 * Everything else is byte-identical to what you had.
 */

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
                       .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg }))
                       .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var type = (e && e.parameter && e.parameter.type) ? e.parameter.type : 'feed_settings';
  if (type === 'breaks') {
    return getBreaks();
  } else if (type === 'units') {
    return getUnits();
  } else if (type === 'out') {
    return getOut();
  } else if (type === 'herd_log') {
    return getHerdLog();
  } else if (type === 'paddocks') {
    return getPaddocks();
  } else {
    return getFeedSettings();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    if (!e || !e.postData || !e.postData.contents) {
      return errorResponse("Empty POST body");
    }

    var payload = JSON.parse(e.postData.contents);
    var type = payload.type;

    if (type === 'breaks') {
      return saveBreaks(payload.breaks);
    } else if (type === 'feed_settings') {
      return saveFeedSettings(payload);
    } else if (type === 'farmwalk_batch') {
      return saveFarmwalkBatch(payload.entries);
    } else if (type === 'update_paddock_history') {
      return updatePaddockHistory(payload.paddock, payload.entries);
    } else if (type === 'farmwalk_entry' || type === 'farmwalk') {
      return saveFarmwalkEntry(payload);
    } else if (type === 'save_units' || type === 'units') {
      return saveUnits(payload.units);
    } else if (type === 'save_out' || type === 'out') {
      return saveOut(payload.out);
    } else if (type === 'herd_log') {
      return appendHerdLog(payload.entries);
    } else if (type === 'herd_cows') {
      return applyHerdCows(payload);
    } else if (type === 'paddocks') {
      return savePaddocks(payload);
    } else {
      return errorResponse("Unknown payload type: " + type);
    }
  } catch (err) {
    return errorResponse("Execution error: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/* ================== FARMWALK FUNCTIONS ================== */

function saveFarmwalkBatch(entriesList) {
  if (!Array.isArray(entriesList) || entriesList.length === 0) {
    return errorResponse("No entries provided");
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Farmwalks") || ss.getSheets()[0];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Date", "Paddock", "Cover", "Reason"]);
  }

  var rows = [];
  entriesList.forEach(function(item) {
    var dateStr = item.date;
    var formattedDate = dateStr;
    if (dateStr && dateStr.indexOf('-') > -1) {
      var parts = dateStr.split('-');
      if (parts.length === 3) formattedDate = parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    var paddock = item.paddock;
    var cover = Number(item.cover);
    var reason = item.reason || "";
    rows.push([formattedDate, paddock, isNaN(cover) ? 0 : cover, reason]);
  });

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
  }

  return jsonResponse({ status: "success", count: rows.length });
}

function saveFarmwalkEntry(payload) {
  var paddock = payload.paddock;
  var cover = Number(payload.cover);
  var reason = payload.reason || "";
  var dateStr = payload.date;

  if (!paddock) return errorResponse("Missing paddock name");

  var formattedDate = dateStr;
  if (dateStr && dateStr.indexOf('-') > -1) {
    var parts = dateStr.split('-');
    if (parts.length === 3) formattedDate = parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Farmwalks") || ss.getSheets()[0];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Date", "Paddock", "Cover", "Reason"]);
  }

  sheet.appendRow([formattedDate, paddock, isNaN(cover) ? 0 : cover, reason]);

  return jsonResponse({ status: "success", paddock: paddock, cover: cover });
}

function updatePaddockHistory(paddockName, entriesList) {
  if (!paddockName) return errorResponse("Missing paddock name");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Farmwalks") || ss.getSheets()[0];
  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    var rowsToKeep = [];

    var pLower = String(paddockName).trim().toLowerCase();
    for (var i = 0; i < data.length; i++) {
      var rowName = String(data[i][1]).trim().toLowerCase();
      if (rowName !== pLower) {
        rowsToKeep.push(data[i]);
      }
    }

    if (Array.isArray(entriesList)) {
      entriesList.forEach(function(item) {
        var dateStr = item.date;
        var formattedDate = dateStr;
        if (dateStr && dateStr.indexOf('-') > -1) {
          var parts = dateStr.split('-');
          if (parts.length === 3) formattedDate = parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        rowsToKeep.push([formattedDate, paddockName, Number(item.cover) || 0, item.reason || ""]);
      });
    }

    sheet.getRange(2, 1, lastRow, 4).clearContent();
    if (rowsToKeep.length > 0) {
      sheet.getRange(2, 1, rowsToKeep.length, 4).setValues(rowsToKeep);
    }
  }

  return jsonResponse({ status: "success", paddock: paddockName });
}

/* ================== BREAKS & SETTINGS HELPERS ================== */

function getBreaks() {
  var sheet = getOrCreateSheet("Breaks");
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 2) return jsonResponse({ status: "success", breaks: [] });
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  var breaks = data.map(function(row) {
    var b = {};
    headers.forEach(function(header, index) {
      var val = row[index];
      if (header === 'vertices') {
        try { b[header] = JSON.parse(val || "[]"); } catch (e) { b[header] = []; }
      } else if (header === 'isCropBreak' || header === 'isDeleted') {
        b[header] = (val === true || String(val).toUpperCase() === 'TRUE');
      } else {
        b[header] = val;
      }
    });
    return b;
  });
  return jsonResponse({ status: "success", breaks: breaks });
}

function saveBreaks(breaksList) {
  if (!Array.isArray(breaksList)) return errorResponse("Payload breaks must be array");
  var sheet = getOrCreateSheet("Breaks");
  sheet.clearContents();
  var headers = ["id", "name", "paddock", "vertices", "areaSqm", "areaHa", "distanceMeters", "cropWidthMeters", "cropMode", "createdAt", "createdBy", "group", "comment", "isCropBreak", "cropStatus", "isDeleted", "deletedBy", "deletedAt", "lastEditedBy", "lastEditedAt"];
  sheet.appendRow(headers);
  var rows = [];
  breaksList.forEach(function(b) {
    rows.push([b.id || "", b.name || "", b.paddock || "", JSON.stringify(b.vertices || []), b.areaSqm || 0, b.areaHa || 0, b.distanceMeters || 0, b.cropWidthMeters || 0, b.cropMode || "", b.createdAt || "", b.createdBy || "", b.group || "", b.comment || "", b.isCropBreak ? "TRUE" : "FALSE", b.cropStatus || "", b.isDeleted ? "TRUE" : "FALSE", b.deletedBy || "", b.deletedAt || "", b.lastEditedBy || "", b.lastEditedAt || ""]);
  });
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  return jsonResponse({ status: "success", count: rows.length });
}

var JSON_SETTING_KEYS = ['herdCows', 'cropYields', 'cropHerds', 'customHerds', 'manualBreaks', 'customPaddocks', 'silage'];
var ARRAY_SETTING_KEYS = ['cropHerds', 'customHerds', 'customPaddocks'];

function getFeedSettings() {
  var sheet = getOrCreateSheet("Settings");
  var lastRow = sheet.getLastRow();
  var settings = {};
  if (lastRow > 0) {
    var data = sheet.getRange(1, 1, lastRow, 2).getValues();
    data.forEach(function(row) {
      var key = row[0]; var val = row[1];
      if (JSON_SETTING_KEYS.indexOf(key) !== -1) {
        var fallback = ARRAY_SETTING_KEYS.indexOf(key) !== -1 ? [] : {};
        try { settings[key] = JSON.parse(val || JSON.stringify(fallback)); }
        catch (e) { settings[key] = fallback; }
      } else { settings[key] = val; }
    });
  }

  // The app assigns customHerds straight onto BREAK_GROUPS. A blank or corrupt
  // cell used to hand it {} or [], leaving it with no herds at all - drop the
  // key instead so the app keeps the herds it already has.
  if (Array.isArray(settings.customHerds) && settings.customHerds.length > 0) {
    settings.customHerds = normalizeHerds(settings.customHerds);
  } else {
    delete settings.customHerds;
  }

  return jsonResponse(settings);
}

// Read one Settings key without disturbing the rest of the sheet.
function readSettingValue(sheet, key) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return null;
  var data = sheet.getRange(1, 1, lastRow, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function writeSettingValue(sheet, key, val) {
  var lastRow = sheet.getLastRow();
  if (lastRow >= 1) {
    var data = sheet.getRange(1, 1, lastRow, 1).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === key) { sheet.getRange(i + 1, 2).setValue(val); return; }
    }
  }
  sheet.appendRow([key, val]);
}

function saveFeedSettings(payload) {
  var sheet = getOrCreateSheet("Settings");

  // Cow numbers are NOT taken from this payload. They belong to the herd_cows
  // endpoint, which applies one change at a time under the script lock. A phone
  // can sit on an open page for days, and this save rewrites the whole sheet -
  // so honouring herdCows here let a stale device push old counts back over
  // everyone else's work. Whatever the sheet already holds wins.
  var existingHerdCows = readSettingValue(sheet, 'herdCows');

  // Same danger for the herd list itself. This payload carries whatever herds
  // that device happens to know about, so a herd it has never heard of must
  // survive the save. Removal happens only through deleteHerds.
  var existingHerdsRaw = readSettingValue(sheet, 'customHerds');
  var existingHerds = [];
  if (existingHerdsRaw) {
    try { existingHerds = JSON.parse(existingHerdsRaw) || []; } catch (e) { existingHerds = []; }
  }
  if (!Array.isArray(existingHerds)) existingHerds = [];

  // A delete has to be remembered for a while. Otherwise the next device that
  // still has the herd in its list simply puts it back.
  var tombstones = readHerdTombstones(sheet);
  if (Array.isArray(payload.deleteHerds)) {
    payload.deleteHerds.forEach(function(id) {
      if (!id) return;
      var known = false;
      tombstones.forEach(function(t) { if (String(t.id) === String(id)) known = true; });
      if (!known) tombstones.push({ id: String(id), ts: new Date().toISOString() });
    });
  }

  if (Array.isArray(payload.customHerds)) {
    payload.customHerds = mergeHerdLists(existingHerds, payload.customHerds,
                                         tombstones.map(function(t) { return t.id; }));
  }
  payload.deletedHerds = tombstones;

  sheet.clearContents();
  var keysToIgnore = ['type', 'breaks', 'herdEdit', 'deleteHerds'];

  if (payload.customHerds) payload.customHerds = normalizeHerds(payload.customHerds);

  var rows = [];
  Object.keys(payload).forEach(function(key) {
    if (keysToIgnore.indexOf(key) !== -1) return;
    var val = payload[key];
    // Only seed herdCows from a client when the sheet has never had it.
    if (key === 'herdCows' && existingHerdCows) val = existingHerdCows;
    if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
    rows.push([key, val]);
  });
  if (rows.length > 0) sheet.getRange(1, 1, rows.length, 2).setValues(rows);

  var herdCowsForReport = existingHerdCows || payload.herdCows;
  if (typeof herdCowsForReport === 'string') {
    try { herdCowsForReport = JSON.parse(herdCowsForReport); } catch (e) { herdCowsForReport = {}; }
  }
  writeHerdSheet(payload.customHerds, herdCowsForReport);

  return jsonResponse({ status: "success" });
}

/**
 * Decide what the herd list should be after a save.
 *
 * A herd being absent from the incoming list means NOTHING. The device may
 * simply never have heard of it - a page opened before it was created, or one
 * that started work before it had finished reading the sheet. Absence used to
 * mean "delete", and that quietly removed herds again and again.
 *
 * incoming wins for herds it knows about, so renames and tick boxes still work.
 * A herd only goes when its id is named in deleteIds, which the app fills in
 * only when someone presses delete on that herd.
 */
// How long a deleted herd stays deleted even if a device still lists it. Long
// enough for every phone to have refreshed, short enough that the same id can
// be used again later.
var HERD_TOMBSTONE_DAYS = 7;

function readHerdTombstones(sheet) {
  var raw = readSettingValue(sheet, 'deletedHerds');
  var list = [];
  if (raw) { try { list = JSON.parse(raw) || []; } catch (e) { list = []; } }
  if (!Array.isArray(list)) list = [];

  var cutoff = new Date().getTime() - (HERD_TOMBSTONE_DAYS * 24 * 60 * 60 * 1000);
  var live = [];
  list.forEach(function(t) {
    if (!t || !t.id) return;
    var when = new Date(t.ts).getTime();
    if (!isFinite(when) || when > cutoff) live.push(t);   // undated entries are kept
  });
  return live;
}

function mergeHerdLists(existing, incoming, deleteIds) {
  var doomed = {};
  if (Array.isArray(deleteIds)) {
    deleteIds.forEach(function(id) { if (id) doomed[String(id)] = true; });
  }

  var seen = {};
  var out = [];
  incoming.forEach(function(h) {
    if (!h || !h.id || doomed[String(h.id)]) return;
    seen[String(h.id)] = true;
    out.push(h);
  });

  existing.forEach(function(h) {
    if (!h || !h.id) return;
    if (seen[String(h.id)] || doomed[String(h.id)]) return;
    out.push(h);            // the sender did not know about this one - keep it
  });

  return out;
}

/**
 * The only thing that may change a herd's cow number.
 *
 * doPost holds the script lock, so read-modify-write here is atomic: two people
 * moving cows at the same moment both land, and "from" is always the number that
 * was really there, not what some phone last saw. The log row is written here
 * for the same reason - a client cannot know the true previous value.
 *
 * mode 'delta' adds or removes; mode 'set' forces a total.
 */
function applyHerdCows(payload) {
  if (!payload || !payload.herd) return errorResponse("Missing herd");

  var sheet = getOrCreateSheet("Settings");

  // Signal at a gate is poor. If the reply was lost on the way back the person
  // is told it failed and taps again, so the same change must never be applied
  // twice. The log row is the record of it having happened.
  if (payload.id) {
    var already = findHerdLogEntry(payload.id);
    if (already) {
      var currentRaw = readSettingValue(sheet, 'herdCows');
      var currentCows = {};
      if (currentRaw) { try { currentCows = JSON.parse(currentRaw) || {}; } catch (e) { currentCows = {}; } }
      return jsonResponse({ status: "success", entry: already, herdCows: currentCows,
                            staleOnClient: false, repeated: true });
    }
  }

  var raw = readSettingValue(sheet, 'herdCows');
  var cows = {};
  if (raw) { try { cows = JSON.parse(raw) || {}; } catch (e) { cows = {}; } }
  if (typeof cows !== 'object' || cows === null || Array.isArray(cows)) cows = {};

  var from = Number(cows[payload.herd]) || 0;
  var to;

  if (payload.mode === 'set') {
    to = Number(payload.to);
    if (!isFinite(to)) return errorResponse("Bad total");
  } else {
    var delta = Number(payload.delta);
    if (!isFinite(delta) || delta === 0) return errorResponse("Bad delta");
    to = from + delta;
  }
  if (to < 0) to = 0;
  to = Math.round(to);

  cows[payload.herd] = to;
  writeSettingValue(sheet, 'herdCows', JSON.stringify(cows));

  var entry = {
    id: payload.id || ('hl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    ts: payload.ts || new Date().toISOString(),
    herd: String(payload.herd),
    herdName: String(payload.herdName || payload.herd),
    from: from,
    to: to,
    delta: to - from,
    user: String(payload.user || 'Unknown User')
  };
  if (entry.delta !== 0) appendHerdLogRows([entry]);

  return jsonResponse({
    status: "success",
    entry: entry,
    herdCows: cows,
    // So the client can say "someone else changed it" instead of silently
    // showing a jump the person did not make.
    staleOnClient: (payload.expectedFrom !== undefined && Number(payload.expectedFrom) !== from)
  });
}

/* ================== HERDS: GRASS ALLOCATION & MINERALS ================== */

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

function toBool(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

/**
 * Keep the per-herd grass allocation (m2/cow/day) and the magnesium / calcium
 * dosing fields as real numbers and booleans, whatever the cell happened to
 * hold. A herd that has never been given these fields keeps them empty, which
 * the app reads as "share the daily area proportionally, no minerals".
 */
function normalizeHerds(herds) {
  if (!Array.isArray(herds)) return [];
  return herds.map(function(h) {
    if (!h || typeof h !== 'object') return h;
    h.m2_per_cow = toNumberOrNull(h.m2_per_cow);
    h.mag_on = toBool(h.mag_on);
    h.mag_g  = toNumberOrNull(h.mag_g);
    h.cal_on = toBool(h.cal_on);
    h.cal_g  = toNumberOrNull(h.cal_g);
    return h;
  });
}

/**
 * Mirror the herds into a readable "Herds" sheet so break size and the mineral
 * amounts to load can be read straight off the spreadsheet. The app still reads
 * herds from the customHerds JSON in Settings - this sheet is a report, not a
 * source, so it can never disagree with what the app is using.
 */
function writeHerdSheet(herds, herdCows) {
  if (!Array.isArray(herds)) return;
  try {
    var cows = (herdCows && typeof herdCows === 'object') ? herdCows : {};
    var sheet = getOrCreateSheet("Herds");
    sheet.clearContents();

    var headers = ["id", "name", "cows", "on grass", "on crop", "OAD",
                   "m2/cow/day", "break ha/day",
                   "magnesium", "Mg g/cow", "Mg kg/day",
                   "calcium", "Ca g/cow", "Ca kg/day"];
    sheet.appendRow(headers);

    var rows = [];
    herds.forEach(function(h) {
      if (!h || h.id === 'all') return;
      var n    = Number(cows[h.id]) || 0;
      var m2   = toNumberOrNull(h.m2_per_cow);
      var magOn = toBool(h.mag_on), magG = toNumberOrNull(h.mag_g);
      var calOn = toBool(h.cal_on), calG = toNumberOrNull(h.cal_g);
      rows.push([
        h.id || "", h.name || "", n,
        h.on_grass ? "TRUE" : "FALSE",
        h.on_crop  ? "TRUE" : "FALSE",
        h.is_oad   ? "TRUE" : "FALSE",
        m2 === null ? "" : m2,
        m2 === null ? "" : (m2 * n) / 10000,
        magOn ? "TRUE" : "FALSE",
        magG === null ? "" : magG,
        (magOn && magG !== null) ? (magG * n) / 1000 : "",
        calOn ? "TRUE" : "FALSE",
        calG === null ? "" : calG,
        (calOn && calG !== null) ? (calG * n) / 1000 : ""
      ]);
    });

    if (rows.length > 0) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  } catch (err) {
    // A reporting sheet must never cost the user their settings save.
  }
}

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

/* ================== FARM UNITS ================== */

function getUnits() {
  var sheet = getOrCreateSheet("Units");
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ status: "success", units: [] });

  var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  var units = [];

  data.forEach(function(row) {
    if (!row[0] && !row[1]) return;

    var paddocks = [];
    var raw = row[3];
    try {
      paddocks = JSON.parse(raw || "[]");
    } catch (e) {
      paddocks = String(raw || "").split(/[|,]/).map(function(s) {
        return s.trim();
      }).filter(function(s) { return s.length > 0; });
    }
    if (!Array.isArray(paddocks)) paddocks = [];

    units.push({
      id: String(row[0] || ""),
      name: String(row[1] || ""),
      color: String(row[2] || "") || "#9b59b6",
      paddocks: paddocks
    });
  });

  return jsonResponse({ status: "success", units: units });
}

/* ================== PADDOCKS OUT OF ROTATION ================== */
// Sheet "out": paddock | status   (status is CROP, SILAGE or OTHER)
// Row 1 is a header, matching how the app's CSV reader skips the first line.

function getOut() {
  var sheet = getOrCreateSheet("out");
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ status: "success", out: [] });

  var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var out = [];
  data.forEach(function(row) {
    var name = String(row[0] || "").trim();
    if (!name) return;
    out.push({
      paddock: name,
      status: String(row[1] || "OUT").trim().toUpperCase()
    });
  });
  return jsonResponse({ status: "success", out: out });
}

function saveOut(outList) {
  if (!Array.isArray(outList)) return errorResponse("Payload out must be array");

  var sheet = getOrCreateSheet("out");
  sheet.clearContents();
  sheet.appendRow(["paddock", "status"]);

  var rows = [];
  outList.forEach(function(o) {
    if (!o) return;
    var name = String(o.paddock || "").trim();
    if (!name) return;
    rows.push([name, String(o.status || "OUT").trim().toUpperCase()]);
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }

  return jsonResponse({ status: "success", count: rows.length });
}

/* ================== HERD NUMBERS LOG ================== */
// Sheet "HerdLog": id | timestamp | herd id | herd | from | to | change | user
//
// Append only. Nothing in here rewrites or clears an existing row, which is why
// it cannot live in Settings - saveFeedSettings clears that sheet on every save.
// Rows are keyed by id so a client re-sending an entry can never duplicate it.

var HERD_LOG_HEADERS = ["id", "timestamp", "herd id", "herd", "from", "to", "change", "user"];

function getHerdLogSheet() {
  var sheet = getOrCreateSheet("HerdLog");
  if (sheet.getLastRow() === 0) sheet.appendRow(HERD_LOG_HEADERS);
  return sheet;
}

function getHerdLog() {
  var sheet = getHerdLogSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ status: "success", entries: [] });

  var data = sheet.getRange(2, 1, lastRow - 1, HERD_LOG_HEADERS.length).getValues();
  var entries = [];
  data.forEach(function(row) {
    if (!row[0]) return;
    // A timestamp cell comes back as a Date when the sheet has formatted it and
    // as a plain string when it has not, so duck-type rather than instanceof.
    var ts = row[1];
    var isDate = ts && typeof ts.getTime === 'function' && !isNaN(ts.getTime());
    entries.push({
      id: String(row[0]),
      ts: isDate ? ts.toISOString() : String(ts || ""),
      herd: String(row[2] || ""),
      herdName: String(row[3] || ""),
      from: Number(row[4]) || 0,
      to: Number(row[5]) || 0,
      delta: Number(row[6]) || 0,
      user: String(row[7] || "")
    });
  });
  return jsonResponse({ status: "success", entries: entries });
}

function findHerdLogEntry(id) {
  var sheet = getHerdLogSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var data = sheet.getRange(2, 1, lastRow - 1, HERD_LOG_HEADERS.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      var ts = data[i][1];
      var isDate = ts && typeof ts.getTime === 'function' && !isNaN(ts.getTime());
      return {
        id: String(data[i][0]),
        ts: isDate ? ts.toISOString() : String(ts || ""),
        herd: String(data[i][2] || ""), herdName: String(data[i][3] || ""),
        from: Number(data[i][4]) || 0, to: Number(data[i][5]) || 0,
        delta: Number(data[i][6]) || 0, user: String(data[i][7] || "")
      };
    }
  }
  return null;
}

function appendHerdLogRows(entries) {
  var sheet = getHerdLogSheet();
  var lastRow = sheet.getLastRow();

  var seen = {};
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function(r) {
      if (r[0]) seen[String(r[0])] = true;
    });
  }

  var rows = [];
  entries.forEach(function(e) {
    if (!e || !e.id || seen[String(e.id)]) return;
    seen[String(e.id)] = true;
    var from = Number(e.from) || 0;
    var to   = Number(e.to) || 0;
    rows.push([
      String(e.id),
      e.ts || new Date().toISOString(),
      String(e.herd || ""),
      String(e.herdName || ""),
      from,
      to,
      (e.delta === undefined || e.delta === null) ? (to - from) : Number(e.delta),
      String(e.user || "Unknown User")
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HERD_LOG_HEADERS.length).setValues(rows);
  }
  return rows.length;
}

function appendHerdLog(entries) {
  if (!Array.isArray(entries)) return errorResponse("Payload entries must be array");
  if (entries.length === 0) return jsonResponse({ status: "success", added: 0 });
  return jsonResponse({ status: "success", added: appendHerdLogRows(entries) });
}

/* ================== PADDOCK BOUNDARIES ================== */
// Sheet "Paddock Boundaries":
//   paddockId | name | farmId | calcArea | geometryType | geometryJson
//
// paddockId is the real key and never changes. name is only a label, so a
// paddock can be renamed without touching anything that points at it.
// geometryJson holds MultiPolygon coordinates: [[[[lng,lat], ...]]]
//
// Same rules as the herds, for the same reasons: a row is only removed when
// the app names its id, and a paddock the sender has never heard of is left
// exactly as it is.

var PADDOCK_SHEET = "Paddock Boundaries";
var PADDOCK_HEADERS = ["paddockId", "name", "farmId", "calcArea", "geometryType", "geometryJson"];

function getPaddockSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(PADDOCK_SHEET);   // never created blind - it holds the farm
}

function getPaddocks() {
  var sheet = getPaddockSheet();
  if (!sheet) return errorResponse("No '" + PADDOCK_SHEET + "' tab in this spreadsheet");

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ status: "success", paddocks: [] });

  var data = sheet.getRange(2, 1, lastRow - 1, PADDOCK_HEADERS.length).getValues();
  var paddocks = [];
  data.forEach(function(row) {
    var id = String(row[0] || "").trim();
    if (!id) return;
    var geom = null;
    try { geom = JSON.parse(row[5] || "null"); } catch (e) { geom = null; }
    paddocks.push({
      paddockId: id,
      name: String(row[1] || "").trim(),
      farmId: String(row[2] || ""),
      calcArea: Number(row[3]) || 0,
      geometryType: String(row[4] || "MultiPolygon"),
      geometry: geom
    });
  });
  return jsonResponse({ status: "success", paddocks: paddocks });
}

/**
 * Upsert by paddockId.
 *
 * Anything not mentioned is left alone, so a device with an old list cannot
 * wipe the farm. Rows go only when their id is in deletePaddocks.
 */
function savePaddocks(payload) {
  var sheet = getPaddockSheet();
  if (!sheet) return errorResponse("No '" + PADDOCK_SHEET + "' tab in this spreadsheet");
  if (!Array.isArray(payload.paddocks)) return errorResponse("Payload paddocks must be array");

  var lastRow = sheet.getLastRow();
  var existing = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, PADDOCK_HEADERS.length).getValues()
    : [];

  var doomed = {};
  if (Array.isArray(payload.deletePaddocks)) {
    payload.deletePaddocks.forEach(function(id) { if (id) doomed[String(id).trim()] = true; });
  }

  var incoming = {};
  payload.paddocks.forEach(function(p) {
    if (p && p.paddockId) incoming[String(p.paddockId).trim()] = p;
  });

  var rows = [];
  var kept = {};
  existing.forEach(function(row) {
    var id = String(row[0] || "").trim();
    if (!id) return;
    if (doomed[id]) return;                       // named for deletion
    kept[id] = true;
    var p = incoming[id];
    if (!p) { rows.push(row); return; }           // sender did not mention it
    rows.push(paddockRow(p, row));
  });

  // paddocks the sheet has never seen (a split makes these)
  payload.paddocks.forEach(function(p) {
    var id = p && p.paddockId ? String(p.paddockId).trim() : "";
    if (!id || kept[id] || doomed[id]) return;
    kept[id] = true;
    rows.push(paddockRow(p, null));
  });

  sheet.clearContents();
  sheet.appendRow(PADDOCK_HEADERS);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, PADDOCK_HEADERS.length).setValues(rows);
  }

  return jsonResponse({ status: "success", count: rows.length });
}

// Build a row, keeping whatever the caller did not send.
function paddockRow(p, old) {
  var geom = p.geometry;
  var geomText;
  if (geom === undefined || geom === null) {
    geomText = old ? old[5] : "";
  } else {
    geomText = (typeof geom === 'string') ? geom : JSON.stringify(geom);
  }
  return [
    String(p.paddockId).trim(),
    p.name !== undefined && p.name !== null ? String(p.name) : (old ? old[1] : ""),
    p.farmId !== undefined && p.farmId !== null ? String(p.farmId) : (old ? old[2] : ""),
    p.calcArea !== undefined && p.calcArea !== null ? Number(p.calcArea) : (old ? old[3] : 0),
    p.geometryType || (old ? old[4] : "MultiPolygon"),
    geomText
  ];
}

function saveUnits(unitsList) {
  if (!Array.isArray(unitsList)) return errorResponse("Payload units must be array");

  var sheet = getOrCreateSheet("Units");
  sheet.clearContents();

  var headers = ["id", "name", "color", "paddocks"];
  sheet.appendRow(headers);

  var rows = [];
  unitsList.forEach(function(u) {
    if (!u) return;
    rows.push([
      u.id || "",
      u.name || "",
      u.color || "",
      JSON.stringify(u.paddocks || [])
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  return jsonResponse({ status: "success", count: rows.length });
}
