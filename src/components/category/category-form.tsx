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
import type { Category } from "@/type/category";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetchAll } from "@/hooks/useFetchAll";

// -------------------- SCHEMA --------------------
const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  moduleId: z.coerce.number().min(1, "Select ModuleId"),
  subModuleId: z.coerce.number().optional(),
});


type categoryFormValues = z.infer<typeof categorySchema>;
type categoryFormProps = {
  mode: "add" | "edit";
  initialData?: Category;
  onSuccess?: () => void;
  onCancel?: () => void;
};

type Module = {
  id: number;
  name: string;
};

// Type matching your exact API response
type SubModule = {
  id: number;
  name: string;
  moduleId: number;
};

// -------------------- COMPONENT --------------------
export default function categoryForm({ mode, initialData, onSuccess, onCancel }: categoryFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { create, update } = useMutate<Category>("/api/category", "category");

  const form = useForm<categoryFormValues>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      moduleId: initialData?.moduleId ?? 0,
      subModuleId: initialData?.subModuleId ?? 0,
    },
  });
  console.log("Initial form values:", initialData); // ✅ Debug log to verify initial values
  const selectedModuleId = form.watch("moduleId");

  const { items: moduleItems, isLoadingItems: loadingModules } = useFetchAll<Module>(
    '/api/module',
    ["module"]
  );
  const moduleData = moduleItems?.data || [];

  // ✅ Pass `null` if no module is selected to prevent firing API with ID 0.
  // ✅ Pass `selectedModuleId` in the array to force refetch when module changes.
  const { items: submoduleItems, isLoadingItems: loadingSubModules } = useFetchAll<SubModule>(
    selectedModuleId ? `/api/submodule?moduleId=${selectedModuleId}` : '',
    ["submodule", selectedModuleId]
  );
  const subModuleData = submoduleItems?.data || [];

  // ✅ Since useFetchAll gives `items`, it already extracts the array from `{ data: [...] }`



  // ✅ Reset is handled via onValueChange of the moduleId Select so it doesn't clear initialData.

  // -------------------- FORM --------------------
  const onSubmit = async (values: categoryFormValues) => {
    setLoading(true);

    try {
      const payload: any = {
        name: values.name,
        moduleId: values.moduleId,
        subModuleId: values.subModuleId, // Send null if "None" is selected
      };

      if (mode === "edit" && initialData) {
        console.log("Editing category with ID:", initialData); // ✅ Debug log to verify ID
        payload.id = initialData.id.toString();
      }

      const mutation = mode === "edit" ? update : create;
      await mutation.mutateAsync(payload);

      toast.success(
        mode === "edit" ? "Category updated successfully ✅" : "Category added successfully ✅",
        { style: { background: "#10b981", color: "white" } }
      );

      onSuccess ? onSuccess() : navigate("/category");
    } catch (err: any) {
      toast.error(
        Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.join(", ")
          : err?.response?.data?.errors || "Failed to save category",
        { style: { background: "#c6212d", color: "white" } }
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------- UI --------------------
  return (
    <div className="p-2 bg-gradient-to-br from-gray-50 to-blue-50/30 pb-40">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {mode === "add" ? "Add New Category" : "Edit Category"}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {mode === "add"
                  ? "Create a new category for your property"
                  : `Update details for ${initialData?.name}`}
              </p>
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
                  Category Details
                </h2>
              </div>

              {/* Name and Module Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Category Name
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter category name"
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="moduleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Module <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(Number(val));
                          form.setValue("subModuleId", 0); // Reset submodule when module changes
                        }}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border border-gray-300 rounded-lg px-4 py-6 focus:ring-2 focus:ring-blue-500 transition-all">
                            <SelectValue placeholder={loadingModules ? "Loading modules..." : "Select module name"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {moduleData.map((mod) => (
                            <SelectItem key={mod.id} value={mod.id.toString()}>
                              {mod.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sub Module Field */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormField
                  control={form.control}
                  name="subModuleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Sub Module
                      </FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(Number(val));
                          // ✅ FIXED: Removed the bug that was resetting moduleId to 0 here
                        }}
                        value={field.value && field.value !== 0 ? field.value.toString() : undefined}
                        disabled={!selectedModuleId || selectedModuleId === 0} // Disabled until module is picked
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border border-gray-300 rounded-lg px-4 py-6 focus:ring-2 focus:ring-blue-500 transition-all">
                            <SelectValue
                              placeholder={
                                !selectedModuleId || selectedModuleId === 0
                                  ? "Select a module first"
                                  : loadingSubModules
                                    ? "Loading..."
                                    : subModuleData.length === 0
                                      ? "No sub modules available"
                                      : "Select sub module"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">None / Clear</SelectItem>

                          {/* ✅ Map through `subModules` derived from useFetchAll `items` */}
                          {subModuleData.map((sub) => (
                            console.log("Rendering sub module:", sub), // ✅ Debug log to verify data
                            <SelectItem key={sub.id} value={sub.id.toString()}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <>{mode === "edit" ? "Update Category" : "Save Category"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}