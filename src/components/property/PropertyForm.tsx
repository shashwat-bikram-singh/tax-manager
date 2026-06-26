import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { useAuthStore } from "@/store/authStore";
import { jwtDecode } from "jwt-decode";

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const propertySchema = z.object({
  province: z.string().min(1, { message: "Province is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  district: z.string().min(1, { message: "District is required" }),
  localbody: z.string().min(1, { message: "Local body is required" }),
  wardNo: z.string().min(1, { message: "Ward No is required" }),
  description: z.string().optional().nullable(),
  propertytype: z.string().min(1, { message: "Property type is required" }),
  currentUsage: z.string().optional().nullable(),
  legalstatus: z.string().min(1, { message: "Legal status is required" }),
  valuation: z.coerce.number().min(1, { message: "Valuation is required" }),
  taxAmount: z.coerce.number().min(1, { message: "Tax Amount is required" }),
  kittaNumber: z.string(),
  sheetNumber: z.string().optional().nullable(),
  groundCode: z.string().optional().nullable(),
  constructionYear: z.string().optional().nullable(),
  areaInSqMeters: z.coerce
    .number({ required_error: "Area in square meters is required" })
    .min(0, { message: "Area must be 0 or greater" }),
  areaInSqft: z.coerce.number().optional().nullable(),
  ownershipType: z.string().min(1, { message: "Ownership type is required" }),
  usageRights: z.string().min(1, { message: "Usage rights is required" }),
  usageTypes: z.string().optional(),
  geographicRegion: z.string().min(1, { message: "Geographic region is required" }),
  encroachmentRisk: z.string().optional().nullable(),
  noOfFloor: z.coerce
    .number({ required_error: "Number of floors is required" })
    .min(0, { message: "Must be 0 or more" }),
  ownershipTransferMiti: z.string().min(1, { message: "Ownership transfer date is required" }),
  measurementUnit: z.string().min(1, { message: "Measurement unit is required" }),
  bigha: z.coerce.number().optional().nullable(),
  kattha: z.coerce.number().optional().nullable(),
  dhur: z.coerce.number().optional().nullable(),
  ropani: z.coerce.number().optional().nullable(),
  aana: z.coerce.number().optional().nullable(),
  paisa: z.coerce.number().optional().nullable(),
  daam: z.coerce.number().optional().nullable(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  officeId: z.string().optional().nullable(), // ← added for SuperAdmin
});

type PropertyFormValues = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  mode: "add" | "edit" | "view";
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

// ─── Conversion Helpers ───────────────────────────────────────────────────────
function calcTeraiToSqm(bigha = 0, kattha = 0, dhur = 0): number {
  return (
    bigha * TERAI_BIGHA_TO_SQM +
    kattha * TERAI_KATTHA_TO_SQM +
    dhur * TERAI_DHUR_TO_SQM
  );
}
function calcHillyToSqm(ropani = 0, aana = 0, paisa = 0, daam = 0): number {
  return (
    ropani * HILLY_ROPANI_TO_SQM +
    aana * HILLY_AANA_TO_SQM +
    paisa * HILLY_PAISA_TO_SQM +
    daam * HILLY_DAAM_TO_SQM
  );
}
function sqmToTerai(sqm: number) {
  let rem = sqm;
  const bigha = Math.floor(rem / TERAI_BIGHA_TO_SQM);
  rem -= bigha * TERAI_BIGHA_TO_SQM;
  const kattha = Math.floor(rem / TERAI_KATTHA_TO_SQM);
  rem -= kattha * TERAI_KATTHA_TO_SQM;
  const dhur = Math.round((rem / TERAI_DHUR_TO_SQM) * 100) / 100;
  return { bigha, kattha, dhur };
}
function sqmToHilly(sqm: number) {
  let rem = sqm;
  const ropani = Math.floor(rem / HILLY_ROPANI_TO_SQM);
  rem -= ropani * HILLY_ROPANI_TO_SQM;
  const aana = Math.floor(rem / HILLY_AANA_TO_SQM);
  rem -= aana * HILLY_AANA_TO_SQM;
  const paisa = Math.floor(rem / HILLY_PAISA_TO_SQM);
  rem -= paisa * HILLY_PAISA_TO_SQM;
  const daam = Math.round((rem / HILLY_DAAM_TO_SQM) * 100) / 100;
  return { ropani, aana, paisa, daam };
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function unwrapList<T>(raw: any): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (Array.isArray(raw.data)) return raw.data as T[];
  if (Array.isArray(raw.Data)) return raw.Data as T[];
  return [];
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
      const selected = options.find(
        (item) => String(item.id) === String(value)
      );
      setInputValue(selected ? getLabel(selected) : "");
    } else {
      setInputValue("");
    }
  }, [value, options, getLabel]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowOptions(false);
        if (value) {
          const selected = options.find(
            (item) => String(item.id) === String(value)
          );
          setInputValue(selected ? getLabel(selected) : "");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, options, getLabel]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setShowOptions(true);
    if (val.length === 0) {
      onChange("");
      if (onClear) onClear();
    }
  };

  const handleSelect = (item: any) => {
    setInputValue(getLabel(item));
    onChange(item.id.toString());
    setShowOptions(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue("");
    setShowOptions(false);
    onChange("");
    if (onClear) onClear();
  };

  const filtered =
    inputValue.trim() === ""
      ? options
      : options.filter((item) =>
        getLabel(item).toLowerCase().includes(inputValue.toLowerCase())
      );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled) setShowOptions(true);
          }}
          placeholder={isLoading ? "Loading..." : placeholder}
          disabled={disabled || isLoading}
          className="w-full h-12 px-4 bg-gray-50 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <ChevronDown size={16} />
        </div>
      </div>

      {showOptions && !disabled && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto">
          {isLoading ? (
            <li className="p-4 text-center text-sm text-gray-500">Loading...</li>
          ) : filtered.length > 0 ? (
            filtered.map((item, index) => (
              <li
                key={item.id ?? index}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
                className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-50 last:border-0"
              >
                {getLabel(item)}
              </li>
            ))
          ) : (
            <li className="p-4 text-center text-sm text-gray-400 italic">
              No matches found
            </li>
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

  // ── Role detection ──────────────────────────────────────────────────────
  const { token } = useAuthStore();
  const decoded: any = token ? jwtDecode(token) : {};
  const isSuperAdmin = (decoded?.Role ?? decoded?.role ?? "").toLowerCase() === "superadmin";

  // ── Fetch all offices only when SuperAdmin ──────────────────────────────
  const { items: rawAllOfficeData, isLoadingItems: isLoadingAllOffices } =
    useFetchAll<Office>(
      isSuperAdmin ? "/api/office" : "",
      ["all-offices"]
    );
  const allOfficeList = unwrapList<Office>(rawAllOfficeData);

  const { items: rawFetchedProperty, isLoadingItems: isFetchingProperty } =
    useFetchAll<PropertyDetail>(
      mode === "edit" && id ? `/api/property?id=${id}` : "",
      ["property-detail", id ?? ""]
    );
  const propertyData = unwrapList<PropertyDetail>(rawFetchedProperty)[0];
  const initialData = propInitialData || (mode === "edit" ? propertyData : undefined);

  const { create, update } = useMutate<PropertyDetail>("/api/property", "property");

  const { items: rawPropertyTypeData, isLoadingItems: isLoadingPropertyType } =
    useFetchAll<PropertyType>("/api/propertytype", ["propertytype"]);
  const propertyTypeList = unwrapList<PropertyType>(rawPropertyTypeData);

  const { items: rawLegalStatusData } = useFetchAll<LegalStatus>("/api/legalstatus", ["legalstatus"]);
  const legalStatusList = unwrapList<LegalStatus>(rawLegalStatusData);

  const { items: rawUsageRightData } = useFetchAll<UsageRights>("/api/usageright", ["usageright"]);
  const usageRightsList = unwrapList<UsageRights>(rawUsageRightData);

  const { items: rawUsageTypeData } = useFetchAll<UsageType>("/api/usagetype", ["usagetype"]);
  const usageTypeList = unwrapList<UsageType>(rawUsageTypeData);

  const { items: rawGeographicRegionData, isLoadingItems: isLoadingGeographicRegion } =
    useFetchAll<GeographicRegion>("/api/geographic-region", ["geographicregion"]);
  const geographicRegionList = unwrapList<GeographicRegion>(rawGeographicRegionData);

  const { items: rawOwnershipTypeData } = useFetchAll<OwnershipType>("/api/ownershiptype", ["ownershiptype"]);
  const ownershipTypeList = unwrapList<OwnershipType>(rawOwnershipTypeData);

  // ── Office measurement unit (scoped to logged-in user's office) ─────────
  const { items: rawOfficeData } = useFetchAll<Office>(
    `/api/office?id=${officeId}`,
    ["office"]
  );
  const officeList = unwrapList<Office>(rawOfficeData);
  const officeMeasurementUnit = officeList[0]?.measurementUnit;

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema) as any,
    defaultValues: {
      officeId: "",
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
      taxAmount: 0,
      ownershipTransferMiti: "",
      measurementUnit: "Katha",
      bigha: 0,
      kattha: 0,
      dhur: 0,
      ropani: 0,
      aana: 0,
      paisa: 0,
      daam: 0,
      latitude: 0,
      longitude: 0,
    },
  });

  const { items: rawProvinceData, isLoadingItems: isLoadingProvince } =
    useFetchAll("/api/province", ["province"]);
  const provinceList = unwrapList<any>(rawProvinceData);

  const selectedProvinceId = form.watch("province");
  const selectedDistrictId = form.watch("district");
  const selectedLocalbodyId = form.watch("localbody");

  const { items: rawDistrictData, isLoadingItems: isLoadingDistrict } =
    useFetchAll<District>(
      selectedProvinceId
        ? `/api/district?provinceId=${selectedProvinceId}`
        : "/api/district",
      ["district", selectedProvinceId || "all"]
    );
  const districtList = unwrapList<District>(rawDistrictData);

  const { items: rawLocalbodyData, isLoadingItems: isLoadingLocalbody } =
    useFetchAll<Localbody>(
      selectedDistrictId
        ? `/api/localbody?districtId=${selectedDistrictId}`
        : "/api/localbody",
      ["localbody", selectedDistrictId || "all"]
    );
  const localbodyList = unwrapList<Localbody>(rawLocalbodyData);

  // ── Lease-out rights detection ──────────────────────────────────────────
  const selectedUsageRights = form.watch("usageRights");
  const selectedUsageRightObj = usageRightsList.find(
    (item) => String(item.id) === String(selectedUsageRights)
  );
  const isLeasedOutRights =
    selectedUsageRightObj?.name?.toLowerCase() === "leased-out rights" ||
    (selectedUsageRightObj as any)?.usageRight?.toLowerCase() === "leased-out rights";

  useEffect(() => {
    if (isLeasedOutRights) {
      form.setValue("usageTypes", "");
    }
  }, [isLeasedOutRights]);

  // ── Bottom-up auto-select province/district from localbody ──────────────
  useEffect(() => {
    if (!selectedLocalbodyId || !localbodyList.length) return;
    const matched = localbodyList.find(
      (lb: any) => String(lb.id) === String(selectedLocalbodyId)
    );
    if (matched) {
      if ((matched as any).districtId)
        form.setValue("district", String((matched as any).districtId), { shouldValidate: true });
      if ((matched as any).provinceId)
        form.setValue("province", String((matched as any).provinceId), { shouldValidate: true });
    }
  }, [selectedLocalbodyId, localbodyList]);

  useEffect(() => {
    if (!selectedDistrictId || !districtList.length) return;
    const matched = districtList.find(
      (d: any) => String(d.id) === String(selectedDistrictId)
    );
    if (matched && (matched as any).provinceId)
      form.setValue("province", String((matched as any).provinceId), { shouldValidate: true });
  }, [selectedDistrictId, districtList]);

  // ── Bidirectional area sync ─────────────────────────────────────────────
  const lastEdited = useRef<"terai" | "hilly" | "sqm" | null>(null);
  const isUpdating = useRef(false);

  const bigha = form.watch("bigha");
  const kattha = form.watch("kattha");
  const dhur = form.watch("dhur");
  const ropani = form.watch("ropani");
  const aana = form.watch("aana");
  const paisa = form.watch("paisa");
  const daam = form.watch("daam");
  const areaInSqMeters = form.watch("areaInSqMeters");

  useEffect(() => {
    if (isUpdating.current || lastEdited.current !== "terai") return;
    const sqm = calcTeraiToSqm(Number(bigha) || 0, Number(kattha) || 0, Number(dhur) || 0);
    const hillyVals = sqmToHilly(sqm);
    isUpdating.current = true;
    form.setValue("areaInSqMeters", round2(sqm));
    form.setValue("areaInSqft", round2(sqm * SQM_TO_SQFT));
    form.setValue("ropani", hillyVals.ropani);
    form.setValue("aana", hillyVals.aana);
    form.setValue("paisa", hillyVals.paisa);
    form.setValue("daam", hillyVals.daam);
    setTimeout(() => { isUpdating.current = false; }, 0);
  }, [bigha, kattha, dhur]);

  useEffect(() => {
    if (isUpdating.current || lastEdited.current !== "hilly") return;
    const sqm = calcHillyToSqm(Number(ropani) || 0, Number(aana) || 0, Number(paisa) || 0, Number(daam) || 0);
    const teraiVals = sqmToTerai(sqm);
    isUpdating.current = true;
    form.setValue("areaInSqMeters", round2(sqm));
    form.setValue("areaInSqft", round2(sqm * SQM_TO_SQFT));
    form.setValue("bigha", teraiVals.bigha);
    form.setValue("kattha", teraiVals.kattha);
    form.setValue("dhur", teraiVals.dhur);
    setTimeout(() => { isUpdating.current = false; }, 0);
  }, [ropani, aana, paisa, daam]);

  useEffect(() => {
    if (isUpdating.current || lastEdited.current !== "sqm") return;
    const sqm = Number(areaInSqMeters) || 0;
    const teraiVals = sqmToTerai(sqm);
    const hillyVals = sqmToHilly(sqm);
    isUpdating.current = true;
    form.setValue("areaInSqft", round2(sqm * SQM_TO_SQFT));
    form.setValue("bigha", teraiVals.bigha);
    form.setValue("kattha", teraiVals.kattha);
    form.setValue("dhur", teraiVals.dhur);
    form.setValue("ropani", hillyVals.ropani);
    form.setValue("aana", hillyVals.aana);
    form.setValue("paisa", hillyVals.paisa);
    form.setValue("daam", hillyVals.daam);
    setTimeout(() => { isUpdating.current = false; }, 0);
  }, [areaInSqMeters]);

  // ── Populate form on edit ───────────────────────────────────────────────
  useEffect(() => {
    if (!initialData) return;
    const d = initialData as any;
    const sqm = d.landArea ?? 0;

    const teraiVals =
      d.bigha != null
        ? { bigha: d.bigha ?? 0, kattha: d.kattha ?? 0, dhur: d.dhur ?? 0 }
        : sqmToTerai(sqm);

    const hillyVals =
      d.ropani != null
        ? { ropani: d.ropani ?? 0, aana: d.aana ?? 0, paisa: d.paisa ?? 0, daam: d.daam ?? 0 }
        : sqmToHilly(sqm);

    form.reset({
      propertytype: d.propertyTypeId?.toString() ?? "",
      name: d.name ?? "",
      province: d.provinceId?.toString() ?? "",
      district: d.districtId?.toString() ?? "",
      localbody: d.localBodyId?.toString() ?? "",
      description: d.description ?? "",
      kittaNumber: d.kittaNumber ?? "",
      sheetNumber: d.sheetNumber ?? "",
      wardNo: d.wardNo?.toString() ?? "",
      groundCode: (d.landGeoCoordinate || d.geoCoordinates) ?? "",
      constructionYear: d.constructionYear ?? "",
      legalstatus: d.legalStatusId?.toString() ?? "",
      areaInSqMeters: d.landArea ?? d.buildingArea ?? d.areaInSqMeters ?? 0,
      areaInSqft: round2((d.landArea ?? 0) * SQM_TO_SQFT),
      ownershipType: d.ownershipTypeId?.toString() ?? "",
      geographicRegion: d.geographicRegionId?.toString() ?? "",
      usageRights: d.usageRightId?.toString() ?? "",
      usageTypes: d.usageId?.toString() ?? "",
      currentUsage: d.currentUsageId?.toString() ?? d.usageRightId?.toString() ?? "",
      noOfFloor: d.noOfFloors ?? 0,
      encroachmentRisk: d.encroachmentRisk ?? "",
      valuation: Number(d.valuation) || 0,
      taxAmount: Number(d.taxAmount) || 0,
      ownershipTransferMiti: d.ownershipTransferDate ?? "",
      measurementUnit: officeMeasurementUnit || "Katha",
      bigha: teraiVals.bigha,
      kattha: teraiVals.kattha,
      dhur: teraiVals.dhur,
      ropani: hillyVals.ropani,
      aana: hillyVals.aana,
      paisa: hillyVals.paisa,
      daam: hillyVals.daam,
      latitude: d.land_Latitude ?? d.building_Latitude ?? 0,
      longitude: d.land_Longitude ?? d.building_Longitude ?? 0,
      // Pre-fill officeId on edit if SuperAdmin
      officeId: isSuperAdmin ? (d.officeId?.toString() ?? "") : "",
    });
  }, [initialData, officeMeasurementUnit]);

  const buildDefaultArea = (values: PropertyFormValues): string => {
    const unit = (officeMeasurementUnit ?? "").toLowerCase();
    const isTeraiUnit = /bigha|kattha|katha|dhur|terai/i.test(unit);
    const isHillyUnit = /ropani|aana|paisa|daam|hilly/i.test(unit);
    if (isTeraiUnit)
      return `${values.bigha ?? 0}-${values.kattha ?? 0}-${values.dhur ?? 0}`;
    if (isHillyUnit)
      return `${values.ropani ?? 0}-${values.aana ?? 0}-${values.paisa ?? 0}-${values.daam ?? 0}`;
    return (
      `${values.bigha ?? 0}-${values.kattha ?? 0}-${values.dhur ?? 0} | ` +
      `${values.ropani ?? 0}-${values.aana ?? 0}-${values.paisa ?? 0}-${values.daam ?? 0}`
    );
  };

  const onSubmit = async (values: PropertyFormValues) => {
    setLoading(true);
    try {
      const payload: any = {
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
        usageRightId: Number(values.usageRights) || 0,
        ownershipTypeId: Number(values.ownershipType) || 0,
        geographicRegionId: Number(values.geographicRegion) || 0,
        ownershipTransferMiti: values.ownershipTransferMiti || "",
        latitude: values.latitude || 0,
        longitude: values.longitude || 0,
        valuation: Number(values.valuation) || 0,
        taxAmount: Number(values.taxAmount) || 0,
        defaultArea: buildDefaultArea(values),
        // ── Send officeId for SuperAdmin, otherwise use session officeId ──
        officeId: isSuperAdmin
          ? Number(values.officeId) || 0
          : officeId,
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

  const makeNumberHandler = (
    section: "terai" | "hilly" | "sqm",
    fieldOnChange: (v: number | null) => void
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    lastEdited.current = section;
    fieldOnChange(e.target.value === "" ? null : Number(e.target.value));
  };

  const isBuilding = propertyTypeList
    .find((p) => String(p.id) === form.watch("propertytype"))
    ?.propertyType?.toLowerCase() === "building";
  // const isLand = propertyTypeList
  //   .find((p) => String(p.id) === form.watch("propertytype"))
  //   ?.propertyType?.toLowerCase() === "land";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40">
      {mode === "edit" && isFetchingProperty ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-slate-500 font-medium">{t("common.loading")}</span>
        </div>
      ) : (
        <>


          <div className="gap-6 items-start">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl">

                  <div className="bg-slate-50/50 p-6 border-b border-gray-100">
                    {/* Added justify-between here */}
                    <div className="flex items-center justify-between">

                      {/* Grouped the icon and title together on the left */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                          <span className="material-symbols-outlined text-white text-xl">description</span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">
                          {t("property.propertyInformation")}
                        </h2>
                      </div>

                      {/* Button is now a direct child, forcing it to the right */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>

                    </div>
                  </div>

                  <div className="p-6 space-y-12">

                    {/* ── Section 1: General Details ── */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                        <h3 className="text-base font-bold text-gray-800 tracking-tight">
                          {t("property.generalDetails")}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* ── Office field — SuperAdmin only ── */}
                        {isSuperAdmin && (
                          <FormField control={form.control} name="officeId" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                {t("sidebar.office")} <span className="text-red-500">*</span>
                              </FormLabel>
                              <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                                <FormControl>
                                  <SearchableSelect
                                    options={allOfficeList}
                                    value={field.value ?? ""}
                                    onChange={(v) => field.onChange(v || "")}
                                    getLabel={(item) => item.name || (item as any).office || ""}
                                    placeholder="Select Office"
                                    disabled={loading || isLoadingAllOffices}
                                    isLoading={isLoadingAllOffices}
                                  />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}


                        {/* Property Type */}
                        <FormField control={form.control} name="propertytype" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("property.propertyType")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect
                                  options={propertyTypeList}
                                  value={field.value}
                                  onChange={(v) => field.onChange(v || "")}
                                  getLabel={(item) => item.propertyType}
                                  placeholder="Select Property Type"
                                  disabled={loading || isLoadingPropertyType}
                                  isLoading={isLoadingPropertyType}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Province */}
                        <FormField control={form.control} name="province" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("property.province")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect
                                  options={provinceList}
                                  value={field.value}
                                  onChange={(v) => {
                                    field.onChange(v || "");
                                    if (!v) {
                                      form.setValue("district", "");
                                      form.setValue("localbody", "");
                                    }
                                  }}
                                  getLabel={(item) => item.name || item.province}
                                  placeholder="Select Province"
                                  disabled={loading || isLoadingProvince}
                                  isLoading={isLoadingProvince}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* District */}
                        <FormField control={form.control} name="district" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("dashboard.district")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect
                                  options={districtList}
                                  value={field.value}
                                  onChange={(v) => {
                                    field.onChange(v || "");
                                    if (!v) form.setValue("localbody", "");
                                  }}
                                  getLabel={(item) => item.name || (item as any).district}
                                  placeholder="Select District"
                                  disabled={loading || isLoadingDistrict}
                                  isLoading={isLoadingDistrict}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Local Body */}
                        <FormField control={form.control} name="localbody" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("property.localBody")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect
                                  options={localbodyList}
                                  value={field.value}
                                  onChange={(v) => field.onChange(v || "")}
                                  getLabel={(item) => item.name || (item as any).localbody}
                                  placeholder="Select Local Body"
                                  disabled={loading || isLoadingLocalbody}
                                  isLoading={isLoadingLocalbody}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Ward No */}
                        <FormField control={form.control} name="wardNo" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("property.wardNo")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value || "")}
                                disabled={loading}
                                className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white transition-all shadow-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Geographic Region */}
                        <FormField control={form.control} name="geographicRegion" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("property.geographicRegion")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect
                                  options={geographicRegionList}
                                  value={field.value}
                                  onChange={(v) => field.onChange(v || "")}
                                  getLabel={(item) => item.name || (item as any).geographicRegion}
                                  placeholder="Select Region"
                                  disabled={loading || isLoadingGeographicRegion}
                                  isLoading={isLoadingGeographicRegion}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* No of Floors — building only */}
                        {isBuilding && (
                          <FormField control={form.control} name="noOfFloor" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                {t("property.noOfFloor")} <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                                  placeholder="e.g. 3"
                                  disabled={loading}
                                  className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white transition-all shadow-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}

                        {/* Kitta Number */}
                        <FormField control={form.control} name="kittaNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("property.kittaNumber")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value || "")}
                                placeholder="e.g. 4529-B"
                                disabled={loading}
                                className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white transition-all shadow-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Name */}
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("common.name")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value || "")}
                                disabled={loading}
                                className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Description */}
                        <FormField control={form.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("property.description")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value || "")}
                                disabled={loading}
                                className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Construction Year — land only */}
                        {isBuilding && (
                          <FormField control={form.control} name="constructionYear" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                {t("property.constructionYear")} <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <NepaliDatePicker
                                  id="constructionYear"
                                  name="constructionYear"
                                  value={field.value ?? ""}
                                  onSelect={(value: any) => {
                                    const year = value.value.split("-")[0];
                                    field.onChange(year || "");
                                  }}
                                  className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}

                        {/* Ownership Transfer Miti */}
                        <FormField control={form.control} name="ownershipTransferMiti" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("property.ownershipTransferMiti")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <NepaliDatePicker
                                id="ownershipTransferMiti"
                                name="ownershipTransferMiti"
                                value={field.value ?? ""}
                                onSelect={(value: any) => field.onChange(value.value)}
                                className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Legal Status */}
                        <FormField control={form.control} name="legalstatus" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("property.legalStatus")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect
                                  options={legalStatusList}
                                  value={field.value}
                                  onChange={(v) => field.onChange(v || "")}
                                  getLabel={(item) => item.name || (item as any).legalStatus}
                                  placeholder="Select Legal Status"
                                  disabled={loading}
                                />
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
                        <h3 className="text-base font-bold text-gray-800 tracking-tight">
                          {t("property.physicalMeasurementsAndLocation")}
                        </h3>
                      </div>

                      <div className="space-y-6">
                        {/* Terai */}
                        <section className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest">Terai</span>
                            <h3 className="text-sm font-semibold text-gray-600">Bigha · Kattha · Dhur</h3>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            {(["bigha", "kattha", "dhur"] as const).map((unit) => (
                              <FormField key={unit} control={form.control} name={unit} render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">{unit.charAt(0).toUpperCase() + unit.slice(1)}</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} onChange={makeNumberHandler("terai", field.onChange)} placeholder="0.00" className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            ))}
                          </div>
                        </section>

                        {/* Hilly */}
                        <section className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-widest">Hilly</span>
                            <h3 className="text-sm font-semibold text-gray-600">Ropani · Aana · Paisa · Daam</h3>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(["ropani", "aana", "paisa", "daam"] as const).map((unit) => (
                              <FormField key={unit} control={form.control} name={unit} render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">{unit.charAt(0).toUpperCase() + unit.slice(1)}</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} onChange={makeNumberHandler("hilly", field.onChange)} placeholder="0.00" className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            ))}
                          </div>
                        </section>

                        {/* Metric */}
                        <section className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-widest">Metric</span>
                            <h3 className="text-sm font-semibold text-gray-600">Square Meters · Square Feet</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="areaInSqMeters" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase text-gray-400 font-bold">Area (m²) <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" step="any" value={field.value ?? ""} onChange={makeNumberHandler("sqm", field.onChange)} placeholder="0.00" className="text-center bg-gray-50 border-gray-200 h-12 rounded-xl font-bold text-gray-700" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
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

                        {/* Coordinates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                          <FormField control={form.control} name="latitude" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Latitude</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? 0} onChange={(e) => field.onChange(e.target.value || 0)} disabled={loading} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="longitude" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Longitude</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? 0} onChange={(e) => field.onChange(e.target.value || 0)} disabled={loading} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>
                    </div>

                    {/* ── Tax & Valuation ── */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                        <h3 className="text-base font-bold text-gray-800 tracking-tight">Tax & Valuation</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <FormField control={form.control} name="valuation" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("property.valuation")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                                disabled={loading}
                                className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="taxAmount" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              Tax Amount <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                                disabled={loading}
                                className="bg-gray-50 border-gray-200 h-12 rounded-xl focus:bg-white"
                              />
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
                        <h3 className="text-base font-bold text-gray-800 tracking-tight">
                          {t("property.legalAndUsageRights")}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-2">
                          <FormField control={form.control} name="ownershipType" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                {t("property.ownershipType")} <span className="text-red-500">*</span>
                              </FormLabel>
                              <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                                <FormControl>
                                  <SearchableSelect
                                    options={ownershipTypeList}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v || "")}
                                    getLabel={(item) => item.name || (item as any).ownershipType}
                                    placeholder="Select Ownership"
                                    disabled={loading}
                                  />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="usageRights" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                              {t("property.usageRights")} <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                              <FormControl>
                                <SearchableSelect
                                  options={usageRightsList}
                                  value={field.value}
                                  onChange={(v) => field.onChange(v || "")}
                                  getLabel={(item) => item.name || (item as any).usageRight}
                                  placeholder="Select Usage Rights"
                                  disabled={loading}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {!isLeasedOutRights && (
                          <FormField control={form.control} name="usageTypes" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                {t("property.usageTypes")} <span className="text-red-500">*</span>
                              </FormLabel>
                              <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                                <FormControl>
                                  <SearchableSelect
                                    options={usageTypeList}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v || "")}
                                    getLabel={(item) => item.name || (item as any).usageType}
                                    placeholder="Select Usage Type"
                                    disabled={loading}
                                  />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Form Actions */}
                  <div className="p-6 bg-slate-50/50 border-t border-gray-100 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="h-12 px-6 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-100"
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                      {loading
                        ? "Saving..."
                        : mode === "edit"
                          ? t("common.update")
                          : t("common.save")}
                    </Button>
                  </div>

                </div>
              </form>
            </Form>
          </div>
        </>
      )
      }
    </div >
  );
}