import { useState, useEffect, useMemo } from "react";
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
import { X, Plus, Trash2, FileText, AlertTriangle } from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useMutate } from "@/hooks/useMutate";
import NepaliDatePicker from "@/components/ui/NepaliDatePicker";
import { useTranslation } from "react-i18next";
import React from "react";

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const documentRowSchema = z.object({
  propertyId: z.string().min(1, "Required"),
  kittaNo: z.string().optional(),
  documentType: z.string().min(1, "Required"),
  fiscalYearId: z.string().min(1, "Required"),
  fileTagId: z.string().min(1, "Required"),
  issueDate: z.string().min(1, "Required"),
  files: z
    .any()
    .refine(
      (files) =>
        typeof window !== "undefined" &&
        files instanceof FileList &&
        files.length > 0,
      "Select a file"
    )
    .refine((files) => {
      if (typeof window === "undefined" || !(files instanceof FileList)) return false;
      return Array.from(files).every((file) => file.type === "application/pdf");
    }, "Only PDF files are allowed"),
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

function getDuplicateKey(row: {
  propertyId: string;
  documentType: string;
  fiscalYearId: string;
  fileTagId: string;
}) {
  return `${row.propertyId}-${row.documentType}-${row.fiscalYearId}-${row.fileTagId}`;
}

// ─── Pure validation helper ──────────────────────────────────────────────────
function computeValidation(
  rows: DocumentFormValues["documents"],
  existingDocs: any[]
): {
  archiveWarnings: Record<number, boolean>;
  rowErrors: Record<number, string>;
} {
  const archiveWarnings: Record<number, boolean> = {};
  const rowErrors: Record<number, string> = {};
  const seenKeys = new Map<string, number>();

  rows.forEach((row, index) => {
    if (!row.propertyId || !row.documentType || !row.fiscalYearId || !row.fileTagId)
      return;

    const key = getDuplicateKey(row);

    if (seenKeys.has(key)) {
      rowErrors[index] =
        "Duplicate entry: same property, document type, fiscal year and tag already added in this form.";
      return;
    }
    seenKeys.set(key, index);

    const existingMatch = existingDocs.find(
      (doc) =>
        doc.propertyId?.toString() === row.propertyId &&
        doc.documentType?.toString() === row.documentType &&
        doc.fiscalYearId?.toString() === row.fiscalYearId &&
        doc.fileTagId?.toString() === row.fileTagId &&
        doc.isArchived !== true
    );

    if (existingMatch) {
      archiveWarnings[index] = true;
    }
  });

  return { archiveWarnings, rowErrors };
}

function getTodayBS(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function DocumentForm({ onSuccess, onCancel }: DocumentFormProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const defaultPropertyId = searchParams.get("propertyId") || "";
  const [loading, setLoading] = useState(false);
  const [archiveWarnings, setArchiveWarnings] = useState<Record<number, boolean>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  const todayAD = getTodayBS();

  const handleCancel = () => {
    if (onCancel) onCancel();
    else navigate("/app/property");
  };

  const { create } = useMutate<any>("/api/document", "document");
  const { update } = useMutate<any>("/api/document", "document");

  // ── Dropdown data ──────────────────────────────────────────────────────────
  const { items: rawPropertyData, isLoadingItems: isPropLoading } =
    useFetchAll<any>("/api/property", ["property"]);
  const propertyData = rawPropertyData?.data || [];

  const { items: rawFileTagData, isLoadingItems: isTagLoading } =
    useFetchAll<any>("/api/filetag", ["filetag"]);
  const fileTagData = rawFileTagData?.data || [];

  const { items: rawFiscalYearData, isLoadingItems: isFiscalYearLoading } =
    useFetchAll<any>("/api/fiscalyear", ["fiscalyear"]);
  const fiscalYearData = rawFiscalYearData?.data || [];

  const { items: rawDocumentTypeData, isLoadingItems: isDocumentTypeLoading } =
    useFetchAll<any>("/api/documenttype", ["documenttype"]);
  const documentTypeData = rawDocumentTypeData?.data || [];

  const { items: rawExistingDocs } = useFetchAll<any>("/api/document", ["document"]);
  const existingDocs = useMemo<any[]>(() => {
    const d = rawExistingDocs?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(rawExistingDocs)) return rawExistingDocs as any[];
    return [];
  }, [rawExistingDocs]);

  // ── Form setup ─────────────────────────────────────────────────────────────
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema) as any,
    defaultValues: {
      documents: [
        {
          propertyId: defaultPropertyId,
          kittaNo: "",
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

  const watchedDocuments = form.watch("documents");

  // ── Sync validation state ──────────────────────────────────────────────────
  useEffect(() => {
    const { archiveWarnings: newAW, rowErrors: newRE } = computeValidation(
      watchedDocuments,
      existingDocs
    );

    setArchiveWarnings((prev) =>
      JSON.stringify(prev) === JSON.stringify(newAW) ? prev : newAW
    );
    setRowErrors((prev) =>
      JSON.stringify(prev) === JSON.stringify(newRE) ? prev : newRE
    );
  }, [watchedDocuments, existingDocs]);

  // ── Fetch and auto-populate Kitta values for matching rows dynamically ─────
  useEffect(() => {
    watchedDocuments.forEach((row, index) => {
      if (row.propertyId && propertyData.length > 0) {
        const selectedProp = propertyData.find(
          (p: any) => p.id.toString() === row.propertyId.toString()
        );
        if (selectedProp && selectedProp.kittaNo) {
          const currentKitta = form.getValues(`documents.${index}.kittaNo`);
          if (currentKitta !== selectedProp.kittaNo) {
            form.setValue(`documents.${index}.kittaNo`, selectedProp.kittaNo);
          }
        }
      }
    });
  }, [watchedDocuments, propertyData, form]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (values: DocumentFormValues) => {
    const { rowErrors: currentErrors } = computeValidation(
      values.documents,
      existingDocs
    );

    if (Object.keys(currentErrors).length > 0) {
      toast.error("Please fix duplicate entries before submitting.", {
        style: { background: "#c6212d", color: "white" },
      });
      setRowErrors(currentErrors);
      return;
    }

    setLoading(true);
    try {
      for (const row of values.documents) {
        const existingMatch = existingDocs.find(
          (doc) =>
            doc.propertyId?.toString() === row.propertyId &&
            doc.documentType?.toString() === row.documentType &&
            doc.fiscalYearId?.toString() === row.fiscalYearId &&
            doc.fileTagId?.toString() === row.fileTagId &&
            doc.isArchived !== true
        );

        if (existingMatch) {
          await update.mutateAsync({ id: existingMatch.id, isArchived: true } as any);
        }

        const formData = new FormData();
        formData.append("propertyId", row.propertyId);
        if (row.kittaNo) formData.append("kittaNo", row.kittaNo);
        formData.append("documentType", row.documentType);
        formData.append("fiscalYearId", row.fiscalYearId);
        formData.append("fileTagId", row.fileTagId);
        formData.append("issueDate", row.issueDate);
        formData.append("isArchived", "false");

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
      navigate("/app/property");
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
                  <h2 className="text-lg font-bold text-gray-900">
                    {t("property.documentUploadRegistry")}
                  </h2>
                </div>
              </div>
              <Button
                type="button"
                onClick={() =>
                  append({
                    propertyId: "",
                    kittaNo: "",
                    documentType: "",
                    fileTagId: "",
                    issueDate: "",
                    fiscalYearId: "",
                    files: undefined,
                  })
                }
                className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm flex items-center gap-2 h-9 px-4 rounded-xl text-sm transition-all"
              >
                <Plus className="w-4 h-4" /> {t("property.addRow")}
              </Button>
            </div>

            {/* Table */}
            <div className="p-3 md:p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest min-w-[200px]">
                      {t("property.property")}
                    </th>
                    {/* Added Kitta No Column Header */}
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest min-w-[120px]">
                      Kitta No.
                    </th>
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest min-w-[180px]">
                      {t("property.documentType")}
                    </th>
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest min-w-[150px]">
                      {t("property.fiscalYear")}
                    </th>
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest min-w-[150px]">
                      {t("property.fileTag")}
                    </th>
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest min-w-[150px]">
                      {t("property.issueDate")}
                    </th>
                    <th className="pb-3 px-2 text-[10px] uppercase font-bold tracking-widest min-w-[200px]">
                      {t("property.fileUpload")}
                    </th>
                    <th className="pb-3 px-2 text-center text-[10px] uppercase font-bold tracking-widest w-12">
                      {t("common.action")}
                    </th>
                  </tr>
                </thead>
                <tbody className="align-top divide-y divide-gray-100">
                  {fields.map((field, index) => (
                    <React.Fragment key={field.id}>
                      <tr
                        className={`transition-colors ${rowErrors[index]
                            ? "bg-red-50"
                            : archiveWarnings[index]
                              ? "bg-amber-50"
                              : "hover:bg-slate-50/50"
                          }`}
                      >
                        {/* 1. Property Select Column */}
                        <td className="py-4 px-2">
                          <FormField
                            control={form.control}
                            name={`documents.${index}.propertyId`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={loading || isPropLoading}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-11 rounded-xl">
                                      <SelectValue placeholder="Select Property" />
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

                        {/* 2. Kitta Number Input Column (Placed right after property field) */}
                        <td className="py-4 px-2">
                          <FormField
                            control={form.control}
                            name={`documents.${index}.kittaNo`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="e.g. 102"
                                    {...field}
                                    disabled={loading}
                                    className="w-full bg-white border-gray-200 h-11 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-all"
                                  />
                                </FormControl>
                                <FormMessage className="text-[11px]" />
                              </FormItem>
                            )}
                          />
                        </td>

                        {/* 3. Document Type Column */}
                        <td className="py-4 px-2">
                          <FormField
                            control={form.control}
                            name={`documents.${index}.documentType`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={loading || isDocumentTypeLoading}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-11 rounded-xl">
                                      <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {documentTypeData?.map((item: any) => (
                                      <SelectItem key={item.id} value={item.id.toString()}>
                                        {item.name || `Type #${item.id}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-[11px]" />
                              </FormItem>
                            )}
                          />
                        </td>

                        {/* 4. Fiscal Year Column */}
                        <td className="py-4 px-2">
                          <FormField
                            control={form.control}
                            name={`documents.${index}.fiscalYearId`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={loading || isFiscalYearLoading}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-11 rounded-xl">
                                      <SelectValue placeholder="Select Year" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {fiscalYearData?.map((item: any) => (
                                      <SelectItem key={item.id} value={item.id.toString()}>
                                        {item.fiscalYear || `Year #${item.id}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-[11px]" />
                              </FormItem>
                            )}
                          />
                        </td>

                        {/* 5. File Tag Column */}
                        <td className="py-4 px-2">
                          <FormField
                            control={form.control}
                            name={`documents.${index}.fileTagId`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={loading || isTagLoading}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-11 rounded-xl">
                                      <SelectValue placeholder="Select Tag" />
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

                        {/* 6. Issue Date Column */}
                        <td className="py-4 px-2">
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
                                      maxDate={todayAD}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage className="text-[11px]" />
                              </FormItem>
                            )}
                          />
                        </td>

                        {/* 7. File Upload Column */}
                        <td className="py-4 px-2">
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
                                    accept=".pdf"
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

                        {/* Action Column */}
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

                      {/* Warnings / Error Banners */}
                      {(archiveWarnings[index] || rowErrors[index]) && (
                        <tr>
                          <td colSpan={8} className="px-3 pb-3 pt-0">
                            <div
                              className={`flex items-start gap-2 text-xs px-4 py-2.5 rounded-xl border ${rowErrors[index]
                                  ? "bg-red-50 border-red-200 text-red-700"
                                  : "bg-amber-50 border-amber-200 text-amber-700"
                                }`}
                            >
                              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>
                                {rowErrors[index]
                                  ? rowErrors[index]
                                  : "A document with this combination already exists. Submitting will archive the previous version and save the new one."}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {fields.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-sm text-gray-500">
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

            {/* Footer */}
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
                disabled={loading || Object.keys(rowErrors).length > 0}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
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