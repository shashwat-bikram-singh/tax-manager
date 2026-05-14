import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { toast } from "sonner";
import { X, ShieldCheck, ChevronDown } from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useMutate } from "@/hooks/useMutate";
import axiosInstance from "@/config/axios";
import type {
  District,
  LegalStatus,
  Localbody,
  OwnershipType,
  PropertyType,
  UsageRights,
  UsageType,
  PropertyDetail,
  GeographicRegion,
} from "@/type/property";
import NepaliDatePicker from "@/components/ui/NepaliDatePicker";
import { useTranslation } from "react-i18next";
import type { Office } from "@/type/office";

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const propertySchema = z.object({
  province: z.string().min(1, { message: "Province is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  district: z.string().min(1, { message: "District is required" }),
  localbody: z.string().min(1, { message: "Local body is required" }),
  wardNo: z.string().min(1, { message: "Ward No is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  propertytype: z.string().min(1, { message: "Property type is required" }),
  currentUsage: z.string().min(1, { message: "Current usage is required" }),
  legalstatus: z.string().min(1, { message: "Legal status is required" }),
  valuation: z.coerce.number().min(1, { message: "Valuation is required" }),
  taxAmount: z.coerce.number().min(1, { message: "Tax Amount is required" }),
  kittaNumber: z.string(),
  sheetNumber: z.string().optional().nullable(),
  groundCode: z.string().optional().nullable(),
  constructionYear: z.string().min(1, { message: "Construction year is required" }),
  areaInSqMeters: z.coerce
    .number({ required_error: "Area in square meters is required" })
    .min(0, { message: "Area must be 0 or greater" }),
  areaInSqft: z.coerce.number().optional().nullable(),
  ownershipType: z.string().min(1, { message: "Ownership type is required" }),

  usageRights: z.string().min(1, { message: "Usage rights is required" }),
  usageTypes: z.string().min(1, { message: "Usage types is required" }),
  geographicRegion: z.string().min(1, { message: "Geographic region is required" }),
  encroachmentRisk: z.string().optional().nullable(),
  noOfFloor: z.coerce
    .number({ required_error: "Number of floors is required" })
    .min(0, { message: "Must be 0 or more" }),
  ownershipTransferMiti: z.string().min(1, { message: "Ownership transfer date is required" }),
  measurementUnit: z.string().min(1, { message: "Measurement unit is required" }),
  // Terai
  bigha: z.coerce.number().optional().nullable(),
  kattha: z.coerce.number().optional().nullable(),
  dhur: z.coerce.number().optional().nullable(),
  // Hilly
  ropani: z.coerce.number().optional().nullable(),
  aana: z.coerce.number().optional().nullable(),
  paisa: z.coerce.number().optional().nullable(),
  daam: z.coerce.number().optional().nullable(),
  // Coords
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  mode: "add" | "edit" | "view";
  initialData?: PropertyDetail;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ─── Conversion Constants ─────────────────────────────────────────────────────
const TERAI_BIGHA_TO_SQM  = 6772.63;
const TERAI_KATTHA_TO_SQM = TERAI_BIGHA_TO_SQM / 20;     // 338.6315
const TERAI_DHUR_TO_SQM   = TERAI_KATTHA_TO_SQM / 20;    // 16.931575

const HILLY_ROPANI_TO_SQM = 508.72;
const HILLY_AANA_TO_SQM   = HILLY_ROPANI_TO_SQM / 16;    // 31.795
const HILLY_PAISA_TO_SQM  = HILLY_AANA_TO_SQM / 4;       // 7.94875
const HILLY_DAAM_TO_SQM   = HILLY_PAISA_TO_SQM / 4;      // 1.9871875

const SQM_TO_SQFT = 10.7639;

// ─── Conversion Helpers ───────────────────────────────────────────────────────
function calcTeraiToSqm(bigha = 0, kattha = 0, dhur = 0): number {
  return (
    bigha  * TERAI_BIGHA_TO_SQM +
    kattha * TERAI_KATTHA_TO_SQM +
    dhur   * TERAI_DHUR_TO_SQM
  );
}

function calcHillyToSqm(ropani = 0, aana = 0, paisa = 0, daam = 0): number {
  return (
    ropani * HILLY_ROPANI_TO_SQM +
    aana   * HILLY_AANA_TO_SQM +
    paisa  * HILLY_PAISA_TO_SQM +
    daam   * HILLY_DAAM_TO_SQM
  );
}

function sqmToTerai(sqm: number): { bigha: number; kattha: number; dhur: number } {
  let rem = sqm;
  const bigha  = Math.floor(rem / TERAI_BIGHA_TO_SQM);
  rem -= bigha * TERAI_BIGHA_TO_SQM;
  const kattha = Math.floor(rem / TERAI_KATTHA_TO_SQM);
  rem -= kattha * TERAI_KATTHA_TO_SQM;
  const dhur   = Math.round((rem / TERAI_DHUR_TO_SQM) * 100) / 100;
  return { bigha, kattha, dhur };
}

function sqmToHilly(sqm: number): { ropani: number; aana: number; paisa: number; daam: number } {
  let rem = sqm;
  const ropani = Math.floor(rem / HILLY_ROPANI_TO_SQM);
  rem -= ropani * HILLY_ROPANI_TO_SQM;
  const aana   = Math.floor(rem / HILLY_AANA_TO_SQM);
  rem -= aana * HILLY_AANA_TO_SQM;
  const paisa  = Math.floor(rem / HILLY_PAISA_TO_SQM);
  rem -= paisa * HILLY_PAISA_TO_SQM;
  const daam   = Math.round((rem / HILLY_DAAM_TO_SQM) * 100) / 100;
  return { ropani, aana, paisa, daam };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Reusable Searchable Select ───────────────────────────────────────────────
interface SearchableSelectProps {
  options: any[];
  value: string | undefined;
  onChange: (value: string) => void;
  getLabel: (item: any) => string;
  placeholder: string;
  disabled?: boolean;
  isLoading?: boolean;
  onClear?: () => void;
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
}: SearchableSelectProps) => {
  const [inputValue, setInputValue] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const selected = options.find((item) => item.id == value);
      if (selected) setInputValue(getLabel(selected));
    } else {
      setInputValue("");
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
    onChange(item.id.toString());
    setShowOptions(false);
  };

  const filtered = options.filter((item) =>
    getLabel(item).toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowOptions(!disabled)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="w-full h-12 px-4 bg-gray-50 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <ChevronDown size={16} />
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
            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {showOptions && !disabled && (
        <ul className="absolute z-50 w-full mt-1 bg-white border-gray-300 rounded-xl shadow-xl max-h-60 overflow-auto">
          {isLoading ? (
            <li className="p-4 text-center text-sm text-gray-500">Loading...</li>
          ) : filtered.length > 0 ? (
            filtered.map((item, index) => (
              <li
                key={index}
                onClick={() => handleSelect(item)}
                className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-50 last:border-0"
              >
                {getLabel(item)}
              </li>
            ))
          ) : (
            <li className="p-4 text-center text-sm text-gray-400 italic">No matches found</li>
          )}
        </ul>
      )}
    </div>
  );
};

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
  const [mode, setMode] = useState<"forward" | "reverse">("forward");

  const sqm =
    measureType === "terai"
      ? calcTeraiToSqm(Number(terai.bigha), Number(terai.kattha), Number(terai.dhur))
      : calcHillyToSqm(Number(hilly.ropani), Number(hilly.aana), Number(hilly.paisa), Number(hilly.daam));
  const sqft = sqm * SQM_TO_SQFT;

  const reverseTerai = sqmToTerai(Number(sqmInput) || 0);
  const reverseHilly = sqmToHilly(Number(sqmInput) || 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-base">straighten</span>
        </div>
        <h3 className="text-sm font-bold text-gray-900 tracking-tight">Measurement Converter</h3>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium">
        <button type="button" onClick={() => setMeasureType("terai")} className={`flex-1 py-1.5 rounded-md transition-all ${measureType === "terai" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Terai (B·K·D)</button>
        <button type="button" onClick={() => setMeasureType("hilly")} className={`flex-1 py-1.5 rounded-md transition-all ${measureType === "hilly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Hilly (R·A·P·D)</button>
      </div>

      <div className="flex gap-1 bg-indigo-50 border border-indigo-100 p-1 rounded-lg text-xs font-medium">
        <button type="button" onClick={() => setMode("forward")} className={`flex-1 py-1.5 rounded-md transition-all ${mode === "forward" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-500 hover:text-indigo-700"}`}>Standard → m²</button>
        <button type="button" onClick={() => setMode("reverse")} className={`flex-1 py-1.5 rounded-md transition-all ${mode === "reverse" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-500 hover:text-indigo-700"}`}>m² → Standard</button>
      </div>

      {mode === "forward" && (
        <>
          {measureType === "terai" ? (
            <div className="grid grid-cols-3 gap-2">
              {(["bigha", "kattha", "dhur"] as const).map((unit) => (
                <div key={unit}>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">{unit}</label>
                  <input type="number" min="0" value={terai[unit]} onChange={(e) => setTerai((p) => ({ ...p, [unit]: e.target.value }))} className="w-full text-center bg-gray-50 border-gray-300 rounded-lg px-2 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {(["ropani", "aana", "paisa", "daam"] as const).map((unit) => (
                <div key={unit}>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">{unit.charAt(0).toUpperCase() + unit.slice(1)}</label>
                  <input type="number" min="0" value={hilly[unit]} onChange={(e) => setHilly((p) => ({ ...p, [unit]: e.target.value }))} className="w-full text-center bg-gray-50 border-gray-300 rounded-lg px-1 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="0" />
                </div>
              ))}
            </div>
          )}
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

      {mode === "reverse" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Enter Square Meters</label>
            <input type="number" placeholder="e.g. 500" value={sqmInput} onChange={(e) => setSqmInput(e.target.value)} className="w-full bg-gray-50 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold mb-2">{measureType === "terai" ? "Terai Equivalent" : "Hilly Equivalent"}</p>
            {measureType === "terai" ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[{ label: "Bigha", val: reverseTerai.bigha }, { label: "Kattha", val: reverseTerai.kattha }, { label: "Dhur", val: reverseTerai.dhur.toFixed(2) }].map((item) => (
                  <div key={item.label} className="bg-white rounded-lg p-2 border border-indigo-100">
                    <p className="text-lg font-black text-indigo-700">{item.val}</p>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[{ label: "Ropani", val: reverseHilly.ropani }, { label: "Aana", val: reverseHilly.aana }, { label: "Paisa", val: reverseHilly.paisa }, { label: "Daam", val: reverseHilly.daam.toFixed(2) }].map((item) => (
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

      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
        <p className="text-[11px] text-amber-800 leading-snug">
          <span className="font-bold">Note:</span>{" "}
          1 {measureType === "terai" ? `Bigha = ${TERAI_BIGHA_TO_SQM.toLocaleString()} m²` : `Ropani = ${HILLY_ROPANI_TO_SQM.toLocaleString()} m²`} (1964 standard)
        </p>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function PropertyForm({
  mode,
  initialData: propInitialData,
  onSuccess,
  onCancel,
}: PropertyFormProps) {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const officeId = parseInt(sessionStorage.getItem("OfficeId") || "1");

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
  const initialData = propInitialData || (mode === "edit" ? propertyData : undefined);

  const { create, update } = useMutate<PropertyDetail>("/api/property", "property");

  const { items: rawpropertyTypeData, isLoadingItems } = useFetchAll<PropertyType>("/api/propertytype", ["propertytype"]);
  const PropertyData = rawpropertyTypeData?.data;

  const { items: rawlegalstatusData } = useFetchAll<LegalStatus>("/api/legalstatus", ["legalstatus"]);
  const legalstatusData = rawlegalstatusData?.data;

  const { items: rawusagerightData } = useFetchAll<UsageRights>("/api/usageright", ["usageright"]);
  const usageRightsData = rawusagerightData?.data;

  const { items: rawusageTypeData } = useFetchAll<UsageType>("/api/usagetype", ["usagetype"]);
  const usageTypeData = rawusageTypeData?.data;

  const { items: rawgeographicRegionData, isLoadingItems: isLoadingGeographicRegion } = useFetchAll<GeographicRegion>("/api/geographic-region", ["geographicregion"]);
  const geographicRegionData = rawgeographicRegionData?.data;

  const { items: rawownershipTypeData } = useFetchAll<OwnershipType>("/api/ownershiptype", ["ownershiptype"]);
  const ownershipTypeData = rawownershipTypeData?.data;

  const { items: rawOfficeData } = useFetchAll<Office>(`/api/office?id=${officeId}`, ["office"]);
  const officeData = rawOfficeData?.data;
  const officeMeasurementUnit = officeData?.[0]?.measurementUnit;

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema) as any,
    defaultValues: {
      propertytype: "",
      name: "",
      province: "",
      district: "",
      localbody: "",
      description: "",
      kittaNumber: "",
      sheetNumber: "",
      wardNo: "",
      groundCode: "",
      constructionYear: "",
      legalstatus: "",
      areaInSqMeters: 0,
      areaInSqft: 0,
      ownershipType: "",
      usageRights: "",
      usageTypes: "",
      geographicRegion: "",
      noOfFloor: 0,
      encroachmentRisk: "",
      currentUsage: "",
      valuation: 0,
      taxAmount: 0, // Added Tax Amount
      ownershipTransferMiti: "",
      measurementUnit: "Katha",
      bigha: 0,
      kattha: 0,
      dhur: 0,
      ropani: 0,
      aana: 0,
      paisa: 0,
      daam: 0,
      latitude: "",
      longitude: "",
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

  // ─── Bidirectional Sync Logic ─────────────────────────────────────────────
  // Track which section the user is currently editing to prevent feedback loops.
  // "terai" | "hilly" | "sqm" | null
  const lastEdited = useRef<"terai" | "hilly" | "sqm" | null>(null);
  const isUpdating = useRef(false);

  const bigha        = form.watch("bigha");
  const kattha       = form.watch("kattha");
  const dhur         = form.watch("dhur");
  const ropani       = form.watch("ropani");
  const aana         = form.watch("aana");
  const paisa        = form.watch("paisa");
  const daam         = form.watch("daam");
  const areaInSqMeters = form.watch("areaInSqMeters");

  // When Terai fields change → recalculate Hilly + SqM + SqFt
  useEffect(() => {
    if (isUpdating.current || lastEdited.current !== "terai") return;

    const sqm   = calcTeraiToSqm(Number(bigha) || 0, Number(kattha) || 0, Number(dhur) || 0);
    const hilly = sqmToHilly(sqm);
    const sqft  = round2(sqm * SQM_TO_SQFT);

    isUpdating.current = true;
    form.setValue("areaInSqMeters", round2(sqm));
    form.setValue("areaInSqft",     sqft);
    form.setValue("ropani", hilly.ropani);
    form.setValue("aana",   hilly.aana);
    form.setValue("paisa",  hilly.paisa);
    form.setValue("daam",   hilly.daam);
    setTimeout(() => { isUpdating.current = false; }, 0);
  }, [bigha, kattha, dhur]);

  // When Hilly fields change → recalculate Terai + SqM + SqFt
  useEffect(() => {
    if (isUpdating.current || lastEdited.current !== "hilly") return;

    const sqm   = calcHillyToSqm(Number(ropani) || 0, Number(aana) || 0, Number(paisa) || 0, Number(daam) || 0);
    const terai = sqmToTerai(sqm);
    const sqft  = round2(sqm * SQM_TO_SQFT);

    isUpdating.current = true;
    form.setValue("areaInSqMeters", round2(sqm));
    form.setValue("areaInSqft",     sqft);
    form.setValue("bigha",  terai.bigha);
    form.setValue("kattha", terai.kattha);
    form.setValue("dhur",   terai.dhur);
    setTimeout(() => { isUpdating.current = false; }, 0);
  }, [ropani, aana, paisa, daam]);

  // When SqM field changes → recalculate Terai + Hilly + SqFt
  useEffect(() => {
    if (isUpdating.current || lastEdited.current !== "sqm") return;

    const sqm   = Number(areaInSqMeters) || 0;
    const terai = sqmToTerai(sqm);
    const hilly = sqmToHilly(sqm);
    const sqft  = round2(sqm * SQM_TO_SQFT);

    isUpdating.current = true;
    form.setValue("areaInSqft", sqft);
    form.setValue("bigha",  terai.bigha);
    form.setValue("kattha", terai.kattha);
    form.setValue("dhur",   terai.dhur);
    form.setValue("ropani", hilly.ropani);
    form.setValue("aana",   hilly.aana);
    form.setValue("paisa",  hilly.paisa);
    form.setValue("daam",   hilly.daam);
    setTimeout(() => { isUpdating.current = false; }, 0);
  }, [areaInSqMeters]);

  // ─── Reset form when initialData loads (edit mode) ───────────────────────
  useEffect(() => {
    if (!initialData) return;
    const d = initialData as any;

    // Pre-fill the SqM value; local units come from stored values
    const sqm  = d.landArea ?? 0;
    const sqft = round2(sqm * SQM_TO_SQFT);

    // If backend stores terai/hilly individually use them; else derive from sqm
    const terai = (d.bigha !== undefined && d.bigha !== null)
      ? { bigha: d.bigha ?? 0, kattha: d.kattha ?? 0, dhur: d.dhur ?? 0 }
      : sqmToTerai(sqm);

    const hilly = (d.ropani !== undefined && d.ropani !== null)
      ? { ropani: d.ropani ?? 0, aana: d.aana ?? 0, paisa: d.paisa ?? 0, daam: d.daam ?? 0 }
      : sqmToHilly(sqm);

     form.reset({
       propertytype:         d.propertyTypeId?.toString()  ?? "",
       name:                 d.name                        ?? "",
       province:             d.provinceId?.toString()      ?? "",
       district:             d.districtId?.toString()      ?? "",
       localbody:            d.localBodyId?.toString()     ?? "",
       description:          d.description                 ?? "",
       kittaNumber:          d.kittaNumber                 ?? "",
       sheetNumber:          d.sheetNumber                 ?? "",
       wardNo:               d.wardNo?.toString()          ?? "",
       groundCode: (d.landGeoCoordinate || d.geoCoordinates) ?? "",
       constructionYear:     d.constructionYear            ?? "",
       legalstatus:          d.legalStatusId?.toString()   ?? "",
       areaInSqMeters:       d.landArea ?? d.areaInSqMeters ?? 0,
       areaInSqft:           sqft,
       ownershipType:        d.ownershipTypeId?.toString() ?? "",
       geographicRegion:     d.geographicRegionId?.toString() ?? "",
       usageRights:          d.usageRightId?.toString()    ?? "",
       usageTypes:           d.usageId?.toString()         ?? "",
       currentUsage:         d.usageRightId?.toString() ?? "",
       noOfFloor:            d.noOfFloors                  ?? 0,
       encroachmentRisk:     d.encroachmentRisk            ?? "",
       valuation:            d.valuation?.toString()       ?? "",
       taxAmount:            d.taxAmount?.toString()       ?? "", // Mapping Tax Amount
       ownershipTransferMiti: d.ownershipTransferDate      ?? "",
       measurementUnit:      officeMeasurementUnit || "Katha",
       bigha:                terai.bigha,
       kattha:               terai.kattha,
       dhur:                 terai.dhur,
       ropani:               hilly.ropani,
       aana:                 hilly.aana,
       paisa:                hilly.paisa,
       daam:                 hilly.daam,
       latitude:             d.propertyTypeId ? d.land_Latitude : d.building_Latitude ?? "",
       longitude:            d.propertyTypeId ? d.land_Longitude : d.building_Longitude ?? "",
     });
  }, [initialData]);
  console.log("Initial form values:", initialData);

  const buildDefaultArea = (values: PropertyFormValues): string => {
    const unit = (officeMeasurementUnit ?? "").toLowerCase();
    const isTeraiUnit = /bigha|kattha|katha|dhur|terai/i.test(unit);
    // Hilly keywords: ropani / aana / paisa / daam / hilly
    const isHillyUnit = /ropani|aana|paisa|daam|hilly/i.test(unit);

    if (isTeraiUnit) {
      return `${values.bigha ?? 0}-${values.kattha ?? 0}-${values.dhur ?? 0}`;
    }

    if (isHillyUnit) {
      return `${values.ropani ?? 0}-${values.aana ?? 0}-${values.paisa ?? 0}-${values.daam ?? 0}`;
    }

    // No office unit configured — send both
    return (
      `${values.bigha ?? 0}-${values.kattha ?? 0}-${values.dhur ?? 0} | ` +
      `${values.ropani ?? 0}-${values.aana ?? 0}-${values.paisa ?? 0}-${values.daam ?? 0}`
    );
  };

  const onSubmit = async (values: PropertyFormValues) => {
    setLoading(true);
    try {
      const areaMeasurement = buildDefaultArea(values);

      const payload: any = {
        propertyTypeId:       Number(values.propertytype)  || 0,
        name:                 values.name                  || "",
        provinceId:           Number(values.province)      || 0,
        districtId:           Number(values.district)      || 0,
        localBodyId:          Number(values.localbody)     || 0,
        wardNo:               Number(values.wardNo)        || 0,
        kittaNumber:          values.kittaNumber           || "",
        sheetNumber:          values.sheetNumber           || "",
        description:          values.description           || "",
        areaInSqMeters:       Number(values.areaInSqMeters) || 0,
        geoCoordinates:       values.groundCode            || "",
        noOfFloor:            Number(values.noOfFloor)     || 0,
        constructionYear:     values.constructionYear      || "",
        usageId:              Number(values.usageTypes)    || 0,
        legalStatusId:        Number(values.legalstatus)   || 0,
        usageRightId:        Number(values.usageRights)   || 0,
        ownershipTypeId:      Number(values.ownershipType) || 0,
        geographicRegionId:   Number(values.geographicRegion) || 0,
        ownershipTransferMiti: values.ownershipTransferMiti || "",
        latitude:             values.latitude              || "",
        longitude:            values.longitude             || "",
        valuation:            Number(values.valuation)     || 0,
        taxAmount:            Number(values.taxAmount)     || 0,
        defaultArea:          areaMeasurement,
      };

      if (mode === "edit" && initialData?.id) {
        payload.id = initialData.id;
        await update.mutateAsync(payload);
      } else {
        await create.mutateAsync(payload);
      }

      toast.success(
        mode === "edit"
          ? `${t("property.propertyUpdatedSuccessfully")} ✅`
          : `${t("property.propertySavedSuccessfully")} ✅`,
        { style: { background: "#10b981", color: "white" } }
      );
      onSuccess?.();
      navigate("/app/property");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(
        Array.isArray(error?.response?.data?.errors)
          ? error.response.data.errors.join(", ")
          : error?.response?.data?.errors || `${t("property.failedToSaveProperty")}`,
        { style: { background: "#c6212d", color: "white" } }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else navigate("/app/property");
  };

  const disabled = loading;

  // ─── Shared number input onChange with section tracking ───────────────────
  const makeNumberHandler = (
    section: "terai" | "hilly" | "sqm",
    fieldOnChange: (v: number | null) => void
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    lastEdited.current = section;
    fieldOnChange(e.target.value === "" ? null : Number(e.target.value));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 p-6 space-y-6">
      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
        {t("property.inventory")} &rsaquo; {t("property.propertyDetail")}
      </p>

      {mode === "edit" && isFetchingProperty ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-slate-500 font-medium">{t("common.loading")}</span>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="icon" onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="gap-6 items-start">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">

                  {/* ── Card Header ── */}
                  <div className="bg-slate-50/50 p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <span className="material-symbols-outlined text-white text-xl">description</span>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">{t("property.propertyInformation")}</h2>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-12">

                    {/* ── Section 1: General Details ── */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                        <h3 className="text-base font-bold text-gray-800 tracking-tight">{t("property.generalDetails")}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Property Type */}
                        <FormField control={form.control} name="propertytype" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.propertyType")} <span className="text-red-500">*</span></FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect options={PropertyData || []} value={field.value} onChange={(v) => field.onChange(v || "")} getLabel={(item) => item.propertyType} placeholder={isLoadingItems ? "Loading..." : ""} disabled={disabled || isLoadingItems} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Province */}
                        <FormField control={form.control} name="province" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.province")} <span className="text-red-500">*</span></FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect options={provinceData || []} value={field.value} onChange={(v) => { field.onChange(v || ""); form.setValue("district", ""); form.setValue("localbody", ""); }} getLabel={(item) => item.name || item.province} placeholder={isLoadingProvince ? "Loading..." : ""} disabled={disabled || isLoadingProvince} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* District */}
                        <FormField control={form.control} name="district" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("dashboard.district")} <span className="text-red-500">*</span></FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect options={districtData || []} value={field.value} onChange={(v) => { field.onChange(v || ""); form.setValue("localbody", ""); }} getLabel={(item) => item.name || item.district} placeholder={!selectedProvinceId ? "Enter Province First" : isLoadingDistrict ? "Loading..." : ""} disabled={disabled || !selectedProvinceId || isLoadingDistrict} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Local Body */}
                        <FormField control={form.control} name="localbody" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.localBody")} <span className="text-red-500">*</span></FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect options={localbodyData || []} value={field.value} onChange={(v) => field.onChange(v || "")} getLabel={(item) => item.name || item.localbody} placeholder={!selectedDistrictId ? "Enter District first" : isLoadingLocalbody ? "Loading..." : ""} disabled={disabled || !selectedDistrictId || isLoadingLocalbody} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Ward No */}
                        <FormField control={form.control} name="wardNo" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.wardNo")} <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || "")} disabled={disabled} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white transition-all shadow-none" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Geographic Region */}
                        <FormField control={form.control} name="geographicRegion" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.geographicRegion")} <span className="text-red-500">*</span></FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect options={geographicRegionData || []} value={field.value} onChange={(v) => field.onChange(v || "")} getLabel={(item) => item.name || item.geographicRegion} placeholder={isLoadingGeographicRegion ? "Loading..." : ""} disabled={disabled || isLoadingGeographicRegion} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* No of Floors (building only) */}
                        {PropertyData?.find((p: PropertyType) => p.id.toString() === form.watch("propertytype"))?.propertyType?.toLowerCase() === "building" && (
                          <FormField control={form.control} name="noOfFloor" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.noOfFloor")} <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input {...field} type="number" min="0" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} placeholder="e.g. 3" disabled={disabled} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white transition-all shadow-none" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}

                        {/* Kitta Number (land only) */}
                        {PropertyData?.find((p: PropertyType) => p.id.toString() === form.watch("propertytype"))?.propertyType?.toLowerCase() === "land" && (
                          <FormField control={form.control} name="kittaNumber" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.kittaNumber")} <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || "")} placeholder="e.g. 4529-B" disabled={disabled} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white transition-all shadow-none" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}

                        {/* Name */}
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("common.name")} <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || "")} disabled={disabled} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Description */}
                        <FormField control={form.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.description")} <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || "")} disabled={disabled} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Construction Year */}
                        <FormField control={form.control} name="constructionYear" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.constructionYear")} <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <NepaliDatePicker id="constructionYear" name="constructionYear" value={field.value ?? ""} onSelect={(value: any) => { const year = value.value.split("-")[0]; field.onChange(year || ""); }} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Ownership Transfer Miti */}
                        <FormField control={form.control} name="ownershipTransferMiti" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.ownershipTransferMiti")} <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <NepaliDatePicker id="ownershipTransferMiti" name="ownershipTransferMiti" value={field.value ?? ""} onSelect={(value: any) => { field.onChange(value.value); }} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Current Usage */}
                        <FormField control={form.control} name="currentUsage" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.currentUsage")} <span className="text-red-500">*</span></FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect options={usageRightsData || []} value={field.value} onChange={(v) => field.onChange(v || "")} getLabel={(item) => item.name || item.usageRight} placeholder={isLoadingItems ? "Loading..." : ""} disabled={disabled || isLoadingItems} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Legal Status */}
                        <FormField control={form.control} name="legalstatus" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.legalStatus")} <span className="text-red-500">*</span></FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect options={legalstatusData || []} value={field.value} onChange={(v) => field.onChange(v || "")} getLabel={(item) => item.name || item.legalStatus} placeholder={isLoadingItems ? "Loading..." : ""} disabled={disabled || isLoadingItems} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                      </div>
                    </div>

                    {/* ── Section 2: Physical Measurements ── */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                        <h3 className="text-base font-bold text-gray-800 tracking-tight">{t("property.physicalMeasurementsAndLocation")}</h3>
                      </div>

                      <div className="space-y-6">

                        {/* ── Terai Section ── */}
                        <section className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest">Terai</span>
                            <h3 className="text-sm font-semibold text-gray-600">Bigha · Kattha · Dhur</h3>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            {/* Bigha */}
                            <FormField control={form.control} name="bigha" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">Bigha</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} onChange={makeNumberHandler("terai", field.onChange)} placeholder="0.00" className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            {/* Kattha */}
                            <FormField control={form.control} name="kattha" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">Kattha</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} onChange={makeNumberHandler("terai", field.onChange)} placeholder="0.00" className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            {/* Dhur */}
                            <FormField control={form.control} name="dhur" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">Dhur</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} onChange={makeNumberHandler("terai", field.onChange)} placeholder="0.00" className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </section>

                        {/* ── Hilly Section ── */}
                        <section className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-widest">Hilly</span>
                            <h3 className="text-sm font-semibold text-gray-600">Ropani · Aana · Paisa · Daam</h3>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Ropani */}
                            <FormField control={form.control} name="ropani" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">Ropani</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} onChange={makeNumberHandler("hilly", field.onChange)} placeholder="0.00" className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            {/* Aana */}
                            <FormField control={form.control} name="aana" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">Aana</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} onChange={makeNumberHandler("hilly", field.onChange)} placeholder="0.00" className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            {/* Paisa */}
                            <FormField control={form.control} name="paisa" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">Paisa</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} onChange={makeNumberHandler("hilly", field.onChange)} placeholder="0.00" className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            {/* Daam */}
                            <FormField control={form.control} name="daam" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">Daam</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} onChange={makeNumberHandler("hilly", field.onChange)} placeholder="0.00" className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </section>

                        {/* ── Metric Section ── */}
                        <section className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-widest">Metric</span>
                            <h3 className="text-sm font-semibold text-gray-600">Square Meters · Square Feet</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Area in Sq Meters */}
                            <FormField control={form.control} name="areaInSqMeters" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">Area (m²) <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} onChange={makeNumberHandler("sqm", field.onChange)} placeholder="0.00" className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            {/* Area in Sq Feet (read-only, auto-calculated) */}
                            <FormField control={form.control} name="areaInSqft" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">Area (sq ft) <span className="text-xs text-gray-300 normal-case font-normal">auto</span></FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} readOnly tabIndex={-1} placeholder="0.00" className="text-center bg-gray-100 border-gray-200 h-12 rounded-xl font-bold text-gray-500 cursor-not-allowed" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </section>

                        {/* ── Location & Valuation ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                          <FormField control={form.control} name="latitude" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Latitude</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || "")} disabled={disabled} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="longitude" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Longitude</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || "")} disabled={disabled} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                      </div>
                    </div>
                     <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                        <h3 className="text-base font-bold text-gray-800 tracking-tight">Tax & Valuation</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 pt-2">
                        
                        {/* Tax Amount Field */}
                        <FormField control={form.control} name="taxAmount" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Tax Amount <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || "")} disabled={disabled} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        
                        {/* Valuation Field */}
                        <FormField control={form.control} name="valuation" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.valuation")} <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || "")} disabled={disabled} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        
                          </div>
                      </div>
                    

                    {/* ── Section 3: Legal & Usage Rights ── */}
                    <div className="space-y-6 pt-6 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-purple-600 rounded-full" />
                        <h3 className="text-base font-bold text-gray-800 tracking-tight">{t("property.legalAndUsageRights")}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                        {/* Ownership Type */}
                        <div className="md:col-span-2">
                          <FormField control={form.control} name="ownershipType" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.ownershipType")} <span className="text-red-500">*</span></FormLabel>
                              <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                                <FormControl>
                                  <SearchableSelect options={ownershipTypeData || []} value={field.value} onChange={(v) => field.onChange(v || "")} getLabel={(item) => item.name || item.ownershipType} placeholder={isLoadingItems ? "Loading..." : ""} disabled={disabled || isLoadingItems} />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        {/* Usage Rights */}
                        <FormField control={form.control} name="usageRights" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.usageRights")} <span className="text-red-500">*</span></FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect options={usageRightsData || []} value={field.value} onChange={(v) => field.onChange(v || "")} getLabel={(item) => item.name || item.usageRight} placeholder={isLoadingItems ? "Loading..." : ""} disabled={disabled || isLoadingItems} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Usage Types */}
                        <FormField control={form.control} name="usageTypes" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t("property.usageTypes")} <span className="text-red-500">*</span></FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect options={usageTypeData || []} value={field.value} onChange={(v) => field.onChange(v || "")} getLabel={(item) => item.name || item.usageType} placeholder={isLoadingItems ? "Loading..." : ""} disabled={disabled || isLoadingItems} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                      </div>
                    </div>

                  </div>

                  {/* ── Footer ── */}
                  <div className="p-6 bg-slate-50/50 border-t border-gray-100 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={handleCancel} className="h-12 px-6 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-100">
                      {t("common.cancel")}
                    </Button>
                     <Button type="submit" disabled={loading} className="h-12 px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all active:scale-95">
                      {loading ? "Saving..." : mode === "edit" ? t("common.update") : t("common.save")}
                    </Button>
                  </div>

                </div>
              </form>
            </Form>
          </div>
        </>
      )}
    </div>
  );
}