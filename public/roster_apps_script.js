/**
 * Roster Google Apps Script Web App
 * 
 * Instructions:
 * 1. Open your Roster Google Sheet (ID: 13WH2T-3uzAcOw4hajLUaGQSNr2MWY1Ocwq2BiAe0dZQ or similar).
 * 2. Go to Extensions > Apps Script.
 * 3. Replace any existing code with this script.
 * 4. Click Save.
 * 5. Deploy as Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web App URL and set it as ROSTER_GOOGLE_SCRIPT_URL in index.html.
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var type = e.parameter.type;
  
  if (type === 'get_roster') {
    var sheets = ss.getSheets();
    var sheetNames = [];
    sheets.forEach(function(s) {
      if (!s.isSheetHidden()) {
        sheetNames.push(s.getName());
      }
    });
    
    // Choose selected sheetName, or fallback to first visible sheet
    var sheetName = e.parameter.sheetName;
    var targetSheet = null;
    if (sheetName) {
      targetSheet = ss.getSheetByName(sheetName);
    }
    if (!targetSheet) {
      // Find first visible sheet
      for (var i = 0; i < sheets.length; i++) {
        if (!sheets[i].isSheetHidden()) {
          targetSheet = sheets[i];
          break;
        }
      }
    }
    
    if (!targetSheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "No visible sheets found." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var activeSheetName = targetSheet.getName();
    var dataRange = targetSheet.getDataRange();
    var values = dataRange.getValues();
    var backgrounds = dataRange.getBackgrounds();
    
    // Filter out hidden columns
    var visibleValues = [];
    var visibleBackgrounds = [];
    
    // Determine which columns are visible
    var numCols = targetSheet.getLastColumn();
    var visibleColIndices = [];
    for (var col = 1; col <= numCols; col++) {
      if (!targetSheet.isColumnHiddenByUser(col)) {
        visibleColIndices.push(col - 1); // 0-based index
      }
    }
    
    // Reconstruct values and backgrounds with only visible columns
    for (var row = 0; row < values.length; row++) {
      var rowVals = [];
      var rowBgs = [];
      visibleColIndices.forEach(function(colIdx) {
        rowVals.push(values[row][colIdx]);
        rowBgs.push(backgrounds[row][colIdx]);
      });
      visibleValues.push(rowVals);
      visibleBackgrounds.push(rowBgs);
    }
    
    var response = {
      success: true,
      sheets: sheetNames,
      currentSheet: activeSheetName,
      values: visibleValues,
      backgrounds: visibleBackgrounds
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Invalid type" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  return ContentService.createTextOutput(JSON.stringify({ error: "Post not supported" }))
    .setMimeType(ContentService.MimeType.JSON);
}
