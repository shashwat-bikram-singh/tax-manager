import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
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
import { X, Save } from "lucide-react";
import { useMutate } from "@/hooks/useMutate";
import { useFetchAll } from "@/hooks/useFetchAll";
import type { FiscalYear } from "@/type/fiscalyear";
import NepaliDatePicker from "../ui/NepaliDatePicker";


// -------------------- SCHEMA --------------------
const fiscalyearSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startMiti: z.string().min(1, "Start Miti is required"),
  endMiti: z.string().min(1, "End Miti is required"),
});

type FiscalyearFormValues = z.infer<typeof fiscalyearSchema>;

type FiscalyearFormProps = {
  mode: "add" | "edit";
  initialData?: FiscalYear;
  onSuccess?: () => void;
  onCancel?: () => void;
};

// -------------------- COMPONENT --------------------
export default function FiscalyearForm({ mode, initialData, onSuccess, onCancel }: FiscalyearFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { create, update } = useMutate<FiscalYear>("/api/fiscalyear", "fiscalyear");
  const { items: fyData } = useFetchAll<FiscalYear>("/api/fiscalyear", ["fiscalyear"]);

  const handleCancel = () => {
    if (onCancel) onCancel();
    else navigate("/fiscalyear");
  };

  function getfiscalYears(data: any): FiscalYear[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const nestedData = data.data || data.Data;
    if (Array.isArray(nestedData)) return nestedData;
    return [];
  }

  const fiscalYears = getfiscalYears(fyData);

  const inputClass = "w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-200 placeholder:text-gray-400 shadow-sm";

  // -------------------- FORM --------------------
  const form = useForm<FiscalyearFormValues>({
    resolver: zodResolver(fiscalyearSchema) as any,
    defaultValues: {
      name: initialData?.fiscalYear || "",
      startMiti: initialData?.startMiti ?? "",
      endMiti: initialData?.endMiti ?? "",
    },
  });

  const onSubmit = async (values: FiscalyearFormValues) => {
    setLoading(true);

    try {
      const existingFy = fiscalYears.find(fy => 
        fy.fiscalYear.toLowerCase() === values.name.toLowerCase() && 
        fy.id !== initialData?.id
      );

      if (existingFy) {
        toast.error(`Fiscal Year "${values.name}" already exists`, {
          style: { background: "#c6212d", color: "white" },
        });
        setLoading(false);
        return;
      }

      const payload: any = {
        fiscalYear: values.name,
        startMiti: values.startMiti,
        endMiti: values.endMiti,
      };

      if (mode === "edit" && initialData?.id) {
        payload.id = initialData.id;
      }

      const mutation = mode === "edit" ? update : create;
      await mutation.mutateAsync(payload);

      toast.success(
        mode === "edit"
          ? "Fiscal Year updated successfully"
          : "Fiscal Year added successfully",
        { style: { background: "#10b981", color: "white" } }
      );

      onSuccess ? onSuccess() : navigate("/fiscalyear");
    } catch (err: any) {
      toast.error(
        Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.join(", ")
          : err?.response?.data?.errors || "Failed to save fiscal year",
        { style: { background: "#c6212d", color: "white" } }
      );
    } finally {
      setLoading(false);
    }
  };


  // -------------------- UI --------------------
  return (
    <div className="">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="bg-white border-b border-gray-100 p-8 pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {mode === "add" ? "Add New Fiscal Year" : "Edit Fiscal Year"}
                </h1>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8 pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-gray-200 flex-grow"></div>
                  <div className="h-px bg-gray-200 flex-grow"></div>
                </div>

                {/* Row 1: Name */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium text-gray-700 flex items-center justify-between">
                          Fiscal Year Name
                          <span className="text-red-500 text-xs">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. 2080/81"
                            className={inputClass}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 2: Start Miti & End Miti */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startMiti"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium text-gray-700 flex items-center justify-between">
                          Start Miti
                          <span className="text-red-500 text-xs">*</span>
                        </FormLabel>
                        <FormControl>
                          <NepaliDatePicker
                            id="start-miti"
                            name="start-miti"
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

                  <FormField
                    control={form.control}
                    name="endMiti"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium text-gray-700 flex items-center justify-between">
                          End Miti
                          <span className="text-red-500 text-xs">*</span>
                        </FormLabel>
                        <FormControl>
                          <NepaliDatePicker
                            id="end-miti"
                            name="end-miti"
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
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-6 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/30 transition-all duration-200 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {mode === "edit" ? "Update Fiscal Year" : "Save Fiscal Year"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}