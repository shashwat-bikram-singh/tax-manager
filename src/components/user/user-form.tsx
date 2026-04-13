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
import type { Suboffice } from "@/type/suboffice";
import { useFetchAll } from "@/hooks/useFetchAll";
import type { Role_Type } from "@/type/role";

type Module = {
  id: number;
  name: string;
};

// -------------------- SCHEMA --------------------
const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email"),
  roleId: z.string().min(1, "Role is required"),
  subOfficeId: z.string().min(1, "Suboffice is required"),
  moduleId: z.coerce.number().min(0, "Module is required"),
  subModuleId: z.coerce.number().min(0, "Sub Module is required"),
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
export default function UserForm({ mode, initialData, onSuccess, onCancel }: UserFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { items: roleData, isLoadingItems: isLoadingRole } = useFetchAll<Role_Type>("/api/role", ["role"]);
  const { items: subOfficeData, isLoadingItems: isLoadingSubOffice } = useFetchAll<Suboffice>("/api/suboffice", ["sub-Office"]);
  const { items: moduleItems, isLoadingItems: isLoadingModule } = useFetchAll<Module>("/api/module", ["module"]);
  const { create, update } = useMutate<User>("/api/user", "user");

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

  function getSubOffices(subOfficeData: any) {
    if (!subOfficeData) return [];
    if (Array.isArray(subOfficeData)) return subOfficeData;
    const dataCandidate = (subOfficeData as any).data || (subOfficeData as any).Data;
    if (Array.isArray(dataCandidate)) return dataCandidate;

    const items: Suboffice[] = [];
    let i = 0;
    while ((subOfficeData as any)[i] !== undefined) {
      items.push((subOfficeData as any)[i]);
      i++;
    }
    return items;
  }

  const subOffices = getSubOffices(subOfficeData);

  function getModules(moduleData: any) {
    if (!moduleData) return [];
    if (Array.isArray(moduleData)) return moduleData;
    const dataCandidate = (moduleData as any).data || (moduleData as any).Data;
    if (Array.isArray(dataCandidate)) return dataCandidate;

    const items: Module[] = [];
    let i = 0;
    while ((moduleData as any)[i] !== undefined) {
      items.push((moduleData as any)[i]);
      i++;
    }
    return items;
  }

  const modules = getModules(moduleItems);

  // -------------------- FORM --------------------
  const schema = mode === "add" ? addUserSchema : editUserSchema;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      roleId: initialData?.roleId?.toString() ?? "",
      subOfficeId: initialData?.subOfficeId?.toString() ?? "",
      email: initialData?.email ?? "",
      username: initialData?.username ?? "",
      password: initialData?.password ?? "",
      confirmPassword: initialData?.password ?? "",
      moduleId: initialData?.moduleId ?? 0,
      subModuleId: initialData?.subModuleId ?? 0,
    },
  });

  const selectedModuleId = form.watch("moduleId");
  const { items: subModuleItems, isLoadingItems: isLoadingSubModule } = useFetchAll<any>(
    selectedModuleId ? `/api/submodule?moduleId=${selectedModuleId}` : "",
    ["submodule", selectedModuleId]
  );

  function getSubModules(subModuleData: any) {
    if (!subModuleData) return [];
    if (Array.isArray(subModuleData)) return subModuleData;
    const dataCandidate = (subModuleData as any).data || (subModuleData as any).Data;
    if (Array.isArray(dataCandidate)) return dataCandidate;
    const items: any[] = [];
    let i = 0;
    while ((subModuleData as any)[i] !== undefined) {
      items.push((subModuleData as any)[i]);
      i++;
    }
    return items;
  }

  const subModules = getSubModules(subModuleItems);

  const onSubmit = async (values: UserFormValues) => {
    setLoading(true);

    try {
      const payload: any = {
        name: values.name,
        roleId: values.roleId,
        subOfficeId: values.subOfficeId,
        email: values.email,
        username: values.username,
        password: values.password,
        confirmPassword: values.confirmPassword,
        moduleId: values.moduleId,
        subModuleId: values.subModuleId,
      };

      if (mode === "edit" && initialData?.id) {
        payload.id = initialData.id.toString();
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
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Role
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
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
                              {r.displayName}
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
                  name="subOfficeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Suboffice
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        disabled={loading || isLoadingSubOffice}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border border-gray-300 rounded-lg h-[50px] px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200">
                            <SelectValue placeholder={isLoadingSubOffice ? "Loading..." : "Select suboffice"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subOffices.map((s: Suboffice) => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.name} {s.title ? `- ${s.title}` : ""}
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
                  name="moduleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-gray-700 font-medium">
                        Module
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(Number(val));
                          form.setValue("subModuleId", 0);
                        }}
                        value={field.value !== undefined ? field.value.toString() : undefined}
                        disabled={loading || isLoadingModule}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border border-gray-300 rounded-lg h-[50px] px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200">
                            <SelectValue placeholder={isLoadingModule ? "Loading..." : "Select module"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {modules.map((m: Module) => (
                            <SelectItem key={m.id} value={m.id.toString()}>
                              {m.name}
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
                        disabled={!selectedModuleId || selectedModuleId === 0 || isLoadingSubModule}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border border-gray-300 rounded-lg h-[50px] px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200">
                            <SelectValue
                              placeholder={
                                !selectedModuleId || selectedModuleId === 0
                                  ? "Select a module first"
                                  : isLoadingSubModule
                                    ? "Loading..."
                                    : subModules.length === 0
                                      ? "No sub modules available"
                                      : "Select sub module"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">None / Clear</SelectItem>
                          {subModules.map((s: any) => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              {/* ✅ FIXED: Removed the stray </div> that was breaking the DOM here */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormField
                  control={form.control}
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
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
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