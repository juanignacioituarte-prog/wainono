/**
 * WATERMETRICS SYNC — Apps Script
 * ---------------------------------------------------------------------------
 * Receives soil probe + rain gauge readings POSTed by watermetrics_bookmarklet.js
 * (run in your own browser, while logged into Watermetrics) and stores them
 * in a "Watermetrics" tab, one row per (date, series). gr.html reads that
 * tab as a published CSV and uses the real reading for any day it has one,
 * falling back to its own modelled soil water otherwise.
 *
 * WHY LONG FORMAT (date, series, value) INSTEAD OF ONE COLUMN PER SERIES:
 * nobody has actually seen what Watermetrics calls each series yet - the
 * spec's names ("Soil Moisture Sensor Upper (%)" etc.) are read off the
 * Stateboard display, which may not match the JSON's own `series[].name`
 * exactly. Storing whatever name comes back, verbatim, means a wrong guess
 * here never loses data - it just means gr.html's matching (which is easy
 * for me to fix without you redeploying anything) needs a small tweak.
 * After the first real sync, open the sheet and send me what the series
 * column actually says.
 *
 * SETUP (one-off):
 * 1. Create a new Google Sheet (or reuse one you already have — a fresh one
 *    is simplest, this does not need to be the farm dashboard's own sheet).
 * 2. Extensions > Apps Script. Delete the sample code, paste this whole file.
 * 3. Deploy > New deployment > type "Web app".
 *      Execute as:      Me
 *      Who has access:  Anyone
 *    Deploy, authorise it, and copy the URL it gives you (ends in /exec).
 * 4. Paste that URL into watermetrics_bookmarklet.js where it says
 *    PASTE_YOUR_APPS_SCRIPT_URL_HERE, then rebuild the bookmarklet.
 * 5. Run the bookmarklet once from the Watermetrics site to test it works,
 *    then check the sheet — a "Watermetrics" tab should appear with rows.
 * 6. In the sheet: File > Share > Publish to web, pick the Watermetrics
 *    tab, format CSV, Publish. Send me that CSV link — that is what
 *    gr.html reads.
 */

const SHEET_NAME = 'Watermetrics';
const HEADERS = ['date', 'sensor_id', 'series', 'value'];

function doPost(e){
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.type !== 'watermetrics_sync') throw new Error('unknown type: ' + body.type);

    const sheet = getOrCreateSheet_();
    const existing = readExisting_(sheet);   // "date|sensor|series" -> row index (1-based, into `rows`)
    const rows = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues()
      : [];

    let updated = 0, added = 0;
    Object.keys(body.sensors || {}).forEach(sensorKey => {
      (body.sensors[sensorKey] || []).forEach(series => {
        (series.data || []).forEach(point => {
          if (point == null || point.x == null || point.y == null) return;
          const dateKey = Utilities.formatDate(new Date(point.x), Session.getScriptTimeZone(), 'yyyy-MM-dd');
          const key = dateKey + '|' + sensorKey + '|' + series.name;
          if (existing[key] != null){
            rows[existing[key]][3] = point.y;
            updated++;
          } else {
            rows.push([dateKey, sensorKey, series.name, point.y]);
            existing[key] = rows.length - 1;
            added++;
          }
        });
      });
    });

    // Rewrite the whole body. Simpler and safer than patching individual
    // cells, and this sheet is small (a handful of series x a season of
    // days), so the cost of a full rewrite is not worth avoiding.
    rows.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), HEADERS.length).clearContent();
    if (rows.length) sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);

    return json_({ status: 'success', added, updated, totalRows: rows.length });
  } catch (err){
    return json_({ status: 'error', message: String(err) });
  }
}

// A GET with no params confirms the deployment is alive, so hitting the
// /exec URL in a browser tab shows something other than a blank error page.
function doGet(e){
  return json_({ status: 'success', message: 'Watermetrics sync endpoint is up. POST to sync data.' });
}

function getOrCreateSheet_(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh){
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readExisting_(sheet){
  const map = {};
  if (sheet.getLastRow() <= 1) return map;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  values.forEach((row, i) => {
    if (!row[0]) return;
    const dateKey = row[0] instanceof Date
      ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[0]);
    map[dateKey + '|' + row[1] + '|' + row[2]] = i;
  });
  return map;
}

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
