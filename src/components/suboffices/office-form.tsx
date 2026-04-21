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
import type { Office } from "@/type/office";


// -------------------- SCHEMA --------------------
const OfficeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  parentId: z.number().optional().nullable(),
  measurementUnit: z.string().optional().nullable(),
});

type OfficeFormValues = z.infer<typeof OfficeSchema>;

type OfficeFormProps = {
  mode: "add" | "edit";
  initialData?: Office;
  onSuccess?: () => void;
  onCancel?: () => void;
};

// -------------------- COMPONENT --------------------
export default function OfficeForm({ mode, initialData, onSuccess, onCancel }: OfficeFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { create, update } = useMutate<Office>("/api/office", "office");
  const { items: fyData } = useFetchAll<Office>("/api/office", ["office"]);

  function getOffices(data: any): Office[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const nestedData = data.data || data.Data;
    if (Array.isArray(nestedData)) return nestedData;
    return [];
  }

  const Offices = getOffices(fyData);

  // Refined styling for inputs - sleek, modern, consistent height
  const inputClass = "w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-200 placeholder:text-gray-400 shadow-sm";

  // -------------------- FORM --------------------
  const form = useForm<OfficeFormValues>({
    resolver: zodResolver(OfficeSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      parentId: initialData?.parentId || null,
      measurementUnit: initialData?.measurementUnit || null,
    },
  });

  const onSubmit = async (values: OfficeFormValues) => {
    setLoading(true);

    try {
      const existingFy = Offices.find(fy =>
        fy.name.toLowerCase() === values.name.toLowerCase() &&
        fy.id !== initialData?.id
      );

      if (existingFy) {
        toast.error(`Office "${values.name}" already exists`, {
          style: { background: "#c6212d", color: "white" },
        });
        setLoading(false);
        return;
      }

      const payload: any = {
        name: values.name,
        code: values.code,
        parentId: values.parentId || null,
        measurementUnit: values.measurementUnit || null,
      };

      if (mode === "edit" && initialData?.id) {
        payload.id = initialData.id;
      }

      const mutation = mode === "edit" ? update : create;
      await mutation.mutateAsync(payload);

      toast.success(
        mode === "edit"
          ? "Office updated successfully ✅"
          : "Office added successfully ✅",
        { style: { background: "#10b981", color: "white" } }
      );

      onSuccess ? onSuccess() : navigate("/office");
    } catch (err: any) {
      toast.error(
        Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.join(", ")
          : err?.response?.data?.errors || "Failed to save Office",
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
                  {mode === "add" ? "Add New Office" : "Edit Office"}
                </h1>

              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCancel}
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
                  <div className="h-px bg-gray-200 grow"></div>

                  <div className="h-px bg-gray-200 grow"></div>
                </div>

                {/* Row 1: Name & Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                          Office Name
                          <span className="text-red-500 text-xs">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Kathmandu Main Branch"
                            className={inputClass}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                          Code
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. KTM-001"
                            className={inputClass}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 2: Parent Office */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="parentId"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Parent Office
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <select
                              {...field}
                              className={inputClass + " appearance-none cursor-pointer"}
                              disabled={loading}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            >
                              <option value="">No Parent</option>
                              {Offices.filter(o => o.id !== initialData?.id).map((office) => (
                                <option key={office.id} value={office.id}>
                                  {office.name}
                                </option>
                              ))}
                            </select>
                            {/* Custom Dropdown Arrow */}
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                              </svg>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* // create a dropdown using selection hardcoded input filed for the Measurement Unit the units are Sq.m, Terai, Hilly */}
                <FormField
                  control={form.control}
                  name="measurementUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Measurement Unit
                      </FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          disabled={loading}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">No Measurement Unit</option>
                          <option value="Sq.m">Sq.m</option>
                          <option value="Terai">Terai(Bigha,Dhur,Kattha)</option>
                          <option value="Hilly">Hilly(Ropani,Aana,Paisa,Dam)</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-6 border-t border-gray-100 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
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
                      {mode === "edit" ? "Update Office" : "Save Office"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div >
  );
}