/**
 * Farm Monitor Health & Safety Cloud Sync Script
 * 
 * Instructions:
 * 1. Create/Open a Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any existing code and paste this script.
 * 4. Click Save (disk icon).
 * 5. Click Deploy > New Deployment.
 *    - Select type: Web App.
 *    - Description: H&S Cloud Sync
 *    - Execute as: Me (your email)
 *    - Who has access: Anyone (this is required for Web API requests)
 * 6. Click Deploy, authorize permissions, and copy the "Web app URL".
 * 7. Paste that URL into index.html as the HS_GOOGLE_SCRIPT_URL variable.
 * 
 * Note: This script automatically creates the spreadsheet tabs ("Staff", 
 * "Hazards", "Meetings", "Observations", "Incidents") if they don't exist yet!
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var type = e.parameter.type;
  
  if (type === 'hs_get_all') {
    var response = {
      staff: readFromSheet(ss, "Staff"),
      hazards: readFromSheet(ss, "Hazards"),
      meetings: readFromSheet(ss, "Meetings"),
      interactions: readFromSheet(ss, "Observations"),
      incidents: readFromSheet(ss, "Incidents")
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Invalid request type" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var payload;
  
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Malformed JSON payload" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (payload.type === 'hs_sync_all') {
    if (payload.staff) saveToSheet(ss, "Staff", payload.staff);
    if (payload.hazards) saveToSheet(ss, "Hazards", payload.hazards);
    if (payload.meetings) saveToSheet(ss, "Meetings", payload.meetings);
    if (payload.interactions) saveToSheet(ss, "Observations", payload.interactions);
    if (payload.incidents) saveToSheet(ss, "Incidents", payload.incidents);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid action type" }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Saves an array of objects to a sheet tab dynamically.
 * Creates headers automatically from the keys and writes objects.
 */
function saveToSheet(ss, sheetName, dataArray) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clear();
  
  if (!dataArray || dataArray.length === 0) return;
  
  // Extract all unique object keys as columns
  var keys = [];
  dataArray.forEach(function(item) {
    Object.keys(item).forEach(function(k) {
      if (keys.indexOf(k) === -1) {
        keys.push(k);
      }
    });
  });
  
  // Write Headers
  sheet.appendRow(keys);
  
  // Prepare values grid
  var rows = [];
  dataArray.forEach(function(item) {
    var row = [];
    keys.forEach(function(k) {
      var val = item[k];
      if (typeof val === 'object' && val !== null) {
        row.push(JSON.stringify(val)); // Serialize arrays/sub-objects to JSON
      } else {
        row.push(val === undefined ? "" : val);
      }
    });
    rows.push(row);
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, keys.length).setValues(rows);
  }
}

/**
 * Reads data from a sheet tab dynamically and parses it back to JSON objects.
 */
function readFromSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length <= 1) return []; // Empty or header-only
  
  var headers = values[0];
  var list = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = row[j];
      
      // Parse serialized sub-arrays or objects
      if (typeof val === 'string' && (val.indexOf('[') === 0 || val.indexOf('{') === 0)) {
        try {
          item[key] = JSON.parse(val);
        } catch (err) {
          item[key] = val;
        }
      } else {
        item[key] = val;
      }
    }
    list.push(item);
  }
  return list;
}
