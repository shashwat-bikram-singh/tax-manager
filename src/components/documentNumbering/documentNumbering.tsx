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
import type { DocumentNumbering } from "@/type/documentnumbering";
import DocumentNumberingForm from "./documentNumbering-form";

export default function DocumentNumberingList() {
  const { items: documentNumberData, isLoadingItems, error: fetchError } = useFetchAll<DocumentNumbering>("/api/documentnumber", ["documentnumbering"]);
  const { delete: deletedocNumber } = useMutate<DocumentNumbering>("/api/documentNumber", "documentnumbering");
  const { items: fyData } = useFetchAll<any>("/api/fiscalyear", ["dn-fiscalyear"]);
  const { items: subOfficeData } = useFetchAll<any>("/api/suboffice", ["db-suboffice"]);
  const { items: moduleData } = useFetchAll<any>("/api/module", ["dn-module"]);
  const { items: subModuleData } = useFetchAll<any>("/api/submodule", ["dn-submodule"]);

  // Helper to extract data
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

  const rawDN = extractData(documentNumberData);
  const fiscalYears = extractData(fyData);
  const subOffices = extractData(subOfficeData);
    const modules = extractData(moduleData);
  const subModules = extractData(subModuleData);

  const docnum = rawDN.map((d) => ({
    ...d,
    fiscalYear: fiscalYears.find((fy: any) => fy.id === d.fiscalYearId)?.name || d.fiscalYear,
    subOffice: subOffices.find((so: any) => so.id === d.subOfficeId)?.name || d.subOffice,
    module: modules.find((m: any) => m.id === d.moduleId)?.name || d.module,
    subModule: subModules.find((s: any) => s.id === d.subModuleId)?.name || d.subModule,
  }));


  const [editingDoumentNumber, setEditingDoumentNumber] = useState<DocumentNumbering | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof DocumentNumbering;
    direction: "ascending" | "descending";
  } | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentNumberToDelete, setDocumentNumberToDelete] = useState<DocumentNumbering | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    sn: true,
    fiscalYear: true,
    subOffice: true,
    module: true,
    subModule: true,
    startNumber: true,
    prefix: true,
    suffix: true,
    length: true,
    actions: true,
  });


  const handleEdit = (id: number) => {
    const item = docnum.find((v) => v.id === id);
    if (item) {
      setEditingDoumentNumber(item);
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
  };

  function sortDocumentNumbers<T extends Record<string, any>>(
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

  const sortedDocumentNumber = sortDocumentNumbers(docnum, sortConfig);


  // Handle filtering and search
  const filteredDoumentNumber =

    sortedDocumentNumber.filter((item) => {
      const searchStr = searchTerm.toLowerCase();
      return (
        searchTerm === "" ||
        (item.prefix && item.prefix.toLowerCase().includes(searchStr)) ||
        (item.suffix && item.suffix.toLowerCase().includes(searchStr)) ||
        (item.fiscalYear && item.fiscalYear.toLowerCase().includes(searchStr)) ||
        (item.subOffice && item.subOffice.toLowerCase().includes(searchStr)) ||
        (item.module && item.module.toLowerCase().includes(searchStr)) ||
        (item.subModule && item.subModule.toLowerCase().includes(searchStr))
      );
    });


  // Pagination
  const totalPages = Math.ceil(filteredDoumentNumber.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedDocumentNumber = filteredDoumentNumber.slice(startIndex, startIndex + entriesPerPage);

  // Request sort
  const requestSort = (key: keyof DocumentNumbering) => {
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
  const getSortIndicator = (key: keyof DocumentNumbering) => {
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
  const confirmDelete = (item: DocumentNumbering) => {
    setDocumentNumberToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (documentNumberToDelete) {
      try {
        await deletedocNumber.mutateAsync(documentNumberToDelete.id);
        setDeleteDialogOpen(false);
        setDocumentNumberToDelete(null);
      } catch (err) {
        toast.error("Failed to delete document number", {
          style: { background: "#c6212d", color: "white" },
        });
      }
    }
  };

  if (isLoadingItems) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (fetchError) return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load Document Number: {fetchError.message}</div>;

  // Mobile responsive card view
  const MobileDocumentNumberCard = ({ item }: { item: DocumentNumbering }) => (
    <div className="bg-white rounded-lg border p-4 mb-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{item.fiscalYearId}</h3>
          <p className="text-sm text-gray-500">{item.subOfficeId}</p>
          <p className="text-sm text-gray-500">{item.moduleId}</p>
          <p className="text-sm text-gray-500">{item.subModuleId}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div>
          <span className="text-gray-400">Perfix:</span> {item.prefix || "-"}
        </div>
        <div>
          <span className="text-gray-400">Suffix:</span> {item.suffix || "-"}
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
        <h2 className="text-2xl font-semibold text-gray-800">Document Number List </h2>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleAddNew}
        >
          Add Document Number
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search document number..."
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
              {columnVisibility.fiscalYear && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("fiscalYear")}
                >
                  Fiscal Year {getSortIndicator("fiscalYear")}
                </TableHead>
              )}
              {columnVisibility.subOffice && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("subOffice")}
                >
                  Suboffice {getSortIndicator("subOffice")}
                </TableHead>
              )}
              {columnVisibility.module && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("module")}
                >
                  Module {getSortIndicator("module")}
                </TableHead>
              )}
              {columnVisibility.subModule && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("subModule")}
                >
                  SubModule {getSortIndicator("subModule")}
                </TableHead>
              )}
              {columnVisibility.startNumber && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("startNumber")}
                >
                  Start Number {getSortIndicator("startNumber")}
                </TableHead>
              )}
              {columnVisibility.prefix && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("prefix")}
                >
                  Prefix {getSortIndicator("prefix")}
                </TableHead>
              )}
              {columnVisibility.suffix && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("suffix")}
                >
                  Suffix {getSortIndicator("suffix")}
                </TableHead>
              )}
              {columnVisibility.length && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("length")}
                >
                  Length {getSortIndicator("length")}
                </TableHead>
              )}
              {columnVisibility.actions && (
                <TableHead className="text-center">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDocumentNumber.length > 0 ? (
              paginatedDocumentNumber.map((item, index) => (
                <TableRow key={item.id}>
                  {columnVisibility.sn && (
                    <TableCell>
                      {(currentPage - 1) * entriesPerPage + index + 1}
                    </TableCell>
                  )}
                  {columnVisibility.fiscalYear && (
                    <TableCell >{item.fiscalYear}</TableCell>
                  )}
                  {columnVisibility.subOffice && (
                    <TableCell> {item.subOffice || "-"}</TableCell>
                  )}
                  {columnVisibility.module && (
                    <TableCell> {item.module || "-"}</TableCell>
                  )}
                  {columnVisibility.subModule && (
                    <TableCell> {item.subModule || "-"}</TableCell>
                  )}
                  {columnVisibility.startNumber && (
                    <TableCell>{item.startNumber || "-"}</TableCell>
                  )}
                  {columnVisibility.prefix && (
                    <TableCell>{item.prefix}</TableCell>
                  )}
                  {columnVisibility.suffix && (
                    <TableCell>{item.suffix}</TableCell>
                  )}
                  {columnVisibility.length && (
                    <TableCell>{item.length}</TableCell>
                  )}
                  {columnVisibility.actions && (
                    <TableCell className="flex gap-2 justify-center">
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
                  No Document Number found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards (visible only on mobile) */}
      <div className="md:hidden">
        {paginatedDocumentNumber.length > 0 ? (
          paginatedDocumentNumber.map((item) => (
            <MobileDocumentNumberCard key={item.id} item={item} />
          ))
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No DocumentNumber found.</p>
          </div>
        )}
      </div>
      {/* Pagination */}
      <div className="hidden sm:flex items-center justify-between px-2 mt-4 flex-col sm:flex-row gap-4">
        <div className="flex items-center text-sm text-muted-foreground">
          Showing{" "}
          {filteredDoumentNumber.length === 0
            ? 0
            : (currentPage - 1) * entriesPerPage + 1}{" "}
          to {Math.min(currentPage * entriesPerPage, filteredDoumentNumber.length)} of{" "}
          {filteredDoumentNumber.length} entries
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
              Are you sure you want to delete the document Prefix{" "}
              " {documentNumberToDelete?.prefix}" ? This action cannot be undone.
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

      {editingDoumentNumber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] p-2 shadow-lg overflow-hidden">
            <div className="overflow-y-auto max-h-[calc(90vh-1rem)]">
              <DocumentNumberingForm
                mode="edit"
                initialData={editingDoumentNumber}
                onSuccess={() => setEditingDoumentNumber(null)}
                onCancel={() => setEditingDoumentNumber(null)}
              />
            </div>
          </Card>
        </div>
      )}

      {isAddingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] p-2 shadow-lg overflow-hidden">
            <div className="overflow-y-auto max-h-[calc(90vh-1rem)]">
              <DocumentNumberingForm
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
