import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
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
import type { Tax } from "@/type/tax";
import NepaliDatePicker from "../ui/NepaliDatePicker";

// -------------------- TYPES --------------------
interface Property {
  id: number;
  name: string;
}

// -------------------- SCHEMA --------------------
const taxPaymentSchema = z.object({
  propertyId: z.number().min(1, "Property is required"),
  fiscalyearId: z.number().min(1, "Fiscal Year is required"),
  ReceiptNo: z.string().min(1, "Receipt No is required"),
  amount: z.number().min(1, "Amount is required"),
  PaymentMiti: z.string().min(1, "Start Miti is required"),
  file: z.any().optional(),
});

type TaxPaymentFormValues = z.infer<typeof taxPaymentSchema>;

type TaxPaymentFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

// -------------------- COMPONENT --------------------
export default function TaxPaymentForm({ onSuccess, onCancel }: TaxPaymentFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const { activeFiscalYearId, fiscalYears } = useFiscalYear();

  // Fetch Data
  const { items: propertyData, isLoadingItems: isLoadingProperty } = useFetchAll<Property>("/api/property", ["property"]);
  
  // Mutate Data
  const { create } = useMutate<Tax>("/api/payment", "payment"); 

  const form = useForm<z.infer<typeof taxPaymentSchema>>({
    resolver: zodResolver(taxPaymentSchema),
    defaultValues: {
      propertyId: 0,
      fiscalyearId: activeFiscalYearId || 0,
      ReceiptNo: "",
      amount: 0,
      PaymentMiti: "",
      file: undefined,
    },
  });

  // Helper to normalize data arrays
  const normalizeData = <T,>(data: any): T[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const dataCandidate = data.data || data.Data;
    if (Array.isArray(dataCandidate)) return dataCandidate;
    return [];
  };

  const properties = normalizeData<Property>(propertyData);

  const onSubmit = async (values: TaxPaymentFormValues) => {
    setLoading(true);

    try {
      // 1. Create FormData
      const formData = new FormData();
      // 2. Append text fields
      formData.append("propertyId", (values.propertyId ?? 0).toString());
      formData.append("fiscalYearId", (values.fiscalyearId ?? 0).toString());
      formData.append("ReceiptNo", values.ReceiptNo);
      formData.append("amount", values.amount.toString());
      formData.append("PaymentMiti", values.PaymentMiti);

      // 3. Append file (React Hook Form standard file list format)
      if (values.file && values.file.length > 0) {
        formData.append("file", values.file[0]);
      }

      // 4. Send to API
      await create.mutateAsync(formData);

      toast.success("Tax Payment saved successfully ✅", {
        style: { background: "#10b981", color: "white" },
      });

      // 5. Reset form after success
      form.reset({
        propertyId: 0,
        fiscalyearId: 0,
        amount: 0,
        ReceiptNo: "",
        PaymentMiti: "",
        file: undefined,
      });
      setFileName("");

      // 6. Navigation or Success Callback
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/tax-payments");
      }

    } catch (err: any) {
      console.error("Submission Error:", err);
      toast.error(
        err?.response?.data?.message || "Failed to save tax payment",
        { style: { background: "#c6212d", color: "white" } }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName("");
    }
  };

  return (
    <div className="p-2 bg-gradient-to-br from-gray-50 to-green-50/30">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
               <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add Tax Payment</h1>
              <p className="text-gray-600 text-sm mt-1">
                Record a new tax payment receipt
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="rounded-full hover:bg-gray-200"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Top Row: Property & Fiscal Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-gray-700 font-medium">
                      Property Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value ? field.value.toString() : ""}
                      disabled={loading || isLoadingProperty}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue placeholder={isLoadingProperty ? "Loading..." : "Select Property"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((prop: Property) => (
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
                name="fiscalyearId"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-gray-700 font-medium">
                      Fiscal Year <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value ? field.value.toString() : ""}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 w-full">
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

            {/* Middle Row: Receipt No & Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <FormField
                control={form.control}
                name="ReceiptNo"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-gray-700 font-medium">
                      Receipt No <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. REC-2023-001"
                        disabled={loading}
                        className="h-11 w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-gray-700 font-medium">
                      Amount <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="0.00"
                        disabled={loading}
                        className="h-11 w-full"
                        value={typeof field.value === "number" ? field.value : ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <FormField
                control={form.control}
                name="PaymentMiti"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-gray-700 flex items-center justify-between">
                      Start Miti
                      <span className="text-red-500 text-xs">*</span>
                    </FormLabel>
                    <FormControl>
                      <NepaliDatePicker
                        id="paymentmiti"
                        name="paymentmiti"
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
            </div>

            {/* File Upload Section */}
            <FormField
              control={form.control}
              name="file"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">
                    Upload Receipt <span className="text-red-500">*</span>
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
                          const files = e.target.files;
                          onChange(files);
                          handleFileChange(e);
                        }}
                      />
                      <label
                        htmlFor="file-upload"
                        className={`
                          flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                          ${fileName 
                            ? "border-green-500 bg-green-50" 
                            : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                          }
                        `}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
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
                        </div>
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="h-10 px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Payment"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}