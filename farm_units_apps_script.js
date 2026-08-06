/**
 * Farm Units — additions for the Wainono Farm Monitor Apps Script.
 *
 * Paste the two functions at the bottom into your existing script, and make the
 * two small edits to doGet/doPost shown below. Nothing else changes.
 *
 * Units are stored in their own "Units" sheet rather than riding along in
 * Settings, because saveFeedSettings() calls clearContents() and rewrites only
 * the keys present in its payload — units stored there would be silently wiped
 * by the next feed settings autosave.
 *
 * Sheet layout (created automatically on first save):
 *   id | name | color | paddocks
 * where paddocks is a JSON array of paddock names, e.g. ["W1","W2","A3"].
 */


/* ============================================================
   EDIT 1 — in doGet, add the 'units' branch:

function doGet(e) {
  var type = (e && e.parameter && e.parameter.type) ? e.parameter.type : 'feed_settings';
  if (type === 'breaks') {
    return getBreaks();
  } else if (type === 'units') {          // <-- ADD THESE
    return getUnits();                    // <-- TWO LINES
  } else {
    return getFeedSettings();
  }
}

   EDIT 2 — in doPost, add the 'units' branch alongside the others:

    } else if (type === 'farmwalk_entry' || type === 'farmwalk') {
      return saveFarmwalkEntry(payload);
    } else if (type === 'save_units' || type === 'units') {   // <-- ADD THESE
      return saveUnits(payload.units);                        // <-- TWO LINES
    } else {
      return errorResponse("Unknown payload type: " + type);
    }
   ============================================================ */


/* ================== FARM UNITS ================== */

function getUnits() {
  var sheet = getOrCreateSheet("Units");
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ status: "success", units: [] });

  var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  var units = [];

  data.forEach(function(row) {
    if (!row[0] && !row[1]) return; // skip blank rows

    var paddocks = [];
    var raw = row[3];
    try {
      paddocks = JSON.parse(raw || "[]");
    } catch (e) {
      // Tolerate a hand-typed pipe or comma separated list
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
