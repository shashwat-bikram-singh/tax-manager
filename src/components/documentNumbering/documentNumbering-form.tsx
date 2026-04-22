import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useMutate } from "@/hooks/useMutate";
import type { Suboffice } from "@/type/suboffice";
import { useFetchAll } from "@/hooks/useFetchAll";
import type { DocumentNumbering } from "@/type/documentnumbering";

const documentNumberSchema = z.object({
  fiscalYearId: z.string().min(1, "Fiscal Year is required"),
  subOfficeId: z.string().min(1, "Suboffice is required"),
  moduleId: z.coerce.number().min(1, "Select Module"),
  subModuleId: z.coerce.number().optional(),
  prefix: z.string().min(1, "Prefix is required"),
  suffix: z.string().min(1, "Suffix is required"),
  startNumber: z.string().min(1, "StartNumber is required"),
  length: z.string().min(1, "Length is required"),
});

type DocumentNumFormValues = z.infer<typeof documentNumberSchema>;

type DocumentNumberFormProps = {
  mode: "add" | "edit";
  initialData?: DocumentNumbering;
  onSuccess?: () => void;
  onCancel?: () => void;
};

type Module = {
  id: number;
  name: string;
};

type SubModule = {
  id: number;
  name: string;
  moduleId: number;
};

export default function DocumentNumberingForm({ mode, initialData, onSuccess, onCancel }: DocumentNumberFormProps) {

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { create, update } = useMutate<DocumentNumbering>("/api/documentnumber", "documentnumbering");
  const { items: subOfficeData, isLoadingItems: isLoadingSubOffice } = useFetchAll<Suboffice>("/api/suboffice", ["dnf-sub-Office"]);
  const { items: fiscalYearData, isLoadingItems: isLoadingFY } = useFetchAll<any>("/api/fiscalyear", ["dn-fiscalyear"]);
  const { items: moduleItems, isLoadingItems: loadingModules } = useFetchAll<Module>("/api/module", ["dnf-module"]);
  const moduleData = moduleItems?.data || [];

  const handleCancel = () => {
    if (onCancel) onCancel();
    else navigate("/documentNumber");
  };

  const form = useForm<DocumentNumFormValues>({
    resolver: zodResolver(documentNumberSchema) as any,
    defaultValues: {
      fiscalYearId: initialData?.fiscalYearId?.toString() ?? "",
      subOfficeId: initialData?.subOfficeId?.toString() ?? "",
      moduleId: initialData?.moduleId ?? 0,
      subModuleId: initialData?.subModuleId ?? 0,
      startNumber: initialData?.startNumber?.toString() ?? "",
      prefix: initialData?.prefix?.toString() ?? "",
      suffix: initialData?.suffix?.toString() ?? "",
      length: initialData?.length?.toString() ?? "",
    },
  });


  const selectedModuleId = form.watch("moduleId");
  const { items: submoduleItems, isLoadingItems: loadingSubModules } = useFetchAll<SubModule>(
    selectedModuleId ? `/api/submodule?moduleId=${selectedModuleId}` : '',
    ["dnf-submodule", selectedModuleId || 0]
  );
  const subModuleData = submoduleItems?.data || [];

  const extractData = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const dataCandidate = data.data || data.Data;
    if (Array.isArray(dataCandidate)) return dataCandidate;

    const items: any[] = [];
    let i = 0;
    while (data[i] !== undefined) {
      items.push(data[i]);
      i++;
    }
    return items;
  };

  const fiscalYears = extractData(fiscalYearData?.data.filter((item: any) => item.isActive === true));
  const subOffices = extractData(subOfficeData?.data);

  const onSubmit = async (values: DocumentNumFormValues) => {
    setLoading(true);

    try {
      const payload: any = {
        fiscalYearId: parseInt(values.fiscalYearId),
        subOfficeId: parseInt(values.subOfficeId),
        moduleId: values.moduleId,
        subModuleId: values.subModuleId ? values.subModuleId : 0,
        startNumber: parseInt(values.startNumber),
        prefix: values.prefix,
        suffix: values.suffix,
        length: parseInt(values.length),
      };

      if (mode === "edit" && initialData?.id) {
        payload.id = initialData.id.toString();
      }

      const mutation = mode === "edit" ? update : create;
      await mutation.mutateAsync(payload);
      toast.success("Document Number saved successfully");

      onSuccess ? onSuccess() : navigate("/documentNumber");
    } catch (err: any) {
      toast.error(
        Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.join(", ")
          : err?.response?.data?.errors || "Failed to save Document Number",
        { style: { background: "#c6212d", color: "white" } }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=" p-2 bg-gradient-to-br from-gray-50 to-blue-50/30 ">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {mode === "add" ? "Add New Document Number" : "Edit Document Number"}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {mode === "add"
                  ? "Create a new Document Number for your property"
                  : `Update details for ${initialData?.prefix}`}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-all duration-200"
          >
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
                  Document Number Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormField
                  control={form.control}
                  name="fiscalYearId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Fiscal Year <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={loading || isLoadingFY}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border border-gray-300 rounded-lg h-[50px] px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200">
                            <SelectValue placeholder="Select Fiscal Year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fiscalYears.map((item: any) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.name}
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
                  name="subOfficeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Suboffice <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={loading || isLoadingSubOffice}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border border-gray-300 rounded-lg h-[50px] px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200">
                            <SelectValue placeholder="Select Suboffice" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subOffices.map((item: any) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.name}
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
                        }}
                        value={field.value ? field.value.toString() : undefined}
                        disabled={loading || loadingModules}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border border-gray-300 rounded-lg px-4 py-6 focus:ring-2 focus:ring-blue-500 transition-all">
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
                <FormField
                  control={form.control}
                  name="subModuleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Sub Module
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value && field.value !== 0 ? field.value.toString() : undefined}
                        disabled={!selectedModuleId || selectedModuleId === 0 || loadingSubModules}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormField
                  control={form.control}
                  name="prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Prefix
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter Prefix"
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
                  name="suffix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Suffix
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter  Suffix"
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
                  name="startNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Start Number <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Eg. 1"
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
                  name="length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Length <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Eg. 5"
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                          disabled={loading}
                        />
                      </FormControl>
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
                  <>
                    {mode === "edit" ? "Update Document Number" : "Save Document Number"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}