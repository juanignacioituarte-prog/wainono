'use client';

import { useState, useEffect } from 'react';
import * as shp from 'shpjs';

type Farm = {
  id: string;
  name: string;
  createdAt: string;
};

export default function FarmDashboard() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [newFarmName, setNewFarmName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{msg: string, type: 'error'|'success'|'info'} | null>(null);

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const res = await fetch('/api/farms');
      const data = await res.json();
      setFarms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmName) return;
    
    try {
      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFarmName })
      });
      if (res.ok) {
        setNewFarmName('');
        fetchFarms();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const uploadGeoJSON = async (geojson: any) => {
    if (!selectedFarm) return;
    setUploadStatus({ msg: 'Uploading to database...', type: 'info' });

    try {
      const res = await fetch(`/api/farms/${selectedFarm.id}/gis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geojson)
      });

      const data = await res.json();
      
      if (res.ok) {
        setUploadStatus({ msg: data.message, type: 'success' });
      } else {
        setUploadStatus({ msg: data.error || 'Upload failed', type: 'error' });
      }
    } catch (err) {
      setUploadStatus({ msg: 'Failed to communicate with server', type: 'error' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedFarm || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    setUploadStatus({ msg: 'Reading file...', type: 'info' });
    
    if (file.name.endsWith('.zip')) {
      try {
        setUploadStatus({ msg: 'Parsing Shapefile...', type: 'info' });
        const arrayBuffer = await file.arrayBuffer();
        const geojson = await shp.parseZip(arrayBuffer);
        await uploadGeoJSON(geojson);
      } catch (err) {
        console.error(err);
        setUploadStatus({ msg: 'Invalid Shapefile ZIP', type: 'error' });
      }
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const geojson = JSON.parse(event.target?.result as string);
          await uploadGeoJSON(geojson);
        } catch (err) {
          setUploadStatus({ msg: 'Invalid GeoJSON file', type: 'error' });
        }
      };
      reader.readAsText(file);
    }
  };

  if (loading) {
    return <div className="text-emerald-400 animate-pulse">Loading dashboard...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sidebar: Farms List */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-xl font-semibold mb-4 text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Your Farms
          </h2>
          
          <form onSubmit={createFarm} className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="New Farm Name..." 
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-slate-200"
              value={newFarmName}
              onChange={e => setNewFarmName(e.target.value)}
            />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20 active:scale-95">
              Add
            </button>
          </form>

          <div className="space-y-2">
            {farms.length === 0 ? (
              <p className="text-slate-500 text-sm">No farms created yet.</p>
            ) : (
              farms.map(farm => (
                <button 
                  key={farm.id}
                  onClick={() => setSelectedFarm(farm)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-between group ${
                    selectedFarm?.id === farm.id 
                    ? 'bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/30' 
                    : 'hover:bg-slate-700/30 border border-transparent'
                  }`}
                >
                  <span className={`font-medium ${selectedFarm?.id === farm.id ? 'text-emerald-300' : 'text-slate-300 group-hover:text-slate-200'}`}>
                    {farm.name}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${selectedFarm?.id === farm.id ? 'text-emerald-400 translate-x-1' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Farm Details */}
      <div className="lg:col-span-2">
        {selectedFarm ? (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-100">{selectedFarm.name}</h2>
                <p className="text-slate-400 mt-1">Farm ID: <span className="font-mono text-xs bg-slate-900 px-2 py-1 rounded">{selectedFarm.id}</span></p>
              </div>
              <span className="bg-emerald-900/30 text-emerald-400 text-xs px-3 py-1 rounded-full border border-emerald-500/20">Active</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GIS Upload Card */}
              <div className="bg-slate-900/40 rounded-xl p-6 border border-slate-700/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-lg font-medium text-slate-200 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  GIS Boundaries
                </h3>
                <p className="text-slate-400 text-sm mb-6">Upload a GeoJSON file to set the paddock boundaries for this farm.</p>
                
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-xl cursor-pointer hover:bg-slate-800/50 hover:border-emerald-500/50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <p className="mb-2 text-sm text-slate-400"><span className="font-semibold text-emerald-400">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-slate-500">.geojson or .zip (Shapefiles)</p>
                  </div>
                  <input type="file" className="hidden" accept=".geojson,application/geo+json,.zip,application/zip" onChange={handleFileUpload} />
                </label>

                {uploadStatus && (
                  <div className={`mt-4 p-3 rounded-lg text-sm border ${
                    uploadStatus.type === 'success' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' :
                    uploadStatus.type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-300' :
                    'bg-blue-900/20 border-blue-500/30 text-blue-300'
                  }`}>
                    {uploadStatus.msg}
                  </div>
                )}
              </div>

              {/* Users Card (Placeholder) */}
              <div className="bg-slate-900/40 rounded-xl p-6 border border-slate-700/50 relative overflow-hidden group opacity-60">
                <h3 className="text-lg font-medium text-slate-200 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  User Permissions
                </h3>
                <p className="text-slate-400 text-sm mb-6">Manage who has access to this farm. (Coming soon)</p>
                <div className="flex -space-x-2 overflow-hidden">
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-800 bg-slate-700" />
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-800 bg-slate-600" />
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-800 bg-emerald-800/50 border border-emerald-500 flex items-center justify-center"><span className="text-xs text-emerald-300">+</span></div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="h-full min-h-[400px] border-2 border-dashed border-slate-700/50 rounded-2xl flex flex-col items-center justify-center text-slate-500 bg-slate-800/10">
            <svg className="w-16 h-16 mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <p className="text-lg">Select a farm to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
