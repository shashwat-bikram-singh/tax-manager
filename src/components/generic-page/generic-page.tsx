import { useNavigate } from 'react-router-dom';
import { useFetchAll } from '@/hooks/useFetchAll';
// Assuming you have a type file. If 'GenericData' is not defined, ensure it matches your API response.
import type { DashboardData } from '@/type/dashboard'; 

// Define the interface for the data structure based on usage
interface GenericData {
  totalProperty?: number;
  totalLandProperty?: number;
  totalBuildingProperty?: number;
  totalOffice?: number;
}

export default function GenericPage() {
  const navigate = useNavigate();
  const { items: genericResponse } = useFetchAll<GenericData>("/api/generic-info", ["generic-data"]);
  
  function getGenericData(res: any): GenericData | null {
    if (!res) return null;
    if (res.data) {
      const data = res.data;
      return Array.isArray(data) && data.length > 0 ? data[0] : data;
    }
    return null;
  }

  const d = getGenericData(genericResponse);

  const handleSignIn = () => {
    navigate("/login");
  };

  // Helper to format numbers (adds commas)
  const formatNumber = (num: number | undefined) => {
    return num != null ? num.toLocaleString() : "0";
  };

  return (
    <div className="min-h-screen flex bg-surface font-body text-on-surface overflow-hidden">

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-surface/50">
        
        {/* Background Ambience */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-tertiary/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        {/* Top Header */}
        <header className="h-20 bg-white/70 backdrop-blur-md border-b border-outline/10 flex items-center justify-between px-8 sticky top-0 z-20">
          
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <img src="/TU.png" alt="TU" className="w-6 h-6 object-contain brightness-0 invert" />
            </div>
            <div>
              <h1 className="font-headline font-black text-lg text-primary leading-none tracking-tight">Institutional PMS</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-outline font-bold mt-1">Portal</p>
            </div>
          </div>

          {/* Right: Sign In Button */}
          <button
            onClick={handleSignIn}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            Sign In
          </button>

        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-headline font-bold text-on-surface uppercase tracking-wider">Property Overview</h2>
                <p className="text-sm text-on-surface-variant mt-1">Welcome , here is what's happening today.</p>
              </div>
            </div>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: Total Property */}
              <div className="group bg-white rounded-3xl p-6 shadow-sm border border-outline/5 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <span className="material-symbols-outlined text-3xl">apartment</span>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span> Live
                  </span>
                </div>
                <div className="mt-6">
                  <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Total Property</p>
                  <h3 className="font-headline text-4xl font-black text-on-surface mt-1">
                    {formatNumber(d?.totalProperty)}
                  </h3>
                </div>
              </div>

              {/* Card 2: Total Land */}
              <div className="group bg-white rounded-3xl p-6 shadow-sm border border-outline/5 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                    <span className="material-symbols-outlined text-3xl">terrain</span>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Total Land</p>
                  <h3 className="font-headline text-4xl font-black text-on-surface mt-1">
                    {formatNumber(d?.totalLandProperty)}
                  </h3>
                  <div className="w-full bg-gray-100 h-1.5 mt-4 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
              </div>

              {/* Card 3: Total Building */}
              <div className="group bg-white rounded-3xl p-6 shadow-sm border border-outline/5 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <span className="material-symbols-outlined text-3xl">domain</span>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Total Building</p>
                  <h3 className="font-headline text-4xl font-black text-on-surface mt-1">
                    {formatNumber(d?.totalBuildingProperty)}
                  </h3>
                </div>
              </div>

              {/* Card 4: Total Office */}
              <div className="group bg-white rounded-3xl p-6 shadow-sm border border-outline/5 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                    <span className="material-symbols-outlined text-3xl">corporate_fare</span>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Total Office</p>
                  <h3 className="font-headline text-4xl font-black text-on-surface mt-1">
                    {formatNumber(d?.totalOffice)}
                  </h3>
                </div>
              </div>

            </section>

          </div>
        </div>
      </main>
    </div>
  );
}