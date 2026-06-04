import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { useFetchAll } from "@/hooks/useFetchAll";
import { FileText, AlertTriangle, Scale, Gavel, Upload, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProjectMap } from "@/components/map/projectmap"; // ✅ adjust path if needed

export default function Report() {
  const { items: response, isLoading } = useFetchAll<any>("/decision-logic", [
    "decision-logic",
  ]);
  const navigate = useNavigate();

  const apiData = response?.data;
  const data = Array.isArray(apiData) ? apiData : [];
  const firstRecord = data?.[0] || {};

  console.log("firstRecord:", firstRecord);

  // Parse summary string safely
  const summaryData = useMemo(() => {
    const summary = firstRecord?.summary;
    if (!summary) return [];
    try {
      return JSON.parse(summary);
    } catch (error) {
      console.error("Invalid summary JSON", error);
      return [];
    }
  }, [firstRecord]);
  // --- Calculate Totals ---
  const litigationTotal = useMemo(
    () =>
      summaryData.find((item: any) => item.Category === "Litigation")?.Total ?? 0,
    [summaryData]
  );

  const encroachedTotal = useMemo(
    () =>
      summaryData.find((item: any) => item.Category === "Encroached")?.Total ?? 0,
    [summaryData]
  );

  const missingDocsTotal = useMemo(
    () =>
      summaryData.find((item: any) => item.Category === "Missing Documents")?.Total ?? 0,
    [summaryData]
  );

  // --- Parse litigationDetails ---
  const litigationDetails = useMemo(() => {
    const raw = firstRecord?.litigationDetails;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [firstRecord]);

  // --- Parse missingDocuments ---
  const missingDocuments = useMemo(() => {
    const raw = firstRecord?.missingDocumentDetails;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        console.error("Failed to parse missingDocuments");
        return [];
      }
    }
    return [];
  }, [firstRecord]);

  console.log("missingDocuments:", missingDocuments);

  // --- Count cases per province ---
  const chartDataRaw = useMemo(() => {
    if (!litigationDetails.length) return [];

    const provinceCounts: Record<string, number> = {};
    litigationDetails.forEach((item: any) => {
      const name =
        item.provinceName?.trim() ||
        item.ProvinceName?.trim() ||
        item.province?.trim() ||
        "Unknown";
      provinceCounts[name] = (provinceCounts[name] || 0) + 1;
    });

    return Object.entries(provinceCounts).map(([province, count]) => ({
      province,
      count,
    }));
  }, [litigationDetails]);

  const xCategories = chartDataRaw.map((i) => i.province);
  const yData = chartDataRaw.map((i) => i.count);

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
        title: {
          text: "Province",
          style: { fontWeight: 600, fontSize: "13px" },
        },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: { formatter: (v: number) => Math.floor(v).toString() },
        title: {
          text: "Number of Cases",
          style: { fontWeight: 600, fontSize: "13px" },
        },
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
        style: {
          fontSize: "16px",
          fontWeight: "bold",
          fontFamily: "Inter, sans-serif",
          color: "#333",
        },
      },
    }),
    [chartDataRaw, xCategories]
  );

  const handleUpload = (id: number) => {
    navigate(`/documentForm/add?propertyId=${id}`);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-screen">
        <p className="text-gray-500">Loading Report...</p>
      </div>
    );
  }

  return (
    <div className="p-8 animate-in fade-in duration-700 bg-gray-50 min-h-screen">
      {/* --- Header --- */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
          <Scale className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Decision Logic
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Property Risk & Compliance Analysis
          </p>
        </div>
      </div>

      {/* --- Cards Grid --- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Litigation */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
          <div className="flex items-start justify-between h-full">
            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                <Gavel className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">
                Litigation
              </p>
            </div>
            <div className="text-right">
              <h3 className="font-sans text-4xl font-black text-gray-900">
                {litigationTotal.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Card 2: Encroached */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
          <div className="flex items-start justify-between h-full">
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                Encroached
              </p>
            </div>
            <div className="text-right">
              <h3 className="font-sans text-4xl font-black text-gray-900">
                {encroachedTotal.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Card 3: Missing Documents */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
          <div className="flex items-start justify-between h-full">
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                Missing Docs
              </p>
            </div>
            <div className="text-right">
              <h3 className="font-sans text-4xl font-black text-gray-900">
                {missingDocsTotal.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* --- Chart Section --- */}
      <section className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
            No case data available to display chart
          </div>
        )}
      </section>

      {/* --- Document Missing Index Section --- */}
      <section className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {/* Section Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Document Missing Index
            </h2>
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

        {/* Document List — scrollable */}
        {missingDocuments.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {missingDocuments.map((doc: any, index: number) => {
              const assetName = doc.Name || "Unnamed Asset";
              const campus = doc.Office || "";

              return (
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
                        {assetName}
                      </p>
                      {campus && (
                        <p className="text-xs text-gray-400 mt-0.5">{campus}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-gray-300 gap-3">
            <FileText className="w-10 h-10" />
            <p className="text-sm">No missing documents found</p>
          </div>
        )}
      </section>

      {/* --- Map Section --- */}
      <section className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-blue-50 rounded-lg">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Property Location Map</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Geographic distribution of assets across Nepal
            </p>
          </div>
        </div>
        <div className="h-[520px] w-full rounded-xl overflow-hidden">
          <ProjectMap className="h-full w-full" />
        </div>
      </section>

    </div>
  );
}