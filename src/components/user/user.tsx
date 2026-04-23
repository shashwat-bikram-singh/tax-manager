import { useState, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {

  Pencil,
  Trash,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Key,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useMutate } from "@/hooks/useMutate";
import type { User } from "@/type/user";
import UserForm from "./user-form";
import { ChangePasswordDialog } from "./change-password";

// Helper function for sorting (moved outside to avoid re-creation)
const sortedUser = <T extends Record<string, any>>(
  items: T[],
  sortConfig: { key: keyof T; direction: "ascending" | "descending" } | null
): T[] => {
  const sortableItems = [...items];

  if (!sortConfig) return sortableItems;

  sortableItems.sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue == null || bValue == null) return 0;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortConfig.direction === "ascending"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortConfig.direction === "ascending"
        ? aValue - bValue
        : bValue - aValue;
    }

    return 0;
  });

  return sortableItems;
};

// Mobile Card Component (moved outside for optimization)
const MobileUserCard = ({ item, onEdit, onDelete, onChangePassword }: { item: User; onEdit: (id: number) => void; onDelete: (item: User) => void; onChangePassword: (id: number) => void }) => (
  <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 shadow-sm">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="font-semibold text-lg text-slate-900">{item.name}</h3>
        <p className="text-sm text-slate-500">{item.email}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
      <div>
        <span className="text-slate-400">Role:</span> <span className="text-slate-700">{item.role || "-"}</span>
      </div>
      <div>
        <span className="text-slate-400">Username:</span> <span className="text-slate-700">{item.username || "-"}</span>
      </div>
    </div>
    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => onChangePassword(item.id)}>
        <Key size={16} strokeWidth={2} />
      </Button>
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => onEdit(item.id)}>
        <Pencil size={16} strokeWidth={2} />
      </Button>
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(item)}>
        <Trash size={16} strokeWidth={2} />
      </Button>
    </div>
  </div>
);

export default function UserList() {
  const { t } = useTranslation(); // Using the hook without namespace to access root keys
  const { items: userData, isLoadingItems, error: fetchError } = useFetchAll<User>("/api/user", ["user"]);
  const { delete: deleteUser } = useMutate<User>("/api/user", "user");

  const [selectedUserId, setSelectedUserId] = useState<number | null>();
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);

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

  const rawUsers = extractData(userData);
  const users = rawUsers;

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof User;
    direction: "ascending" | "descending";
  } | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    sn: true,
    name: true,
    role: true,
    username: true,
    email: true,
    actions: true,
  });

  const handleEdit = useCallback((id: number) => {
    const item = users.find((v) => v.id === id);
    if (item) {
      setEditingUser(item);
    }
  }, [users]);

  const handleAddNew = () => {
    setIsAddingNew(true);
  };

  const sortedUsers = useMemo(() => sortedUser(users, sortConfig), [users, sortConfig]);

  // Handle filtering and search
  const filteredUsers = useMemo(() => sortedUsers.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.username && item.username.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  }), [sortedUsers, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + entriesPerPage);

  // Request sort


  // Get sort indicator


  // Page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle delete
  const confirmDelete = (item: User) => {
    setUserToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (userToDelete) {
      try {
        await deleteUser.mutateAsync(userToDelete.id);
        toast.success(t("deletedSuccessfully") || "User deleted successfully", {
          style: { background: "#10b981", color: "white" },
        });
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      } catch (err) {
        toast.error(t("deleteFailed") || "Failed to delete user", {
          style: { background: "#c6212d", color: "white" },
        });
      }
    }
  };

  if (isLoadingItems) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  if (fetchError) return (
    <div className="p-4 text-red-500 bg-red-50 rounded-lg m-4">
      {t("failedToLoad") || "Failed to load users"}: {fetchError.message}
    </div>
  );

  return (
    <div className="-mt-5 md:p-1 max-w-9xl mx-auto space-y-4">
      {/* Debug: Show user count */}
      {import.meta.env.DEV && (
        <div className="text-sm text-slate-500">
          {t("user.totalUser")} {users.length}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t("user.Users")}</h2>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="text-slate-500 border-slate-200 hover:bg-slate-50 p-2 h-9 w-9 shrink-0"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="h-4 w-4" />
            </Button>

            {searchOpen && (
              <div className="relative w-full sm:w-80 group">
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder={t("searchPlaceholder") || "Search users..."}
                  className="pl-9 w-full bg-slate-50 border-2 focus:bg-white focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-50 gap-2 shrink-0">
                  <Settings2 />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>{t("toggleColumns") || "Toggle Columns"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(columnVisibility).map(([key, visible]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={visible}
                    onCheckedChange={() => setColumnVisibility({ ...columnVisibility, [key]: !visible })}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 text-white shrink-0" onClick={handleAddNew}>
            <span className="mr-2 text-lg leading-none">+</span> {t("user.addUser")}
          </Button>
        </div>

        {/* Desktop Table (hidden on mobile) */}
        <div className="hidden md:block rounded-md border mb-6">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow className="hover:bg-slate-50/50">
                {columnVisibility.sn && (
                  <TableHead className="w-16 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("common.sn")}</TableHead>
                )}
                {columnVisibility.name && (
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("common.name")}</TableHead>
                )}
                {columnVisibility.role && (
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("common.role")}</TableHead>
                )}
                {columnVisibility.username && (
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("common.username")}</TableHead>
                )}
                {columnVisibility.email && (
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("common.email")}</TableHead>
                )}
                {columnVisibility.actions && (
                  <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2 w-24">{t("common.action")}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((item, index) => (
                  <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    {columnVisibility.sn && (
                      <TableCell className="text-center text-sm text-slate-500 font-medium py-2">
                        {(currentPage - 1) * entriesPerPage + index + 1}
                      </TableCell>
                    )}
                    {columnVisibility.name && (
                      <TableCell className="text-sm text-slate-900 font-medium py-2">{item.name}</TableCell>
                    )}
                    {columnVisibility.role && (
                      <TableCell className="text-sm text-slate-600 py-2">{item.role || "-"}</TableCell>
                    )}
                    {columnVisibility.username && (
                      <TableCell className="text-sm text-slate-600 py-2">{item.username || "-"}</TableCell>
                    )}
                    {columnVisibility.email && (
                      <TableCell className="text-sm text-slate-600 py-2">{item.email || "-"}</TableCell>
                    )}
                    {columnVisibility.actions && (
                      <TableCell className="py-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title={t("changePassword") || "Change Password"}
                            onClick={() => {
                              setSelectedUserId(item.id);
                              setOpenPasswordDialog(true);
                            }}
                          >
                            <Key size={16} strokeWidth={2} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => handleEdit(item.id)}
                          >
                            <Pencil size={16} strokeWidth={2} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => confirmDelete(item)}
                          >
                            <Trash size={16} strokeWidth={2} />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={
                      Object.values(columnVisibility).filter(Boolean).length
                    }
                    className="h-24 text-center"
                  >
                    {t("noUsersFound") || "No users found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards (visible only on mobile) */}
        <div className="md:hidden">
          {paginatedUsers.length > 0 ? (
            paginatedUsers.map((item) => (
              <MobileUserCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={confirmDelete}
                onChangePassword={(id) => { setSelectedUserId(id); setOpenPasswordDialog(true); }}
              />
            ))
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">{t("noUsersFound") || "No users found."}</p>
            </div>
          )}
        </div>
        {/* Pagination */}
        <div className="hidden sm:flex items-center justify-between px-2 mt-4 flex-col sm:flex-row gap-4">
          <div className="flex items-center text-sm text-muted-foreground">
            {t("showing") || "Showing"}{" "}
            {filteredUsers.length === 0
              ? 0
              : (currentPage - 1) * entriesPerPage + 1}{" "}
            {t("to") || "to"} {Math.min(currentPage * entriesPerPage, filteredUsers.length)} {t("of") || "of"}{" "}
            {filteredUsers.length} {t("entries") || "entries"}
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">{t("show") || "Show"}</p>
              <Select
                value={entriesPerPage.toString()}
                onValueChange={(value) => {
                  setEntriesPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={entriesPerPage} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={pageSize.toString()}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm font-medium">{t("entries") || "entries"}</p>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm">
                {t("page") || "Page"} {currentPage} {t("of") || "of"} {totalPages}
              </span>

              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("confirmDeletion") || "Confirm Deletion"}</DialogTitle>
              <DialogDescription>
                {t("deleteConfirmation", { name: userToDelete?.name }) || `Are you sure you want to delete user ${userToDelete?.name}? This action cannot be undone.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t("cancel") || "Cancel"}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {t("delete") || "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            <UserForm
              mode="edit"
              initialData={editingUser!}
              onSuccess={() => setEditingUser(null)}
              onCancel={() => setEditingUser(null)}
            />
          </DialogContent>
        </Dialog>

        {/* Add User Dialog */}
        <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            <UserForm
              mode="add"
              onSuccess={() => setIsAddingNew(false)}
              onCancel={() => setIsAddingNew(false)}
            />
          </DialogContent>
        </Dialog>

        <ChangePasswordDialog
          open={openPasswordDialog}
          onOpenChange={setOpenPasswordDialog}
          userId={selectedUserId}
        />
      </div>
    </div>
  );
}