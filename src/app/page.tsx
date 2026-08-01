import FarmDashboard from '@/components/FarmDashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-900 to-slate-900 -z-10" />
      <div className="max-w-7xl mx-auto p-6 lg:p-12">
        <header className="mb-12 flex justify-between items-center animate-fade-in-down">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
              NDVI Control Panel
            </h1>
            <p className="text-slate-400 mt-2">Manage your farms, paddocks, and GIS boundaries.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 backdrop-blur-md">
              <span className="text-emerald-400 font-semibold">J</span>
            </div>
          </div>
        </header>

        <FarmDashboard />
      </div>
    </main>
  );
}
