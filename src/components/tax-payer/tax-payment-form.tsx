import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutate } from "@/hooks/useMutate";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useFiscalYear } from "@/context/FiscalYearContext";
import type { Tax } from "@/type/tax"; // Assuming this is your Payment type or similar
import NepaliDatePicker from "../ui/NepaliDatePicker";

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
  paymentId?: number; // For modal edit mode
  initialData?: Partial<Tax>; // Pre-filled data from modal
  onSuccess?: () => void;
  onCancel?: () => void;
}

// -------------------- COMPONENT --------------------
export default function TaxPaymentForm({ 
  mode, 
  paymentId, 
  initialData,
  onSuccess, 
  onCancel 
}: TaxPaymentFormProps) {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const { activeFiscalYearId, fiscalYears } = useFiscalYear();
  const queryClient = useQueryClient();

  // Use prop ID (modal), route ID (page), or undefined (add)
  const editId = paymentId || (mode === "edit" ? Number(routeId) : undefined);

  // Fetch Properties
  const { items: propertyData, isLoadingItems: isLoadingProperty } = useFetchAll<Property>("/api/property", ["property"]);
  
  // Fetch existing payment for Edit Mode
  const editApiUrl = editId ? `/api/payment?id=${editId}` : "";
  const { items: paymentData, isLoadingItems: isLoadingPayment } = useFetchAll<Tax>(
    editApiUrl,
    editId ? ["payment", editId] : ["payment-none"]
  );

  // Normalize Payment Data (API response handling)
  const normalizeTax = (data: any): Tax | null => {
    if (!data) return null;
    let item: any = null;

    // Handle various response structures
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

  // Determine source of data: InitialData (Modal) or API (Page)
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

  // Populate form when data loads or mode changes
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
      
      // ID for Edit Mode
      if (mode === "edit" && editId) {
        formData.append("id", editId.toString());
      }
      
      // Form Fields (standardized names)
      formData.append("propertyId", values.propertyId.toString());
      formData.append("fiscalYearId", values.fiscalYearId.toString());
      formData.append("receiptNo", values.receiptNo);
      formData.append("amountPaid", values.amountPaid.toString()); // Ensure backend expects amountPaid
      formData.append("paymentMiti", values.paymentMiti);

      // File (Optional on Edit)
      if (values.file && values.file.length > 0) {
        formData.append("file", values.file[0]);
      }

      // Execute Mutation
      if (mode === "edit") {
        await update.mutateAsync(formData);
        toast.success("Payment updated successfully ✅");
      } else {
        await create.mutateAsync(formData);
        toast.success("Payment saved successfully ✅");
      }

      // Refresh Data
      queryClient.invalidateQueries({ queryKey: ["payment"] });
      queryClient.invalidateQueries({ queryKey: ["paymentStatus"] });

      // Callback or Navigate
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
      // If user clears file input (via X button logic if implemented), reset to existing filename
      if (mode === "edit" && existingPayment?.FilePath) {
         setFileName(existingPayment.FilePath.split('/').pop() || "Current file");
      } else {
         setFileName("");
      }
    }
  };

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
                {mode === "edit" ? "Edit Payment" : "Add Payment"}
              </h3>
              <p className="text-xs text-slate-500">
                 {mode === "edit" ? "Update details below" : "Fill in the details"}
              </p>
           </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
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
                  <FormLabel>Property <span className="text-red-500">*</span></FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value ? field.value.toString() : ""}
                    disabled={loading || isLoadingProperty}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={isLoadingProperty ? "Loading..." : "Select Property"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id.toString()}>
                          {prop.name}
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
              name="fiscalYearId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiscal Year <span className="text-red-500">*</span></FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value ? field.value.toString() : ""}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Fiscal Year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fiscalYears.filter(fy => fy.id && fy.id > 0).map((year) => (
                        <SelectItem key={year.id} value={year.id?.toString() ?? ""}>
                          {year.fiscalYear}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <FormLabel>Receipt No <span className="text-red-500">*</span></FormLabel>
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
                  <FormLabel>Amount (Rs) <span className="text-red-500">*</span></FormLabel>
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
                <FormLabel>Payment Date <span className="text-red-500">*</span></FormLabel>
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
                  Upload Receipt {mode === "add" && <span className="text-red-500">*</span>}
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
                        <span className="font-semibold">Click to upload</span>
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
              onClick={onCancel}
              disabled={loading}
              className="text-slate-600 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : mode === "edit" ? (
                "Update Payment"
              ) : (
                "Save Payment"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}