# Antigravity Context: RiverTerrace Farm Dashboard

This document is intended to provide immediate context for any future Antigravity AI instances picking up this project on a new machine. 

## 🏗 Architecture & Stack
*   **Frontend**: Pure HTML, CSS, and Vanilla JavaScript within single massive `index.html` files. 
*   **Backend**: Serverless. Relies entirely on published Google Sheets CSV endpoints to fetch data, plus `localStorage` (and optionally a Google Apps Script) to save states (like drawn breaks or feed settings).
*   **Mapping**: Uses Leaflet.js rendering GeoJSON (`GEOJSON_URL`) to display paddock boundaries.
*   **Parsing**: Uses PapaParse to read the CSVs dynamically on load.

## 📁 Environments (Directories)
The repository contains three main deployment environments, each managed within its own directory/file structure:
1.  **Production (`/index.html`)**: The stable root deployment.
2.  **Beta (`/beta/index.html`)**: The testing ground for new features before they hit production.
3.  **Version 2 (`/v2/index.html`)**: A recently created isolated environment. 
    *   *Quirk*: The `v2` environment strictly prefixes all its `localStorage` keys with `v2_` to prevent cross-contamination with the root or beta versions.

## 📊 Core Data Sources (Google Sheets CSVs)
Data is driven by several CSVs fetched on load. If a user reports data looks "wrong" (like predicting models overriding manual data), it is almost always a formula issue in their Google Sheet changing the CSV output.
*   **`SATELLITE_CSV_URL`**: Contains NDVI data. Converted to pasture cover using an `ndviToCover` formula.
*   **`MANUAL_MODE_CSV`**: Powers the **Farmwalk** dashboard and the **Feed Planner**. It historically expects exactly 3 columns: `paddock_name`, `latest_date`, `previous_date`. The web app maps column 2 to "Latest" and column 3 to "Previous".
    *   *Recent Issue*: The user's Google Sheet was piping predicted covers (`cal_rt`) into this sheet instead of actual measured covers (`rt manual`). The fix requires them to update the Google Sheet formulas, not the JS code, to preserve chronological flow.
*   **`MANUAL_CSV_URL`**: The "Calibration Sheet" where actual farmwalk measurements are periodically uploaded.
*   **`FEED_SETTINGS_CSV`**: Fallback settings for the feed wedge (residual, cows, intake, etc) if local storage is empty.

## 🐄 Key Features
1.  **Satellite Dashboard**: Uses NDVI to project farm biomass.
2.  **Farmwalk Dashboard**: Uses manual measurements (or `MANUAL_MODE_CSV` data) to track growth between recent dates.
3.  **Predicted Feed Wedge**: A simulation tool combining growth rates, feed intake, and herd data to predict upcoming pasture deficits/surpluses.
4.  **Breaks System**: Users can draw map polygons/lines to segment paddocks. Interaction is bidirectionally synced between the Map and the Sidebar cards.
5.  **External / Crop Paddocks**: System for tracking paddocks outside the main geoJSON farm bounds or specifically marked as "CROP".

## 🤖 Instructions for AI
If you are resuming work on this:
1.  **Always edit across environments**: If you fix a core bug in `v2/index.html`, ensure you port it to `beta/index.html` and `index.html` if applicable.
2.  **Verify Google Sheets Data First**: If the user complains about "wrong values" in the dashboard, fetch the CSV endpoints first using `read_url_content` to verify what the Google Sheet is actually publishing before modifying the parsing logic.
3.  **Local Storage Management**: Be highly aware of localStorage keys. Modifying key schemas will wipe user data unless migrations are handled. Remember `v2` uses the `v2_` prefix.
