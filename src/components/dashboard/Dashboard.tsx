import { useFetchAll } from "@/hooks/useFetchAll";
import type { DashboardData, ProvinceData, DistrictData, LocalBodyData, LeaderboardData } from "@/type/dashboard";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { items: dashboardResponse, isLoadingItems: loading, error } = useFetchAll<DashboardData>("/api/dashboard", ["dashboard"]);
  const { items: leaderboardResponse } = useFetchAll<LeaderboardData>("/api/leaderboard", ["leaderboard"]);

  function getDashboardData(res: any): DashboardData | null {
    if (!res) return null;
    if (res.data) {
      const data = res.data;
      return Array.isArray(data) && data.length > 0 ? data[0] : data;
    }
    return null;
  }

  function getLeaderboardData(res: any): LeaderboardData[] | null {
    if (!res) return null;
    if (res.data) {
      const data = res.data;
      return Array.isArray(data) ? data : [data];
    }
    return null;
  }

  const d = getDashboardData(dashboardResponse);
  const ld = getLeaderboardData(leaderboardResponse);

  const provinceData: ProvinceData[] = d?.provinceData ? JSON.parse(d.provinceData) : [];
  const districtData: DistrictData[] = d?.districtData ? JSON.parse(d.districtData) : [];
  const localBodyData: LocalBodyData[] = d?.localBodyData ? JSON.parse(d.localBodyData) : [];

  const unpaidProperty = (d?.totalProperty ?? 0) - (d?.totalPaidProperty ?? 0);

  // ── ApexCharts configs ──────────────────────────────────────────────────────

  // Province bar chart
  const provinceChartOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
    plotOptions: { bar: { borderRadius: 6, horizontal: false, columnWidth: "45%" } },
    dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: "700" } },
    xaxis: {
      // categories: provinceData.map((p) => `${p.Name}`),
      categories: districtData.map((p) => `${p.Name}`),
      labels: { style: { fontSize: "11px", fontWeight: "600" } },
    },
    yaxis: { labels: { style: { fontSize: "11px" } }, tickAmount: 4 },
    colors: ["#4f46e5"],
    grid: { borderColor: "#f0f0f0" },
    tooltip: { y: { formatter: (v) => `${v} Properties` } },
  };
  const provinceChartSeries = [{ name: "Properties", data: provinceData.map((p) => p.TotalProperty) }];

  // District donut chart
  const districtDonutOptions: ApexOptions = {
    chart: { type: "donut", background: "transparent" },
    labels: provinceData.map((d) => `${d.Name}`),
    // labels: districtData.map((d) => `${d.Name}`),
    colors: ["#4f46e5", "#7c3aed", "#a855f7", "#c084fc", "#e879f9", "#f0abfc"],
    dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: "700" } },
    legend: { position: "bottom", fontSize: "11px", fontWeight: "600" },
    plotOptions: { pie: { donut: { size: "60%", labels: { show: true, total: { show: true, label: "Total", formatter: () => `${districtData.reduce((a, b) => a + b.TotalProperty, 0)}` } } } } },
    tooltip: { y: { formatter: (v) => `${v} Properties` } },
  };
  const districtDonutSeries = districtData.map((d) => d.TotalProperty);


  // Local Body bar chart (horizontal)
  const localBodyChartOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
    plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: "50%" } },
    dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: "700" } },
    xaxis: { labels: { style: { fontSize: "11px" } }, tickAmount: 4 },
    yaxis: {
      categories: localBodyData.map((lb) => `${lb.Name}`),
      labels: { style: { fontSize: "11px", fontWeight: "600" } },
    },
    colors: ["#0ea5e9"],
    grid: { borderColor: "#f0f0f0" },
    tooltip: { y: { formatter: (v) => `${v} Properties` } },
  };
  const localBodyChartSeries = [{ name: "Properties", data: localBodyData.map((lb) => lb.TotalProperty) }];


  // Paid vs Unpaid radial bar
  const radialOptions: ApexOptions = {
    chart: { type: "radialBar", background: "transparent" },
    plotOptions: {
      radialBar: {
        hollow: { size: "55%" },
        dataLabels: {
          name: { fontSize: "13px", fontWeight: "700", color: "#374151" },
          value: { fontSize: "22px", fontWeight: "900", color: "#4f46e5", formatter: (v) => `${v}%` },
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
          <h3 className="font-headline text-4xl font-black text-on-tertiary-container">{d?.paymentPercentage ?? 0}%</h3>
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
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-lg">bar_chart</span>
            <h4 className="font-headline font-bold text-primary text-sm">Properties by District</h4>
            <span className="ml-auto bg-primary-container text-on-primary-container text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              {districtData.length} Districts
            </span>
          </div>
          {districtData.length > 0 ? (
            <ReactApexChart
              options={provinceChartOptions}
              series={provinceChartSeries}
              type="bar"
              height={220}
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-outline text-sm">No province data</div>
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

      {/* ── Charts Row 2: District Donut + Top Performers Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* District Donut */}
        <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-secondary text-lg">pie_chart</span>
            <h4 className="font-headline font-bold text-secondary text-sm">Properties by Province</h4>
            <span className="ml-auto bg-secondary-container text-on-secondary-container text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              {provinceData.length}
            </span>
          </div>
          {provinceData.length > 0 ? (
            <ReactApexChart
              options={districtDonutOptions}
              series={districtDonutSeries}
              type="donut"
              height={280}
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-outline text-sm">No district data</div>
          )}
        </div>

        {/* Top Performers Leaderboard */}
        <div className="bg-white rounded-2xl border flex flex-col border-gray-200 shadow-md overflow-hidden p-6 relative">

          {/* subtle decorative circle (lighter now) */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-gray-100 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0 border border-yellow-200">
                <span
                  className="material-symbols-outlined text-yellow-600 text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  trophy
                </span>
              </div>

              <div>
                <h4 className="font-headline font-bold text-gray-800 text-base">
                  Top Performing Offices
                </h4>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mt-0.5">
                  By Total Properties
                </p>
              </div>
            </div>

            <Link
              to="/leaderboard"
              className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
            >
              View All
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 relative z-10 custom-scrollbar pr-1">
            {!ld ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                <span className="material-symbols-outlined text-3xl opacity-50">
                  leaderboard
                </span>
                <p>No leaderboard data available</p>
              </div>
            ) : (
              console.log("ld", ld),
              (Array.isArray(ld) ? ld : [ld]).slice(0, 4).map((item: LeaderboardData) => {
                console.log("asdasdj", item.rankPosition)
                const isTop3 = item.rankPosition <= 3;
                return (
                  <div
                    key={item.officeId}
                    className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 rounded-xl p-3"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-sm ${item.rankPosition === 1
                        ? "bg-yellow-400 text-yellow-900"
                        : item.rankPosition === 2
                          ? "bg-gray-300 text-gray-800"
                          : item.rankPosition === 3
                            ? "bg-amber-600 text-white"
                            : "bg-gray-200 text-gray-600 font-bold"
                        }`}
                    >
                      {item.rankPosition}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate leading-snug ${isTop3
                          ? "font-bold text-gray-900"
                          : "font-semibold text-gray-700"
                          }`}
                      >
                        {item.officeName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`font-black text-lg leading-none ${isTop3 ? "text-yellow-600" : "text-gray-800"
                          }`}
                      >
                        {item.totalProperties.toLocaleString()}
                      </p>
                      <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold mt-1">
                        Properties
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Property Type Breakdown ── */}
      <section className="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
        <h4 className="font-headline font-bold text-primary flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-sm">category</span>
          Property Type Overview
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Land */}
          <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>landscape</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-outline">Land</p>
              <p className="text-3xl font-black font-headline text-primary">{d?.totalLand ?? 0}</p>
              <p className="text-[11px] text-outline font-semibold">
                {d?.totalProperty ? Math.round((d.totalLand / d.totalProperty) * 100) : 0}% of total
              </p>
            </div>
          </div>
          {/* Building */}
          <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>apartment</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-outline">Building</p>
              <p className="text-3xl font-black font-headline text-secondary">{d?.totalBuilding ?? 0}</p>
              <p className="text-[11px] text-outline font-semibold">
                {d?.totalProperty ? Math.round((d.totalBuilding / d.totalProperty) * 100) : 0}% of total
              </p>
            </div>
          </div>
          {/* Paid vs Unpaid */}
          <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-tertiary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-outline">Paid / Total</p>
              <p className="text-3xl font-black font-headline text-tertiary">
                {d?.totalPaidProperty ?? 0}<span className="text-lg text-outline font-medium">/{d?.totalProperty ?? 0}</span>
              </p>
              <p className="text-[11px] text-outline font-semibold">{d?.paymentPercentage ?? 0}% cleared</p>
            </div>
          </div>
        </div>
      </section>

      {/* System Footer */}
      <footer className="pt-4 text-center text-outline text-[10px] font-black uppercase tracking-[0.2em] space-x-8 opacity-40">
        <span>© NFINX Property Management System</span>
      </footer>
    </div>
  );
} 