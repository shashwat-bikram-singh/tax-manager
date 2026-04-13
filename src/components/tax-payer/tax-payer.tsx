import { useState } from "react";
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
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useMutate } from "@/hooks/useMutate";
import type { TaxPayer } from "@/type/tax-payer";
import TaxPayerForm from "./tax-payer-form";

export default function TaxPayerList() {
  const { items: taxPayerData, isLoadingItems, error: fetchError } = useFetchAll<TaxPayer>("/api/taxpayer", ["taxpayer"]);
  const { delete: deleteTaxPayer } = useMutate<TaxPayer>("/api/taxpayer", "taxpayer");
  const { items: moduleData } = useFetchAll<any>("/api/module", ["module"]);
  const { items: subModuleData } = useFetchAll<any>("/api/submodule", ["submodule"]);
  const { items: categoryData } = useFetchAll<any>("/api/category", ["category"]);


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

  const rawTaxPayers = extractData(taxPayerData);
  const modules = extractData(moduleData);
  const subModules = extractData(subModuleData);
  const categories = extractData(categoryData);

  const taxPayers = rawTaxPayers.map((taxPayer) => ({
    ...taxPayer,
    module: modules.find((m: any) => m.id === taxPayer.moduleId)?.name || taxPayer.module,
    subModule: subModules.find((s: any) => s.id === taxPayer.subModuleId)?.name || taxPayer.subModule,
    category: categories.find((c: any) => c.id === taxPayer.categoryId)?.name || taxPayer.category,
  }));

  const [editingTaxPayer, setEditingTaxPayer] = useState<TaxPayer | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TaxPayer;
    direction: "ascending" | "descending";
  } | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taxPayerToDelete, setTaxPayerToDelete] = useState<TaxPayer | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    sn: true,
    name: true,
    address: true,
    contactNo: true,
    email: true,
    vehicleNo: true,
    category: true,
    module: true,
    subModule: true,
    actions: true,
  });


  const handleEdit = (id: number) => {
    const item = taxPayers.find((v) => v.id === id);
    if (item) {
      setEditingTaxPayer(item);
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
  };

  function sortedTaxPayer<T extends Record<string, any>>(
    items: T[],
    sortConfig: { key: keyof T; direction: "ascending" | "descending" } | null
  ): T[] {
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
  }

  const sortedTaxPayers = sortedTaxPayer(taxPayers, sortConfig);

  // Handle filtering and search
  const filteredTaxPayers = sortedTaxPayers.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.address && item.address.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTaxPayers.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedTaxPayers = filteredTaxPayers.slice(startIndex, startIndex + entriesPerPage);

  // Request sort
  const requestSort = (key: keyof TaxPayer) => {
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

  // Get sort indicator
  const getSortIndicator = (key: keyof TaxPayer) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? (
      <ChevronUp className="inline h-4 w-4" />
    ) : (
      <ChevronDown className="inline h-4 w-4" />
    );
  };

  // Page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle delete
  const confirmDelete = (item: TaxPayer) => {
    setTaxPayerToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (taxPayerToDelete) {
      try {
        await deleteTaxPayer.mutateAsync(taxPayerToDelete.id);
        toast.success("TaxPayer deleted successfully ✅", {
          style: { background: "#10b981", color: "white" },
        });
        setDeleteDialogOpen(false);
        setTaxPayerToDelete(null);
      } catch (err) {
        toast.error("Failed to delete tax payer", {
          style: { background: "#c6212d", color: "white" },
        });
      }
    }
  };

  if (isLoadingItems) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (fetchError) return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load tax payers: {fetchError.message}</div>;

  // Mobile responsive card view
  const MobileTaxPayerCard = ({ item }: { item: TaxPayer }) => (
    <div className="bg-white rounded-lg border p-4 mb-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <p className="text-sm text-gray-500">{item.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div>
          <span className="text-gray-400">Address:</span> {item.address || "-"}
        </div>
        <div>
          <span className="text-gray-400">Contact No:</span> {item.contactNo || "-"}
        </div>
        <div>
          <span className="text-gray-400">Vehicle No:</span> {item.vehicleNo || "-"}
        </div>
        <div>
          <span className="text-gray-400">Category:</span> {item.categoryId || "-"}
        </div>
        <div>
          <span className="text-gray-400">Module:</span> {item.moduleId || "-"}
        </div>
        <div>
          <span className="text-gray-400">Sub Module:</span> {item.subModuleId || "-"}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => handleEdit(item.id)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          onClick={() => confirmDelete(item)}
        >
          <Trash size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Tax Payer List</h2>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleAddNew}
        >
          Add Tax Payer
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search tax payer..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="hidden sm:flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
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
                      setColumnVisibility({
                        ...columnVisibility,
                        [key]: !visible,
                      })
                    }
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Desktop Table (hidden on mobile) */}
      <div className="hidden md:block rounded-md border mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              {columnVisibility.sn && (
                <TableHead className="w-8">S.N.</TableHead>
              )}
              {columnVisibility.name && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("name")}
                >
                  Name {getSortIndicator("name")}
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
              {columnVisibility.contactNo && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("contactNo")}
                >
                  Contact No {getSortIndicator("contactNo")}
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
              {columnVisibility.vehicleNo && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("vehicleNo")}
                >
                  Vehicle No {getSortIndicator("vehicleNo")}
                </TableHead>
              )}
              {columnVisibility.category && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("categoryId")}
                >
                  Category {getSortIndicator("categoryId" as keyof TaxPayer)}
                </TableHead>
              )}
              {columnVisibility.module && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("module" as any)}
                >
                  Module {getSortIndicator("module" as any)}
                </TableHead>
              )}
              {columnVisibility.subModule && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("subModule" as any)}
                >
                  Sub Module {getSortIndicator("subModule" as any)}
                </TableHead>
              )}
              {columnVisibility.actions && (
                <TableHead className="text-center">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTaxPayers.length > 0 ? (
              paginatedTaxPayers.map((item, index) => (
                <TableRow key={item.id}>
                  {columnVisibility.sn && (
                    <TableCell>
                      {(currentPage - 1) * entriesPerPage + index + 1}
                    </TableCell>
                  )}
                  {columnVisibility.name && (
                    <TableCell >{item.name}</TableCell>
                  )}
                  {columnVisibility.address && (
                    <TableCell> {item.address || "-"}</TableCell>
                  )}
                  {columnVisibility.contactNo && (
                    <TableCell> {item.contactNo || "-"}</TableCell>
                  )}
                  {columnVisibility.email && (
                    <TableCell> {item.email || "-"}</TableCell>
                  )}
                  {columnVisibility.vehicleNo && (
                    <TableCell> {item.vehicleNo || "-"}</TableCell>
                  )}
                  {columnVisibility.category && (
                    <TableCell>{item.category || "-"}</TableCell>
                  )}
                  {columnVisibility.module && (
                    <TableCell>{item.module || "-"}</TableCell>
                  )}
                   {columnVisibility.subModule && (
                    <TableCell>{item.subModule || "-"}</TableCell>
                  )}
                  {columnVisibility.actions && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(item.id)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => confirmDelete(item)}
                        >
                          <Trash size={16} />
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
                  No tax payers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards (visible only on mobile) */}
      <div className="md:hidden">
        {paginatedTaxPayers.length > 0 ? (
          paginatedTaxPayers.map((item) => (
            <MobileTaxPayerCard key={item.id} item={item} />
          ))
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No tax payers found.</p>
          </div>
        )}
      </div>
      {/* Pagination */}
      <div className="hidden sm:flex items-center justify-between px-2 mt-4 flex-col sm:flex-row gap-4">
        <div className="flex items-center text-sm text-muted-foreground">
          Showing{" "}
          {filteredTaxPayers.length === 0
            ? 0
            : (currentPage - 1) * entriesPerPage + 1}{" "}
          to {Math.min(currentPage * entriesPerPage, filteredTaxPayers.length)} of{" "}
          {filteredTaxPayers.length} entries
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Show</p>
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
            <p className="text-sm font-medium">entries</p>
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
              Page {currentPage} of {totalPages}
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
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the tax payer{" "}
              {taxPayerToDelete?.name}? This action cannot be undone.
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

      {editingTaxPayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] p-2 shadow-lg overflow-hidden">
            <div className="overflow-y-auto max-h-[calc(90vh-1rem)]">
              <TaxPayerForm
                mode="edit"
                initialData={editingTaxPayer}
                onSuccess={() => setEditingTaxPayer(null)}
                onCancel={() => setEditingTaxPayer(null)}
              />
            </div>
          </Card>
        </div>
      )}

      {isAddingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] p-2 shadow-lg overflow-hidden">
            <div className="overflow-y-auto max-h-[calc(90vh-1rem)]">
              <TaxPayerForm
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
