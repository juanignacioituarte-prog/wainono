/* ===========================================================================
   WATERMETRICS BOOKMARKLET (source)
   ---------------------------------------------------------------------------
   Run this WHILE LOGGED IN on system.watermetrics.co.nz. It reads the soil
   probe and rain gauge sensors and sends the raw readings to a Google Apps
   Script, which stores them in a sheet. gr.html then reads that sheet and
   uses the real reading for any day it has one, falling back to its own
   modelled soil water for any day it doesn't - see NOTES.md.

   WHY A BOOKMARKLET: a plain fetch() from gr.html cannot read Watermetrics
   at all, even with you logged in - the browser blocks a page on one site
   from reading another site's response (CORS), regardless of the cookie.
   A bookmarklet sidesteps this because it runs INSIDE the Watermetrics page
   itself, so the fetch is same-origin. Same pattern already used in
   Desktop\daily-benchmark for Datamars and Farm Source.

   SETUP (do this once):
   1. Deploy watermetrics_apps_script.js (see that file's own instructions)
      and copy the exec URL it gives you.
   2. Paste that URL in place of PASTE_YOUR_APPS_SCRIPT_URL_HERE below.
   3. Turn the edited file into a bookmarklet - see "TO MAKE THE BOOKMARK"
      at the bottom of this file - and add it to Chrome's bookmarks bar.

   TO RUN IT: open system.watermetrics.co.nz, log in, click the bookmark.
   A green toast means it worked; red means it didn't - the message says why.
   =========================================================================== */
(async function(){
  const SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';

  // Sensor IDs, from the Stateboard's /WaterMonitoring/Charts/{id} numbers.
  const SENSORS = {
    soil: 10725,   // "Wainono Oneil AF" - the soil probe
    rain: 10729    // "Wainono Raingauge"
  };

  // How far back to ask for on every run. Wider than "since last time" on
  // purpose - if a week is missed, the next run should still backfill it,
  // and the Apps Script overwrites by date rather than appending, so asking
  // for more than needed is harmless.
  const DAYS_BACK = 45;

  function toast(msg, isError){
    const d = document.createElement('div');
    d.textContent = msg;
    d.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;' +
      'background:' + (isError ? '#c0392b' : '#219653') + ';color:#fff;' +
      'padding:10px 16px;border-radius:8px;font:14px/1.4 sans-serif;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.35);max-width:320px;';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 7000);
  }

  try {
    if (SCRIPT_URL.indexOf('PASTE_YOUR') === 0)
      throw new Error('the bookmarklet still has the placeholder URL in it - see setup step 2');

    toast('Reading Watermetrics…');
    const since = Date.now() - DAYS_BACK * 86400000;
    const sensors = {};

    for (const key of Object.keys(SENSORS)){
      const id = SENSORS[key];
      const res = await fetch('/WaterMonitoring/DailyData/' + id, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(key + ' sensor ' + id + ' answered HTTP ' + res.status +
        ' - are you logged in?');
      const j = await res.json();
      // Sent exactly as Watermetrics names each series - no guessing here
      // about what the names are. gr.html does the matching on the read
      // side, where it is easy to fix without redeploying this script.
      sensors[key] = (j.series || []).map(s => ({
        name: s.name,
        data: (s.data || []).filter(p => p && p.x >= since).map(p => ({ x: p.x, y: p.y }))
      }));
    }

    const total = Object.values(sensors).reduce((a, s) => a + s.reduce((b, x) => b + x.data.length, 0), 0);
    if (total === 0) throw new Error('got a reply but no readings in the last ' + DAYS_BACK + ' days - check the sensor IDs');

    const resp = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ type: 'watermetrics_sync', sentAt: Date.now(), sensors })
    });
    const out = await resp.json().catch(() => null);
    if (!out || out.status !== 'success') throw new Error((out && out.message) || 'the sheet did not confirm it saved');

    toast('Synced ' + total + ' readings to the sheet ✓');
  } catch(e){
    toast('Watermetrics sync failed: ' + e.message, true);
    console.error('[watermetrics-bookmarklet]', e);
  }
})();

/* ===========================================================================
   TO MAKE THE BOOKMARK

   1. In Chrome: right-click the bookmarks bar -> Add page... (or Add bookmark).
   2. Name it something like "Sync Watermetrics".
   3. For the URL, paste the word "javascript:" followed by this whole file's
      code with the SCRIPT_URL filled in, all as ONE LINE (Chrome accepts a
      long javascript: URL fine - line breaks are the only thing that breaks
      it, so run it through a "minify" step or just delete the line breaks).
   4. Save. Click it from the Watermetrics tab to run it.
   =========================================================================== */
