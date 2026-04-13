// components/SuperAdmin/office-form.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, Eye, Building } from "lucide-react";
import { useMutate } from "@/hooks/useMutate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";


const officeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email"),
  logo: z.instanceof(File).optional(),
  resourceAccessKey: z.string().optional(),
  userName: z.string().min(1, "Username is required"),
  userEmail: z.string().email("Invalid email"),
  allowMultiSubOffice: z.boolean().optional(),
  subOfficeLimit: z.number().optional(),
});

type OfficeFormValues = z.infer<typeof officeSchema>;

interface OfficeFormProps {
  mode: "add" | "edit";
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function OfficeForm({ mode, initialData, onSuccess, onCancel }: OfficeFormProps) {
  const navigate = useNavigate();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { create, update } = useMutate<any>("/api/officewithuser", "officewithuser");
  const isSubmitting = create.isLoading || update.isLoading;

  const form = useForm<OfficeFormValues>({
    resolver: zodResolver(officeSchema),
    defaultValues: {
      name: initialData?.name || "",
      address: initialData?.address || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      logo: undefined,
      resourceAccessKey: initialData?.resourceAccessKey || "",
      userName: initialData?.userName || "",
      userEmail: initialData?.userEmail || "",
      allowMultiSubOffice: initialData?.allowMultiSubOffice || false,
      subOfficeLimit: initialData?.subOfficeLimit || 0,
    },
  });

  useEffect(() => {
    if (mode === "edit" && initialData) {
      form.reset({
        name: initialData.name || "",
        address: initialData.address || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        logo: undefined,
        resourceAccessKey: initialData.resourceAccessKey || "",
        userName: initialData.userName || "",
        userEmail: initialData.userEmail || "",
        allowMultiSubOffice: initialData.allowMultiSubOffice || false,
        subOfficeLimit: initialData.subOfficeLimit || 0,
      });

      if (initialData.logoUrl && !initialData.logoUrl.includes("fileName=&")) {
        setPreviewUrl(initialData.logoUrl);
      }
    }
  }, [initialData, form, mode]);

  // ✅ File input handler
  const handleFileInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: any
  ) => {
    const selectedFile = e.target.files?.[0] ?? null;
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Only image files are allowed!");
      return;
    }

    field.onChange(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  // ✅ Submit handler - simplified using your API
  const onSubmit = async (values: OfficeFormValues) => {
    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("address", values.address);
      formData.append("phone", values.phone);
      formData.append("email", values.email);
      formData.append("userName", values.userName);
      formData.append("userEmail", values.userEmail);
      formData.append(
        "allowMultiSubOffice",
        values.allowMultiSubOffice ? "true" : "false"
      );

      // Only include subOfficeLimit if allowMultiSubOffice is true
      if (values.allowMultiSubOffice && values.subOfficeLimit) {
        formData.append("subOfficeLimit", values.subOfficeLimit.toString());
      }


      if (values.resourceAccessKey) {
        formData.append("resourceAccessKey", values.resourceAccessKey);
      }

      if (values.logo) {
        formData.append("logo", values.logo);
      }

      const mutation = mode === "edit" ? update : create;

      if (mode === "edit" && initialData?.id) {
        formData.append("id", initialData.id.toString());
        await mutation.mutateAsync(formData);
      } else {
        formData.append("id", "0");
        await mutation.mutateAsync(formData);
      }

      toast.success(
        `Office ${mode === "add" ? "created" : "updated"} successfully!`,
        {
          style: { background: "#10b981", color: "white" },
        }
      );

      onSuccess ? onSuccess() : navigate("/super-admin/offices");
    } catch (err: any) {
      console.error(`${mode === "add" ? "Create" : "Update"} error:`, err);
      toast.error(
        Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.join(", ")
          : err?.response?.data?.errors || "Failed to save office",
        { style: { background: "#c6212d", color: "white" } }
      );
    }
  };

  const handleCancel = () => {
    onCancel ? onCancel() : navigate("/super-admin/offices");
  };

  return (
    <div className="p-4 bg-white min-h-screen rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            {mode === "add" ? "Add New Office" : "Edit Office"}
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            {mode === "add"
              ? "Create a new office branch"
              : `Update details for ${initialData?.name}`}
          </p>
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

      {/* Form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Left: Information */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Office Information
            </h3>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Office Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter office name"
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Address <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter office address"
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter phone number"
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowMultiSubOffice"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-gray-700">
                    Allow Multi SubOffice <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show subOfficeLimit only when allowMultiSubOffice is checked */}
            {form.watch("allowMultiSubOffice") && (
              <FormField
                control={form.control}
                name="subOfficeLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">
                      SubOffice Limit <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter sub office limit"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value || 0}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="border-t pt-4 space-y-6">
              <h3 className="text-lg font-semibold  text-gray-800 mb-2">
                User Information
              </h3>



              <FormField
                control={form.control}
                name="userName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">
                      Username <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter User name"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">
                      User Email <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Right: Logo */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Office Logo
            </h3>

            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Upload Logo (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileInput(e, field)}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview Section */}
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
              {previewUrl ? (
                <div className="flex flex-col items-start gap-4">
                  <div className="w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={previewUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Full Size
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <div className="flex justify-center">
                        <img
                          src={previewUrl}
                          alt="Full size logo preview"
                          className="max-w-full max-h-96 object-contain rounded"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <Building className="h-8 w-8 text-gray-400" />
                  <span className="text-xs text-gray-500 ml-2">No logo</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <FormField
                control={form.control}
                name="resourceAccessKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">
                      Resources Access Key (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Office ID Display (only in edit mode)
            {mode === "edit" && office && (
              <div className="border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Office ID:</span> {office.id}
                </p>
                {office.key && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Unique Key:</span>
                    <span className="font-mono text-xs ml-1">{office.key}</span>
                  </p>
                )}
              </div>
            )} */}
          </div>

          {/* Actions */}
          <div className="lg:col-span-2 flex justify-end gap-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting
                ? mode === "add"
                  ? "Creating..."
                  : "Updating..."
                : mode === "add"
                  ? "Create Office"
                  : "Update Office"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
