import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useFetchAll } from "@/hooks/useFetchAll";
import { BarChart3, ShieldAlert, TrendingUp, Loader2 } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface LeaderBoardItem {
    OfficeId: number;
    OfficeName: string;
    TotalProperties: number;
    TotalLand: number;
    TotalBuilding: number;
    TotalValuation: number;
    RankPosition: number;
}

interface LegalDetail {
    LegalStatusId: number;
    LegalStatusName: string;
    DistrictName: string;
    LocalBodyName: string;
    TotalProperty: number;
}

interface LegalStatusProvince {
    ProvinceId: number;
    ProvinceName: string;
    Details: LegalDetail[];
}

interface TrendItem {
    Year: number;
    TotalAssets: number;
    EncroachedAssets: number;
}

interface ParsedAnalytics {
    leaderboard: LeaderBoardItem[];
    legalStatus: LegalStatusProvince[];
    trend: TrendItem[];
}

interface ApiTableRow {
    userRole: string;
    leaderBoard: string;
    legalStatus: string;
    encroachmentTrend: string;
}

interface ApiResponse {
    table: ApiTableRow[];
}

// ─── PARSER ───────────────────────────────────────────────────────────────────
function parseAnalyticData(raw: any): ParsedAnalytics {
    const emptyState: ParsedAnalytics = { leaderboard: [], legalStatus: [], trend: [] };
    try {
        // Handle both direct API response shapes
        const table: ApiTableRow[] | undefined =
            raw?.data?.table ?? raw?.table ?? (Array.isArray(raw) ? raw : undefined);

        if (!table || !table.length) return emptyState;

        const row = table[0];

        const leaderboard: LeaderBoardItem[] =
            typeof row.leaderBoard === "string" ? JSON.parse(row.leaderBoard) : (row.leaderBoard ?? []);

        const legalStatus: LegalStatusProvince[] =
            typeof row.legalStatus === "string" ? JSON.parse(row.legalStatus) : (row.legalStatus ?? []);

        const trend: TrendItem[] =
            typeof row.encroachmentTrend === "string" ? JSON.parse(row.encroachmentTrend) : (row.encroachmentTrend ?? []);

        return { leaderboard, legalStatus, trend };
    } catch (error) {
        console.error("Failed to parse analytic report data:", error);
        return emptyState;
    }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function AnalyticReport() {
    const { items: rawData, isLoadingItems } = useFetchAll<ApiResponse>("/analytics-rpt", ["analytics-rpt"]);

    const data = useMemo(() => parseAnalyticData(rawData), [rawData]);

    // ─── AGGREGATE LEGAL STATUS FOR DONUT CHART ───────────────────────────
    const legalAggregation = useMemo(() => {
        const counts: Record<string, number> = {};
        data.legalStatus.forEach((province) => {
            province.Details.forEach((detail) => {
                counts[detail.LegalStatusName] = (counts[detail.LegalStatusName] || 0) + detail.TotalProperty;
            });
        });

        const labels = Object.keys(counts);
        const values = Object.values(counts);

        const colorMap: Record<string, string> = {
            "Verified & Clear": "#10B981",
            "Encroached": "#F59E0B",
            "Under Litigation": "#EF4444",
            "In-Registration": "#3B82F6",
        };

        const colors = labels.map(label => colorMap[label] || "#6B7280");

        return { labels, values, colors };
    }, [data.legalStatus]);

    // ─── BAR CHART (Campus Comparison) ────────────────────────────────────
    const barChartOptions: ApexOptions = useMemo(() => ({
        chart: {
            type: 'bar',
            height: 350,
            toolbar: { show: false },
            background: 'transparent',
        },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '60%',
                borderRadius: 4,
            },
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: data.leaderboard.map(item => item.OfficeName),
            labels: { style: { colors: '#64748B', fontSize: '12px' } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: '#334155', fontSize: '13px', fontWeight: 600 },
                offsetX: -10,
            },
        },
        grid: {
            borderColor: '#F1F5F9',
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: false } },
            padding: { top: 0, bottom: 0, left: 10, right: 20 },
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            fontSize: '12px',
            fontWeight: 600,
            markers: { width: 10, height: 10, radius: 2 },
            itemMargin: { horizontal: 10 },
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: { formatter: (val: number) => `${val} Units` },
        },
        colors: ['#3B82F6', '#94A3B8'],
        theme: { mode: 'light' },
    }), [data.leaderboard]);

    const barChartSeries = useMemo(() => [
        { name: 'Total Land', data: data.leaderboard.map(item => item.TotalLand) },
        { name: 'Total Building', data: data.leaderboard.map(item => item.TotalBuilding) },
    ], [data.leaderboard]);

    // ─── DONUT CHART (Legal Issues) ────────────────────────────────────────
    const donutChartOptions: ApexOptions = useMemo(() => ({
        chart: {
            type: 'donut',
            height: 350,
            background: 'transparent',
        },
        labels: legalAggregation.labels,
        colors: legalAggregation.colors,
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        name: { show: false },
                        value: {
                            show: true,
                            fontSize: '24px',
                            fontWeight: 700,
                            color: '#1E293B',
                            offsetY: -5,
                        },
                        total: {
                            show: true,
                            label: 'Total Issues',
                            fontSize: '12px',
                            color: '#94A3B8',
                            fontWeight: 500,
                            formatter: (w: any) =>
                                w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0),
                        },
                    },
                },
            },
        },
        dataLabels: {
            enabled: true,
            formatter: (_val: number, opts: any) =>
                opts.w.globals.series[opts.seriesIndex],
            style: { fontSize: '13px', fontWeight: 'bold', colors: ['#FFFFFF'] },
            dropShadow: { enabled: false },
        },
        legend: {
            position: 'bottom',
            fontSize: '12px',
            fontWeight: 500,
            markers: { width: 10, height: 10, radius: 2 },
        },
        stroke: { width: 2, colors: ['#FFFFFF'] },
    }), [legalAggregation]);

    const donutChartSeries = legalAggregation.values;

    // ─── LINE CHART (Trend Analysis) ───────────────────────────────────────
    const lineChartOptions: ApexOptions = useMemo(() => ({
        chart: {
            type: 'line',
            height: 300,
            toolbar: { show: false },
            zoom: { enabled: false },
            background: 'transparent',
        },
        xaxis: {
            categories: data.trend.map(item => item.Year.toString()),
            labels: { style: { colors: '#64748B' } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: '#64748B' },
                formatter: (val: number) => val.toFixed(0),
            },
        },
        grid: {
            borderColor: '#F1F5F9',
            strokeDashArray: 4,
        },
        stroke: {
            width: 3,
            curve: 'smooth',
        },
        markers: {
            size: 4,
            strokeWidth: 2,
            hover: { size: 6 },
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            fontSize: '12px',
            fontWeight: 600,
            markers: { width: 10, height: 10, radius: 2 },
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: { formatter: (val: number) => `${val} Assets` },
        },
        colors: ['#3B82F6', '#EF4444'],
        theme: { mode: 'light' },
    }), [data.trend]);

    const lineChartSeries = useMemo(() => [
        { name: 'Total Verified Assets', data: data.trend.map(item => item.TotalAssets) },
        { name: 'Encroached Assets', data: data.trend.map(item => item.EncroachedAssets) },
    ], [data.trend]);

    // ─── LOADING ───────────────────────────────────────────────────────────
    if (isLoadingItems) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 bg-white rounded-2xl border border-slate-100 p-10">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-slate-500 font-medium text-sm">Fetching Analytical Data...</p>
            </div>
        );
    }

    return (
        <div className="max-w-8xl mx-auto space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Analytical Report</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Comprehensive insights into property distribution, legal status, and historical trends.
                </p>
            </div>

            {/* Top Grid: Bar Chart & Donut Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Campus Comparison */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Campus Comparison Report</h2>
                            <p className="text-xs text-slate-400 font-medium">Ranking based on total asset count vs area</p>
                        </div>
                    </div>
                    <div className="flex-grow">
                        {data.leaderboard.length > 0 ? (
                            <ReactApexChart
                                options={barChartOptions}
                                series={barChartSeries}
                                type="bar"
                                height={350}
                            />
                        ) : (
                            <div className="h-[350px] flex items-center justify-center text-slate-400 text-sm font-medium">
                                No leaderboard data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Legal Issues Concentration */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Legal Issues Concentration</h2>
                            <p className="text-xs text-slate-400 font-medium">Risk identification by campus locations</p>
                        </div>
                    </div>
                    <div className="flex-grow">
                        {donutChartSeries.length > 0 ? (
                            <ReactApexChart
                                options={donutChartOptions}
                                series={donutChartSeries}
                                type="donut"
                                height={350}
                            />
                        ) : (
                            <div className="h-[350px] flex items-center justify-center text-slate-400 text-sm font-medium">
                                No legal status data available
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Trend Analysis */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800">
                            Trend Analysis: Asset Growth vs Encroachment
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">
                            Year-over-year comparison of verified assets and encroached properties
                        </p>
                    </div>
                </div>
                <div>
                    {data.trend.length > 0 ? (
                        <ReactApexChart
                            options={lineChartOptions}
                            series={lineChartSeries}
                            type="line"
                            height={300}
                        />
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm font-medium">
                            No trend data available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}