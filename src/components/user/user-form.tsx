import { useState } from "react";
import { get, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, X } from "lucide-react";
import { useMutate } from "@/hooks/useMutate";
import type { User } from "@/type/user";
import { useFetchAll } from "@/hooks/useFetchAll";
import type { Role_Type } from "@/type/role";
import type { Office } from "@/type/office";
import { parse } from "date-fns";
// -------------------- SCHEMA --------------------
const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email"),
  role: z.string().min(1, "Role is required"),
  office: z.string().min(1, "office is required")
});

const addUserSchema = baseSchema.extend({
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string().min(1, "Confirm Password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const editUserSchema = baseSchema.extend({
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.password || data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserFormValues = z.infer<typeof addUserSchema>;

type UserFormProps = {
  mode: "add" | "edit";
  initialData?: User;
  onSuccess?: () => void;
  onCancel?: () => void;
};

// -------------------- COMPONENT --------------------
// ... (imports remain the same)

// -------------------- COMPONENT --------------------
export default function UserForm({ mode, initialData, onSuccess, onCancel }: UserFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { items: roleData, isLoadingItems: isLoadingRole } = useFetchAll<Role_Type>("/api/role", ["role"]);
  const { create, update } = useMutate<User>("/api/user", "user");
  const { items: officeData, isLoadingItems: isLoadingOffice } = useFetchAll<Office>("/api/office", ["office"]);

  // ... (getOffices and getRoles functions remain the same)
  function getOffices(officeData: any) {
    if (!officeData) return [];
    if (Array.isArray(officeData)) return officeData;
    const dataCandidate = (officeData as any).data || (officeData as any).Data;
    if (Array.isArray(dataCandidate)) return dataCandidate;

    const items: Office[] = [];
    let i = 0;
    while ((officeData as any)[i] !== undefined) {
      items.push((officeData as any)[i]);
      i++;
    }
    return items;
  }
  const offices = getOffices(officeData);

  function getRoles(roleData: any) {
    if (!roleData) return [];
    if (Array.isArray(roleData)) return roleData;
    const dataCandidate = (roleData as any).data || (roleData as any).Data;
    if (Array.isArray(dataCandidate)) return dataCandidate;

    const items: Role_Type[] = [];
    let i = 0;
    while ((roleData as any)[i] !== undefined) {
      items.push((roleData as any)[i]);
      i++;
    }
    return items;
  }

  const roles = getRoles(roleData);

  // -------------------- FORM --------------------
  const schema = mode === "add" ? addUserSchema : editUserSchema;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      // FIX 1: Ensure these match the schema keys (role, office) and are strings
      role: initialData?.roleId?.toString() ?? "", 
      email: initialData?.email ?? "",
      username: initialData?.username ?? "",
      password: "",
      confirmPassword: "",
      office: initialData?.officeId?.toString() ?? "", 
    },
  });

  const onSubmit = async (values: UserFormValues) => {
    setLoading(true);

    try {
      const payload: any = {
        name: values.name,
        roleId: parseInt(values.role),
        officeId: parseInt(values.office),
        email: values.email,
        username: values.username,
        password: values.password,
        confirmPassword: values.confirmPassword,
      };

      if (mode === "edit" && initialData?.id) {
        payload.id = initialData.id;
      }

      const mutation = mode === "edit" ? update : create;
      await mutation.mutateAsync(payload);

      toast.success(
        mode === "edit"
          ? "User updated successfully ✅"
          : "User added successfully ✅",
        { style: { background: "#10b981", color: "white" } }
      );

      onSuccess ? onSuccess() : navigate("/user");
    } catch (err: any) {
      toast.error(
        Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.join(", ")
          : err?.response?.data?.errors || "Failed to save user",
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
                {mode === "add" ? "Add New User" : "Edit User"}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {mode === "add"
                  ? "Create a new user for your property"
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
            {/* User Information Card */}
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  User Details
                </h2>
              </div>

              {/* User Name and Role Fields */}
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
                          placeholder="Enter user name"
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
                  // FIX 2: Changed name="roleId" to name="role"
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Role
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loading || isLoadingRole}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border border-gray-300 rounded-lg h-[50px] px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200">
                            <SelectValue placeholder={isLoadingRole ? "Loading..." : "Select role"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((r: Role_Type) => (
                            <SelectItem key={r.id} value={r.id.toString()}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Office Field */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormField
                  control={form.control}
                  // FIX 3: Changed name="officeId" to name="office"
                  name="office"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Office
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={loading || isLoadingOffice}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full border border-gray-300 rounded-lg h-[50px] px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200">
                              <SelectValue placeholder={isLoadingOffice ? "Loading..." : "Select Office"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {offices.map((r: Office) => (
                              <SelectItem key={r.id} value={r.id.toString()}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Username and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormField
                  control={form.control}
                  // FIX 4: Changed name="name" to name="username"
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Username
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter username"
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
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              {mode === "add" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                          Password <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter password"
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                              disabled={loading}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-600 text-sm mt-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                          Confirm Password
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Enter confirm password"
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                              disabled={loading}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((prev) => !prev)}
                              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-600 text-sm mt-1" />
                      </FormItem>
                    )}
                  />
                </div>
              )}
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
                  <>{mode === "edit" ? "Update User" : "Save User"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}