# Wainono farm app - handover notes

Everything needed to carry on working on this app from another computer.
Written 2 October 2026, updated 12 October 2026. App version: **v1.1.61**,
service worker cache `wn-farm-v1.1.75`, Apps Script `2026-10-15-b`.

The index of all projects and the rules is `G:\My Drive\Apps\README.md`
(`G:\Mi unidad\Apps\README.md` on the Zenbook).

**Two computers work on this repo: the Zenbook and the TUF A16 (`TUF16`).**
Start every session with `git pull` in `C:\dev\onefarm`; end it with a commit
(files by name) and a push. A push from one computer does not reach the other
until it pulls. The TUF16 has no GitHub login yet, so push from the Zenbook if
a push there fails. Every rule Juani gives goes into this file in the same
commit as the code.

---

## 1. Where things live

| What | Where |
|---|---|
| Repo | `https://github.com/juanignacioituarte-prog/wainono.git` (remote `origin`, branch `main`) |
| Local folder | `C:\dev\onefarm` on each computer. Never in Google Drive: Drive damaged the git records once (3 October 2026) |
| Live app | https://juanignacioituarte-prog.github.io/wainono/index.html |
| Hosting | GitHub Pages, straight off `main`. A push is live in 1-3 minutes |
| Second remote | `onefarm` - a different project, do not push there by accident |

### Files that matter

| File | What it is |
|---|---|
| `index.html` | **The whole app.** One file: HTML, CSS and all the JavaScript. This is the only file to edit for app changes |
| `sw.js` | Service worker. Network first. `CACHE_NAME` must be bumped on every release |
| `wainono_apps_script.js` | The Apps Script for the **feed sync** spreadsheet. Sent to Google with clasp (see section 4) |
| `health_safety_apps_script.js` | Script for the Health & Safety sheet (separate spreadsheet) |
| `vehicle_maintenance_apps_script.js` | Script for the vehicle sheet (separate spreadsheet) |
| `roster_apps_script.js` | Script for the roster sheet |
| `treatment.html`, `TRtreatment.html` | Cow treatment app (own project folder: `G:\My Drive\Apps\cow-treatment`) |
| `shed.html` | Shed cow display log viewer (own project: `G:\My Drive\Apps\shed-cow-display`) |
| `gr.html` | Pasture growth prediction page (own project: `G:\My Drive\Apps\pasture-growth`) |
| `index viejo.html`, `test.html` | Old copies. **Ignore them.** Only `index.html` is live |

---

## 2. House rules (learned the hard way)

1. **Only `index.html` on `main` is the app.** The other HTML copies are stale.
2. **Never `git add -A`.** `.env` and `.env.local` sit untracked in the folder
   and must stay out of git. Always stage files by name:
   `git add index.html sw.js`.
3. **Bump the version on every release**: the `v1.1.xx` string in `index.html`
   (it appears twice - use `sed -i "s/v1\.1\.11/v1.1.12/g"`) and `CACHE_NAME`
   in `sw.js`. Without the bump, phones keep the old file.
4. **Never test against the live sheet.** `index.html` has a guard: on
   `file://` every POST to `script.google.com` is refused. For local testing,
   copy `index.html` somewhere else, replace
   `const IS_LOCAL_COPY = location.protocol === 'file:';` with
   `const IS_LOCAL_COPY = true;`, and serve that copy (see section 6).
5. **Write simple English** in the app text and in replies. Short sentences.
6. Commit messages: plain English, say what changed and why.

---

## 3. The spreadsheets

The app talks to four separate Google spreadsheets, each with its own Apps
Script web app URL (all of them are in `index.html` near line 2544).

| Spreadsheet | Script URL constant | Used for |
|---|---|---|
| **feed sync** (the main one) | `GOOGLE_SCRIPT_URL` | farmwalks, breaks, paddocks, units, herds, maintenance |
| Health & Safety | `HS_GOOGLE_SCRIPT_URL` | staff, hazards, meetings, incidents |
| Roster | `ROSTER_GOOGLE_SCRIPT_URL` | roster |
| Vehicles | `VEHICLE_GOOGLE_SCRIPT_URL` | vehicles and service logs |

### Tabs in "feed sync"

| Tab | Columns / meaning |
|---|---|
| `Settings` | feed settings, one row per setting |
| `Feed Settings` | older feed settings row |
| `Farmwalks` | `Date | paddock | cover | reason`. **The order of the rows is the walking order** |
| `Paddock Boundaries` | `paddockId | name | farmId | calcArea | geometryType | geometryJson` |
| `walk order` | `paddock`, one per row, the farmwalk route |
| `breaks` (lower case) | every break ever drawn |
| `out` | `paddock | status` - paddocks out of rotation |
| `Units` | farm units (Te Ruahete, Wainono) with their paddocks as JSON |
| `Herds` / `HerdLog` | herd numbers and every change to them |
| `ndvi` | NDVI tile URLs, filled by the sync repo |
| `auth` | who may use the app |
| `maintenance` | one row per maintenance job (see section 5) |
| `maintenance categories` | `category | subcategory` |
| `silage` | one row per silage location (see section 5) |
| `silage products` | `product`, one per row |
| `silage log` | every change of a silage number, append only |

### Reading data: two paths

- **Published CSV** (fast, read only): `MANUAL_MODE_CSV`, `AUTH_CSV_URL` etc.
  These lag **several minutes** behind the sheet. If a change does not show,
  that is usually why - wait, do not "fix" it.
- **Apps Script GET** (live): `?type=...`. Use this to check the truth.

### Apps Script endpoints (feed sync)

GET `?type=`: `breaks`, `units`, `out`, `herd_log`, `paddocks`, `tabs`,
`version`, `walk_order`, `maintenance`, `silage`, `silage_log`, and with no
type, the feed settings.

POST `{type: ...}`: `breaks`, `feed_settings`, `farmwalk_batch`,
`update_paddock_history`, `farmwalk_entry`, `farmwalk_load`, `save_units`,
`save_out`, `herd_log`, `herd_cows`, `paddocks`, `rename_paddock`,
`save_walk_order`, `save_maintenance_job`, `delete_maintenance_job`,
`save_maintenance_categories`, `save_silage_location`, `silage_stock`,
`delete_silage_location`, `save_silage_products`.

`?type=tabs` lists every tab with its live row count. `?type=version` says
which script version is really deployed. Both are the quickest way to check
whether a change landed.

---

## 4. Deploying the Apps Script

**Automatic, with clasp (since 15 Oct 2026).** From Git Bash, after the
change is committed in `C:\dev\onefarm`:

```bash
sh /c/dev/wainono-apps-script/deploy.sh
```

It copies `C:\dev\onefarm\wainono_apps_script.js` to
`C:\dev\wainono-apps-script\Code.js`, runs `clasp push`, then `clasp deploy`
on the SAME deployment the app calls (`AKfycbzRkk...`, so the URL never
changes), and waits until `?type=version` shows the new `SCRIPT_VERSION`.
Script ID `1VXavicL6jY7dY-bsUfoSwrdU1VJZI8Q53KqxgYH95J-2l37xuoU-1EIm`.
`C:\dev\wainono-apps-script` is NOT in the public repo (`.clasp.json`,
`deploy.sh`). clasp 3.4.1 is installed with npm (`npm install -g
@google/clasp`); the Google login is in `~/.clasprc.json`, made by Juani with
`clasp.cmd login`, and it can reach all of Juani's Apps Scripts: never copy
it anywhere. On a new PC: install clasp, Juani runs `clasp.cmd login`, then
`clasp.cmd clone <script ID>` into `C:\dev\wainono-apps-script` and copy
`deploy.sh` (it is short: see the Zenbook/TUF16 copy). The Apps Script API
must be on at https://script.google.com/home/usersettings (it is).

By hand (old way, still works):

1. Open the **feed sync** spreadsheet - Extensions - Apps Script
2. Select all, paste `wainono_apps_script.js` over it, Ctrl+S
3. Deploy - Manage deployments - **pencil** - Version: **New version** - Deploy
   (use the pencil, not "New deployment", so the URL stays the same)
4. Check: `?type=version` must show the `SCRIPT_VERSION` at the top of the file

Bump `SCRIPT_VERSION` (format `YYYY-MM-DD-a`) whenever the file changes, so
"did the paste take?" has an answer.

A POST from a command line needs node, not curl: curl loses the body on the
302 redirect. There is a helper in the scratchpad (`post.js`) that does:

```js
fetch(URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' },
             body: JSON.stringify(payload), redirect: 'follow' })
```

---

## 5. What the app does (sections)

Top buttons: **FARMWALK**, **FEED**, **BREAKS**. The ⋮ menu holds Health &
Safety, Roster, Weather, Vehicle Maintenance, **Farm Maintenance**,
**Silage**, **Print Map**, Farm Configuration (admin only), Audio & Map Settings, Weekly Area
Report.

The app **opens on BREAKS with the plain satellite picture**.

### The FARMWALK bar (v1.1.36, Juani 13 Oct 2026)
Four rows, so real and estimated covers are not mixed up:
- **VIEW** MEASURED / ESTIMATED / SATELLITE: one switch, the view in use is
  lit (`setCoverView`; modes `manual`, `estimate`, `satellite`). ESTIMATED is
  what was called EST. FW.
- **ADD** + Farmwalk (works from any view: goes to MEASURED and starts the
  walk, `farmwalkButton`) and **+ PARTIAL** (the partial walk screen, mode
  `check`, which was called CHECK). The walk date, SAVE FARMWALK and the
  progress appear in this row while a walk is entered.
- **TOOLS** PLAN, HISTORY, GROWTH.
- **FILTER** the unit chips and BREAKS ON/OFF.

### FARMWALK
- Cards per paddock: latest cover, previous, growth, area.
- `+ Farmwalk` starts entry mode. Cards follow the **walk order**, not cover.
- What is typed is kept on the phone (`wn_farmwalk_draft`) **with its date**.
  A draft for another day is never shown as today's walk.
- SAVE FARMWALK sends `farmwalk_load` with `mode:'merge'` - it rewrites only
  the paddocks that phone walked, so two people can walk the same day.
- Rows go into the sheet in walking order.
- HISTORY: every past walk, continue / edit / delete.
- Unit chips (ALL / Te Ruahete / Wainono) filter the list, the map and the
  averages. They work in FARMWALK and in SATELLITE.
- SATELLITE sits inside this bar (next to PLAN and HISTORY).
- BREAKS ON/OFF button shows or hides the breaks on these two screens.

### Where the cover on a map label comes from (v1.1.22, Juani 12 Oct 2026)
- FARMWALK, FEED and PLAN: the farmwalk (`manualModeData`). The label shows the
  measured cover and the walk date ("2586 kgDM · walk 30 Sept").
- **BREAKS and every other screen except SATELLITE: estimated cover = the
  paddock's last walk + the farm average growth of every day since, from
  measured weather.** The label says "≈ 3449 kgDM estimated / walk 30 Sept:
  2586 + est. growth 863 (12 days)". A paddock with no walk above 0 says "not
  walked yet".
- **The newest real cover wins** (Juani, 13 Oct 2026, v1.1.31): the start is
  the paddock's newest real cover, from a full farmwalk OR a partial walk
  (`grLastWalk` reads `FARMWALK_HISTORY` and `PARTIAL_WALKS`; on the same day
  the full walk is kept). Labels say "walk 30 Sept" or "partial walk 13 Oct".
  The break cards (EST. KG/COW) leave out group C partial rows: those measure
  only a grazed strip. FARMWALK itself never changes.
- **Breaks since the walk (Juani, 12 Oct 2026):** if breaks were drawn in the
  paddock after its last walk, it was grazed. **The day after the LAST break
  was drawn it is the residual (`GR_RESIDUAL`), and the est. growth counts
  from the day after that** (Juani, 12 Oct 2026, v1.1.25). On the break day and the
  next day it shows 1500. Label: "last break 6 Oct · 1500 on 7 Oct + est.
  growth 399 (5 days) / walk 30 Sept: 2586 · 3 breaks since". The COVER MAP
  uses the same number. On 12 Oct: 47 paddocks from a break, 60 from a walk.
- **Average growth of a partial walk** (v1.1.44, Juani 13 Oct 2026,
  `partialGrowth`): A and B paddocks, at least 3 days since their start;
  actual per day = (measured - start) / days, estimated per day = (estimate -
  start) / days, both weighted by paddock area. Shown live at the top of
  + PARTIAL (today's corrected estimate) and per date in PARTIAL WALKS (the
  estimate saved with the rows). On 13 Oct: actual 69 / estimated 75 (+9%),
  14 paddocks.
- A saved C row more than **500 above its estimate is not a residual**
  (v1.1.43, `partialIsResidual`): left out of the residual median and the C
  averages, marked "not a residual" in PARTIAL WALKS. (Paddock 39 on 13 Oct
  was saved as C at 2964 while two breaks drawn by mistake were still on the
  map; re-saving it in + PARTIAL now replaces the row as group A.)
- **The residual** (Juani, 13 Oct 2026, v1.1.30) is the **median of the group
  C checks** in the `partial walk` tab from the last 30 days, once there are
  at least 3 (`grUpdateResidual`); until then **1500**. The tab is read when
  the app opens (kept on the phone as `partial_walks_cache`), when CHECK
  opens and after a save. Labels and CHECK say which residual is used and
  where it came from ("1700: median of 3 C checks, last 30 days").
- The break cards' EST. KG/COW use **walk + growth only** (`ignoreBreaks`), on
  the day the break was drawn: a new break is a strip not grazed yet, and the
  1500 rule would give about 0 kg/cow for every second break in a paddock.
- BREAKS with **COVER MAP** on colours each paddock by its estimated cover
  (`getCoverColor`, same scale as FARMWALK); out paddocks keep their reason
  colour, paddocks with no walk stay clear (v1.1.23).
- **📈 EST. FW** in the FARMWALK bar (v1.1.26, Juani 12 Oct 2026): the paddock
  ranking on the estimated cover, like FARMWALK and SATELLITE, with all the
  filters (unit chips, search, sort COVER / GROWTH, BREAKS ON/OFF) and the map
  in estimated-cover colours. Mode `estimate`; `buildEstimatedPaddockData()`
  shapes each paddock like a farmwalk row (cover = estimate, dated today,
  "previous" = what it started from: the walk, or 1500 after a break). The
  farm average at the top is the estimated average ("estimated today").
  Entering a walk is hidden there. GROWTH sort uses the average growth since
  the start, which is about the same for every paddock (one farm figure).
  A stats box at the top (v1.1.31, `buildEstimateStatsBox`): est. average
  cover, growth today and the 7-day average, **pre-grazing = average of the
  top 5 paddocks** (newest real or estimated cover), the residual in use,
  feed above the residual (t DM), and **📋 PARTIAL WALKS**: every partial walk
  by date, measured against the estimate, with the group averages.
  **📈 ACTUAL vs ESTIMATED** (v1.1.32, Juani 13 Oct 2026,
  `growthCompareIntervals`): pairs of real covers of one paddock (full or
  partial walk, group C left out), 5-35 days apart, no break drawn between,
  not a fall of more than 100, ending in the last 60 days. Actual growth per
  day against the app's growth over the same days; one line per pair of
  dates and a total. On 13 Oct: 186 pairs, actual 25 / estimated 28 per day.
  **Regrowth after a grazing is counted too** (v1.1.33, Juani 13 Oct 2026):
  from the residual in use (median of the recent C checks, 1500 until 3) on
  the day after the last break before a real cover, to that cover; 5-35
  days; only when grazed since the cover before. Shown as its own total and
  one line per end date. On 13 Oct: 55 pairs, actual 35 / estimated 30.
  Last column **% diff** = (estimated − actual) ÷ actual, + = estimate too
  high, green under 10% (v1.1.37); also in the per-paddock list.
  Walk-to-walk pairs also tuned the month factors, so the partial walks are
  the fairer test.
- **PLAN wedge: MEASURED / ESTIMATED** switch (v1.1.31, `wedgeSource`, kept in
  `plan_wedge_source`). ESTIMATED draws today's estimated covers (blue bars);
  the demand line and targets are the same as MEASURED. **The Rotation
  Parameters follow the switch** (v1.1.34): on ESTIMATED the farm average
  cover is the estimated one and the farm average growth is the model's
  7-day average from measured weather (in `updateFarmStats`, `planEstimated`).
  The pre-grazing target does not change: it comes from cows, intake, round
  and the residual target, not from the covers.
- **PLAN inputs come from the data** (v1.1.35, Juani 13 Oct 2026; MEASURED and
  ESTIMATED alike; `applyAutoFeedInputs`, run at the start of
  `calculateFeedLogic`). The boxes are grey, read only, with a note of where
  each number came from:
  - Post grazing residual = the residual in use (median of the recent C
    checks, 1500 until 3).
  - Rotation length = feed area / (break area of the last N days / N); N = 4,
    changed in the box under it (`feed_round_days`). Crop breaks left out; a
    PLAN unit counts only its own herds' breaks. With no breaks the old value
    stays.
  - Actual pre-grazing cover = average of the top 5 paddocks in rotation,
    measured or estimated as the wedge shows.
  - Only Avg Daily Intake and In-Shed / Crop Supplement are typed.
- **🎯 CHECK** in the FARMWALK bar (v1.1.27, Juani 13 Oct 2026): a partial
  farmwalk to test the estimate. Groups, from the walks BEFORE today
  (`checkInfo`): **A** not grazed since its last walk, walked 7+ days ago
  (tests growth); **B** last break 7+ days ago (tests residual + growth); **C**
  **24 to 48 hours after the last break** (the 24-hour rule: a break is
  grazed out 24 hours after it is drawn, v1.1.39; the window was cut from 72
  to 48 hours in v1.1.40 so regrowth does not push the residual up, Juani 13
  Oct 2026); tests the residual, measured inside the grazed strip. Always shown in the order
  A, B, C (Juani). **Breaks under 24 hours old are left out when the group
  is chosen** (v1.1.41, `breaksUntil`): by the 24-hour rule they are not
  grazed out yet, so a paddock whose first break since its walk is today is
  still **A** ("Break drawn in the last 24 h: measure the part not grazed
  yet"); one with an older break 24-48 h ago is C. Grey: out, never walked,
  walked under 7 days ago, or a break 2-6 days ago.
  **OTHER** (v1.1.40, Juani): the grey paddocks **in rotation** can be measured
  too, under the OTHER chip (each shows its reason; a tap on it on the map
  opens its box; ALL also shows any that has a cover typed). Saved in the
  partial walk as group **X**; not in the A/B/C averages nor the residual
  median, but as a real cover it does reset that paddock's estimate.
  Out-of-rotation paddocks are left out of + PARTIAL (Juani).
  **High cover moves to A** (v1.1.39, Juani): breaks are sometimes drawn the
  day before the cows go in, and a "cows go in" date was rejected (people
  forget it). So when a cover is typed for a B or C paddock, it is compared
  with the grazed estimate and the not-grazed one (last real cover + growth,
  breaks ignored); if it is closer to not-grazed, the paddock becomes A, is
  compared with the not-grazed estimate and saved as A (so the residual median
  is not spoilt). Not decided when the two estimates are under 300 apart
  (`CHECK_RECLASS_MIN`). The map
  shows the groups (A green, B blue, C orange) and the breaks. A tap on a
  paddock goes to its card (lit up, box open); a tap on a card zooms the map
  to the paddock and shows its label (v1.1.28). Each typed cover shows
  measured − estimate and per day; the top box averages each group.
  **Saved in its own sheet tab, `partial walk`, never in Farmwalks** (Juani,
  13 Oct 2026, v1.1.29): `save_partial_walk` / `?type=partial_walk`. Columns
  date | paddock | cover | group | estimate | start | start date | days | user
  | saved at; one row per paddock per date (a second save replaces it).
  **The last full farmwalk is never modified**; FARMWALK, its average and its
  UNMEASURED marks do not change, and EST. FW / BREAKS keep starting from the
  full walk. (v1.1.27-28 saved into Farmwalks; nothing was ever saved that
  way on the live sheet - checked 13 Oct, newest walk 30 Sept, 106 rows.)
  Typed covers are kept on the phone until saved (`check_walk_draft`). On 13 Oct: A 48, C 9, B 20, grey 52.
- SATELLITE keeps the satellite cover ("≈ ... estimated · satellite <date>").

### Growth from measured weather (v1.1.22)
- The model is a **copy of `Apps\pasture-growth\gr.html`'s** (MODEL constants,
  GDD smoothing, FAO-56 moisture factor, water balance, radiation, month
  calibration from farmwalk pairs). **If gr.html's model changes, change the
  copy in `index.html` too** (`GR_MODEL`, `grBuild`).
- Farm average only (Juani, 12 Oct 2026): irrigated and dryland runs blended by
  area, using gr.html's per-paddock setting `gr_irrigation_class` (same
  website, same browser storage). No NDVI split, so the calibration is the
  flat one: on 12 Oct October = 1.89 from 1,042 walk intervals, the same as
  gr.html's flat figure. gr.html uses its NDVI calibration (1.78) by default,
  so its farm number is about 6% lower.
- Weather: Open-Meteo archive (measured) for 2 years up to 2 days ago, and the
  forecast endpoint's past days for yesterday and today. Read once a day,
  kept in `growth_weather_v1`. The walks: `FARMWALK_HISTORY` (every walk, from
  the same CSV as FARMWALK) plus `fairlie_history.csv` (last season).
- **Growth correction from the LAST walk** (v1.1.48, Juani 13 Oct 2026,
  `grApplyCorrection`; before v1.1.48 it was the last 30 days of pairs):
  the newest walk date (full or partial) with 5 or more pairs sets factor = actual growth / model growth on those pairs,
  weighted by days. Pairs = not grazed between two real covers AND (v1.1.49,
  Juani: "count B, we need them if we stop doing full walks") grazed then
  measured, starting from the residual in use. It stays in use until the next walk or partial walk with
  5+ pairs ("the model was 8% high on 13 Oct, so ×0.93 until the next
  walk"). Kept within ×0.5-×1.5. `GR.daily` = model × factor (used by every
  estimate); `GR.dailyRaw` = the model's own numbers (used by ACTUAL vs
  ESTIMATED, so that table still tests the model). Redone when walks, partial
  walks or breaks load, and after a partial walk is saved. Shown in the
  ESTIMATED stats box, the comparison and the GROWTH page bar. On 13 Oct:
  ×0.93 from 125 pairs (mostly September full walks); the 12 partial-walk
  pairs alone said actual 63 against model 75.
- `estimateCover(name, date)`, `growthOn(date)`, `grLastWalk(name, date)`.
  (The app already had a `lastWalkBefore` for the cards; do not reuse that name.)
- On 12 Oct the model gave 72-100 kgDM/ha/day for early October. That is the
  model's number (gr.html agrees); whether it is too high is a question for
  the pasture growth project.
- **🌱 GROWTH** in the FARMWALK bar, next to SATELLITE, opens `gr.html` inside
  the app with a BACK bar and today's farm average.

### Farm average
Area weighted average of the paddocks walked in the latest walk:
`sum(cover x area) / sum(area)`. Nothing else goes into it - no crop break
area, no device setting. The line under it says which walk, how many paddocks
and how many hectares, so two devices can be compared.

### Farm Configuration (admin)
- **Farm units**: which paddocks belong to which unit.
- **Paddocks out**: the `out` tab. This is the one list of paddocks out of
  rotation (v1.1.15).
  - "Take paddocks out": pick **one or more** paddocks in the list or by
    tapping them on the map, then tap the reason (CROP / SILAGE / OTHER).
    All the picked paddocks go out together, in one save (v1.1.16, Juani
    12 Oct 2026). A second tap takes a paddock off the pick; picked ones are
    yellow on the map and shown as chips with x and CLEAR (`outPicked`,
    `takePickedPaddocksOut`). A tap on a paddock that is already out only
    shows its line in the list (`outFocusName`). The box shows how many
    paddocks are picked and their hectares (v1.1.17).
  - **Reasons are managed in the app** (v1.1.17, Juani 12 Oct 2026): the
    "Reasons" box under it adds a reason with a colour, changes a colour, or
    deletes a reason. Kept in the sheet tab `out reasons` (`reason | color`),
    saved whole with `save_out_reasons`. The list reaches every phone with the
    feed settings read at start-up (`outReasons`) and with `?type=out`
    (`reasons`); the phone keeps a copy in `out_reasons`. Until the tab has a
    list the app uses Crop, Silage, Other. **Other is always kept**: it is the
    fallback for "OUT" and empty. A reason a phone does not know yet keeps its
    own name, in the colour of Other. A reason that paddocks still use cannot
    be deleted. The out tab stores the reason in upper case (`REGRASS`).
    `OUT_STATUSES` is now a `let`, built by `normalizeOutReasons`.
  - Each reason has its own colour on every map, the cards, the map key and
    the list. On every map (FARMWALK, BREAKS and the rest) the label of a
    paddock that is out has a line "OUT: <reason>" in that colour (v1.1.19,
    Juani 12 Oct 2026), from the out tab or an old cover of 0.
  - In BREAKS a paddock that is out is filled in its reason colour (opacity
    0.45), so no break is drawn in it by mistake (v1.1.20, Juani 12 Oct
    2026). Paddocks in rotation stay clear, as before. Defaults: Crop `#d35400`, Silage `#8e44ad`, Other `#e74c3c`.
    Old reasons such as `OUT` or lower case ones count as Other.
  - A paddock on the tab is out in FARMWALK too, whatever its last cover
    (`applyOutTabToWalk`). Before v1.1.15 the tab only counted for paddocks
    with no covers.
  - "Take out of rotation" in the farmwalk now writes to the tab. It no longer
    writes a cover of 0. BRING BACK writes the cover and takes it off the tab.
  - **A cover of 0 is never saved** (Juani, 12 Oct 2026). Typing 0 in a
    farmwalk box clears it and opens "Take out of rotation". SAVE FARMWALK,
    BRING BACK, the walk HISTORY editor and "Update Covers" all refuse 0.
  - Old paddocks out by a cover of 0 in the farmwalk are shown in the list
    with a note. **BACK IN** on one of them asks for a cover and changes the 0
    in its last farmwalk (`restoreZeroCover`, sent as
    `update_paddock_history`). It never adds a cover for today: that would
    look like a walk of one paddock and move the farm average.
  - **BRING BACK in the farmwalk** only opens a box for the cover on the day
    of the walk being entered (Juani, 12 Oct 2026). It does not touch old
    walks.
  - Changing a 0 on a day when only that paddock was walked (Q3 on 26 Sept)
    makes that day count as a walk for growth.
  - `save_out` writes the whole tab, so every change first reads the live
    tab (`?type=out`), makes the change on it, then saves (`changeOutTab`).
- **Paddocks**: rename, merge, split, reshape, add, delete boundaries.
  A merge moves the covers of the parts onto the merged paddock (averaged by
  area). A split gives both halves the parent's covers. A rename moves the
  history, the breaks, the units, the out list and the walk order.
- **Walk order**: the farmwalk route. Arrows, type a place, tap the paddocks
  on the map in order, or copy the order of a past walk.

### Farm Maintenance (⋮ menu)
Jobs on a map: paddock boundaries and hazards are shown, **never breaks**.
- Job buttons are the **categories**; tapping one shows its **sub categories**.
  Every sub category is a button. `＋` adds a category or a sub category and
  saves it to the sheet for everybody.
- POINT / LINE switch: the same buttons drop a pin or draw a line.
- Tap a button, then tap the map. The job is saved at once with your name.
- Open jobs stay on the map. ✓ FIXED moves a job to HISTORY with who fixed it,
  when and what was done. REOPEN puts it back.
- Pins can be dragged to move them. Line jobs have REDRAW.
- Filters by category and sub category, with a SHOW ALL button.
- Guards: a map click is only taken from inside the map, and not within half a
  second of tapping a button (a ghost click used to drop jobs at random).

Job row in the `maintenance` tab:
`id | status | category | sub | title | notes | type | geometry | createdBy |
createdAt | fixedBy | fixedAt | fixNotes`
`status` is `open` or `fixed`. `geometry` is JSON: `{lat,lng}` for a point, a
list of them for a line. One row per job, written by id, so two phones cannot
clash.

### Silage (⋮ menu)
The stock of silage on a map. Paddock boundaries are shown, **never breaks**.
It has nothing to do with Farm Maintenance; it only drops pins the same way.
- A pin is one place. It is **bales** (counted in bales) or a **stack**
  (counted in tons), with a product, a %DM and notes. One pin = one product.
- `＋ NEW LOCATION`, then tap the map. The number is on the pin.
- `＋ ADD`, `− TAKE` and `SET NUMBER` change the number. Each has a note.
- Bales also have an **average kg DM per bale**. Tons of DM: bales x kg DM per
  bale / 1000, and for a stack, tons x %DM / 100.
- Totals per product at the top: bales, tons in stacks, and **t DM on hand**
  (bales and stacks together). A place with silage but no DM figure is left
  out of that total, and the box says how many places are missing.
- `📋 LOG` shows every change, with a filter per location and EXPORT CSV.
- `⚙ Products` is the shared product list. Other feeds can be added there.
- **The sheet owns the numbers**, like the cow numbers: the phone sends
  "add 12" and `applySilageStock` does the sum under the script lock and
  writes the log row. Every change has an id, so a change sent twice on poor
  signal is counted once.
- **Nothing is saved on the phone first.** With no signal the change is
  refused and the box stays open. The phone only keeps a copy to look at
  (`silage_stock_locations`, `silage_stock_products`, `silage_stock_log`).
- The quantity, the product and bales / stack are set when the pin is made.
  `save_silage_location` on an old pin changes only name, %DM, kg DM per
  bale, notes and position, so an old number on a phone can never be written
  back.
- Deleting a pin writes what was left to the log as taken away.
- In the code the names are `silageStock...` and the ids `sgs-...`, because
  the Silage card on the FEED screen (the daily feeding sum) already uses
  `silage...`. The two are not linked.

Row in the `silage` tab:
`id | name | product | form | quantity | dm | notes | lat | lng | createdBy |
createdAt | baleKgDm`. `form` is `bales` or `stack`. `baleKgDm` is empty for a
stack. A sheet made by script `-a` gets the last header cell added by itself.
Row in the `silage log` tab:
`id | timestamp | location id | location | product | form | from | to |
change | user | note`.

### Print Map (⋮ menu)
Print the farm map, all of it or part, with the paddock names, after marking
paddocks in colours (v1.1.18, Juani 12 Oct 2026).
- Tap a colour, then tap paddocks to paint them. A second tap with the same
  colour, or the ERASER, clears one. CLEAR ALL clears every mark.
- Six colours, each with a name typed by the user (e.g. "Regrass"). Next to
  each: how many paddocks and their hectares; under them the total marked.
- The marking map always shows the satellite photo. BACKGROUND only sets the
  printed page: **PLAIN** (no picture, the default), SATELLITE, NDVI (the
  latest NDVI picture, needs SATELLITE > NDVI opened once), COVER (paddocks in
  their last cover colours, as in FARMWALK, with the cover key).
- What is printed: the paddocks that can be seen on the screen, whole, filling
  the page. WHOLE FARM fits the whole farm. Option: area under each name.
- Paper A4 / A3, landscape / portrait. PRINT PREVIEW builds the page in mm
  (`pmOpenSheet`) with its own Leaflet map, shown scaled down on screen; PRINT
  calls the normal print window, which can also save as PDF.
- The page: title, date, the map with names and a scale, and a key with each
  used colour: name, hectares, number of paddocks and their names, and the
  total marked.
- The marks, names and choices are kept **on this device only**
  (`print_map_state`). Nothing goes to the sheet.
- Labels are given their small size before their content, so Leaflet centres
  them on the paddock; otherwise they sat beside it.

### Vehicle Maintenance
Fleet list, service checks with a checklist per vehicle type.
**Service Several** does many vehicles in one go: tick the vehicles (or "all"
for a type), one date, one person, one set of notes. Each vehicle still gets
its own log line, and a tick is only written to a vehicle whose own checklist
has it.

---

## 6. How to test safely

There is no build step. Test a copy, never the live app.

```bash
# 1. copy the app and turn the write guard on
S=/tmp/site; mkdir -p $S
cp index.html $S/index.html
sed -i "s/const IS_LOCAL_COPY = location.protocol === 'file:';/const IS_LOCAL_COPY = true;/" $S/index.html

# 2. serve it (node, python may not be installed)
node -e "const h=require('http'),f=require('fs');h.createServer((q,s)=>{f.readFile('$S/index.html',(e,d)=>{s.writeHead(200,{'Content-Type':'text/html'});s.end(d)})}).listen(8765)"
```

Then open `http://localhost:8765/`. The copy reads real data but refuses every
write, and shows an orange "LOCAL COPY - READ ONLY" tag.

The second PC has no node. There, serve the folder with
`py -3 -m http.server 8765 --directory <folder>` and run the syntax check
below in the browser console (`fetch('index.html')`, then the same loop).
The copy stops at the Google sign-in. For a test, hide `#login-screen`, set
`localStorage.auth_name` to a test name and call `init()` in the console.

To test code that saves, stub `window.fetch` in the browser console so POSTs
return `{status:'success'}` and collect what would have been sent.

**Syntax check before every commit** (there is no linter):

```bash
node -e "
const fs=require('fs');const html=fs.readFileSync('index.html','utf8');
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;let m,n=0,bad=0;
while((m=re.exec(html))){n++;try{new Function(m[1])}catch(e){bad++;console.log('script',n,e.message)}}
console.log(n+' inline scripts, '+bad+' with errors');"
```

The Apps Script can be tested with a fake sheet: build a small object with
`getRange/getValues/setValues/appendRow/deleteRow`, set `SpreadsheetApp`,
`ContentService` and `LockService` globals, then `eval` the file. There were
working test files for the farmwalk order, the maintenance functions and the
silage functions. The same fake sheet in a hidden iframe, with `fetch` sent to
it, tests a whole screen without touching the live sheet.

---

## 7. Release steps

```bash
cd "<repo>"
sed -i "s/v1\.1\.61/v1.1.62/g" index.html      # both places
sed -i "s/wn-farm-v1\.1\.75/wn-farm-v1.1.76/" sw.js
# syntax check (above), then
git add index.html sw.js                        # never -A
git commit -m "..."
git push origin main
# wait for Pages, then check the live file really changed:
curl -s "https://juanignacioituarte-prog.github.io/wainono/index.html?t=$(date +%s)" | grep -c "someNewFunctionName"
```

If the user says "I cannot see it", the usual cause is a change that was never
pushed, or the version was not bumped.

---

## 8. Traps that cost time before

- **Dates.** New Zealand is UTC+12. `toISOString()` shifts the day. Use
  `toDateInputValue(d)` for date inputs and build sheet dates from timestamps
  (`d/m/yyyy`). A printed date like "3 Sept" parses as year 2001.
- **Published CSV lag.** Minutes behind. Check with `?type=tabs` or a script
  GET instead of guessing.
- **Device caches.** `wn_cached_manual_data`, `wn_cached_farmwalk_csv`,
  `wn_maint_jobs`, `wn_maint_cats`, `wn_walk_order`, `wn_farmwalk_draft`,
  `silage_stock_locations`, `silage_stock_products`, `silage_stock_log`.
  The sheet is the record; a cached cover is only used for 3 days.
- **Per device settings must never change shared numbers.** A phone's "show
  breaks for N days" setting once changed the farm average (2291 on the phone,
  2190 on the computer).
- **Row order in `Farmwalks` is data**, not decoration. Code that deletes and
  re-appends a row moves the paddock to the end of the route. `loadFarmwalk`
  (merge) and `updatePaddockHistory` now change rows **in place**.
- **Paddock names are the key** in every tab except the boundaries. Renaming
  must go through `rename_paddock`, which renames everywhere at once.
- **Leaflet**: after the sidebar changes size, call `map.invalidateSize()`, or
  taps land in the wrong place.
- The browser pane in the desktop app scales its viewport; clicking by
  coordinates is unreliable. Drive the page with JavaScript instead.

---

## 9. Other projects in their own folders

These are separate and have their own notes. They live in
`G:\My Drive\Apps\`. The full list, and what to read first in each, is in
`G:\My Drive\Apps\README.md`:

| Project | Folder |
|---|---|
| Cow treatment app | `Apps\cow-treatment` (ships as `treatment.html` here) |
| Shed cow display | `Apps\shed-cow-display` (ships as `shed.html` here) |
| Pasture growth prediction | `Apps\pasture-growth` (`gr.html`) |
| LH daily benchmark | `Apps\daily-benchmark` |
| Mineral dispenser (ESP32) | `Apps\mineral-dispenser` |
| Drafting gate (ESP32) | `Apps\drafting-gate` |
| RUC off-road logger (ESP32) | `Apps\ruc-offroad-logger` |
| NDVI sync | repo `juanignacioituarte-prog/farm-biomass-sync` |

ESP32 work uses the installed PlatformIO CLI
(`~/.platformio/penv/Scripts/pio.exe`), board on COM10 on the Zenbook.
Never change the XRP2 reader's DATA FORMAT / OUTPUT MODE settings - the
drafting gate parses that output.

---

## 10. Where the work stopped (2 October 2026)

Everything listed above is live and working. Open points:

- `K4-K5` was merged from K4 and K5 in September. Its covers were moved by
  hand (21 Aug 2432, 3 Sept 2680, 20 Sept 1720). Merges done from now on move
  the history by themselves.
- `U1` and `U2` were not walked on 20 Sept - nobody said whether that was on
  purpose.
- Paddock boundaries are "a bit off" in places (breaks spill outside them).
  The user wanted to fix them; nothing has been done yet.
- Quick buttons used to be kept per device. They are now the sub categories,
  shared through the sheet, so that is settled.

Added 3 October 2026:

- **Silage** section (v1.1.13). It needs Apps Script `2026-10-03-a`: paste the
  script first (section 4), then push the app. With the old script the screen
  says "The Apps Script needs updating".
- kg DM per bale and "t DM on hand" (v1.1.14, script `2026-10-03-b`).
- Silage idea not built: link the stock to the Silage card on the FEED screen
  (take what is fed each day).
- Old tracked files still in the repo: `riverterrace-main\`, `index viejo.html`,
  `test.html`, `diff.txt`, `diff_local.txt`. Removing them needs its own commit.
- There is no `.gitignore`. Add files to git by name only.
- The names with `wainono` in them (repo, live address, cache name, the word in
  the app, the title of this file) stay until Juani says. A farm setup system
  is planned and the names will be handled there.

Added 12 October 2026:

- Paddocks out reworked (v1.1.15, see Farm Configuration). No script change.
- On 12 Oct the out tab had 22 paddocks, all OTHER. Q3, 30a, U1 and U2 were
  out only by a cover of 0 in the farmwalk (26 and 30 Sept). Juani will sort
  these by hand: **do not change the sheet data for them**.

- Paddocks out: several paddocks can be picked and taken out together
  (v1.1.16). No script change.
- Reasons for paddocks out are managed in the app (v1.1.17, Apps Script
  `2026-10-12-a`, new tab `out reasons`). Paste the script before pushing.
- PLAN has a "Farm Area" card: total area, in rotation, out of rotation, out
  for Silage, and the other reasons (`renderPlanAreaCard`, from
  `rotationAreas`, which now also gives `byReason`). It follows the unit
  picked in PLAN. The areas come from the paddock boundaries and the out tab.
- Print Map in the menu (v1.1.18). No script change. Marks stay on the device.
- Map labels of paddocks out say "OUT: <reason>" in FARMWALK and BREAKS too
  (v1.1.19).
- BREAKS: paddocks out are filled in their reason colour (v1.1.20).
- Map labels say where the cover comes from: measured with the walk date in
  FARMWALK; "≈ ... estimated · satellite <date>" in BREAKS and the rest
  (v1.1.21).
- BREAKS uses last walk + estimated growth from measured weather, not the
  satellite (v1.1.22). GROWTH button opens gr.html in the app.
- BREAKS COVER MAP colours paddocks by the estimated cover (v1.1.23).
- Estimated cover after breaks: 1500 + growth since the last break (v1.1.24).
- After a break: 1500 on the day after the last break, growth from the next
  day (v1.1.25).
- EST. FW: paddock ranking on the estimated cover, with all filters (v1.1.26).
- CHECK: partial farmwalk with groups A / B / C to test the estimate, saved
  as a real farmwalk (v1.1.27).
- CHECK: groups in the order A, B, C; card and map paddock linked both ways
  (v1.1.28).
- CHECK saves to the new `partial walk` tab, not Farmwalks (v1.1.29, Apps
  Script `2026-10-13-a`). Paste the script; until then a save is refused.
- Residual = median of the C checks of the last 30 days (3 or more), else
  1500 (v1.1.30). No script change.
- Estimated farmwalk: newest real cover (walk or partial walk) wins; EST. FW
  stats box and partial walks list; PLAN wedge MEASURED / ESTIMATED (v1.1.31).
- EST. FW: ACTUAL vs ESTIMATED growth table (v1.1.32).
- ACTUAL vs ESTIMATED also counts regrowth after a grazing, from the residual
  in use (v1.1.33).
- PLAN: Rotation Parameters follow the MEASURED / ESTIMATED switch (v1.1.34).
- PLAN: residual, rotation length (breaks of the last 4 days, changeable)
  and actual pre-grazing cover are automatic (v1.1.35).
- FARMWALK bar in four rows: VIEW (MEASURED / ESTIMATED / SATELLITE), ADD
  (+ Farmwalk, + PARTIAL), TOOLS, FILTER. EST. FW is now ESTIMATED and CHECK
  is now + PARTIAL (v1.1.36).
- ACTUAL vs ESTIMATED: % diff column (v1.1.37).
- + PARTIAL: paddocks with a break today are in group C (v1.1.38).
- + PARTIAL: C is 24-72 hours after the last break (replaces "today is C");
  a high measured cover moves a B or C paddock to A (v1.1.39).
- + PARTIAL: C is 24-48 hours after the last break; grey paddocks in rotation
  can be measured under OTHER (saved as X) (v1.1.40).
- + PARTIAL: breaks under 24 hours old are left out of the group choice, so a
  paddock first grazed today is A (v1.1.41).
- Growth corrected by actual / model over the last 30 days of walk pairs
  (v1.1.42).
- C rows more than 500 above their estimate are not counted as residuals
  (v1.1.43).
- Partial walk average growth (A + B, by area) against the estimate
  (v1.1.44).
- The growth comparison window is simpler (v1.1.45, button now 📈 GROWTH
  CHECK, Juani 13 Oct 2026 said the old one was confusing): one sentence for
  the last 30 days (measured, estimated, "8% high"), the correction factor in
  plain words, then 1. paddocks NOT grazed between two walks and 2. paddocks
  grazed then measured, one line per date. Columns: Dates, Paddocks, Measured
  kg/day, Estimated kg/day, Estimate is. Under 5 paddocks = grey "(few)".
- The + PARTIAL summary box is two lines only (v1.1.46, Juani 13 Oct 2026):
  Growth: actual · estimated · % (A + B by area); Residual: actual (average of
  today's C checks, outliers left out) · in use · %. The per-group A/B/C lines
  were removed.
- PARTIAL WALKS list: the A/B/C average line per date was removed (v1.1.47,
  Juani said it was confusing). Each date shows the Growth line and the
  paddock table only.
- The growth correction comes from the LAST walk or partial walk with 5+
  clean pairs, kept until the next one (v1.1.48). GROWTH CHECK headline shows
  that walk. On 13 Oct: 8 paddocks, measured 68, model 74, ×0.93.
- The correction also counts grazed-then-measured pairs (B), not only
  not-grazed pairs (v1.1.49). On 13 Oct: 12 paddocks (8 + 4), measured 64,
  model 75, ×0.86 (was ×0.93 without B). Grazed pairs pull it down because
  regrowth is slow in the first days after grazing.
- PARTIAL WALKS list shows the CORRECTED estimate, redone when the list opens
  (v1.1.50, Juani: "it is what I am going to end up using"): today's growth
  correction and residual, from the last real cover before that day, breaks
  drawn 24+ hours before the row was saved. Display only: the estimate saved
  in the "partial walk" sheet is never changed. The original estimate is not
  shown.
- ESTIMATED cards of paddocks measured today (v1.1.51, Juani 13 Oct 2026:
  "many paddocks don't have growth"): growth and previous cover come from
  the real cover before today's (full or partial walk, or the residual the
  day after the last break), i.e. the MEASURED growth, over 3+ days. C
  residual checks still show no growth.
- + PARTIAL help text cut to four lines in Juani's words (v1.1.52): A not
  grazed since last FW / B grazed 7+ days ago / C grazed up to 48 hr ago /
  Grey: do not use.
- **Fert** in the ⋮ menu (v1.1.53, Apps Script `2026-10-15-a`, Juani 15 Oct
  2026). Grazings per paddock since a date (default 1 June, the season
  start; kept per phone). Grass breaks only (no crop breaks, no lines). A
  new round starts after 10 days with no break AND only if the round before
  covered 80% of the paddock area; a round counts once it covers 80%; an
  unfinished round with no break for 30 days is dropped. Round dated by its
  first break. ALL = map coloured by number of grazings; ROUND N = list of
  the paddocks with an Nth grazing and a tick "fert ordered" (map: green
  ordered, orange not). Ticks in the sheet `fert` (paddock | grazed | round |
  user | saved at; grazed = first break date of that grazing; untick deletes
  the row): doPost `save_fert`, doGet `fert`. Deployed with clasp, version 41.
- The Apps Script is now sent to Google with clasp: `sh
  /c/dev/wainono-apps-script/deploy.sh` (15 Oct 2026). No more pasting.
- Fert: a break counts for the map paddock its centre lies in, not the
  name it was saved with (v1.1.54). Breaks saved as "30" are in 30a, "23B"
  in 23, "L8A" in L8, "L3A" in L1; some have no name. Falls back to the
  name when the break has no points or lies outside every paddock.
- Fert: a grazing also counts at 60% once 10 days pass with no break
  (v1.1.55, Juani: 28 was fully grazed but its 50 strip breaks add up to
  69%). A round still counts at once at 80%. A new round starts after 10
  days with no break and 60% covered.
- Fert: the finished-grazing rule went to 50% in v1.1.56 and back to 60% in
  v1.1.57. 33 looked 54% covered in Sept only because "Break 1430" (no
  paddock name, odd shape) had its centre outside 33. Breaks are now placed
  by the paddock holding most sample points (centre + a point halfway
  between each corner and the centre, v1.1.58, away from the fences).
  Check on 15 Oct: every named break since June lands in its own paddock.
- Editing a break's createdAt in the Breaks sheet alone does not stick: a
  phone's copy wins when its lastEditedAt/createdAt is newer, and the next
  sync rewrites the whole sheet. Change lastEditedAt to now as well.
- Fert (v1.1.59, script 2026-10-15-b): ticks showed as not ticked from
  v1.1.55 to v1.1.58 (a helper named `done` hid the ticked list; renamed
  `finished`). Round list: not ordered on top, ordered at the bottom; TICK
  ALL button saves every not-ordered paddock of the round in one POST
  (`save_fert` with `entries`).
- Fert: with a round picked, a tap on a paddock on the map ticks its fert
  for that round, a second tap unticks it (v1.1.60). Not in that round: a
  message only. With ALL: opens the paddock's last round.
- Fert REPORT (v1.1.61, `openFertReport`): the paddocks ticked on one day
  (by savedAt, NZ date; default today; the last 6 tick days as buttons),
  grouped by round (the round today for that grazing), with grazed date, ha,
  who, totals, and COPY AS TEXT.
