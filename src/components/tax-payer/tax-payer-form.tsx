import { useState, useEffect } from "react";
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
import { X, ChevronDown, Check } from "lucide-react";
import { useMutate } from "@/hooks/useMutate";
import type { TaxPayer } from "@/type/tax-payer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetchAll } from "@/hooks/useFetchAll";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const taxPayerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  contactNo: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  vehicleNo: z.string().optional(),
  categoryId: z.coerce.number().optional(),
  moduleId: z.coerce.number().min(1, "Select Module"),
  subModuleId: z.coerce.number().optional(),
});

type taxPayerFormValues = z.infer<typeof taxPayerSchema>;
type taxPayerFormProps = {
  mode: "add" | "edit";
  initialData?: TaxPayer;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export type Module = {
  id: number;
  name: string;
};

export type SubModule = {
  id: number;
  name: string;
  moduleId: number;
};

type Category = {
  id: number;
  name: string;
  moduleId?: number;
  subModuleId?: number;
};

export default function TaxPayerForm({ mode, initialData, onSuccess, onCancel }: taxPayerFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const { create, update } = useMutate<TaxPayer>("/api/taxpayer", "taxpayer");

  const form = useForm<taxPayerFormValues>({
    resolver: zodResolver(taxPayerSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      address: initialData?.address ?? "",
      contactNo: initialData?.contactNo ?? "",
      email: initialData?.email ?? "",
      vehicleNo: initialData?.vehicleNo ?? "",
      categoryId: initialData?.categoryId ?? 0,
      moduleId: initialData?.moduleId ?? 0,
      subModuleId: initialData?.subModuleId ?? 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name ?? "",
        address: initialData.address ?? "",
        contactNo: initialData.contactNo ?? "",
        email: initialData.email ?? "",
        vehicleNo: initialData.vehicleNo ?? "",
        categoryId: initialData.categoryId ?? 0,
        moduleId: initialData.moduleId ?? 0,
        subModuleId: initialData.subModuleId ?? 0,
      });
    }
  }, [initialData, form]);

  const selectedModuleId = form.watch("moduleId");
  const selectedSubModuleId = form.watch("subModuleId");

  const { items: moduleItems, isLoadingItems: loadingModules } = useFetchAll<Module>('/api/module', ["module"]);
  const moduleData = moduleItems?.data || [];

  const isCategoryEnabled = selectedModuleId === 3;

  const { items: submoduleItems, isLoadingItems: loadingSubModules } = useFetchAll<SubModule>(selectedModuleId ? `/api/submodule?moduleId=${selectedModuleId}` : '', ["submodule", selectedModuleId]);
  const subModuleData = submoduleItems?.data || [];

  const categoryQuery = (isCategoryEnabled && selectedSubModuleId && selectedSubModuleId !== 0)
    ? `/api/category?moduleId=${selectedModuleId}&subModuleId=${selectedSubModuleId}`
    : isCategoryEnabled
      ? `/api/category?moduleId=${selectedModuleId}`
      : '';

  const { items: categoryItems, isLoadingItems: loadingCategories } = useFetchAll<Category>(
    categoryQuery,
    ["category", selectedModuleId, selectedSubModuleId || 0]
  );
  const allCategories = categoryItems?.data || [];
  const categoryData = isCategoryEnabled
    ? allCategories
      .filter((cat: Category) => {
        if (!selectedSubModuleId || selectedSubModuleId === 0) {
          return cat.moduleId === selectedModuleId;
        }
        return cat.moduleId === selectedModuleId && (cat.subModuleId === selectedSubModuleId || !cat.subModuleId);
      })
      .sort((a: Category, b: Category) => a.name.localeCompare(b.name))
    : [];

  const filteredCategoryData = categoryData.filter((cat: Category) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const selectedCategory = categoryData.find((cat: Category) => cat.id === form.watch("categoryId"));

  const onSubmit = async (values: taxPayerFormValues) => {
    setLoading(true);

    try {
      const payload: any = {
        name: values.name,
        address: values.address || "",
        contactNo: values.contactNo || "",
        email: values.email || "",
        vehicleNo: values.vehicleNo || "",
        categoryId: values.categoryId,
        moduleId: values.moduleId,
        subModuleId: values.subModuleId,
      };

      if (mode === "edit" && initialData) {
        payload.id = initialData.id.toString();
      }

      const mutation = mode === "edit" ? update : create;
      await mutation.mutateAsync(payload);

      toast.success(
        mode === "edit" ? "Tax Payer updated successfully" : "Tax Payer added successfully",
        { style: { background: "#10b981", color: "white" } }
      );

      onSuccess ? onSuccess() : navigate("/tax-payer");
    } catch (err: any) {
      toast.error(
        Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.join(", ")
          : err?.response?.data?.errors || "Failed to save tax payer",
        { style: { background: "#c6212d", color: "white" } }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 bg-gradient-to-br from-gray-50 to-blue-50/30 pb-40">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {mode === "add" ? "Add New Tax Payer" : "Edit Tax Payer"}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {mode === "add"
                  ? "Create a new tax payer entry"
                  : `Update details for ${initialData?.name}`}
              </p>
            </div>
          </div>

          <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-all duration-200">
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </div>

      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Tax Payer Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Name
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter name"
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
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter address"
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
                  name="contactNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Contact No
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter contact number"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter email"
                          type="email"
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
                  name="vehicleNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Vehicle No
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter vehicle number"
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
                          form.setValue("subModuleId", 0);
                          form.setValue("categoryId", 0);
                        }}
                        value={field.value ? field.value.toString() : undefined}
                        disabled={loading || loadingModules}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all">
                            <SelectValue placeholder={loadingModules ? "Loading modules..." : "Select module"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {moduleData.map((mod: Module) => (
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
                          form.setValue("categoryId", 0);
                        }}
                        value={field.value && field.value !== 0 ? field.value.toString() : undefined}
                        disabled={!selectedModuleId || selectedModuleId === 0 || loadingSubModules}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all">
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
                          {subModuleData.map((sub: SubModule) => (
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

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Category {!isCategoryEnabled || !selectedSubModuleId || selectedSubModuleId === 0 ? null : <span className="text-red-500">*</span>}
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={loading || loadingCategories || !isCategoryEnabled || !selectedSubModuleId || selectedSubModuleId === 0}
                            >
                              {field.value
                                ? selectedCategory?.name
                                : !isCategoryEnabled
                                  ? <span className="font-normal">Select module with category first</span>
                                  : !selectedSubModuleId || selectedSubModuleId === 0
                                    ? <span className="font-normal">Select a sub module first</span>
                                    : <span className="font-normal">Select category</span>}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Input
                            placeholder="Search category..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="border-0 border-b rounded-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="max-h-[300px] overflow-y-auto py-1">
                            {filteredCategoryData.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                No category found
                              </div>
                            ) : (
                              filteredCategoryData.map((cat: Category) => (
                                <div
                                  key={cat.id}
                                  onClick={() => {
                                    field.onChange(cat.id);
                                    setCategorySearch("");
                                  }}
                                  className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    field.value === cat.id && "bg-accent"
                                  )}
                                >
                                  {cat.name}
                                  {field.value === cat.id && (
                                    <Check className="ml-auto h-4 w-4" />
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
                  <>{mode === "edit" ? "Update Tax Payer" : "Save Tax Payer"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div >
  );
}