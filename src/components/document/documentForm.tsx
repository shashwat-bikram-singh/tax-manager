import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { X, Plus, Trash2, FileText } from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useMutate } from "@/hooks/useMutate";
import NepaliDatePicker from "@/components/ui/NepaliDatePicker";
import { useTranslation } from "react-i18next";
// ─── Zod Schema ───────────────────────────────────────────────────────────────
const documentRowSchema = z.object({
  propertyId: z.string().min(1, "Required"),
  documentType: z.string().min(1, "Required"),
  fiscalYearId: z.string().min(1, "Required"),
  fileTagId: z.string().min(1, "Required"),
  issueDate: z.string().min(1, "Required"),
  files: z
    .any()
    .refine((files) => typeof window !== "undefined" && files instanceof FileList && files.length > 0, "Select a file"),
});

const documentSchema = z.object({
  documents: z.array(documentRowSchema).min(1, "Add at least one document"),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

interface DocumentFormProps {
  mode: "add" | "edit";
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function DocumentForm({ onSuccess, onCancel }: DocumentFormProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const defaultPropertyId = searchParams.get("propertyId") || "";
  const [loading, setLoading] = useState(false);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/property");
    }
  };

  // We assume the backend expects POST to /api/document for files
  const { create } = useMutate<any>("/api/document", "document");

  // Fetch properties and file tags for the dropdowns
  const { items: rawPropertyData, isLoadingItems: isPropLoading } = useFetchAll<any>("/api/property", ["property"]);
  const propertyData = rawPropertyData?.data || [];

  const { items: rawFileTagData, isLoadingItems: isTagLoading } = useFetchAll<any>("/api/filetag", ["filetag"]);
  const fileTagData = rawFileTagData?.data || [];

  const { items: rawFiscalYearData, isLoadingItems: isFiscalYearLoading } = useFetchAll<any>("/api/fiscalyear", ["fiscalyear"]);
  const fiscalYearData = rawFiscalYearData?.data || [];


  const { items: rawDocumentTypeData, isLoadingItems: isDocumentTypeLoading } = useFetchAll<any>("/api/documenttype", ["documenttype"]);
  const documentTypeData = rawDocumentTypeData?.data || [];

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema) as any,
    defaultValues: {
      documents: [
        {
          propertyId: defaultPropertyId,
          documentType: "",
          fileTagId: "",
          fiscalYearId: "",
          issueDate: "",
          files: undefined,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "documents",
    control: form.control,
  });

  const onSubmit = async (values: DocumentFormValues) => {
    setLoading(true);
    try {
      // Loop over rows and submit each file payload sequentially
      for (const row of values.documents) {
        const formData = new FormData();
        formData.append("propertyId", row.propertyId);
        formData.append("documentType", row.documentType);
        formData.append("fiscalYearId", row.fiscalYearId);
        formData.append("fileTagId", row.fileTagId);
        formData.append("issueDate", row.issueDate);

        // Append files
        if (row.files) {
          for (let i = 0; i < row.files.length; i++) {
            formData.append("files", row.files[i]);
          }
        }

        await create.mutateAsync(formData);
      }

      toast.success(`${t("property.documentUploadedSuccessfully")} ✅`, {
        style: { background: "#10b981", color: "white" },
      });
      form.reset();
      onSuccess?.();
      navigate("/property");
    } catch (error: any) {
      toast.error(
        Array.isArray(error?.response?.data?.errors)
          ? error.response.data.errors.join(", ")
          : error?.response?.data?.errors || `${t("property.documentUploadFailed")} ❌`,
        { style: { background: "#c6212d", color: "white" } }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 p-6">
      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
        {t("property.documentVault")} › {t("property.registerDocuments")}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">

            {/* Form Header */}
            <div className="bg-slate-50/50 p-3 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t("property.documentUploadRegistry")}</h2>
                </div>
              </div>
              <Button
                type="button"
                onClick={() =>
                  append({ propertyId: "", documentType: "", fileTagId: "", issueDate: "", fiscalYearId: "", files: undefined })
                }
                className="bg-blue-600 text-white hover:bg-indigo-100 border border-indigo-200 shadow-sm flex items-center gap-2 h-9 px-4 rounded-xl text-sm transition-all"
              >
                <Plus className="w-4 h-4" /> {t("property.addRow")}
              </Button>
            </div>

            {/* Dynamic Table Body */}
            <div className="p-3 md:p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest font-body">{t("property.property")}</th>
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest font-body">{t("property.documentType")}</th>
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest font-body">{t("property.fiscalYear")}</th>
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest font-body">{t("property.fileTag")}</th>
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest font-body">{t("property.issueDate")}</th>
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest font-body">{t("property.fileUpload")}</th>
                    <th className="pb-3 px-2 text-center text-[10px] uppercase font-bold tracking-widest font-body w-12">{t("common.action")}</th>
                  </tr>
                </thead>
                <tbody className="align-top divide-y divide-gray-100">
                  {fields.map((field, index) => (
                    <tr key={field.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Property Column */}
                      <td className="py-4 px-2 min-w-[200px]">
                        <FormField
                          control={form.control}
                          name={`documents.${index}.propertyId`}
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value} disabled={loading || isPropLoading}>
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-11 rounded-xl">
                                    <SelectValue placeholder="" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {propertyData?.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                      {item.name || `Property #${item.id}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )}
                        />
                      </td>

                      {/* Document Type Column */}
                      <td className="py-4 px-2 min-w-[180px]">
                        <FormField
                          control={form.control}
                          name={`documents.${index}.documentType`}
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value} disabled={loading || isDocumentTypeLoading}>
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-11 rounded-xl">
                                    <SelectValue placeholder="" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {documentTypeData?.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                      {item.name || `Property #${item.id}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )}
                        />
                      </td>
                      <td className="py-4 px-2 min-w-[180px]">
                        <FormField
                          control={form.control}
                          name={`documents.${index}.fiscalYearId`}
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value} disabled={loading || isFiscalYearLoading}>
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-11 rounded-xl">
                                    <SelectValue placeholder="" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {fiscalYearData?.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                      {item.fiscalYear || `Property #${item.id}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )}
                        />
                      </td>

                      {/* File Tag Column */}
                      <td className="py-4 px-2 min-w-[180px]">
                        <FormField
                          control={form.control}
                          name={`documents.${index}.fileTagId`}
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value} disabled={loading || isTagLoading}>
                                <FormControl>
                                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-11 rounded-xl">
                                    <SelectValue placeholder="" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {fileTagData?.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                      {item.name || `Tag #${item.id}`}
                                    </SelectItem>
                                  ))}
                                  {fileTagData.length === 0 && (
                                    <SelectItem value="1">Legal Document (Fallback)</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )}
                        />
                      </td>

                      {/* Issue Date Column */}
                      <td className="py-4 px-2 min-w-[150px]">
                        <FormField
                          control={form.control}
                          name={`documents.${index}.issueDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="h-11">
                                  <NepaliDatePicker
                                    id={`issueDate_${index}`}
                                    name={`issueDate_${index}`}
                                    value={field.value ?? ""}
                                    onSelect={(value: any) => field.onChange(value.value)}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )}
                        />
                      </td>

                      {/* File Upload Column */}
                      <td className="py-4 px-2 min-w-[200px]">
                        <FormField
                          control={form.control}
                          name={`documents.${index}.files`}
                          render={({ field: { value, onChange, ...fieldProps } }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...fieldProps}
                                  type="file"
                                  multiple
                                  disabled={loading}
                                  onChange={(e) => onChange(e.target.files)}
                                  className="w-full bg-gray-50 border-gray-200 h-11 rounded-xl text-xs py-2 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all shadow-none"
                                />
                              </FormControl>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )}
                        />
                      </td>

                      {/* Delete Action Column */}
                      <td className="py-4 px-2 text-center text-gray-400">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={loading || fields.length === 1}
                          onClick={() => remove(index)}
                          className="hover:text-red-600 hover:bg-red-50 rounded-xl h-11 w-11 transition-colors mx-auto"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {fields.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-sm text-gray-500">
                        No documents added. Click "Add Row" to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <FormMessage className="text-red-500 mt-2 px-2">
                {form.formState.errors.documents?.root?.message}
              </FormMessage>
            </div>

            {/* Footer Section */}
            <div className="p-3 bg-slate-50/50 border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="h-10 px-4 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
              >
                {loading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
