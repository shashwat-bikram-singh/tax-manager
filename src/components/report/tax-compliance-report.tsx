import { useMemo } from "react";
import { useFetchAll } from "@/hooks/useFetchAll";
import ReactApexChart from "react-apexcharts";
import type { TaxDashboardData } from "@/type/tax-compliance";

export default function TaxComplianceReport() {
  const { items: response } = useFetchAll<TaxDashboardData>(
    "/tax-compliance-rpt",
    ["tax-compliance-report"]
  );
console.log("Tax Compliance Report Data:", response);
  const taxComplianceData = response?.data;

  // --- Summary Cards ---
  const { liability, paid, balance } = useMemo(() => {
    const overall = taxComplianceData?.table1?.[0];
    return {
      liability: overall?.overallTaxLiabilities ?? 0,
      paid:      overall?.overallTaxPaid ?? 0,
      balance:   overall?.overallOutstandingBalance ?? 0,
    };
  }, [taxComplianceData]);

  // --- Chart Data ---
  const chartDataRaw = useMemo(
    () =>
      (taxComplianceData?.table || [])
        .filter(
          (item: any) =>
            (item.totalTaxPaid || 0) > 0 || (item.outstandingBalance || 0) > 0
        )
        .map((item: any) => ({
          province: item.provinceName || "Unknown",
          paid:     item.totalTaxPaid || 0,
          unpaid:   item.outstandingBalance || 0,
        })),
    [taxComplianceData]
  );

  const series = [
    { name: "Total Tax Paid",      data: chartDataRaw.map((i: any) => i.paid) },
    { name: "Outstanding Balance", data: chartDataRaw.map((i: any) => i.unpaid) },
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type:        "bar",
      height:      350,
      toolbar:     { show: false },
      fontFamily:  "Inter, sans-serif",
      background:  "transparent",
    },
    colors: ["#10b981", "#1e3a8a"],
    plotOptions: {
      bar: {
        horizontal:  false,
        columnWidth: "60%",
        borderRadius: 6,
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show:   true,
      width:  2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: chartDataRaw.map((i: any) => i.province),
      labels: {
        rotate: -45,
        style:  { fontSize: "11px" },
      },
    },
    yaxis: {
      labels: {
        formatter: (v: number) => `NPR ${(v / 1000).toFixed(0)}k`,
      },
    },
    tooltip: {
      y: {
        formatter: (v: number) => `NPR ${v.toLocaleString()}`,
      },
    },
    legend: { position: "top" },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
    },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Total Tax Liability */}
        <div className="bg-surface-container-low p-6 rounded-2xl space-y-2 border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Total Tax Liability
          </p>
          <h3 className="font-headline text-3xl font-black text-on-primary-fixed-variant">
            NPR {liability.toLocaleString()}
          </h3>
        </div>

        {/* Total Tax Paid */}
        <div className="bg-surface-container-low p-6 rounded-2xl space-y-2 border-l-4 border-on-primary-fixed-variant shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Total Tax Paid
          </p>
          <h3 className="font-headline text-3xl font-black text-on-primary-fixed-variant">
            NPR {paid.toLocaleString()}
          </h3>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-surface-container-highest p-6 rounded-2xl space-y-3 border-l-4 border-tertiary shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-tertiary-container">
            Outstanding Balance
          </p>
          <h3 className="font-headline text-3xl font-black text-on-primary-fixed-variant">
            NPR {balance.toLocaleString()}
          </h3>
        </div>

      </section>

      {/* Chart */}
      <section className="bg-surface-container-low p-6 rounded-3xl shadow-sm border border-outline-variant">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-on-surface">
            Tax Liability by Province
          </h2>
          <p className="text-sm text-on-surface-variant">
            Comparison of Paid Tax vs Outstanding Balance
          </p>
        </div>

        {chartDataRaw.length === 0 ? (
          <div className="flex items-center justify-center h-[350px] text-on-surface-variant text-sm">
            No chart data available.
          </div>
        ) : (
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={350}
          />
        )}
      </section>

    </div>
  );
}