import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { X, ShieldCheck } from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useMutate } from "@/hooks/useMutate";
import axiosInstance from "@/config/axios";
import type { District, LegalStatus, Localbody, OwnershipType, PropertyType, UsageRights, UsageType, PropertyDetail, GeographicRegion } from "@/type/property";
import NepaliDatePicker from "@/components/ui/NepaliDatePicker";

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const propertySchema = z.object({

  province: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  localbody: z.string().optional().nullable(),
  wardNo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  propertytype: z.string().optional().nullable(),
  currentUsage: z.string().optional().nullable(),
  legalstatus: z.string().optional().nullable(),
  valuation: z.string().optional().nullable(),
  kittaNumber: z.string().optional().nullable(),
  sheetNumber: z.string().optional().nullable(),
  groundCode: z.string().optional().nullable(),
  constructionYear: z.string().optional().nullable(),
  areaInSqMeters: z.coerce.number().min(0).optional().nullable(),
  ownershipType: z.string().optional().nullable(),
  legalStatus: z.string().optional().nullable(),
  usageRights: z.string().optional().nullable(),
  usageTypes: z.string().optional().nullable(),
  geographicRegion: z.string().optional().nullable(),
  encroachmentRisk: z.string().optional().nullable(),
  noOfFloor: z.coerce.number().optional().nullable(),
  ownershipTransferMiti: z.string().optional().nullable(),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  mode: "add" | "edit" | "view";
  // initialData?: Partial<PropertyFormValues> & {
  //   kittaNo?: string | null;
  //   verificationStatus?: "verified" | "unverified" | "pending";
  //   lastUpdated?: string | null;
  // };
  initialData?: PropertyDetail;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ─── Conversion Constants ─────────────────────────────────────────────────────
const TERAI_BIGHA_TO_SQM = 6772.63;
const TERAI_KATTHA_TO_SQM = TERAI_BIGHA_TO_SQM / 20;
const TERAI_DHUR_TO_SQM = TERAI_KATTHA_TO_SQM / 20;

const HILLY_ROPANI_TO_SQM = 508.72;
const HILLY_AANA_TO_SQM = HILLY_ROPANI_TO_SQM / 16;
const HILLY_PAISA_TO_SQM = HILLY_AANA_TO_SQM / 4;
const HILLY_DAAM_TO_SQM = HILLY_PAISA_TO_SQM / 4;
const SQM_TO_SQFT = 10.7639;

function calcTerai(bigha = 0, kattha = 0, dhur = 0) {
  return (bigha * TERAI_BIGHA_TO_SQM) + (kattha * TERAI_KATTHA_TO_SQM) + (dhur * TERAI_DHUR_TO_SQM);
}
function calcHilly(ropani = 0, aana = 0, paisa = 0, daam = 0) {
  return (ropani * HILLY_ROPANI_TO_SQM) + (aana * HILLY_AANA_TO_SQM) + (paisa * HILLY_PAISA_TO_SQM) + (daam * HILLY_DAAM_TO_SQM);
}

function convertSqmToTerai(sqm: number) {
  let remaining = sqm;

  const bigha = Math.floor(remaining / TERAI_BIGHA_TO_SQM);
  remaining -= bigha * TERAI_BIGHA_TO_SQM;

  const kattha = Math.floor(remaining / TERAI_KATTHA_TO_SQM);
  remaining -= kattha * TERAI_KATTHA_TO_SQM;

  const dhur = remaining / TERAI_DHUR_TO_SQM;

  return { bigha, kattha, dhur };
}


function convertSqmToHilly(sqm: number) {
  let remaining = sqm;

  const ropani = Math.floor(remaining / HILLY_ROPANI_TO_SQM);
  remaining -= ropani * HILLY_ROPANI_TO_SQM;

  const aana = Math.floor(remaining / HILLY_AANA_TO_SQM);
  remaining -= aana * HILLY_AANA_TO_SQM;

  const paisa = Math.floor(remaining / HILLY_PAISA_TO_SQM);
  remaining -= paisa * HILLY_PAISA_TO_SQM;

  const daam = remaining / HILLY_DAAM_TO_SQM;

  return { ropani, aana, paisa, daam };
}



// ─── Badge Component ──────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status?: string }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
        <ShieldCheck className="w-3.5 h-3.5" />
        Verified
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 text-xs font-semibold">
      Unverified
    </span>
  );
}



// ─── Measurement Converter Card ───────────────────────────────────────────────
export function MeasurementConverter() {
  const [measureType, setMeasureType] = useState<"terai" | "hilly">("terai");
  const [terai, setTerai] = useState({ bigha: "", kattha: "", dhur: "" });
  const [hilly, setHilly] = useState({ ropani: "", aana: "", paisa: "", daam: "" });
  const [sqmInput, setSqmInput] = useState("");
  const reverseTerai = convertSqmToTerai(Number(sqmInput) || 0);
  const reverseHilly = convertSqmToHilly(Number(sqmInput) || 0);
  const [mode, setMode] = useState<"forward" | "reverse">("forward");

  const sqm = measureType === "terai"
    ? calcTerai(Number(terai.bigha), Number(terai.kattha), Number(terai.dhur))
    : calcHilly(Number(hilly.ropani), Number(hilly.aana), Number(hilly.paisa), Number(hilly.daam));

  const sqft = sqm * SQM_TO_SQFT;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-base">straighten</span>
        </div>
        <h3 className="text-sm font-bold text-gray-900 tracking-tight">Measurement Converter</h3>
      </div>

      {/* Region Toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium">
        <button
          type="button"
          onClick={() => setMeasureType("terai")}
          className={`flex-1 py-1.5 rounded-md transition-all ${measureType === "terai" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >Terai (B·K·D)</button>
        <button
          type="button"
          onClick={() => setMeasureType("hilly")}
          className={`flex-1 py-1.5 rounded-md transition-all ${measureType === "hilly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >Hilly (R·A·P·D)</button>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-1 bg-indigo-50 border border-indigo-100 p-1 rounded-lg text-xs font-medium">
        <button
          type="button"
          onClick={() => setMode("forward")}
          className={`flex-1 py-1.5 rounded-md transition-all ${mode === "forward" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-500 hover:text-indigo-700"
            }`}
        >
          Standard → m²
        </button>
        <button
          type="button"
          onClick={() => setMode("reverse")}
          className={`flex-1 py-1.5 rounded-md transition-all ${mode === "reverse" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-500 hover:text-indigo-700"
            }`}
        >
          m² → Standard
        </button>
      </div>

      {/* Forward mode: Standard inputs */}
      {mode === "forward" && (
        <>
          {measureType === "terai" ? (
            <div className="grid grid-cols-3 gap-2">
              {(["bigha", "kattha", "dhur"] as const).map((unit) => (
                <div key={unit}>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">{unit}</label>
                  <input
                    type="number"
                    min="0"
                    value={terai[unit]}
                    onChange={(e) => setTerai((p) => ({ ...p, [unit]: e.target.value }))}
                    className="w-full text-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {(["ropani", "aana", "paisa", "daam"] as const).map((unit) => (
                <div key={unit}>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">{unit.charAt(0).toUpperCase() + unit.slice(1)}</label>
                  <input
                    type="number"
                    min="0"
                    value={hilly[unit]}
                    onChange={(e) => setHilly((p) => ({ ...p, [unit]: e.target.value }))}
                    className="w-full text-center bg-gray-50 border border-gray-200 rounded-lg px-1 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Standardized Area Result */}
          <div className="bg-[#0f2646] rounded-xl p-4 text-white">
            <p className="text-[10px] uppercase tracking-widest text-blue-200 font-semibold mb-1">Standardized Area</p>
            <p className="text-3xl font-black tracking-tight">{sqm.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-blue-300 text-xs mt-0.5">Square Meters (m²)</p>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xl font-bold">{sqft.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-blue-300 text-xs mt-0.5">Square Feet (sq ft)</p>
            </div>
          </div>
        </>
      )}

      {/* Reverse mode: SQM input */}
      {mode === "reverse" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Enter Square Meters</label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={sqmInput}
              onChange={(e) => setSqmInput(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold mb-2">
              {measureType === "terai" ? "Terai Equivalent" : "Hilly Equivalent"}
            </p>
            {measureType === "terai" ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-lg p-2 border border-indigo-100">
                  <p className="text-lg font-black text-indigo-700">{reverseTerai.bigha}</p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Bigha</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-indigo-100">
                  <p className="text-lg font-black text-indigo-700">{reverseTerai.kattha}</p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Kattha</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-indigo-100">
                  <p className="text-lg font-black text-indigo-700">{reverseTerai.dhur.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Dhur</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  { label: "Ropani", val: reverseHilly.ropani },
                  { label: "Aana", val: reverseHilly.aana },
                  { label: "Paisa", val: reverseHilly.paisa },
                  { label: "Daam", val: reverseHilly.daam.toFixed(2) },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-lg p-2 border border-indigo-100">
                    <p className="text-sm font-black text-indigo-700">{item.val}</p>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase">{item.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversion note */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
        <p className="text-[11px] text-amber-800 leading-snug">
          <span className="font-bold">Note:</span>{" "}
          1 {measureType === "terai" ? `Bigha = ${TERAI_BIGHA_TO_SQM.toLocaleString()} m²` : `Ropani = ${HILLY_ROPANI_TO_SQM.toLocaleString()} m²`} (1964 standard)
        </p>
      </div>
    </div>
  );
}

// ─── GIS Map Card ─────────────────────────────────────────────────────────────
// function GisMapCard({ lat, lng }: { lat?: number | null; lng?: number | null }) {
//   const displayLat = lat ? lat.toFixed(4) : "27.6811";
//   const displayLng = lng ? lng.toFixed(4) : "85.2848";

//   return (
//     <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-500 aspect-video min-h-[180px]">
//       {/* Topographic pattern overlay */}
//       <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
//         {[20, 40, 60, 80, 100, 120, 140, 160].map((r, i) => (
//           <ellipse key={i} cx="200" cy="150" rx={r * 1.8} ry={r} fill="none" stroke="white" strokeWidth="0.8" />
//         ))}
//         {[60, 100, 140].map((r, i) => (
//           <ellipse key={`b${i}`} cx="320" cy="80" rx={r} ry={r * 0.7} fill="none" stroke="white" strokeWidth="0.8" />
//         ))}
//       </svg>
//       {/* Red location pin */}
//       <div className="absolute inset-0 flex items-center justify-center">
//         <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg shadow-red-500/50"></div>
//       </div>
//       {/* GIS Coordinate badge */}
//       <div className="absolute bottom-3 left-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2">
//         <p className="text-[9px] uppercase tracking-widest text-white/60 font-semibold">GIS Coordinates</p>
//         <p className="text-white text-sm font-semibold mt-0.5">{displayLat}° N, {displayLng}° E</p>
//       </div>
//     </div>
//   );
// }

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function PropertyForm({ mode, initialData: propInitialData, onSuccess, onCancel }: PropertyFormProps) {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);


  const navigate = useNavigate();

  // Always fetch fresh data for this specific property ID (never serve stale cache)
  const { data: fetchedItem, isLoading: isFetchingProperty } = useQuery({
    queryKey: ["property-detail", id],
    queryFn: async () => {
      const res = await axiosInstance.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/property?id=${id}`
      );
      return res.data;
    },
    enabled: mode === "edit" && !!id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const fetchedData = (fetchedItem as any)?.data || fetchedItem;
  const propertyData = Array.isArray(fetchedData) ? fetchedData[0] : fetchedData;
  // Use propInitialData if provided, otherwise fallback to fetched data in edit mode
  const initialData = propInitialData || (mode === "edit" ? propertyData : undefined);

  const { create, update } = useMutate<PropertyDetail>("/api/property", "property");

  const { items: rawpropertyTypeData, isLoadingItems } = useFetchAll<PropertyType>("/api/propertytype", ["propertytype"]);
  const PropertyData = rawpropertyTypeData?.data

  const { items: rawlegalstatusData } = useFetchAll<LegalStatus>("/api/legalstatus", ["legalstatus"]);
  const legalstatusData = rawlegalstatusData?.data


  const { items: rawusagerightData } = useFetchAll<UsageRights>("/api/usageright", ["usageright"]);
  const usageRightsData = rawusagerightData?.data

  const { items: rawusageTypeData } = useFetchAll<UsageType>("/api/usagetype", ["usagetype"]);
  const usageTypeData = rawusageTypeData?.data


  const { items: rawgeographicRegionData } = useFetchAll<GeographicRegion>("/api/geogrpahic-region", ["geographicregion"]);
  const geographicRegionData = rawgeographicRegionData?.data

  const { items: rawownershipTypeData } = useFetchAll<OwnershipType>("/api/ownershiptype", ["ownershiptype"]);
  const ownershipTypeData = rawownershipTypeData?.data

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema) as any,
    defaultValues: {
      propertytype: initialData?.propertyTypeId?.toString() ?? "",
      name: initialData?.name ?? "",
      province: initialData?.provinceId?.toString() ?? "",
      district: initialData?.districtId?.toString() ?? "",
      localbody: initialData?.localBodyId?.toString() ?? "",
      description: initialData?.description ?? "",
      kittaNumber: (initialData as any)?.kittaNumber ?? null,
      wardNo: initialData?.wardNo?.toString() ?? "",
      groundCode: (initialData as any)?.landGeoCoordinate ?? "",
      constructionYear: (initialData as any)?.constructionYear ?? "",
      legalstatus: initialData?.legalStatusId?.toString() ?? "",
      areaInSqMeters: (initialData as any)?.landArea ?? 0,
      ownershipType: initialData?.ownershipTypeId?.toString() ?? "",
      usageRights: (initialData as any)?.usageRightId?.toString() ?? "",
      usageTypes: (initialData as any)?.usageId?.toString() ?? "",
      geographicRegion: (initialData as any)?.geographicRegion?.toString() ?? "",
      noOfFloor: (initialData as any)?.noOfFloors ?? 0,
      legalStatus: "",
      encroachmentRisk: "",
      currentUsage: "",
      valuation: (initialData as any)?.valuation?.toString() ?? "",
      ownershipTransferMiti: (initialData as any)?.ownershipTransferDate ?? "",
    },
  });

  const { items: rawProvinceData, isLoadingItems: isLoadingProvince } = useFetchAll("/api/province", ["province"]);
  const provinceData = rawProvinceData?.data;
  const selectedProvinceId = form.watch("province");
  const selectedDistrictId = form.watch("district");

  const { items: rawDistrictData, isLoadingItems: isLoadingDistrict } = useFetchAll<District>(
    selectedProvinceId ? `/api/district?provinceId=${selectedProvinceId}` : "",
    ["district", selectedProvinceId || ""]
  );
  const districtData = rawDistrictData?.data;

  const { items: rawLocalbodyData, isLoadingItems: isLoadingLocalbody } = useFetchAll<Localbody>(
    selectedDistrictId ? `/api/localbody?districtId=${selectedDistrictId}` : "",
    ["localbody", selectedDistrictId || ""]
  );
  const localbodyData = rawLocalbodyData?.data;
  useEffect(() => {
    if (!initialData) return;
    const d = initialData as any;
    form.reset({
      propertytype: d.propertyTypeId?.toString() ?? "",
      name: d.name ?? "",
      province: d.provinceId?.toString() ?? "",
      district: d.districtId?.toString() ?? "",
      localbody: d.localBodyId?.toString() ?? "",
      description: d.description ?? "",
      kittaNumber: d.kittaNumber ?? null,
      wardNo: d.wardNo?.toString() ?? "",
      groundCode: d.landGeoCoordinate ?? "",
      constructionYear: d.constructionYear ?? "",
      legalstatus: d.legalStatusId?.toString() ?? "",
      areaInSqMeters: d.landArea ?? 0,
      ownershipType: d.ownershipTypeId?.toString() ?? "",
      geographicRegion: d.geographicRegion?.toString() ?? "",
      usageRights: d.usageRightId?.toString() ?? "",
      usageTypes: d.usageId?.toString() ?? "",
      noOfFloor: d.noOfFloors ?? 0,
      legalStatus: "",
      encroachmentRisk: "",
      currentUsage: "",
      valuation: d.valuation?.toString() ?? "",
      ownershipTransferMiti: d.ownershipTransferDate ?? "",
    });
  }, [initialData]);

  const onSubmit = async (values: PropertyFormValues) => {
    setLoading(true);
    try {
      const payload: Partial<PropertyDetail> = {
        // userId: 
        propertyTypeId: Number(values.propertytype) || 0,
        name: values.name || "",
        provinceId: Number(values.province) || 0,
        districtId: Number(values.district) || 0,
        localBodyId: Number(values.localbody) || 0,
        wardNo: Number(values.wardNo) || 0,
        kittaNumber: values.kittaNumber || "",
        sheetNumber: values.sheetNumber || "",
        description: values.description || "",
        areaInSqMeters: Number(values.areaInSqMeters) || 0,
        geoCoordinates: values.groundCode || "",
        noOfFloor: Number(values.noOfFloor) || 0,
        constructionYear: values.constructionYear || "",
        usageId: Number(values.usageTypes) || 0,
        legalStatusId: Number(values.legalstatus) || 0,
        usageRightsId: Number(values.usageRights) || 0,
        ownershipTypeId: Number(values.ownershipType) || 0,
        geographicRegionId: Number(values.geographicRegion) || 0,
        ownershipTransferMiti: values.ownershipTransferMiti || "",
      };

      if (mode === "edit" && initialData?.id) {
        payload.id = initialData.id;
        await update.mutateAsync(payload as PropertyDetail);
      } else {
        await create.mutateAsync(payload as PropertyDetail);
      }

      toast.success(mode === "edit" ? "Property updated successfully ✅" : "Property saved successfully ✅", {
        style: { background: "#10b981", color: "white" },
      });
      onSuccess?.();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(
        Array.isArray(error?.response?.data?.errors)
          ? error.response.data.errors.join(", ")
          : error?.response?.data?.errors || "Failed to save property",
        { style: { background: "#c6212d", color: "white" } }
      );
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading;

  const handleCancel = () => {
    if (onCancel) onCancel();
    else navigate("/property");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 p-6 space-y-6">
      {/* ── Page Header ── */}

      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
        Inventory &rsaquo; Property Detail
      </p>

      {mode === "edit" && isFetchingProperty ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-slate-500 font-medium">Loading property data...</span>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {onCancel && (
                <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>


          {/* Two-column layout: form + converter sidebar */}
          <div className="gap-6 items-start">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                  {/* Header Section of the unified card */}
                  <div className="bg-slate-50/50 p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <span className="material-symbols-outlined text-white text-xl">description</span>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Property Information</h2>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-12">
                    {/* SECTION: General & Campus Association */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                        <h3 className="text-base font-bold text-gray-800 tracking-tight">General  Details</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                          control={form.control}
                          name="propertytype"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Property Type</FormLabel>
                              <Select onValueChange={(v) => field.onChange(v || null)} value={field.value ?? undefined} disabled={disabled || isLoadingItems}>
                                <FormControl>
                                  <SelectTrigger className="bg-gray-50 w-auto border-gray-200 h-12 rounded-xl focus:ring-blue-500">
                                    <SelectValue placeholder={isLoadingItems ? "Loading property types..." : "Select property type"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {PropertyData?.map((type: any) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                      {type.propertyType}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />


                        <FormField
                          control={form.control}
                          name="province"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Province</FormLabel>
                              <Select
                                onValueChange={(v) => {
                                  field.onChange(v || null);
                                  form.setValue("district", null);
                                  form.setValue("localbody", null);
                                }}
                                value={field.value ?? undefined}
                                disabled={disabled || isLoadingProvince}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-12 rounded-xl">
                                    <SelectValue placeholder={isLoadingProvince ? "Loading provinces..." : "Select province"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {provinceData?.map((prov: any) => (
                                    <SelectItem key={prov.id} value={prov.id.toString()}>
                                      {prov.name || prov.province}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="district"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">District</FormLabel>
                              <Select
                                onValueChange={(v) => {
                                  field.onChange(v || null);
                                  form.setValue("localbody", null);
                                }}
                                value={field.value ?? undefined}
                                disabled={disabled || !selectedProvinceId || isLoadingDistrict}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-12 rounded-xl">
                                    <SelectValue
                                      placeholder={!selectedProvinceId ? "Select province first" : isLoadingDistrict ? "Loading districts..." : "Select district"}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {districtData?.map((dist: any) => (
                                    <SelectItem key={dist.id} value={dist.id.toString()}>
                                      {dist.name || dist.district}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />


                        <FormField
                          control={form.control}
                          name="localbody"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Local body</FormLabel>
                              <Select
                                onValueChange={(v) => field.onChange(v || null)}
                                value={field.value ?? undefined}
                                disabled={disabled || !selectedDistrictId || isLoadingLocalbody}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-12 rounded-xl">
                                    <SelectValue
                                      placeholder={!selectedDistrictId ? "Select district first" : isLoadingLocalbody
                                        ? "Loading local bodies..."
                                        : "Select local body"
                                      }
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {localbodyData?.map((lb: any) => (
                                    <SelectItem key={lb.id} value={lb.id.toString()}>
                                      {lb.name || lb.localbody}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="wardNo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Ward No</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value || null)}
                                  placeholder="e.g. 12"
                                  disabled={disabled}
                                  className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white transition-all shadow-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="geographicRegion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Geographic Region</FormLabel>
                              <Select onValueChange={(v) => field.onChange(v || null)} value={field.value ?? undefined} disabled={disabled || isLoadingItems}>
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-12 rounded-xl">
                                    <SelectValue placeholder={isLoadingItems ? "Loading geographic region..." : "Select geographic region"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {geographicRegionData?.map((type: any) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                      {type.name || type.geographicRegion}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />



                        {/* Conditionally rendered based on Property Type being 'Building' */}
                        {PropertyData?.find((p: PropertyType) => p.id.toString() === form.watch("propertytype"))?.propertyType?.toLowerCase() === "building" && (
                          <FormField
                            control={form.control}
                            name="noOfFloor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">No of Floors</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="0"
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder="e.g. 3"
                                    disabled={disabled}
                                    className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white transition-all shadow-none"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Conditionally rendered based on Property Type being 'Land' */}
                        {PropertyData?.find((p: PropertyType) => p.id.toString() === form.watch("propertytype"))?.propertyType?.toLowerCase() === "land" && (
                          <FormField
                            control={form.control}
                            name="kittaNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Kitta No</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value || null)}
                                    placeholder="e.g. 4529-B"
                                    disabled={disabled}
                                    className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white transition-all shadow-none"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value || null)}
                                  disabled={disabled}
                                  className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Description</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value || null)}
                                  disabled={disabled}
                                  className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />


                        <FormField
                          control={form.control}
                          name="constructionYear"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Construction Year</FormLabel>
                              <FormControl>
                                <NepaliDatePicker
                                  id="constructionYear"
                                  name="constructionYear"
                                  value={field.value ?? ""}
                                  onSelect={(value: any) => {
                                    const year = value.value.split("-")[0];
                                    field.onChange(year || "");
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ownershipTransferMiti"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Ownership Transfer Miti</FormLabel>
                              <FormControl>
                                <NepaliDatePicker
                                  id="ownershipTransferMiti"
                                  name="ownershipTransferMiti"
                                  value={field.value ?? ""}
                                  onSelect={(value: any) => {
                                    field.onChange(value.value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="currentUsage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Current Usage Rights</FormLabel>
                              <Select onValueChange={(v) => field.onChange(v || null)} value={field.value ?? undefined} disabled={disabled || isLoadingItems}>
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-12 rounded-xl">
                                    <SelectValue placeholder={isLoadingItems ? "Loading usage rights..." : "Select usage"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {usageRightsData?.map((type: any) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                      {type.name || type.usageRight}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="legalstatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Legal Status Type</FormLabel>
                              <Select onValueChange={(v) => field.onChange(v || null)} value={field.value ?? undefined} disabled={disabled || isLoadingItems}>
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-12 rounded-xl focus:ring-blue-500">
                                    <SelectValue placeholder={isLoadingItems ? "Loading legal status..." : "Select legal status"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {legalstatusData?.map((type: any) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                      {type.name || type.legalStatus}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* SECTION: Physical Measurements & Location */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                        <h3 className="text-base font-bold text-gray-800 tracking-tight">Physical Measurements & Location</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        {/* Land Measurement Sub-grid */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">

                            <FormField
                              control={form.control}
                              name="areaInSqMeters"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[9px] uppercase tracking-tighter text-gray-400 font-semibold">Area(Sq.m)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="0"
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                      placeholder="0"
                                      disabled={disabled}
                                      className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="groundCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Ground Coordinate</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value || null)}
                                      placeholder="e.g. GC-2024-001"
                                      disabled={disabled}
                                      className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="valuation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Valuation</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value || null)}
                                      placeholder="e.g. GC-2024-001"
                                      disabled={disabled}
                                      className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                        </div>

                        {/* GIS Coordinates Sub-grid */}

                      </div>
                    </div>

                    {/* SECTION: Legal & Usage Rights */}
                    <div className="space-y-6 pt-6 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-purple-600 rounded-full" />
                        <h3 className="text-base font-bold text-gray-800 tracking-tight">Legal & Usage Rights</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name="ownershipType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Ownership Type</FormLabel>
                                <Select onValueChange={(v) => field.onChange(v || null)} value={field.value ?? undefined} disabled={disabled || isLoadingItems}>
                                  <FormControl>
                                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-12 rounded-xl">
                                      <SelectValue placeholder={isLoadingItems ? "Loading ownership..." : "Select ownership type"} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {ownershipTypeData?.map((type: any) => (
                                      <SelectItem key={type.id} value={type.id.toString()}>
                                        {type.name || type.ownershipType}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="usageRights"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Usage Rights</FormLabel>
                              <Select onValueChange={(v) => field.onChange(v || null)} value={field.value ?? undefined} disabled={disabled || isLoadingItems}>
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-12 rounded-xl">
                                    <SelectValue placeholder={isLoadingItems ? "Loading usage rights..." : "Select rights"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {usageRightsData?.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                      {item.name || item.usageRight}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="usageTypes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Usage Type</FormLabel>
                              <Select onValueChange={(v) => field.onChange(v || null)} value={field.value ?? undefined} disabled={disabled || isLoadingItems}>
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-12 rounded-xl">
                                    <SelectValue placeholder={isLoadingItems ? "Loading usage types..." : "Select type"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {usageTypeData?.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                      {item.name || item.usageType}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Section of the unified card */}
                  <div className="p-6 bg-slate-50/50 border-t border-gray-100 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      className="h-12 px-6 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                      {loading ? "Saving..." : (mode === "edit" ? "Update Property" : "Save Property")}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>

            {/* Sticky Measurement Converter sidebar */}
            <div className="sticky top-6">
              <MeasurementConverter />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
