import { useState, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Trash,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileX,
  Upload,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useMutate } from "@/hooks/useMutate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Property {
  id: number;
  name?: string;
  propertyType?: string;
  landArea?: number;
  buildingArea?: number;
  legalStatus?: string;
  usageName?: string;
  ownershipType?: string;
}

export default function PropertyList() {
  const navigate = useNavigate();
  const { items: propertyData, isLoadingItems } = useFetchAll<Property>("/api/property", ["property"]);
  const { delete: deleteProperty } = useMutate<Property>("/api/property", "property");

  const getAreaDisplay = (item: Property) => {
    const land = item.landArea;
    const building = item.buildingArea;
    if (land && building) return `${land} sq.m / ${building} sq.m`;
    if (land) return `${land} sq.m`;
    if (building) return `${building} sq.m`;
    return "-";
  };

  function getProperties(data: any): Property[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const nestedData = data.data || data.Data;
    if (Array.isArray(nestedData)) return nestedData;
    return [];
  }

  const properties = getProperties(propertyData);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    sn: true,
    name: true,
    propertyType: true,
    landArea: true,
    buildingArea:true,
    legalStatus: true,
    usageName: true,
    ownershipType: true,
    actions: true,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  const handleEdit = (id: number) => {
    navigate(`/property/edit/${id}`);
  };
  const handleUpload = (id: number) => {
    navigate(`/documentForm/add?propertyId=${id}`);
  };

  const handleAddNew = () => {
    navigate("/property/add");
  };

  const filteredProperties = properties.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      searchTerm === "" ||
      (item.propertyType && item.propertyType.toLowerCase().includes(searchLower)) ||
      (item.name && item.name .toLowerCase().includes(searchLower)) ||
      (item.legalStatus && item.legalStatus .toLowerCase().includes(searchLower)) ||
      (item.ownershipType && item.ownershipType .toLowerCase().includes(searchLower)) ||
      (item.usageName && item.usageName.toLowerCase().includes(searchLower)) 
    );
  });

  const totalPages = Math.ceil(filteredProperties.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedProperties = filteredProperties.slice(startIndex, startIndex + entriesPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const confirmDelete = (item: Property) => {
    setPropertyToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (propertyToDelete && propertyToDelete.id) {
      try {
        await deleteProperty.mutateAsync(propertyToDelete.id);
        toast.success("Property deleted successfully");
        setDeleteDialogOpen(false);
        setPropertyToDelete(null);
      } catch (err) {
        toast.error("Failed to delete property");
      }
    }
  };

  if (isLoadingItems) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="-mt-5 md:p-1 max-w-9xl mx-auto space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Property Inventory</h2>
          
        </div>
      </div>

      {/* Controls Bar */}
    

      {/* Table */}
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
                placeholder="Search fiscal years..."
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
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
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
          <span className="mr-2 text-lg leading-none">+</span> Add Property
        </Button>
      </div>
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow className="hover:bg-slate-50/50">
              {columnVisibility.sn && (
                <TableHead className="w-16 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">S.N.</TableHead>
              )}
              {columnVisibility.name && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Name</TableHead>
              )}
              {columnVisibility.propertyType && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Property Type</TableHead>
              )}
              {(columnVisibility.landArea || columnVisibility.buildingArea) && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Area (sq.m)</TableHead>
              )}
              {columnVisibility.legalStatus && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Legal Status</TableHead>
              )}
              {columnVisibility.usageName && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Reason to Use</TableHead>
              )}
              {columnVisibility.ownershipType && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Ownership Type</TableHead>
              )}
              {columnVisibility.actions && (
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4 w-24">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProperties.length > 0 ? (
              paginatedProperties.map((item, index) => (
                <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  {columnVisibility.sn && (
                    <TableCell className="text-center text-sm text-slate-500 font-medium py-4">
                      {(currentPage - 1) * entriesPerPage + index + 1}
                    </TableCell>
                  )}
                  {columnVisibility.name && (
                    <TableCell className="font-semibold text-slate-900 py-4">{item.name ?? "-"}</TableCell>
                  )}
                  {columnVisibility.propertyType && (
                    <TableCell className="text-sm text-slate-600 py-4">{item.propertyType ?? "-"}</TableCell>
                  )}
                  {(columnVisibility.landArea || columnVisibility.buildingArea) && (
                    <TableCell className="text-sm text-slate-600 py-4">{getAreaDisplay(item)}</TableCell>
                  )}
                  {columnVisibility.legalStatus && (
                    <TableCell className="text-sm text-slate-600 py-4">{item.legalStatus ?? "-"}</TableCell>
                  )}
                  {columnVisibility.usageName && (
                    <TableCell className="text-sm text-slate-600 py-4">{item.usageName ?? "-"}</TableCell>
                  )}
                  {columnVisibility.ownershipType && (
                    <TableCell className="text-sm text-slate-600 py-4">{item.ownershipType ?? "-"}</TableCell>
                  )}
                  {columnVisibility.actions && (
                    <TableCell className="py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => handleUpload(item.id)} title="Upload">
                          <Upload size={16} strokeWidth={2} />
                         </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => handleEdit(item.id)} title="Edit">
                          <Pencil size={16} strokeWidth={2} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => confirmDelete(item)} title="Delete">
                          <Trash size={16} strokeWidth={2} />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={Object.values(columnVisibility).filter(Boolean).length + 1} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <FileX className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm font-medium">No properties found.</p>
                    <p className="text-xs mt-1">Try adjusting your search or filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="hidden sm:flex items-center justify-between px-2 pt-4">
        <div className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-900">
            {filteredProperties.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}
          </span> to <span className="font-medium text-slate-900">
            {Math.min(currentPage * entriesPerPage, filteredProperties.length)}
          </span> of <span className="font-medium text-slate-900">{filteredProperties.length}</span> results
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-slate-700">Rows per page</p>
            <Select value={entriesPerPage.toString()} onValueChange={(v) => { setEntriesPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={entriesPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-1">
              <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-8 w-8 p-0" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-8 w-8 p-0" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-900">Delete Property</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete this property? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}