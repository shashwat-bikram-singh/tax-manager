import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { useFetchAll } from "@/hooks/useFetchAll";
import { FileText, AlertTriangle, Scale, Gavel, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Report() {
  const { items: response, isLoading } = useFetchAll<any>("/decision-logic", [
    "decision-logic",
  ]);
  const navigate = useNavigate();

  const apiData = response?.data;
  const data = Array.isArray(apiData) ? apiData : [];
  const firstRecord = data?.[0] || {};

  const summaryData = useMemo(() => {
    const summary = firstRecord?.summary;
    if (!summary) return [];
    try { return JSON.parse(summary); }
    catch { return []; }
  }, [firstRecord]);

  const encroachedTotal = useMemo(
    () => summaryData.find((item: any) => item.Category === "Encroached")?.Total ?? 0,
    [summaryData]
  );
  const missingDocsTotal = useMemo(
    () => summaryData.find((item: any) => item.Category === "Missing Documents")?.Total ?? 0,
    [summaryData]
  );

  // ── Parse litigationDetails — array of { ProvinceName, Properties[] } ──
  const litigationDetails = useMemo(() => {
    const raw = firstRecord?.litigationDetails;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
      catch { return []; }
    }
    return [];
  }, [firstRecord]);

  // ── Province counts: count Properties[] length per province ──
  const provinceRows = useMemo(() => {
    return litigationDetails.map((item: any) => ({
      province: (item.ProvinceName ?? item.provinceName ?? "Unknown")
        .replace(/ Pradesh$/i, "")   // strip " Pradesh" suffix for display
        .trim(),
      count: Array.isArray(item.Properties) ? item.Properties.length : 0,
    }));
  }, [litigationDetails]);

  // Total litigation = sum of all property counts across provinces
  const litigationTotal = useMemo(
    () => provinceRows.reduce((sum: number, r: any) => sum + r.count, 0),
    [provinceRows]
  );

  // Only provinces with count > 0 go into the bar chart
  const chartDataRaw = useMemo(
    () => provinceRows.filter((r: any) => r.count > 0),
    [provinceRows]
  );

  const missingDocuments = useMemo(() => {
    const raw = firstRecord?.missingDocumentDetails;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
      catch { return []; }
    }
    return [];
  }, [firstRecord]);

  // ── Bar chart ──
  const xCategories = chartDataRaw.map((i: any) => i.province);
  const yData = chartDataRaw.map((i: any) => i.count);

  const series: ApexCharts.ApexOptions["series"] = [
    { name: "Active Cases", data: yData },
  ];

  const options: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: 350,
        toolbar: { show: false },
        fontFamily: "Inter, sans-serif",
        background: "transparent",
      },
      colors: ["#3b82f6"],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: chartDataRaw.length <= 3 ? "30%" : "60%",
          borderRadius: 6,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val}`,
        style: { fontSize: "12px", colors: ["#fff"] },
      },
      stroke: { show: true, width: 2, colors: ["transparent"] },
      xaxis: {
        categories: xCategories,
        labels: {
          rotate: -35,
          rotateAlways: true,
          trim: false,
          style: { fontSize: "11px", fontWeight: 500 },
        },
        title: { text: "Province", style: { fontWeight: 600, fontSize: "13px" } },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        tickAmount: Math.max(...yData, 1),
        labels: { formatter: (v: number) => Math.floor(v).toString() },
        title: { text: "Number of Cases", style: { fontWeight: 600, fontSize: "13px" } },
      },
      tooltip: {
        shared: true,
        intersect: false,
        x: { show: true },
        y: { formatter: (v: number) => `${v} Cases` },
      },
      legend: { position: "top" },
      grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
      title: {
        text: "Litigation Heat Map (by Province)",
        align: "left",
        style: { fontSize: "16px", fontWeight: "bold", fontFamily: "Inter, sans-serif", color: "#333" },
      },
    }),
    [chartDataRaw, xCategories, yData]
  );

  // ── Heatmap: always show all 7 provinces (including 0-count ones) ──
  function getHeatColor(count: number): {
    bg: string; border: string; textColor: string; labelColor: string;
  } {
    if (count >= 3) return {
      bg: "bg-red-200", border: "border-red-300",
      textColor: "text-red-700", labelColor: "text-red-500",
    };
    if (count >= 1) return {
      bg: "bg-red-100", border: "border-red-200",
      textColor: "text-red-600", labelColor: "text-red-400",
    };
    return {
      bg: "bg-gray-50", border: "border-gray-200",
      textColor: "text-gray-400", labelColor: "text-gray-300",
    };
  }

  const handleUpload = (id: number) => {
    navigate(`/app/document-vault/add?propertyId=${id}`);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-screen">
        <p className="text-gray-500">Loading Report...</p>
      </div>
    );
  }

  return (
    <div className=" animate-in fade-in duration-700 bg-gray-50 min-h-[95vh]">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
          <Scale className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Decision Logic</h1>
          <p className="text-sm text-gray-500 mt-1">Property Risk & Compliance Analysis</p>
        </div>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Litigation — total derived from Properties[] counts */}
       <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group h-20">
  <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />

  <div className="flex items-center justify-between">
    <div className="space-y-1">
      <div className="p-2 bg-red-50 rounded-md group-hover:bg-red-100 transition-colors">
        <Gavel className="w-5 h-5 text-red-600" />
      </div>

      <p className="text-[9px] font-black uppercase tracking-wider text-red-600">
        Litigation
      </p>
    </div>

    <div className="text-right">
      <h3 className="text-3xl font-black text-gray-900">
        {litigationTotal.toLocaleString()}
      </h3>

      <p className="text-[9px] text-gray-400 mt-0.5 font-semibold">
        {provinceRows.filter((r: any) => r.count > 0).length} province(s) affected
      </p>
    </div>
  </div>
</div>

        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group h-20">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="p-2 bg-amber-50 rounded-md group-hover:bg-amber-100 transition-colors">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-600">Encroached</p>
            </div>
            <div className="text-right">
              <h3 className="font-sans text-3xl font-black text-gray-900">{encroachedTotal.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group h-20">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="p-2 bg-blue-50 rounded-md group-hover:bg-blue-100 transition-colors">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-600">Missing Docs</p>
            </div>
            <div className="text-right">
              <h3 className="font-sans text-3xl font-black text-gray-900">{missingDocsTotal.toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Bar Chart */}
      <section className="mt-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {chartDataRaw.length > 0 ? (
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={350}
            key={xCategories.join(",")}
          />
        ) : (
          <div className="h-[350px] flex items-center justify-center text-gray-400">
            No litigation cases found across any province
          </div>
        )}
      </section>

      {/* Document Missing Index + Litigation Heatmap */}
      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* LEFT — Document Missing Index */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Document Missing Index</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Assets without verifiable Lalpurja (Land Ownership Certificate)
              </p>
            </div>
            <button
              onClick={() => handleUpload(firstRecord?.id)}
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors px-3 py-2 rounded-lg hover:bg-blue-100 flex-shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Doc
            </button>
          </div>

          {missingDocuments.length > 0 ? (
            <div className="space-y-3 overflow-y-auto max-h-80">
              {missingDocuments.map((doc: any, index: number) => (
                <div
                  key={doc.id || doc.assetId || index}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-amber-100 rounded-lg flex-shrink-0">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                        {doc.Name || "Unnamed Asset"}
                      </p>
                      {doc.Office && (
                        <p className="text-xs text-gray-400 mt-0.5">{doc.Office}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpload(doc.id ?? firstRecord?.id)}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-100 flex-shrink-0"
                  >
                    Upload Doc
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-gray-300 gap-3">
              <FileText className="w-10 h-10" />
              <p className="text-sm">No missing documents found</p>
            </div>
          )}
        </div>

        {/* RIGHT — Litigation Heatmap (all 7 provinces) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">Litigation Heatmap</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Active court cases distribution by Province
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 flex-1">
            {provinceRows.map(({ province, count }: any) => {
              const colors = getHeatColor(count);
              return (
                <div
                  key={province}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border ${colors.bg} ${colors.border} transition-all duration-200 hover:scale-105 cursor-default min-h-[90px]`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-widest text-center leading-tight ${colors.labelColor}`}>
                    {province.toUpperCase()}
                  </p>
                  <p className={`text-3xl font-black mt-1 ${colors.textColor}`}>
                    {count}
                  </p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${colors.labelColor}`}>
                    CASES
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-5 mt-5 pt-4 border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">High Critical (3+)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-200 flex-shrink-0" />
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">At Risk (1-2)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-200 flex-shrink-0" />
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Stabilized (0)</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}