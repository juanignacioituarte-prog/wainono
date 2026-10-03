# Wainono farm app - handover notes

Everything needed to carry on working on this app from another computer.
Written 2 October 2026, updated 3 October 2026. App version: **v1.1.13**,
service worker cache `wn-farm-v1.1.27`, Apps Script `2026-10-03-a`.

The index of all projects and the rules is `G:\My Drive\Apps\README.md`.

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
| `wainono_apps_script.js` | The Apps Script for the **feed sync** spreadsheet. Pasted by hand into the script editor (see section 4) |
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

The script is **not** deployed from this repo. To update it:

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
**Silage**, Farm Configuration (admin only), Audio & Map Settings, Weekly Area
Report.

The app **opens on BREAKS with the plain satellite picture**.

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

### Farm average
Area weighted average of the paddocks walked in the latest walk:
`sum(cover x area) / sum(area)`. Nothing else goes into it - no crop break
area, no device setting. The line under it says which walk, how many paddocks
and how many hectares, so two devices can be compared.

### Farm Configuration (admin)
- **Farm units**: which paddocks belong to which unit.
- **Paddocks out**: the `out` tab.
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
- Totals per product at the top: bales, tons in stacks, and tons of DM when
  every stack with silage in it has a %DM.
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
  `save_silage_location` on an old pin changes only name, %DM, notes and
  position, so an old number on a phone can never be written back.
- Deleting a pin writes what was left to the log as taken away.
- In the code the names are `silageStock...` and the ids `sgs-...`, because
  the Silage card on the FEED screen (the daily feeding sum) already uses
  `silage...`. The two are not linked.

Row in the `silage` tab:
`id | name | product | form | quantity | dm | notes | lat | lng | createdBy |
createdAt`. `form` is `bales` or `stack`.
Row in the `silage log` tab:
`id | timestamp | location id | location | product | form | from | to |
change | user | note`.

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
sed -i "s/v1\.1\.13/v1.1.14/g" index.html      # both places
sed -i "s/wn-farm-v1\.1\.27/wn-farm-v1.1.28/" sw.js
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
- Silage ideas not built: link the stock to the Silage card on the FEED screen
  (take what is fed each day), and a weight per bale to show bales as tons DM.
- Old tracked files still in the repo: `riverterrace-main\`, `index viejo.html`,
  `test.html`, `diff.txt`, `diff_local.txt`. Removing them needs its own commit.
- There is no `.gitignore`. Add files to git by name only.
- The names with `wainono` in them (repo, live address, cache name, the word in
  the app, the title of this file) stay until Juani says. A farm setup system
  is planned and the names will be handled there.
