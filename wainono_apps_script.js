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

function getFeedSettings() {
  var sheet = getOrCreateSheet("Settings");
  var lastRow = sheet.getLastRow();
  var settings = {};
  if (lastRow > 0) {
    var data = sheet.getRange(1, 1, lastRow, 2).getValues();
    data.forEach(function(row) {
      var key = row[0]; var val = row[1];
      if (['herdCows', 'cropYields', 'cropHerds', 'customHerds', 'manualBreaks', 'customPaddocks', 'silage'].indexOf(key) !== -1) {
        try { settings[key] = JSON.parse(val || "{}"); } catch (e) { settings[key] = {}; }
      } else { settings[key] = val; }
    });
  }
  return jsonResponse(settings);
}

function saveFeedSettings(payload) {
  var sheet = getOrCreateSheet("Settings");
  sheet.clearContents();
  var keysToIgnore = ['type', 'breaks'];
  var rows = [];
  Object.keys(payload).forEach(function(key) {
    if (keysToIgnore.indexOf(key) !== -1) return;
    var val = payload[key];
    if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
    rows.push([key, val]);
  });
  if (rows.length > 0) sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  return jsonResponse({ status: "success" });
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
