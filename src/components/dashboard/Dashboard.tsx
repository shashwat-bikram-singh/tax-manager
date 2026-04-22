import { useFetchAll } from "@/hooks/useFetchAll";
import type { DashboardData, ProvinceData, DistrictData, LocalBodyData } from "@/type/dashboard";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useState } from "react";

export default function Dashboard() {
  const [viewType, setViewType] = useState('district');
  const { items: dashboardResponse, isLoadingItems: loading, error } = useFetchAll<DashboardData>("/api/dashboard", ["dashboard"]);

  function getDashboardData(res: any): DashboardData | null {
    if (!res) return null;
    if (res.data) {
      const data = res.data;
      return Array.isArray(data) && data.length > 0 ? data[0] : data;
    }
    return null;
  }

  const d = getDashboardData(dashboardResponse);

  const provinceData: ProvinceData[] = d?.provinceData ? JSON.parse(d.provinceData) : [];
  const districtData: DistrictData[] = d?.districtData ? JSON.parse(d.districtData) : [];
  const localBodyData: LocalBodyData[] = d?.localBodyData ? JSON.parse(d.localBodyData) : [];
  console.log(provinceData)

  const unpaidProperty = (d?.totalProperty ?? 0) - (d?.totalPaidProperty ?? 0);

  // ── ApexCharts configs ──────────────────────────────────────────────────────

  // Province bar chart
  const provinceChartOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
    plotOptions: { bar: { borderRadius: 6, horizontal: false, columnWidth: "45%" } },
    dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: "700" } },
    xaxis: {
      // categories: provinceData.map((p) => `${p.Name}`),
      categories: provinceData.map((p) => `${p.Name}`),
      labels: { style: { fontSize: "11px", fontWeight: "600" } },
    },
    yaxis: { labels: { style: { fontSize: "11px" } }, tickAmount: 4 },
    colors: ["#4f46e5"],
    grid: { borderColor: "#f0f0f0" },
    tooltip: { y: { formatter: (v) => `${v} Properties` } },
  };
  const districtChartSeries = [{ name: "Properties", data: districtData.map((p) => p.TotalProperty) }];

  //province chart
  const districtChartOptions: ApexOptions = {
   chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
       plotOptions: { bar: { borderRadius: 6, horizontal: false, columnWidth: "45%" } },
    dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: "700" } },
    xaxis: {
      categories: districtData.map((p) => `${p.Name}`),
      labels: { style: { fontSize: "11px", fontWeight: "600" } },
    },
    yaxis: { labels: { style: { fontSize: "11px" } }, tickAmount: 4 },
    colors: ["#4f46e5"],
    grid: { borderColor: "#f0f0f0" },
    tooltip: { y: { formatter: (v) => `${v} Properties` } },
  };
  const provinceChartSeries = [{ name: "Properties", data: provinceData.map((p) => p.TotalProperty) }];
 

  // Paid vs Unpaid radial bar
  const radialOptions: ApexOptions = {
    chart: { type: "radialBar", background: "transparent" },
    plotOptions: {
      radialBar: {
        hollow: { size: "55%" },
        dataLabels: {
          name: { fontSize: "13px", fontWeight: "700", color: "#374151" },
          value: { fontSize: "22px", fontWeight: "900", color: "#4f46e5", formatter: (v) => `${(v).toFixed(2)}%` },
        },
        track: { background: "#e0e7ff" },
      },
    },
    colors: ["#4f46e5"],
    labels: ["Payment Rate"],
  };
  const radialSeries = [d?.paymentPercentage ?? 0];

  // ───────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-outline font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-error-container/20 border border-error-container rounded-2xl text-center">
        <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
        <h3 className="text-on-error-container font-headline font-bold text-lg">Failed to Load Dashboard</h3>
        <p className="text-on-error-container/70 text-sm mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* ── Summary Cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Properties */}
        <div className="bg-surface-container-low p-6 rounded-2xl space-y-2 border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total Properties</p>
          <h3 className="font-headline text-4xl font-black text-primary">{d?.totalProperty ?? 0}</h3>
          <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-primary">landscape</span>
              {d?.totalLand ?? 0} Land
            </span>
            <span className="text-outline">·</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-secondary">apartment</span>
              {d?.totalBuilding ?? 0} Building
            </span>
          </div>
        </div>

        {/* Total Paid Amount */}
        <div className="bg-surface-container-low p-6 rounded-2xl space-y-2 border-l-4 border-on-primary-fixed-variant shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total Paid Amount</p>
          <h3 className="font-headline text-3xl font-black text-on-primary-fixed-variant">
            रू {(d?.totalPaidAmount ?? 0).toLocaleString()}
          </h3>
          <p className="text-[11px] text-outline font-semibold">{d?.totalPaidProperty ?? 0} properties paid</p>
        </div>

        {/* Payment Progress */}
        <div className="bg-surface-container-highest p-6 rounded-2xl space-y-3 border-l-4 border-tertiary shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-tertiary-container">Payment Progress</p>
          <h3 className="font-headline text-4xl font-black text-on-tertiary-container">{(d?.paymentPercentage ?? 0).toFixed(2)}%</h3>
          <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden">
            <div
              className="bg-tertiary h-full rounded-full transition-all duration-700"
              style={{ width: `${d?.paymentPercentage ?? 0}%` }}
            />
          </div>
        </div>

        {/* Unpaid Properties */}
        <div className="bg-error-container/50 p-6 rounded-2xl space-y-2 border-l-4 border-error shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-error-container">Unpaid Properties</p>
          <h3 className="font-headline text-4xl font-black text-on-error-container">{unpaidProperty}</h3>
          <p className="text-[11px] text-on-error-container/70 font-bold uppercase italic">Pending payment</p>
        </div>
      </section>

      {/* ── Charts Row 1: Province Bar + Payment Radial ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Province Bar Chart */}
       <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-container shadow-sm p-6">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-primary text-lg">bar_chart</span>
      <h4 className="font-headline font-bold text-primary text-sm">
        Properties by {viewType === 'district' ? 'District' : 'Province'}
      </h4>
    </div>

    {/* Radio Buttons for Switching */}
    <div className="flex bg-surface-container-low p-1 rounded-lg gap-1 border">
      <button
        onClick={() => setViewType('district')}
        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
          viewType === 'district' ? 'bg-primary text-white shadow-sm' : 'text-outline hover:bg-surface-container-highest'
        }`}
      >
        District
      </button>
      <button
        onClick={() => setViewType('province')}
        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
          viewType === 'province' ? 'bg-primary text-white shadow-sm' : 'text-outline hover:bg-surface-container-highest'
        }`}
      >
        Province
      </button>
    </div>
  </div>

  {/* Dynamic Chart Display */}
  {(viewType === 'district' ? districtData : provinceData).length > 0 ? (
    <ReactApexChart
      options={viewType === 'district' ? districtChartOptions : provinceChartOptions}
      series={viewType === 'district' ? districtChartSeries : provinceChartSeries}
      type="bar"
      height={220}
    />
  ) : (
    <div className="h-[220px] flex items-center justify-center text-outline text-sm">
      No {viewType} data available
    </div>
  )}
</div>

        {/* Payment Radial */}
        <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-6 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-2 w-full">
            <span className="material-symbols-outlined text-primary text-lg">donut_large</span>
            <h4 className="font-headline font-bold text-primary text-sm">Payment Rate</h4>
          </div>
          <ReactApexChart
            options={radialOptions}
            series={radialSeries}
            type="radialBar"
            height={220}
          />
          <div className="flex gap-6 mt-2 text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-on-surface-variant">Paid: {d?.totalPaidProperty ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-error" />
              <span className="text-on-surface-variant">Unpaid: {unpaidProperty}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
         {/* Local Body Horizontal Bar */}
        <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-6 flex flex-col h-[380px]">
        <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-6 flex flex-col h-[380px]">
          {/* Header Section */}
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <span className="material-symbols-outlined text-[#0ea5e9] text-lg">home_work</span>
            <h4 className="font-headline font-bold text-[#0ea5e9] text-sm">Properties by Local Body</h4>
            <span className="ml-auto bg-tertiary-container text-on-tertiary-container text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              {localBodyData.length} Bodies
            </span>
          </div>

          {/* Scrollable Table Container */}
          <div className="flex-grow overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin scrollbar-thumb-slate-200">
            {localBodyData.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-slate-100">
                    {/* Added S.N. Header */}
                    <th className="py-2 w-10 text-[11px] font-bold text-slate-500 uppercase tracking-wider">S.N.</th>
                    <th className="py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Local Body</th>
                    <th className="py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Properties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {localBodyData.map((data, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      {/* Added S.N. Cell using index + 1 */}
                      <td className="py-2.5 text-xs text-slate-400 font-mono">
                        {index + 1}.
                      </td>
                      <td className="py-2.5 text-sm text-slate-700 font-medium">
                        {data.Name || data.LocalBodyId}
                      </td>
                      <td className="py-2.5 text-sm text-slate-600 text-right font-mono">
                        {data.TotalProperty || data.TotalProperty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex items-center justify-center text-outline text-sm italic">
                No local body data
              </div>
            )}
          </div>
          </div>
        </div>
      </section>

      {/* System Footer */}
      <footer className="pt-4 text-center text-outline text-[10px] font-black uppercase tracking-[0.2em] space-x-8 opacity-40">
        <span>© 2081 Property Management System</span>
      </footer>
    </div>
  );
}