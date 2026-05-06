import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X, FileText, ChevronDown } from "lucide-react";
import { toast } from "sonner";

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
import { useMutate } from "@/hooks/useMutate";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useFiscalYear } from "@/context/FiscalYearContext";
import type { Tax } from "@/type/tax";
import NepaliDatePicker from "../ui/NepaliDatePicker";
import { useTranslation } from "react-i18next";

// -------------------- TYPES --------------------
interface Property {
  id: number;
  name: string;
}

// -------------------- SCHEMA --------------------
const baseTaxPaymentSchema = z.object({
  propertyId: z.number().min(1, "Property is required"),
  fiscalYearId: z.number().min(1, "Fiscal Year is required"),
  receiptNo: z.string().min(1, "Receipt No is required"),
  amountPaid: z.number().min(1, "Amount is required"),
  paymentMiti: z.string().min(1, "Payment Date is required"),
  file: z.any().optional(),
});

type TaxPaymentFormValues = z.infer<typeof baseTaxPaymentSchema>;

interface TaxPaymentFormProps {
  mode: "add" | "edit";
  paymentId?: number;
  initialData?: Partial<Tax>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// -------------------- SEARCHABLE SELECT COMPONENT --------------------
interface SearchableSelectProps {
  options: any[];
  value: any;
  onChange: (value: any) => void;
  getLabel: (item: any) => string;
  placeholder: string;
  disabled?: boolean;
  isLoading?: boolean;
  inputClassName?: string;
  // Optional custom clear handler
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
  inputClassName = "",
  onClear
}: SearchableSelectProps) => {
  const [inputValue, setInputValue] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input with form value
  useEffect(() => {
    if (value) {
      const selectedOption = options.find((item) => item.id == value);
      if (selectedOption) {
        setInputValue(getLabel(selectedOption));
      }
    } else {
      setInputValue("");
    }
  }, [value, options]);

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
    if (val.length === 0) onChange(null);
  };

  const handleSelect = (item: any) => {
    setInputValue(getLabel(item));
    onChange(item.id);
    setShowOptions(false);
  };

  const filteredOptions = options.filter((item) =>
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
          className={inputClassName}
        />
        {/* Chevron Icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
          <ChevronDown size={16} />
        </div>
         {/* Clear Button */}
         {value && inputValue && !disabled && (
           <button
             type="button"
             onClick={(e) => {
               e.stopPropagation();
               if (onClear) {
                 onClear();
               } else {
                 setInputValue("");
                 onChange(null);
               }
             }}
             className="absolute inset-y-0 right-8 flex items-center text-gray-400 hover:text-gray-600"
           >
             <X size={14} />
           </button>
         )}
      </div>

      {/* Dropdown Options */}
      {showOptions && !disabled && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <li className="p-4 text-center text-sm text-gray-500">{t("payment.loading")}</li>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((item, index) => (
              <li
                key={index}
                onClick={() => handleSelect(item)}
                className="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-50 last:border-0"
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

// -------------------- COMPONENT --------------------
export default function TaxPaymentForm({
  mode,
  paymentId,
  initialData,
  onSuccess,
  onCancel
}: TaxPaymentFormProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id: routeId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const { activeFiscalYearId, fiscalYears } = useFiscalYear();
  const queryClient = useQueryClient();

  const handleCancel = () => {
    if (onCancel) onCancel();
    else navigate("/tax-compliance");
  };

  const editId = paymentId || (mode === "edit" ? Number(routeId) : undefined);

  const { items: propertyData, isLoadingItems: isLoadingProperty } = useFetchAll<Property>("/api/property", ["property"]);

  const editApiUrl = editId ? `/api/payment?id=${editId}` : "";
  const { items: paymentData, isLoadingItems: isLoadingPayment } = useFetchAll<Tax>(
    editApiUrl,
    editId ? ["payment", editId] : ["payment-none"]
  );

  const normalizeTax = (data: any): Tax | null => {
    if (!data) return null;
    let item: any = null;

    if (Array.isArray(data)) item = data[0];
    else if (Array.isArray(data.data)) item = data.data[0];
    else if (Array.isArray(data.Data)) item = data.Data[0];
    else if (typeof data === 'object' && data.id) item = data;

    if (!item) return null;

    return {
      ...item,
      id: item.id ?? item.Id ?? item.paymentId ?? item.PaymentId,
      propertyId: item.propertyId ?? item.PropertyId,
      fiscalYearId: item.fiscalYearId ?? item.FiscalYearId ?? item.FIscalYearId,
      receiptNo: item.receiptNo ?? item.ReceiptNo ?? "",
      amountPaid: item.amountPaid ?? item.amount ?? item.Amount ?? 0,
      paymentMiti: item.paymentMiti ?? item.PaymentMiti ?? "",
      FilePath: item.FilePath ?? item.filePath ?? "",
      file: item.File ?? item.file,
      property: item.property ?? item.Property ?? "",
    };
  };

  const existingPayment = initialData ? { ...initialData } as Tax : normalizeTax(paymentData);

  const { create, update } = useMutate<Tax>("/api/payment", "payment");

  const form = useForm<TaxPaymentFormValues>({
    resolver: zodResolver(baseTaxPaymentSchema),
    defaultValues: {
      propertyId: 0,
      fiscalYearId: activeFiscalYearId || 0,
      receiptNo: "",
      amountPaid: 0,
      paymentMiti: "",
      file: undefined,
    },
  });

  const normalizeData = <T,>(data: any): T[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const dataCandidate = data.data || data.Data;
    if (Array.isArray(dataCandidate)) return dataCandidate;
    return [];
  };

  const properties = normalizeData<Property>(propertyData);

  // Filter Fiscal Years to ensure valid ID > 0
  const validFiscalYears = fiscalYears.filter(fy => fy.id && fy.id > 0);

  useEffect(() => {
    if (mode === "edit" && existingPayment) {
      form.reset({
        propertyId: existingPayment.PropertyId || 0,
        fiscalYearId: existingPayment.FIscalYearId || activeFiscalYearId || 0,
        receiptNo: existingPayment.receiptNo || "",
        amountPaid: existingPayment.amount || 0,
        paymentMiti: existingPayment.paymentMiti || "",
        file: undefined,
      });
      if (existingPayment.FilePath) {
        setFileName(existingPayment.FilePath.split('/').pop() || "Current file");
      }
    } else if (mode === "add") {
      form.reset({
        propertyId: 0,
        fiscalYearId: activeFiscalYearId || 0,
        receiptNo: "",
        amountPaid: 0,
        paymentMiti: "",
        file: undefined,
      });
      setFileName("");
    }
  }, [mode, existingPayment, activeFiscalYearId, form]);

  const onSubmit = async (values: TaxPaymentFormValues) => {
    setLoading(true);

    try {
      const formData = new FormData();

      if (mode === "edit" && editId) {
        formData.append("id", editId.toString());
      }

      formData.append("propertyId", values.propertyId.toString());
      formData.append("fiscalYearId", values.fiscalYearId.toString());
      formData.append("receiptNo", values.receiptNo);
      formData.append("amountPaid", values.amountPaid.toString());
      formData.append("paymentMiti", values.paymentMiti);

      if (values.file && values.file.length > 0) {
        formData.append("file", values.file[0]);
      }

      if (mode === "edit") {
        await update.mutateAsync(formData);
        toast.success(t("payment.paymentUpdatedSuccessfully") + " ✅");
      } else {
        await create.mutateAsync(formData);
        toast.success(t("payment.paymentSavedSuccessfully") + " ✅");
      }

      queryClient.invalidateQueries({ queryKey: ["payment"] });
      queryClient.invalidateQueries({ queryKey: ["paymentStatus"] });

      setFileName("");
      if (onSuccess) onSuccess();
      else navigate("/tax-compliance");

    } catch (err: any) {
      console.error("Submission Error:", err);
      toast.error(err?.response?.data?.message || `Failed to ${mode} payment`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      if (mode === "edit" && existingPayment?.FilePath) {
        setFileName(existingPayment.FilePath.split('/').pop() || "Current file");
      } else {
        setFileName("");
      }
    }
  };

  // Base class for inputs to match existing style
  const inputBaseClass = "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {mode === "edit" ? t("payment.editPayment") : t("payment.addPayment")}
            </h3>
            <p className="text-xs text-slate-500">
              {mode === "edit" ? t("payment.editPayment") : t("payment.addPayment")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="rounded-full hover:bg-slate-100"
        >
          <X className="h-5 w-5 text-slate-500" />
        </Button>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* Row 1: Property & Fiscal Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("payment.property")} <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={properties}
                      value={field.value?.toString()}
                      onChange={(val) => field.onChange(val ? Number(val) : null)}
                      getLabel={(p) => p.name}
                      placeholder={isLoadingProperty ? "Loading..." : ""}
                      disabled={loading || isLoadingProperty}
                      inputClassName={inputBaseClass}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fiscalYearId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> {t("payment.fiscalYear")} <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={validFiscalYears}
                      value={field.value?.toString()}
                      onChange={(val) => field.onChange(val ? Number(val) : null)}
                      getLabel={(fy) => fy.fiscalYear}
                      placeholder=""
                      disabled={loading}
                      inputClassName={inputBaseClass}
                      // When X is clicked, reset to active fiscal year
                      onClear={() => {
                        if (activeFiscalYearId) {
                          field.onChange(activeFiscalYearId);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Row 2: Receipt No & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="receiptNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> {t("payment.receiptNo")} <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="REC-..." disabled={loading} className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountPaid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("payment.amount")} <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      placeholder="0.00"
                      disabled={loading}
                      className="h-11"
                      value={typeof field.value === "number" ? field.value : ""}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Row 3: Payment Miti */}
          <FormField
            control={form.control}
            name="paymentMiti"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("payment.paymentDate")} <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <NepaliDatePicker
                    value={field.value}
                    onSelect={(value: any) => {
                      field.onChange(value.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Row 4: File Upload */}
          <FormField
            control={form.control}
            name="file"
            render={({ field: { value, onChange, ...fieldProps } }) => (
              <FormItem>
                <FormLabel>
                  {t("payment.uploadReceipt")} {mode === "add" && <span className="text-red-500">*</span>}
                </FormLabel>
                <FormControl>
                  <div>
                    <Input
                      {...fieldProps}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => {
                        onChange(e.target.files);
                        handleFileChange(e);
                      }}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`
                        flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                        ${fileName
                          ? "border-green-500 bg-green-50"
                          : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                        }
                      `}
                    >
                      <Upload className={`w-8 h-8 mb-2 ${fileName ? 'text-green-600' : 'text-gray-400'}`} />
                      <p className="mb-1 text-sm text-gray-500">
                        <span className="font-semibold"> {t("payment.clickToUpload")}</span>
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG or PDF (MAX. 5MB)</p>
                      {fileName && (
                        <p className="mt-2 text-sm font-medium text-green-700 truncate max-w-[200px]">
                          {fileName}
                        </p>
                      )}
                    </label>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="text-slate-600 border-slate-200"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />

                </>
              ) : mode === "edit" ? (
                t("common.update")
              ) : (
                t("common.save")
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}