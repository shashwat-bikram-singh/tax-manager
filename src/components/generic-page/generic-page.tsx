import { useNavigate } from 'react-router-dom';
import { useFetchAll } from '@/hooks/useFetchAll';
import { MapPin, TrendingUp, Layers, Building2, Landmark, BriefcaseBusiness } from 'lucide-react';
import { GenericMap } from '../map/genericmap';

interface GenericData {
  totalProperty?: number;
  totalLandProperty?: number;
  totalBuildingProperty?: number;
  totalOffice?: number;
}

export default function GenericPage() {
  const navigate = useNavigate();
  const { items: genericResponse } = useFetchAll<GenericData>('/api/generic-info', ['generic-data']);

  function getGenericData(res: any): GenericData | null {
    if (!res) return null;
    if (res.data) {
      const data = res.data;
      return Array.isArray(data) && data.length > 0 ? data[0] : data;
    }
    return null;
  }

  const d = getGenericData(genericResponse);

  const formatNumber = (num: number | undefined) =>
    num != null ? num.toLocaleString() : '0';

  const stats = [
    {
      label: 'Total Properties',
      value: formatNumber(d?.totalProperty),
      icon: <Layers className="w-5 h-5" />,
      accent: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/10 text-primary',
      iconHover: 'group-hover:bg-primary group-hover:text-white',
      bar: null,
      badge: { label: 'Live', color: 'text-emerald-600 bg-emerald-50' },
    },
    {
      label: 'Total Land',
      value: formatNumber(d?.totalLandProperty),
      icon: <Landmark className="w-5 h-5" />,
      accent: 'from-emerald-100/60 to-emerald-50/20',
      iconBg: 'bg-emerald-100 text-emerald-600',
      iconHover: 'group-hover:bg-emerald-600 group-hover:text-white',
      bar: d && d.totalProperty ? (d.totalLandProperty ?? 0) / d.totalProperty : 0,
      barColor: 'bg-emerald-500',
      badge: null,
    },
    {
      label: 'Total Building',
      value: formatNumber(d?.totalBuildingProperty),
      icon: <Building2 className="w-5 h-5" />,
      accent: 'from-indigo-100/60 to-indigo-50/20',
      iconBg: 'bg-indigo-100 text-indigo-600',
      iconHover: 'group-hover:bg-indigo-600 group-hover:text-white',
      bar: d && d.totalProperty ? (d.totalBuildingProperty ?? 0) / d.totalProperty : 0,
      barColor: 'bg-indigo-500',
      badge: null,
    },
    {
      label: 'Total Office',
      value: formatNumber(d?.totalOffice),
      icon: <BriefcaseBusiness className="w-5 h-5" />,
      accent: 'from-amber-100/60 to-amber-50/20',
      iconBg: 'bg-amber-100 text-amber-600',
      iconHover: 'group-hover:bg-amber-500 group-hover:text-white',
      bar: d && d.totalProperty ? (d.totalOffice ?? 0) / d.totalProperty : 0,
      barColor: 'bg-amber-500',
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen flex bg-surface font-body text-on-surface overflow-hidden">
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-surface/50">

        {/* Background Ambience */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-tertiary/10 rounded-full blur-[100px] pointer-events-none z-0" />

        {/* Top Navbar */}
        <header className="h-20 bg-white/70 backdrop-blur-md border-b border-outline/10 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <img src="/TU.png" alt="TU" className="w-6 h-6 object-contain brightness-0 invert" />
            </div>
            <div>
              <h1 className="font-headline font-black text-lg text-primary leading-none tracking-tight">Institutional PMS</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-outline font-bold mt-1">Portal</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            Sign In
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── Main Row ── */}
            <div className="flex gap-6 h-[620px]">

              {/* ── LEFT PANEL: title + stats stacked in one div ── */}
              <div className="flex flex-col gap-4 w-72 shrink-0 h-full">

                {/* Title block */}
                <div className="shrink-0">
                  <h2 className="text-2xl font-headline font-bold text-on-surface uppercase tracking-wider leading-tight">
                    Property Overview
                  </h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Welcome — here is what's happening today.
                  </p>
                </div>

                {/* Divider */}
                <div className="shrink-0 h-px bg-outline/10" />

                {/* Stat cards — fill remaining height equally */}
                <div className="flex flex-col gap-3 flex-1 min-h-0">
                  {stats.map((s, i) => (
                    <div
                      key={i}
                      className="group relative flex-1 bg-white rounded-2xl px-5 shadow-sm border border-outline/5
                        hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden
                        flex flex-col justify-center"
                    >
                      {/* Gradient wash */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-60 pointer-events-none rounded-2xl`} />

                      <div className="relative flex items-center gap-4">
                        {/* Icon */}
                        <div className={`p-3 rounded-xl shrink-0 transition-colors duration-300 ${s.iconBg} ${s.iconHover}`}>
                          {s.icon}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest truncate">
                            {s.label}
                          </p>
                          <div className="flex items-end gap-2 mt-1">
                            <span className="font-headline text-3xl font-black text-on-surface leading-none">
                              {s.value}
                            </span>
                            {s.badge && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mb-0.5 flex items-center gap-1 ${s.badge.color}`}>
                                <TrendingUp className="w-3 h-3" />
                                {s.badge.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {s.bar !== null && s.bar !== undefined && (
                        <div className="relative mt-3 w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                          <div
                            className={`${s.barColor} h-full rounded-full transition-all duration-700`}
                            style={{ width: `${Math.round((s.bar ?? 0) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
              {/* ── END LEFT PANEL ── */}

              {/* ── RIGHT: Map ── */}
              <div className="flex-1 h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Property Location Map</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Geographic distribution of assets across Nepal</p>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <GenericMap className="h-full w-full" />
                </div>
              </div>

            </div>
            {/* ── End Main Row ── */}

          </div>
        </div>
      </main>
    </div>
  );
}