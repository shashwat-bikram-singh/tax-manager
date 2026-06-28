import { useFetchAll } from "@/hooks/useFetchAll";
import type { DashboardData, ProvinceData, DistrictData, LocalBodyData, LeaderboardData, OwnershipDistribution } from "@/type/dashboard";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, X, MapPin, LayoutDashboard, Map } from "lucide-react";
import { ProjectMap } from "@/components/map/projectmap";
import { useAuthStore } from "@/store/authStore";
import { jwtDecode } from "jwt-decode";

// ─── SEARCHABLE SELECT ────────────────────────────────────────────────────────
interface SearchableSelectProps {
  options: any[];
  value: string | number | undefined | null;
  onChange: (value: string) => void;
  getLabel: (item: any) => string;
  placeholder: string;
  disabled?: boolean;
  isLoading?: boolean;
  onClear?: () => void;
  widthClass?: string;
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
  valueField = "Id",
}: SearchableSelectProps) => {
  const [inputValue, setInputValue] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const selectedOption = options.find((item) => {
        const itemValue = item[valueField] ?? item.Id ?? item.id ?? item.ProvinceId;
        return itemValue == value;
      });
      if (selectedOption) setInputValue(getLabel(selectedOption));
    } else {
      setInputValue("");
    }
  }, [value, options, valueField, getLabel]);

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
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
          <ChevronDown size={14} />
        </div>
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

// ─── HIGH RISK AUDIT TABLE ────────────────────────────────────────────────────
function getRiskLevel(legalStatus: string): { label: string; color: string; dot: string } {
  const s = legalStatus?.toLowerCase() || "";
  if (s.includes("litigation")) return { label: "High", color: "text-red-500", dot: "bg-red-500" };
  if (s.includes("encroach")) return { label: "Medium", color: "text-amber-500", dot: "bg-amber-500" };
  return { label: "Low", color: "text-green-500", dot: "bg-green-500" };
}

function getStatusBadge(legalStatus: string) {
  const s = legalStatus?.toLowerCase() || "";
  if (s.includes("litigation")) {
    return (
      <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-red-100 text-red-600 border border-red-200">
        Litigation
      </span>
    );
  }
  if (s.includes("encroach")) {
    return (
      <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 border border-amber-200">
        Encroached
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-green-100 text-green-600 border border-green-200">
      {legalStatus || "Normal"}
    </span>
  );
}

function HighRiskAuditTable() {
  const { items: rawPropertyData, isLoadingItems } = useFetchAll<any>("/api/property", ["property"]);

  const properties: any[] = useMemo(() => {
    const d = rawPropertyData?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(rawPropertyData)) return rawPropertyData as any[];
    return [];
  }, [rawPropertyData]);

  const highRiskProperties = useMemo(() =>
    properties.filter((p) => {
      const s = p.legalStatus?.toLowerCase() || "";
      return s.includes("litigation") || s.includes("encroach");
    }),
    [properties]
  );

  if (isLoadingItems) {
    return (
      <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-surface-container shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-red-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            warning
          </span>
        </div>
        <div>
          <h2 className="font-headline font-bold text-gray-800 text-base">
            High-Risk Property Audit{" "}
            <span className="text-gray-400 font-medium text-sm">(अतिक्रमण जोखिम)</span>
          </h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-0.5">
            Properties under litigation or encroachment risk
          </p>
        </div>
        <span className="ml-auto bg-red-50 text-red-600 border border-red-100 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
          {highRiskProperties.length} at risk
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-slate-50">
              <th className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Campus Name</th>
              <th className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Location</th>
              <th className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Issue Type</th>
              <th className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Area (M²)</th>
              <th className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Risk Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {highRiskProperties.length > 0 ? (
              highRiskProperties.map((property, index) => {
                const risk = getRiskLevel(property.legalStatus);
                const location = [property.municipality, property.province].filter(Boolean).join(", ");
                const issueType = property.buildingArea ? "Building" : "Land";
                const area = property.buildingArea || property.landArea;
                return (
                  <tr key={property.id ?? index} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{property.name || "-"}</td>
                    <td className="px-6 py-4 text-slate-500">{location || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        {issueType}
                        {Number(area) >= 10000 && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-mono font-medium">
                      {area ? Number(area).toLocaleString() : "-"}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(property.legalStatus)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${risk.dot}`} />
                        <span className={`font-semibold ${risk.color}`}>{risk.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                  No high-risk properties found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── SUMMARY CARDS ────────────────────────────────────────────────────────────
function SummaryCards({ d }: { d: DashboardData | null }) {
  const { t } = useTranslation();
  const unpaidProperty = (d?.totalProperty ?? 0) - (d?.totalPaidProperty ?? 0);

  return (
    <div className="grid grid-cols-1 gap-3 h-full">
      <div className="bg-surface-container-low p-4 rounded-2xl space-y-1.5 border-l-4 border-primary shadow-sm flex flex-col justify-between">
        <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">{t("dashboard.totalProperties")}</p>
        <h3 className="font-headline text-3xl font-black text-primary">{d?.totalProperty ?? 0}</h3>
        <div className="flex flex-col gap-1 text-[10px] font-bold text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-primary">landscape</span>
            {d?.totalLand ?? 0} {t("common.land")}
            <span className="material-symbols-outlined text-sm text-secondary">apartment</span>
            {d?.totalBuilding ?? 0} {t("common.building")}
          </span>
        </div>
      </div>

      <div className="bg-surface-container-low p-4 rounded-2xl space-y-1.5 border-l-4 border-on-primary-fixed-variant shadow-sm flex flex-col justify-between">
        <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">{t("dashboard.totalPaidAmount")}</p>
        <h3 className="font-headline text-2xl font-black text-on-primary-fixed-variant leading-tight">
          रू {(d?.totalPaidAmount ?? 0).toLocaleString()}
        </h3>
        <p className="text-[10px] text-outline font-semibold">{d?.totalPaidProperty ?? 0} {t("dashboard.propertiesPaid")}</p>
      </div>

      <div className="bg-surface-container-highest p-4 rounded-2xl space-y-1.5 border-l-4 border-tertiary shadow-sm flex flex-col justify-between">
        <p className="text-[8px] font-black uppercase tracking-widest text-on-tertiary-container">{t("dashboard.paymentProgress")}</p>
        <h3 className="font-headline text-3xl font-black text-on-tertiary-container">{(d?.paymentPercentage ?? 0).toFixed(2)}%</h3>
        <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden">
          <div
            className="bg-tertiary h-full rounded-full transition-all duration-700"
            style={{ width: `${d?.paymentPercentage ?? 0}%` }}
          />
        </div>
      </div>

      <div className="bg-error-container/50 p-4 rounded-2xl space-y-1.5 border-l-4 border-error shadow-sm flex flex-col justify-between">
        <p className="text-[8px] font-black uppercase tracking-widest text-on-error-container">{t("dashboard.unpaidProperties")}</p>
        <h3 className="font-headline text-3xl font-black text-on-error-container">{unpaidProperty}</h3>
        <p className="text-[10px] text-on-error-container/70 font-bold uppercase italic">{t("dashboard.pendingPayment")}</p>
      </div>
    </div>
  );
}

// ─── TAB BUTTON ───────────────────────────────────────────────────────────────
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${active
        ? "bg-primary text-white shadow-md shadow-primary/20"
        : "text-on-surface-variant hover:bg-surface-container-low"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"map" | "overview">("map");

  // ── District bar chart filters ──
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | number | null>(null);

  // ── Local body section filters ──
  const [lbProvinceId, setLbProvinceId] = useState<string | number | null>(null);
  const [lbDistrictId, setLbDistrictId] = useState<string | number | null>(null);

  const { token } = useAuthStore();
  const decoded: any = token ? jwtDecode(token) : {};
  const Role = (decoded?.Role ?? decoded?.role ?? "");
  const isSuperAdmin = Role.toLowerCase() === "superadmin";
  // const isAdmin = Role.toLowerCase() === "admin";


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
  const ownershipDistribution: OwnershipDistribution[] = d?.ownershipDistribution ? JSON.parse(d.ownershipDistribution) : [];
  const localBodyData: LocalBodyData[] = d?.localBodyData ? JSON.parse(d.localBodyData) : [];

  useEffect(() => {
    if (provinceData.length > 0 && !selectedProvinceId) {
      const bagmati = provinceData.find((p) => p.Name?.toLowerCase().includes("bagmati"));
      setSelectedProvinceId(bagmati ? bagmati.Id : provinceData[0].Id);
    }
  }, [provinceData, selectedProvinceId]);

  useEffect(() => {
    if (provinceData.length > 0 && !lbProvinceId) {
      const bagmati = provinceData.find((p) => p.Name?.toLowerCase().includes("bagmati"));
      setLbProvinceId(bagmati ? bagmati.Id : provinceData[0].Id);
    }
  }, [provinceData, lbProvinceId]);

  const filteredDistricts = useMemo(() => {
    if (!selectedProvinceId) return districtData;
    return districtData.filter((d) => d.ProvinceId === Number(selectedProvinceId));
  }, [districtData, selectedProvinceId]);

  useEffect(() => { setSelectedDistrictId(null); }, [selectedProvinceId]);

  const lbFilteredDistricts = useMemo(() => {
    if (!lbProvinceId) return districtData;
    return districtData.filter((d) => d.ProvinceId === Number(lbProvinceId));
  }, [districtData, lbProvinceId]);

  useEffect(() => { setLbDistrictId(null); }, [lbProvinceId]);

  const filteredLocalBodies = useMemo(() => {
    if (lbDistrictId) return localBodyData.filter((lb) => lb.DistrictId === Number(lbDistrictId));
    if (lbProvinceId) {
      const districtIds = lbFilteredDistricts.map((d) => d.DistrictId ?? d.Id);
      return localBodyData.filter((lb) => districtIds.includes(lb.DistrictId));
    }
    return localBodyData;
  }, [localBodyData, lbProvinceId, lbDistrictId, lbFilteredDistricts]);

  const unpaidProperty = (d?.totalProperty ?? 0) - (d?.totalPaidProperty ?? 0);

  const districtChartOptions: ApexOptions = useMemo(() => ({
    chart: { type: "bar", toolbar: { show: false }, background: "transparent", stacked: false },
    plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: filteredDistricts.map((p) => `${p.Name}`),
      labels: { style: { fontSize: "11px", fontWeight: "600" } },
    },
    yaxis: { labels: { style: { fontSize: "11px" } }, tickAmount: 4 },
    colors: ["#10b981", "#4f46e5"],
    grid: { borderColor: "#f0f0f0" },
    legend: { show: true, position: "top", horizontalAlign: "right", fontSize: "11px", fontFamily: "inherit", fontWeight: 600 },
    tooltip: { y: { formatter: (v) => `${v} Properties` } },
  }), [filteredDistricts]);

  const districtChartSeries = useMemo(() => [
    { name: t("common.land") || "Land", data: filteredDistricts.map((p) => p.TotalLand ?? 0) },
    { name: t("common.building") || "Building", data: filteredDistricts.map((p) => p.TotalBuilding ?? 0) },
  ], [filteredDistricts, t]);

  const radialOptions: ApexOptions = {
    chart: { type: "radialBar", background: "transparent" },
    plotOptions: {
      radialBar: {
        hollow: { size: "70%" },
        dataLabels: {
          name: { fontSize: "13px", fontWeight: "700", color: "#374151" },
          value: { fontSize: "22px", fontWeight: "900", color: "#4f46e5", formatter: (v) => `${v.toFixed(2)}%` },
        },
        track: { background: "#e0e7ff" },
      },
    },
    colors: ["#4f46e5"],
    labels: ["Payment Rate"],
  };
  const radialSeries = [d?.paymentPercentage ?? 0];

  const ownershipPieSeries = useMemo(() => {
    return ownershipDistribution.map((o) => Number(o.TotalProperty ?? 0));
  }, [ownershipDistribution]);

  const ownershipPieOptions: ApexOptions = useMemo(() => {
    return {
      chart: {
        type: "pie",
      },
      labels: ownershipDistribution.map(
        (o) => o.OwnershipName ?? "Unknown"
      ),
      legend: {
        position: "bottom",
        fontSize: "11px",
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`,
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val} properties`,
        },
      },
    };
  }, [ownershipDistribution]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
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
    <div className="space-y-4 animate-in fade-in duration-700">

      {/* ── Tab Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-md font-black text-gray-900 tracking-tight">Property Dashboard</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
            Tribhuvan University — Institutional PMS
          </p>
        </div>
        <div className="flex items-center bg-surface-container-low rounded-lg border border-surface-container">
          <TabButton
            active={activeTab === "map"}
            onClick={() => setActiveTab("map")}
            icon={<Map size={10} />}
            label="Map View"
          />
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            icon={<LayoutDashboard size={10} />}
            label="Overview"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: MAP VIEW — summary cards + map side by side
      ══════════════════════════════════════════════════════ */}
      {activeTab === "map" && (
        <section
          className="grid gap-5 grid grid-cols-[260px_1fr] min-h-[82vh]"
        >
          {/* Left: summary cards stacked */}
          <div className="flex flex-col gap-4">
            <SummaryCards d={d} />
          </div>

          {/* Right: full-height map */}
          <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Property Location Map</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Geographic distribution of assets across Nepal</p>
              </div>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden min-h-0">
              <ProjectMap className="h-full w-full" />
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: OVERVIEW — charts, leaderboard, tables
      ══════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">

          {/* ── District Bar Chart ── */}
          <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">bar_chart</span>
                <h4 className="font-headline font-bold text-primary text-sm">{t("dashboard.propertiesByDistrict")}</h4>
              </div>
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
            {filteredDistricts.length > 0 ? (
              <ReactApexChart options={districtChartOptions} series={districtChartSeries} type="bar" height={220} />
            ) : (
              <div className="h-[220px] flex items-center justify-center text-outline text-sm">{t("dashboard.noDataAvailable")}</div>
            )}
          </div>

          {/* ── Radial + Leaderboard ── */}
          <div className={`grid grid-cols-1 ${Role == "SuperAdmin" ? "lg:grid-cols-2" : "lg:grid-cols-1"} gap-6`}>
            {/* Radial chart — always shown */}
            <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-lg">donut_large</span>
                <h4 className="font-headline font-bold text-primary text-sm">{t("dashboard.paymentRate")}</h4>
              </div>
              <ReactApexChart options={radialOptions} series={radialSeries} type="radialBar" height={220} />
              <div className="flex gap-6 mt-2 text-[11px] font-bold">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-on-surface-variant">{t("dashboard.paid")}: {d?.totalPaidProperty ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-error" />
                  <span className="text-on-surface-variant">{t("dashboard.unpaid")}: {unpaidProperty}</span>
                </div>
              </div>
            </div>

            {/* Leaderboard — hidden for SuperAdmin */}
            {isSuperAdmin && (
              <div className="bg-white rounded-2xl border flex flex-col border-gray-200 shadow-md overflow-hidden p-6 relative">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-gray-100 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0 border border-yellow-200">
                      <span className="material-symbols-outlined text-yellow-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-gray-800 text-base">{t("dashboard.topPerformingOffices")}</h4>
                      <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mt-0.5">{t("dashboard.byTotalProperties")}</p>
                    </div>
                  </div>
                  <Link to="/app/leaderboardPage" className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1">
                    {t("dashboard.viewAll")}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 relative z-10 pr-1">
                  {!ld ? (
                    <div className="h-[220px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                      <p>{t("dashboard.noLeaderboardData")}</p>
                    </div>
                  ) : (
                    (Array.isArray(ld) ? ld : [ld]).slice(0, 4).map((item: LeaderboardData) => {
                      const isTop3 = item.rankPosition <= 3;
                      return (
                        <div key={item.officeId} className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 rounded-xl p-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-sm ${item.rankPosition === 1 ? "bg-yellow-400 text-yellow-900"
                            : item.rankPosition === 2 ? "bg-gray-300 text-gray-800"
                              : item.rankPosition === 3 ? "bg-amber-600 text-white"
                                : "bg-gray-200 text-gray-600 font-bold"
                            }`}>
                            {item.rankPosition}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate leading-snug ${isTop3 ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                              {item.officeName}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-black text-lg leading-none ${isTop3 ? "text-yellow-600" : "text-gray-800"}`}>
                              {item.totalProperties.toLocaleString()}
                            </p>
                            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold mt-1">{t("common.properties")}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Local Body Table ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT: LOCAL BODY TABLE */}
            {/* ── Local Body Table ── */}
            <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="material-symbols-outlined text-[#0ea5e9] text-lg">
                    home_work
                  </span>
                  <h4 className="font-headline font-bold text-[#0ea5e9] text-sm">
                    {t("dashboard.propertiesByLocalBody")}
                  </h4>
                  <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    {filteredLocalBodies.length} {t("common.bodies")}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Province:
                  </label>

                  <SearchableSelect
                    options={provinceData || []}
                    value={lbProvinceId}
                    onChange={(v) => setLbProvinceId(v)}
                    getLabel={(item) => item.Name || item.name}
                    placeholder="All Provinces"
                    widthClass="w-40"
                    isLoading={loading}
                    valueField="ProvinceId"
                    onClear={() => {
                      setLbProvinceId(null);
                      setLbDistrictId(null);
                    }}
                  />

                  {lbProvinceId && lbFilteredDistricts.length > 0 && (
                    <>
                      <label className="text-[11px] font-semibold text-slate-600">
                        District:
                      </label>

                      <SearchableSelect
                        options={lbFilteredDistricts}
                        value={lbDistrictId}
                        onChange={(v) => setLbDistrictId(v)}
                        getLabel={(item) => item.Name || item.name}
                        placeholder="All Districts"
                        widthClass="w-40"
                        isLoading={loading}
                        valueField="DistrictId"
                        onClear={() => setLbDistrictId(null)}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto max-h-[320px] pr-2">
                {filteredLocalBodies.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-slate-100">
                        <th className="py-2 text-[11px] font-bold text-slate-500 uppercase">
                          S.N.
                        </th>
                        <th className="py-2 text-[11px] font-bold text-slate-500 uppercase">
                          {t("common.localBody")}
                        </th>
                        <th className="py-2 text-[11px] font-bold text-slate-500 uppercase text-right">
                          {t("common.properties")}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-50">
                      {filteredLocalBodies.map((data, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="py-2.5 text-xs text-slate-400 font-mono">
                            {index + 1}.
                          </td>
                          <td className="py-2.5 text-sm text-slate-700 font-medium">
                            {data.Name || data.LocalBodyId}
                          </td>
                          <td className="py-2.5 text-sm text-right font-mono">
                            {data.TotalProperty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-outline text-sm italic">
                    No data
                  </div>
                )}
              </div>
            </div>

            {/* ── Ownership Distribution Pie Chart ── */}
            <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-purple-600 text-lg">
                  pie_chart
                </span>
                <h4 className="font-headline font-bold text-sm text-purple-600">
                  Ownership Distribution
                </h4>
              </div>

              {ownershipPieSeries.length > 0 ? (
                <ReactApexChart
                  options={ownershipPieOptions}
                  series={ownershipPieSeries}
                  type="pie"
                  height={300}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-outline text-sm italic">
                  No ownership data available
                </div>
              )}
            </div>

          </div>

          {/* ── High-Risk Property Audit Table ── */}
          <HighRiskAuditTable />

          {/* Footer */}
          <footer className="pt-4 text-center text-outline text-[10px] font-black uppercase tracking-[0.2em] space-x-8 opacity-40">
            <span>© NFINX Property Management System</span>
          </footer>
        </div>
      )}
    </div>
  );
}