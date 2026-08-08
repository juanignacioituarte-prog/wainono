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

function saveFeedSettings(payload) {
  var sheet = getOrCreateSheet("Settings");
  sheet.clearContents();
  var keysToIgnore = ['type', 'breaks'];

  if (payload.customHerds) payload.customHerds = normalizeHerds(payload.customHerds);

  var rows = [];
  Object.keys(payload).forEach(function(key) {
    if (keysToIgnore.indexOf(key) !== -1) return;
    var val = payload[key];
    if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
    rows.push([key, val]);
  });
  if (rows.length > 0) sheet.getRange(1, 1, rows.length, 2).setValues(rows);

  writeHerdSheet(payload.customHerds, payload.herdCows);

  return jsonResponse({ status: "success" });
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
