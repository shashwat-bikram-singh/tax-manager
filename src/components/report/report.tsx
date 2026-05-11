import { useMemo } from "react";
import { useFetchAll } from "@/hooks/useFetchAll";

import { FileText, AlertTriangle, Scale, Gavel} from "lucide-react";

export default function Report() {
  // 'response' IS the data object because we destructure: const { items: response }
  const { items: response, isLoading } =
  useFetchAll<any>(
    "/decision-logic",
    ["decision-logic"]
  );

// Parse summary string safely
const summaryData = useMemo(() => {
  const summary = response?.data?.[0]?.summary;

  if (!summary) return [];

  try {
    return JSON.parse(summary);
  } catch (error) {
    console.error("Invalid summary JSON", error);
    return [];
  }
}, [response]);

// --- Calculate Totals ---
const litigationTotal = useMemo(
  () =>
    summaryData.find(
      (item: any) =>
        item.Category === "Litigation"
    )?.Total ?? 0,
  [summaryData]
);

const encroachedTotal = useMemo(
  () =>
    summaryData.find(
      (item: any) =>
        item.Category === "Encroached"
    )?.Total ?? 0,
  [summaryData]
);

const missingDocsTotal = useMemo(
  () =>
    summaryData.find(
      (item: any) =>
        item.Category === "Missing Documents"
    )?.Total ?? 0,
  [summaryData]
);

  // --- Loading State ---


  return (
    <div className="p-8 animate-in fade-in duration-700">
      {/* --- Header --- */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
          <Scale className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Decision Logic
          </h1>
          <p className="text-sm text-gray-500 mt-1">Property Risk & Compliance Analysis</p>
        </div>
      </div>

      {/* --- Cards Grid --- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Litigation */}
        <div className="bg-surface-container-low p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          {/* Accent Border */}
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
              <h3 className="font-headline text-4xl font-black text-gray-900">
                {litigationTotal.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Card 2: Encroached */}
        <div className="bg-surface-container-low p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          {/* Accent Border */}
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
              <h3 className="font-headline text-4xl font-black text-gray-900">
                {encroachedTotal.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Card 3: Missing Documents */}
        <div className="bg-surface-container-highest p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          {/* Accent Border */}
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
              <h3 className="font-headline text-4xl font-black text-gray-900">
                {missingDocsTotal.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}