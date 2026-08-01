const SUPABASE_URL = "https://adzglgpoqfjtgbpeiudf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkemdsZ3BvcWZqdGdicGVpdWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0Njg5NzUsImV4cCI6MjEwMTA0NDk3NX0.vc4tTP0fGvSoiVvJiSwzu0c3oh-Vf5DVvKjGDWbWF2o";

const originalFetch = window.fetch;

async function fetchSupabase(table, query = "") {
    const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
    try {
        const res = await originalFetch(url, {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Profile": "public"
            }
        });
        if (!res.ok) {
            console.error(`Supabase fetch failed for ${table}:`, res.status, res.statusText);
            return [];
        }
        return res.json();
    } catch (e) {
        console.error(`Network error for Supabase ${table}:`, e);
        return [];
    }
}

async function postSupabase(table, body) {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const res = await originalFetch(url, {
        method: 'POST',
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify(body)
    });
    return res.json();
}

window.fetch = async function(url, options) {
    if (!url) return originalFetch.apply(this, arguments);
    const urlStr = url.toString();
    
    // NDVI Data
    if (urlStr.includes('/api/beta/ndvi') || urlStr.includes('DATA_CSV_URL')) {
        const data = await fetchSupabase('PastureRecord', 'type=eq.SATELLITE&select=paddock:paddockId(name),date,ndvi,cloudCover,tileUrl');
        let csv = 'paddock_name,ndvi_mean,cloud_pc,date,latest-update\n';
        data.forEach(r => {
            csv += `${r.paddock?.name || ''},${r.ndvi || ''},${r.cloudCover || 0},${r.date || ''},${r.tileUrl || ''}\n`;
        });
        return new Response(csv, { status: 200 });
    }
    
    // Paddocks GeoJSON
    if (urlStr.includes('/api/beta/paddocks') || urlStr.includes('GEOJSON_URL')) {
        const data = await fetchSupabase('Paddock', 'select=name,boundary');
        const features = data.map(row => {
            try {
                let feat = typeof row.boundary === 'string' ? JSON.parse(row.boundary) : row.boundary;
                if (feat && feat.properties) feat.properties.name = row.name;
                return feat;
            } catch (e) { return null; }
        }).filter(Boolean);
        return new Response(JSON.stringify({ type: 'FeatureCollection', features }), { status: 200 });
    }
    
    // Exclusions
    if (urlStr.includes('/api/beta/exclusions') || urlStr.includes('EXCLUSIONS_CSV_URL')) {
        const data = await fetchSupabase('PaddockExclusion', 'select=paddockName,reason'); // schema has paddockName, reason
        let csv = 'paddock_name,date,pct_excluded\n';
        // Note: schema doesn't have pct_excluded directly, just reason/status
        data.forEach(r => csv += `${r.paddockName || ''},,100\n`);
        return new Response(csv, { status: 200 });
    }
    
    // Partials
    if (urlStr.includes('/api/beta/partial') || urlStr.includes('PARTIAL_CSV_URL')) {
        const data = await fetchSupabase('PaddockPartial', 'select=paddockName,status');
        let csv = 'paddock_name,date,pct_grazed\n';
        data.forEach(r => csv += `${r.paddockName || ''},,50\n`);
        return new Response(csv, { status: 200 });
    }
    
    // Calibration
    if (urlStr.includes('/api/beta/cal') || urlStr.includes('CAL_CSV_URL')) {
        const data = await fetchSupabase('Calibration', 'select=paddockName,date,measuredCover');
        let csv = 'paddock_name,date,cover\n';
        data.forEach(r => csv += `${r.paddockName || ''},${r.date || ''},${r.measuredCover || ''}\n`);
        return new Response(csv, { status: 200 });
    }
    
    // Manual Mode
    if (urlStr.includes('/api/beta/manual') || urlStr.includes('MANUAL_MODE_CSV')) {
        // Schema uses a single JSON data field for manual modes, but to avoid crash we return empty CSV
        return new Response('paddock_name,latest_cover,previous_cover,latest_date,previous_date\n', { status: 200 });
    }
    
    // Feed Settings
    if (urlStr.includes('/api/beta/feed') || urlStr.includes('FEED_SETTINGS_CSV')) {
        return new Response('Target,Growth,Rotation,Demand\n1500,30,30,15\n', { status: 200 });
    }

    // Health & Safety and Breaks
    if (urlStr.includes('/api/beta/hs') || (options && options.body && options.body.includes('type":"breaks"'))) {
        if (urlStr.includes('type=breaks') || (options && options.body && options.body.includes('breaks'))) {
            return new Response(JSON.stringify({ success: true, breaks: [] }), { status: 200 });
        }
        if (urlStr.includes('type=hs_get_all')) {
            const staff = await fetchSupabase('HS_Staff');
            const hazards = await fetchSupabase('HS_Hazard');
            const meetings = await fetchSupabase('HS_Meeting');
            return new Response(JSON.stringify({ success: true, staff, hazards, meetings }), { status: 200 });
        }
        if (options && options.method === 'POST') {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    
    // Vehicles
    if (urlStr.includes('/api/beta/vehicles')) {
        if (urlStr.includes('type=vm_get_all')) {
            const vehicles = await fetchSupabase('Vehicle');
            const logs = await fetchSupabase('MaintenanceLog');
            return new Response(JSON.stringify({ success: true, vehicles, logs }), { status: 200 });
        }
        if (options && options.method === 'POST') {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return originalFetch.apply(this, arguments);
};
