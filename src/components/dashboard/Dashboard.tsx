import { useFetchAll } from "@/hooks/useFetchAll";
import type { DashboardData } from "@/type/dashboard";
import { cn } from '@/lib/utils';


export default function Dashboard() {
  const { items: dashboardResponse, isLoadingItems: loading, error } = useFetchAll<DashboardData>("/api/dashboard", ["dashboard"]);

  function getDashboardData(dashboardResponse: any) {
    if (!dashboardResponse) return null;
    const response = dashboardResponse as any;
    if (response.subOfficeCardList && response.graphJson) return response as DashboardData;
    if (response.data) {
      const data = response.data;
      return Array.isArray(data) && data.length > 0 ? data[0] : data;
    }
    return null;
  }

  const dashboardData = getDashboardData(dashboardResponse);
  const subOfficeCards = dashboardData?.subOfficeCardList || [];

  const totalStats = subOfficeCards.reduce((acc: any, office: any) => ({
    ticketsSold: acc.ticketsSold + (office.ticketsSold || 0),
    totalPersons: acc.totalPersons + (office.totalNumberOfPerson || 0),
    totalRevenue: acc.totalRevenue + (office.revenue || 0)
  }), { ticketsSold: 0, totalPersons: 0, totalRevenue: 0 });


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-outline font-medium">Synchronizing records...</p>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="p-8 bg-error-container/20 border border-error-container rounded-2xl text-center">
        <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
        <h3 className="text-on-error-container font-headline font-bold text-lg">Data Sync Failed</h3>
        <p className="text-on-error-container/70 text-sm mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Summary Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue -> Total Tax Due */}
        <div className="bg-surface-container-low p-6 rounded-2xl space-y-2 border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total Tax Due</p>
          <h3 className="font-headline text-3xl w">रू {(totalStats.totalRevenue / 1000000).toFixed(1)}M</h3>
          <div className="flex items-center gap-1 text-[10px] text-primary/60 font-bold uppercase">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            4.2% from last cycle
          </div>
        </div>

        {/* Total Paid Placeholder */}
        <div className="bg-surface-container-low p-6 rounded-2xl space-y-2 border-l-4 border-on-primary-fixed-variant shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total Collected</p>
          <h3 className="font-headline text-3xl font-black text-on-primary-fixed-variant">रू {((totalStats.totalRevenue * 0.72) / 1000000).toFixed(1)}M</h3>
          <div className="w-full bg-white/50 h-1.5 rounded-full overflow-hidden mt-4">
            <div className="bg-primary h-full w-[72%] rounded-full"></div>
          </div>
        </div>

        {/* Overdue Penalties Placeholder */}
        <div className="bg-error-container/50 p-6 rounded-2xl space-y-2 border-l-4 border-error shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-error-container">Overdue Penalties</p>
          <h3 className="font-headline text-3xl font-black text-on-error-container">रू 1.45M</h3>
          <p className="text-[10px] text-on-error-container/70 font-bold uppercase italic">8 Entities Pending</p>
        </div>

        {/* Compliance Rate Placeholder */}
        <div className="bg-surface-container-highest p-6 rounded-2xl space-y-2 border-l-4 border-tertiary shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-tertiary-container">Compliance Rate</p>
          <h3 className="font-headline text-3xl font-black text-on-tertiary-container">84.2%</h3>
          <p className="text-[10px] text-on-tertiary-container/70 font-bold uppercase">Target: 95.0%</p>
        </div>
      </section>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ledger Table (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl ambient-shadow overflow-hidden border border-surface-container">
          <div className="px-6 py-5 flex justify-between items-center border-b border-surface-container-low">
            <h4 className="font-headline font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">list_alt</span>
              Campus Compliance Ledger
            </h4>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low text-primary text-[10px] font-bold rounded-lg hover:bg-surface-container-high transition-colors uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Filter
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low text-primary text-[10px] font-bold rounded-lg hover:bg-surface-container-high transition-colors uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">download</span>
                Export
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/30 text-outline text-[10px] uppercase font-black tracking-widest">
                  <th className="px-6 py-4">Campus Unit</th>
                  <th className="px-6 py-4">Inventory</th>
                  <th className="px-6 py-4">Assessment</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {subOfficeCards.map((office: any, idx: number) => (
                  <tr key={office.subOfficeId} className={cn(
                    "hover:bg-surface-container-low/20 transition-colors border-b border-surface-container-low/50",
                    idx % 2 !== 0 && "bg-surface-container-low/5"
                  )}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center text-[10px] font-black">
                          {office.subOfficeName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface">{office.subOfficeName}</span>
                          <span className="text-[10px] text-outline">{office.officeName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-outline">{office.ticketsSold} Units</td>
                    <td className="px-6 py-4 font-bold text-primary">रू {office.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                        office.revenue > 0 ? "bg-surface-container-highest text-on-primary-fixed-variant" : "bg-error-container text-on-error-container"
                      )}>
                        {office.revenue > 0 ? "Compliant" : "Deficit"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-primary hover:underline font-bold text-xs uppercase tracking-wider">Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions & Insights (1/3 width) */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="bg-primary text-white rounded-2xl p-6 ambient-shadow relative overflow-hidden group border border-white/10">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <h4 className="font-headline font-bold text-lg mb-6 relative z-10 flex items-center gap-2">
              <span className="material-symbols-outlined">bolt</span>
              Admin Control
            </h4>
            <div className="space-y-3 relative z-10">
              <button className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl text-sm font-bold transition-all border border-white/5 active:scale-95">
                <span className="material-symbols-outlined text-xl">upload_file</span>
                Update Inventory
              </button>
              <button className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl text-sm font-bold transition-all border border-white/5 active:scale-95">
                <span className="material-symbols-outlined text-xl">outgoing_mail</span>
                Broadcast Notices
              </button>
              <button className="w-full flex items-center gap-3 bg-secondary px-4 py-3 rounded-xl text-sm font-black transition-all shadow-xl shadow-black/20 hover:brightness-110 active:scale-95">
                <span className="material-symbols-outlined text-xl text-white">receipt_long</span>
                Generate Tax Audit
              </button>
            </div>
          </div>

          {/* Map Preview */}
          <div className="bg-white rounded-2xl ambient-shadow overflow-hidden border border-surface-container">
            <div className="p-4 border-b border-surface-container flex justify-between items-center">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Regional Compliance</span>
              <span className="material-symbols-outlined text-outline cursor-pointer hover:text-primary transition-colors">fullscreen</span>
            </div>
            <div className="h-48 bg-slate-100 relative group overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center grayscale contrast-125 opacity-40 group-hover:scale-105 transition-transform duration-1000"
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBLMAhNCd0-LIm3_5N-aWaqs2gTEuTGRGnywcFwPHiuKC6bkyVlfIu_n0Jg8PfJEP0rO3sz64FScKYGb63RjuaXLIvJiXrOdfWWRFIPP96BozuAAuoBUgqKkBqdIK1u44uPeiaMvF4B1iLvzJQR4HXjebyFJy-gsz-0GZ0eYXofnfV6ZBt5v4FOpH6WWNj6EdpF9HZ9t8zgKq2YWAaOqgCBAQ2RvNBscSWhfgIX1mf3QoDyXNP3QeRRCoRBEE3zHP5-DJeABev_st8')" }}
              ></div>
              {/* Markers */}
              <div className="absolute top-1/2 left-1/3 w-3 h-3 bg-primary border-2 border-white rounded-full shadow-lg"></div>
              <div className="absolute top-1/4 right-1/4 w-3 h-3 bg-secondary border-2 border-white rounded-full shadow-lg animate-pulse"></div>
              <div className="absolute bottom-1/3 right-1/2 w-3 h-3 bg-primary border-2 border-white rounded-full shadow-lg"></div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span className="text-outline uppercase">Valley Region</span>
                </div>
                <span className="text-primary truncate">92% COMPLIANCE</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <span className="text-outline uppercase">Outposts</span>
                </div>
                <span className="text-secondary truncate">68% COMPLIANCE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alert Banner */}
      <section className="bg-error-container/30 rounded-3xl p-8 border border-error-container/50 flex flex-col md:flex-row items-center gap-8 shadow-sm">
        <div className="w-20 h-20 rounded-full bg-error text-white flex items-center justify-center shrink-0 shadow-lg shadow-error/20">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>priority_high</span>
        </div>
        <div className="flex-1 space-y-2 text-center md:text-left">
          <h5 className="font-headline font-black text-on-error-container text-2xl tracking-tight">Tax Reconciliation Deadline Approaching</h5>
          <p className="text-on-error-container/80 text-sm max-w-2xl font-medium leading-relaxed">
            Final reconciliation for F/Y 2080/81 ends in <span className="font-black text-error">12 days</span>. Overdue penalties are accruing at 1.5% daily for 8 entities. Immediate intervention required.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <button className="px-8 py-3 bg-on-error-container text-white text-sm font-black rounded-xl shadow-xl hover:brightness-110 transition-all active:scale-95">
            Automate Notices
          </button>
          <button className="px-8 py-3 border-2 border-on-error-container/20 text-on-error-container text-sm font-black rounded-xl hover:bg-error-container/50 transition-all active:scale-95">
            Review Legal Ledger
          </button>
        </div>
      </section>

      {/* System Footer */}
      <footer className="pt-8 text-center text-outline text-[10px] font-black uppercase tracking-[0.2em] space-x-8 opacity-40">
        <span>© 2080 Tribhuvan University PMS</span>
        <a className="hover:text-primary transition-colors" href="#">Support Protocol</a>
        <a className="hover:text-primary transition-colors" href="#">Security Core</a>
      </footer>
    </div>
  );
}