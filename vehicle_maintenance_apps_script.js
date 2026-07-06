/**
 * Vehicle Maintenance Google Apps Script
 *
 * Instructions:
 * 1. Create a NEW Google Sheet (separate from H&S).
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this entire script, replacing any existing code.
 * 4. Click Save.
 * 5. Deploy > New Deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web App URL.
 * 7. Paste it into index.html as the VEHICLE_GOOGLE_SCRIPT_URL variable.
 *
 * Sheet tabs created automatically:
 *   "Bikes_Quads", "Cars_Utes", "Tractors", "Maintenance_Logs"
 */

function doGet(e) {
  var type = e.parameter.type;
  if (type === 'vm_get_all') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var vehicles = [];
    vehicles = vehicles.concat(readVehicleSheet(ss, 'Bikes_Quads', 'Bikes/Quads'));
    vehicles = vehicles.concat(readVehicleSheet(ss, 'Cars_Utes', 'Cars/Utes'));
    vehicles = vehicles.concat(readVehicleSheet(ss, 'Tractors', 'Tractors'));
    var logs = readLogsSheet(ss);
    return ContentService.createTextOutput(JSON.stringify({ success: true, vehicles: vehicles, logs: logs }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid type' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Malformed JSON' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (payload.type === 'vm_sync_all') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var vehicles = payload.vehicles || [];
    var logs = payload.logs || [];

    // Save vehicles split by type
    saveVehicleSheet(ss, 'Bikes_Quads', vehicles.filter(function(v) { return v.type === 'Bikes/Quads'; }));
    saveVehicleSheet(ss, 'Cars_Utes', vehicles.filter(function(v) { return v.type === 'Cars/Utes'; }));
    saveVehicleSheet(ss, 'Tractors', vehicles.filter(function(v) { return v.type === 'Tractors'; }));

    // Save maintenance logs
    saveLogsSheet(ss, logs);

    return ContentService.createTextOutput(JSON.stringify({ success: true, status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---- Vehicle Sheet Helpers ---- */

function ensureSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function saveVehicleSheet(ss, sheetName, vehicles) {
  var sheet = ensureSheet(ss, sheetName);
  sheet.clear();
  var headers = ['id', 'name', 'type', 'status', 'oosReason', 'lastService'];
  sheet.appendRow(headers);
  vehicles.forEach(function(v) {
    sheet.appendRow([
      v.id || '',
      v.name || '',
      v.type || '',
      v.status || 'in_service',
      v.oosReason || '',
      v.lastService || ''
    ]);
  });
}

function readVehicleSheet(ss, sheetName, typeOverride) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    headers.forEach(function(h, j) { obj[h] = row[j] || ''; });
    if (!obj.type && typeOverride) obj.type = typeOverride;
    list.push(obj);
  }
  return list;
}

/* ---- Logs Sheet Helpers ---- */

function saveLogsSheet(ss, logs) {
  var sheet = ensureSheet(ss, 'Maintenance_Logs');
  sheet.clear();
  var headers = ['id', 'vehicleId', 'date', 'performedBy', 'checkedPoints', 'notes'];
  sheet.appendRow(headers);
  logs.forEach(function(log) {
    sheet.appendRow([
      log.id || '',
      log.vehicleId || '',
      log.date || '',
      log.performedBy || '',
      JSON.stringify(log.checkedPoints || []),
      log.notes || ''
    ]);
  });
}

function readLogsSheet(ss) {
  var sheet = ss.getSheetByName('Maintenance_Logs');
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    headers.forEach(function(h, j) { obj[h] = row[j] || ''; });
    // Parse checkedPoints back from JSON string
    try { obj.checkedPoints = JSON.parse(obj.checkedPoints); } catch(e) { obj.checkedPoints = []; }
    list.push(obj);
  }
  return list;
}
