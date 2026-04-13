// components/SuperAdmin/office-list-page.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronUp,
  ChevronDown,
  Trash,
  Search,
  Pencil,
  Building,
  MapPin,
  Phone,
  Mail,
  Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useMutate } from "@/hooks/useMutate";
import { useFetchAll } from "@/hooks/useFetchAll";
import { Card } from "@/components/ui/card";
import OfficeForm from "./office-form";

interface Office {
  id: number;
  key: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logoFileName: string | null;
  logoUrl: string;
  resourceAccessKey?: string | null;
  userName?: string;
  userEmail?: string;
  allowMultiSubOffice?: boolean;
  subOfficeLimit?: number;
}
type SortableOfficeKey = 'name' | 'address' | 'phone' | 'email' | 'allowMultiSubOffice' | 'subOfficeLimit';

export default function OfficeListPage() {
  const navigate = useNavigate();
  const { items: officeData, isLoadingItems } = useFetchAll<Office>("/api/officewithuser", ["officewithuser"]);
  const { delete: deleteOffice } = useMutate<Office>("/api/office", "officewithuser");

  function getOfficeData() {
    if (!officeData) return [];
    if (Array.isArray(officeData)) return officeData;
    const dataCandidate = (officeData as any).Data || (officeData as any).data;
    if (Array.isArray(dataCandidate)) return dataCandidate;

    const items: Office[] = [];
    let i = 0;
    while ((officeData as any)[i] !== undefined) {
      items.push((officeData as any)[i]);
      i++;
    }
    if (items.length > 0) return items;

    return [];
  }

  const offices = getOfficeData();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: SortableOfficeKey;
    direction: "ascending" | "descending";
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [officeToDelete, setOfficeToDelete] = useState<Office | null>(null);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    sn: true,
    name: true,
    address: true,
    phone: true,
    email: true,
    allowMultiSubOffice: true,
    subOfficeLimit: true,
    actions: true,
  });
  // Sorting

  function getSortedOffices() {
    let sortableItems = [...offices];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = String(a[sortConfig.key] ?? '');
        const bValue = String(b[sortConfig.key] ?? '');
        if (aValue < bValue)
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (aValue > bValue)
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }
  // Filtering
  const sortedOffices = getSortedOffices();

  function getFilteredOffices() {
    return sortedOffices.filter((office) =>
      office.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      office.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      office.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  const filteredOffices = getFilteredOffices();

  // Sorting handler
  const requestSort = (key: SortableOfficeKey) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Office) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? (
      <ChevronUp className="inline h-4 w-4" />
    ) : (
      <ChevronDown className="inline h-4 w-4" />
    );
  };

  // Delete handling
  const confirmDelete = (office: Office) => {
    setOfficeToDelete(office);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (officeToDelete) {
      deleteOffice.mutate(officeToDelete.id);
      toast.success("Office deleted successfully ✅");
      setDeleteDialogOpen(false);
      setOfficeToDelete(null);
    }
  };

  const handleEdit = (id: number) => {
    const item = offices.find((v) => v.id === id);
    if (item) {
      setEditingOffice(item);
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
  };

  // Mobile card design for OfficeList
  const MobileOfficeCard = ({ office }: { office: Office }) => (
    <div className="bg-white rounded-lg border shadow-sm p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          {office.logoUrl && !office.logoUrl.includes("fileName=&") ? (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
              <img
                src={office.logoUrl}
                alt={`${office.name} logo`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building className="h-5 w-5 text-purple-600" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-lg text-gray-800">{office.name}</h3>
            <p className="text-sm text-gray-500 mt-1">ID: {office.id}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {office.address && (
          <div className="flex items-center space-x-2">
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="truncate">{office.address}</span>
          </div>
        )}

        {office.phone && (
          <div className="flex items-center space-x-2">
            <Phone className="h-3 w-3 text-gray-400" />
            <span>{office.phone}</span>
          </div>
        )}

        {office.email && (
          <div className="flex items-center space-x-2">
            <Mail className="h-3 w-3 text-gray-400" />
            <span className="truncate">{office.email}</span>
          </div>
        )}

        {office.allowMultiSubOffice && (
          <div className="flex items-center space-x-2">
            <span className="font-medium">
              {office.allowMultiSubOffice ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => handleEdit(office.id)}
        >
          <Pencil size={16} />
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => confirmDelete(office)}
        >
          <Trash size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 bg-white min-h-screen rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Office List</h2>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full px-4 py-2 shadow-sm border border-blue-200 transition-all duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Back
          </Button>

          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleAddNew}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Office
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="hidden sm:flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search offices..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(columnVisibility).map(([key, visible]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={visible}
                  onCheckedChange={() =>
                    setColumnVisibility({ ...columnVisibility, [key]: !visible })
                  }
                >
                  {key.toUpperCase()}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="hidden md:block rounded-md border mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              {columnVisibility.sn && (
                <TableHead className="w-12">S.N.</TableHead>
              )}
              {columnVisibility.name && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("name")}
                >
                  Office Name {getSortIndicator("name")}
                </TableHead>
              )}
              {columnVisibility.address && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("address")}
                >
                  Address {getSortIndicator("address")}
                </TableHead>
              )}
              {columnVisibility.phone && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("phone")}
                >
                  Phone {getSortIndicator("phone")}
                </TableHead>
              )}
              {columnVisibility.email && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("email")}
                >
                  Email {getSortIndicator("email")}
                </TableHead>
              )}
              {columnVisibility.allowMultiSubOffice && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("allowMultiSubOffice")}
                >
                  Allow Multi SubOffice {getSortIndicator("allowMultiSubOffice")}
                </TableHead>
              )}
              {columnVisibility.subOfficeLimit && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("subOfficeLimit")}
                >
                  SubOffice Limit {getSortIndicator("subOfficeLimit")}
                </TableHead>
              )}
              {columnVisibility.actions && (
                <TableHead className="text-center">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingItems ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredOffices.length > 0 ? (
              filteredOffices.map((office, index) => (
                <TableRow key={office.id}>
                  {columnVisibility.sn && (
                    <TableCell>{index + 1}</TableCell>
                  )}
                  {columnVisibility.name && (
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {office.logoUrl && !office.logoUrl.includes("fileName=&") ? (
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                            <img
                              src={office.logoUrl}
                              alt={`${office.name} logo`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <Building className="h-4 w-4 text-gray-400" />
                        )}
                        <span>{office.name}</span>
                      </div>
                    </TableCell>
                  )}
                  {columnVisibility.address && (
                    <TableCell className="max-w-xs truncate">
                      {office.address || "N/A"}
                    </TableCell>
                  )}
                  {columnVisibility.phone && (
                    <TableCell>{office.phone || "N/A"}</TableCell>
                  )}
                  {columnVisibility.email && (
                    <TableCell className="truncate max-w-xs">
                      {office.email || "N/A"}
                    </TableCell>
                  )}
                  {columnVisibility.allowMultiSubOffice && (
                    <TableCell className="truncate max-w-xs">
                      {office.allowMultiSubOffice ? <span className="text-green-500 font-medium">True</span> : <span className="text-red-500 font-medium">False</span>}
                    </TableCell>
                  )}
                  {columnVisibility.subOfficeLimit && (
                    <TableCell className="truncate max-w-xs">
                      {office.subOfficeLimit || "N/A"}
                    </TableCell>
                  )}
                  {columnVisibility.actions && (
                    <TableCell className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(office.id)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 hover:bg-red-500 hover:text-white"
                        onClick={() => confirmDelete(office)}
                      >
                        <Trash size={16} />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No offices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards (visible only on mobile) */}
      <div className="md:hidden">
        {isLoadingItems ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="bg-white rounded-lg border shadow-sm p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-8 w-full mt-3" />
              </div>
            ))}
          </div>
        ) : filteredOffices.length > 0 ? (
          filteredOffices.map((office) => (
            <MobileOfficeCard key={office.id} office={office} />
          ))
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No offices found.</p>
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the office{" "}
              <b>{officeToDelete?.name}</b>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingOffice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] p-2 shadow-lg overflow-hidden">
            <div className="overflow-y-auto max-h-[calc(90vh-1rem)]">
              <OfficeForm
                mode="edit"
                initialData={editingOffice}
                onSuccess={() => setEditingOffice(null)}
                onCancel={() => setEditingOffice(null)}
              />
            </div>
          </Card>
        </div>
      )}

      {isAddingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] p-2 shadow-lg overflow-hidden">
            <div className="overflow-y-auto max-h-[calc(90vh-1rem)]">
              <OfficeForm
                mode="add"
                onSuccess={() => setIsAddingNew(false)}
                onCancel={() => setIsAddingNew(false)}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}