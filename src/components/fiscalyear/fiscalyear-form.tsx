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
import { X } from "lucide-react";
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

  function getfiscalYears(data: any): FiscalYear[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const nestedData = data.data || data.Data;
    if (Array.isArray(nestedData)) return nestedData;
    return [];
  }

  const fiscalYears = getfiscalYears(fyData);

  // -------------------- FORM --------------------
  const form = useForm<FiscalyearFormValues>({
    resolver: zodResolver(fiscalyearSchema) as any,
    defaultValues: {
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
          ? "Fiscal Year updated successfully ✅"
          : "Fiscal Year added successfully ✅",
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
    <div className=" p-2 bg-white">

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {mode === "add" ? "Add New Fiscal Year" : "Edit Fiscal Year"}
              </h1>
              {/* <p className="text-gray-600 text-sm mt-1">
                {mode === "add"
                  ? "Create a new fiscal year"
                  : `Update details for ${initialData?.name}`}
              </p> */}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-all duration-200"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>


      </div>
      

      {/* Form Section */}

      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Fiscal Year Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter name (eg. 2080/81)"
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormField
                  control={form.control}
                  name="startMiti"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Start Miti <span className="text-red-500">*</span>
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
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endMiti"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        End Miti <span className="text-red-500">*</span>
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
                        {/* <Input
                          {...field}
                          placeholder="YYYY-MM-DD"
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                          disabled={loading}
                        /> */}
                      </FormControl>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-6 border-t border-gray-100">
              <Button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {mode === "edit" ? "Update Fiscal Year" : "Save Fiscal Year"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>


    </div >
  );
}
