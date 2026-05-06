import { useFetchAll } from "@/hooks/useFetchAll";
import type { DashboardData, ProvinceData, DistrictData, LocalBodyData, LeaderboardData } from "@/type/dashboard";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, X } from "lucide-react"; // Lucide imports needed for SearchableSelect
import { useRef } from "react"; // Hook needed for SearchableSelect

// ─── 1. PASTE THE SEARCHABLE SELECT COMPONENT HERE ───────────────────────────
interface SearchableSelectProps {
  options: any[];
  value: string | number | undefined | null;
  onChange: (value: string) => void;
  getLabel: (item: any) => string;
  placeholder: string;
  disabled?: boolean;
  isLoading?: boolean;
  onClear?: () => void;
  // Customizing for Dashboard width
  widthClass?: string; 
  // Field to use for the value (default: 'Id' or 'id')
  valueField?: string;
}

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  getLabel,
  placeholder,
  disabled = false,
  isLoading = false,
  onClear,
  widthClass = "w-full",
  valueField = "Id"
}: SearchableSelectProps) => {
  const [inputValue, setInputValue] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input with form value (e.g. when editing loads data)
  useEffect(() => {
    if (value) {
      const selectedOption = options.find((item) => {
        const itemValue = item[valueField] ?? item.Id ?? item.id ?? item.ProvinceId;
        return itemValue == value;
      });
      if (selectedOption) {
        setInputValue(getLabel(selectedOption));
      }
    } else {
      setInputValue("");
    }
  }, [value, options, valueField, getLabel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setShowOptions(val.length > 0);
    if (val.length === 0 && onClear) onClear();
  };

  const handleSelect = (item: any) => {
    setInputValue(getLabel(item));
    const itemValue = item[valueField] ?? item.Id ?? item.id ?? item.ProvinceId;
    onChange(itemValue ? itemValue.toString() : "");
    setShowOptions(false);
  };

  const filteredOptions = options.filter((item) =>
    getLabel(item).toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={`relative ${widthClass}`} ref={containerRef}>
      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowOptions(!disabled)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="w-full h-[32px] px-3 py-2 bg-surface-container-low border border-surface-container-highest text-on-surface-variant text-[11px] font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-none disabled:opacity-50"
        />
        {/* Chevron Icon */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
          <ChevronDown size={14} />
        </div>
        {/* Clear Button */}
        {value && inputValue && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInputValue("");
              onChange("");
              if (onClear) onClear();
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Dropdown Options */}
      {showOptions && !disabled && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-surface-container-highest rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <li className="p-3 text-center text-sm text-gray-500">Loading...</li>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((item, index) => (
              <li
                key={index}
                onClick={() => handleSelect(item)}
                className="px-3 py-2 text-sm text-on-surface-variant cursor-pointer hover:bg-primary/10 transition-colors border-b border-slate-50 last:border-0"
              >
                {getLabel(item)}
              </li>
            ))
          ) : (
            <li className="p-3 text-center text-sm text-gray-400 italic">No matches found</li>
          )}
        </ul>
      )}
    </div>
  );
};
// ────────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | number | null>(null);
  const { t } = useTranslation();
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

   // Debug: Log district data to verify ProvinceId field
   console.log('District Data:', districtData);
   console.log('Selected Province Id:', selectedProvinceId);

  // ── Logic: Set Default Province (Bagmati) ─────────────────────────────────────
  useEffect(() => {
    if (provinceData.length > 0 && !selectedProvinceId) {
      // Find Bagmati Province
      const bagmati = provinceData.find((p) => p.Name && p.Name.toLowerCase().includes("bagmati"));
      
      if (bagmati) {
        setSelectedProvinceId(bagmati.Id); 
      } else if (provinceData.length > 0) {
        // Fallback to first province if Bagmati not found
        setSelectedProvinceId(provinceData[0].Id);
      }
    }
  }, [provinceData, selectedProvinceId]);

   // ── Logic: Filter Districts based on Selection ──────────────────────────────────
   const filteredDistricts = useMemo(() => {
     if (!selectedProvinceId) return districtData;
     const provinceId = Number(selectedProvinceId);
     return districtData.filter((d) => d.ProvinceId === provinceId);
   }, [districtData, selectedProvinceId]);

   // ── Logic: Filter Local Bodies based on District Selection ─────────────────────
   const filteredLocalBodies = useMemo(() => {
     if (!selectedDistrictId) return localBodyData;
     const districtId = Number(selectedDistrictId);
     return localBodyData.filter((lb) => lb.DistrictId === districtId);
   }, [localBodyData, selectedDistrictId]);

   // Reset district selection when province changes
   useEffect(() => {
     setSelectedDistrictId(null);
   }, [selectedProvinceId]);


   const unpaidProperty = (d?.totalProperty ?? 0) - (d?.totalPaidProperty ?? 0);

   // ── District Chart Options (Dynamic based on filtered data) ────────────────────
   const districtChartOptions: ApexOptions = useMemo(() => ({
     chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
     plotOptions: { bar: { borderRadius: 6, horizontal: false, columnWidth: "40%" } },
     dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: "700" } },
     xaxis: {
       categories: filteredDistricts.map((p) => `${p.Name}`),
       labels: { style: { fontSize: "11px", fontWeight: "600" } },
     },
     yaxis: { labels: { style: { fontSize: "11px" } }, tickAmount: 4 },
     colors: ["#4f46e5"],
     grid: { borderColor: "#f0f0f0" },
     tooltip: { y: { formatter: (v) => `${v} Properties` } },
   }), [filteredDistricts]);

   const districtChartSeries = useMemo(() => [{ name: "Properties", data: filteredDistricts.map((p) => p.TotalProperty) }], [filteredDistricts]);


  // Paid vs Unpaid radial bar (Static)
  const radialOptions: ApexOptions = {
    chart: { type: "radialBar", background: "transparent" },
    plotOptions: {
      radialBar: {
        hollow: { size: "70%" },
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
          <p className="text-outline font-medium">{t("dashboard.loadingDashboard")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-error-container/20 border border-error-container rounded-2xl text-center">
        <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
        <h3 className="text-on-error-container font-headline font-bold text-lg">{t("dashboard.Failed to Load Dashboard")}</h3>
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
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{t("dashboard.totalProperties")}</p>
          <h3 className="font-headline text-4xl font-black text-primary">{d?.totalProperty ?? 0}</h3>
          <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-primary">landscape</span>
              {d?.totalLand ?? 0} {t("common.land")}
            </span>
            <span className="text-outline">·</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-secondary">apartment</span>
              {d?.totalBuilding ?? 0} {t("common.building")}
            </span>
          </div>
        </div>

        {/* Total Paid Amount */}
        <div className="bg-surface-container-low p-6 rounded-2xl space-y-2 border-l-4 border-on-primary-fixed-variant shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{t("dashboard.totalPaidAmount")}</p>
          <h3 className="font-headline text-3xl font-black text-on-primary-fixed-variant">
            रू {(d?.totalPaidAmount ?? 0).toLocaleString()}
          </h3>
          <p className="text-[11px] text-outline font-semibold">{d?.totalPaidProperty ?? 0} {t("dashboard.propertiesPaid")}</p>
        </div>

        {/* Payment Progress */}
        <div className="bg-surface-container-highest p-6 rounded-2xl space-y-3 border-l-4 border-tertiary shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-tertiary-container">{t("dashboard.paymentProgress")}</p>
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
          <p className="text-[10px] font-black uppercase tracking-widest text-on-error-container">{t("dashboard.unpaidProperties")}</p>
          <h3 className="font-headline text-4xl font-black text-on-error-container">{unpaidProperty}</h3>
          <p className="text-[11px] text-on-error-container/70 font-bold uppercase italic">{t("dashboard.pendingPayment")}</p>
        </div>
      </section>

      {/* ── Charts Row 1: District Bar + Payment Radial ── */}
      <div className="gap-3">
        {/* Bar Chart Section */}
        <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">bar_chart</span>
              <h4 className="font-headline font-bold text-primary text-sm">
                {t("dashboard.districtsBy")}
              </h4>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              
              {/* Province Searchable Select */}
              <SearchableSelect
                options={provinceData || []}
                value={selectedProvinceId}
                onChange={(v) => setSelectedProvinceId(v)}
                getLabel={(item) => item.Name || item.name}
                placeholder="Search Province..."
                widthClass="w-48"
                isLoading={loading}
                valueField="ProvinceId"
              />
            </div>
          </div>

          {/* District Chart Display */}
          {filteredDistricts.length > 0 ? (
            <ReactApexChart
              options={districtChartOptions}
              series={districtChartSeries}
              type="bar"
              height={220}
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-outline text-sm">
              {t("dashboard.noDataAvailable")}
            </div>
          )}
        </div>

      </div>

      {/* ── Charts Row 2: District Donut + Top Performers Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2 w-full">
            <span className="material-symbols-outlined text-primary text-lg">donut_large</span>
            <h4 className="font-headline font-bold text-primary text-sm">{t("dashboard.paymentRate")}</h4>
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
              <span className="text-on-surface-variant">{t("dashboard.paid")} : {d?.totalPaidProperty ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-error" />
              <span className="text-on-surface-variant">{t("dashboard.unpaid")} : {unpaidProperty}</span>
            </div>
          </div>
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
                  {t("dashboard.topPerformingOffices")}
                </h4>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mt-0.5">
                  {t("dashboard.byTotalProperties")}
                </p>
              </div>
            </div>

            <Link
              to="/leaderboard"
              className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
            >
              {t("dashboard.viewAll")}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 relative z-10 custom-scrollbar pr-1">
            {!ld ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                <span className="material-symbols-outlined text-3xl opacity-50">
                  {t("dashboard.leaderboard")}
                </span>
                <p>{t("dashboard.noLeaderboardData")}</p>
              </div>
            ) : (
              (Array.isArray(ld) ? ld : [ld]).slice(0, 4).map((item: LeaderboardData) => {
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
                        {t("common.properties")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
        {/* Local Body Horizontal Bar */}
        <div className="p-2 flex flex-col h-[380px]">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0ea5e9] text-lg">home_work</span>
              <h4 className="font-headline font-bold text-[#0ea5e9] text-sm">{t("dashboard.propertiesByLocalBody")}</h4>
              <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                {filteredLocalBodies.length} {t("common.bodies")}
              </span>
            </div>

            {/* District Filter - Only show when province is selected */}
            {selectedProvinceId && filteredDistricts.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">Filter by District:</label>
                <SearchableSelect
                  options={filteredDistricts || []}
                  value={selectedDistrictId}
                  onChange={(v) => setSelectedDistrictId(v)}
                  getLabel={(item) => item.Name || item.name}
                  placeholder="All Districts"
                  widthClass="w-44"
                  isLoading={loading}
                  valueField="DistrictId"
                  onClear={() => setSelectedDistrictId(null)}
                />
              </div>
            )}
          </div>

           {/* Scrollable Table Container */}
           <div className="flex-grow overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin scrollbar-thumb-slate-200">
             {filteredLocalBodies.length > 0 ? (
               <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-white z-10">
                   <tr className="border-b border-slate-100">
                     {/* Added S.N. Header */}
                     <th className="py-2 w-10 text-[11px] font-bold text-slate-500 uppercase tracking-wider">S.N.</th>
                     <th className="py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("common.localBody")}</th>
                     <th className="py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">{t("common.properties")}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {filteredLocalBodies.map((data, index) => (
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
                 {selectedDistrictId ? "No local bodies found for this district" : "Select a district to view local bodies"}
               </div>
             )}
           </div>
        </div>
      </section>
      {/* System Footer */}
      <footer className="pt-4 text-center text-outline text-[10px] font-black uppercase tracking-[0.2em] space-x-8 opacity-40">
        <span>© NFINX Property Management System</span>
      </footer>
    </div >
  );
}