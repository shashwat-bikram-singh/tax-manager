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

import type { Suboffice } from "@/type/suboffice";
import { useMutate } from "@/hooks/useMutate";

// -------------------- SCHEMA --------------------
const subofficeSchema = z.object({
  name: z.string().min(1, "Service Name is required"),
  title: z.string(),
  subTitle: z.string(),
  address: z.string(),
});

type SubofficeFormValues = z.infer<typeof subofficeSchema>;

type SubofficeFormProps = {
  mode: "add" | "edit";
  initialData?: Suboffice;
  onSuccess?: () => void;
  onCancel?: () => void;
};

// -------------------- COMPONENT --------------------
export default function SubofficeForm({ mode, initialData, onSuccess, onCancel }: SubofficeFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);


  const { create, update } = useMutate<Suboffice>("/api/suboffice", "suboffice");


  // -------------------- FORM --------------------
  const form = useForm<SubofficeFormValues>({
    resolver: zodResolver(subofficeSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      title: initialData?.title ?? "",
      subTitle: initialData?.subTitle ?? "",
      address: initialData?.address ?? "",
    },
  });


  const onSubmit = async (values: SubofficeFormValues) => {
    setLoading(true);

    try {
      const formData = new FormData();

      if (mode === "edit" && initialData?.id) {
        formData.append("id", initialData.id.toString());
      }

      formData.append("name", values.name);
      formData.append("title", values.title || "");
      formData.append("subTitle", values.subTitle || "");
      formData.append("address", values.address);

      const mutation = mode === "edit" ? update : create;

      await mutation.mutateAsync(formData);

      toast.success(
        mode === "edit"
          ? "Suboffice updated successfully ✅"
          : "Suboffice added successfully ✅",
        { style: { background: "#10b981", color: "white" } }
      );

      onSuccess ? onSuccess() : navigate("/suboffices");
    } catch (err: any) {
      toast.error(
        Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.join(", ")
          : err?.response?.data?.errors || "Failed to save suboffice",
        { style: { background: "#c6212d", color: "white" } }
      );
    } finally {
      setLoading(false);
    }
  };


  // -------------------- UI --------------------
  return (
    <div className=" p-2 bg-gradient-to-br from-gray-50 to-blue-50/30 ">

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {mode === "add" ? "Add New Suboffice" : "Edit Suboffice"}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {mode === "add"
                  ? "Create a new suboffice for your property"
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
            {/* Suboffice Information Card */}
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Suboffice Details
                </h2>
              </div>



              {/* Suboffice Name and Title Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Suboffice Name
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter suboffice name"
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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter title"
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
                  name="subTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Sub Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter sub title"
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
                        <span className="text-red-500">*</span>
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
                    {mode === "edit" ? "Update Suboffice" : "Save Suboffice"}
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