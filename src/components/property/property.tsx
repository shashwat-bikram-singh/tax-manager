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
  Eye,
  Download,
  X,
  FileText,
  MapPin,
  Building2,
  LandPlot,
  Banknote,
  Scale,
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
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "@/config/axios";

// ─── INTERFACES ──────────────────────────────────────────────────────────────
interface PropertyDocument {
  Id: number;
  FileName: string;
  FilePath: string;
  FileExtension: string;
}

interface Property {
  id: number;
  name?: string;
  propertyType?: string;
  landArea?: number | null;
  buildingArea?: number | null;
  legalStatus?: string;
  usageName?: string;
  ownershipType?: string;
  province: string;
  district?: string;
  localBody?: string;
  geographicRegion?: string;
  wardNo?: number;
  kittaNumber?: string;
  sheetNumber?: string;
  description?: string;
  createdDate?: string;
  valuation?: number;
  taxAmount?: number;
  ownershipTransferDate?: string;
  usageRight?: string;
  land_Latitude?: number | null;
  land_Longitude?: number | null;
  building_Latitude?: number | null;
  building_Longitude?: number | null;
  noOfFloors?: number | null;
  constructionYear?: string | null;
  document?: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getStatusBadge(legalStatus: string, displayText?: string) {
  const s = legalStatus?.toLowerCase() || "";
  if (s.includes("litigation"))
    return <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-red-100 text-red-600 border border-red-200">{displayText ?? "Litigation"}</span>;
  if (s.includes("encroach"))
    return <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 border border-amber-200">{displayText ?? "Encroached"}</span>;
  if (s.includes("verified & clear"))
    return <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-green-100 text-green-600 border border-green-200">{displayText ?? "Verified & Clear"}</span>;
  if (s.includes("in registration") || s.includes("in-registration"))
    return <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-600 border border-yellow-200">{displayText ?? "In Registration"}</span>;
  return <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-green-100 text-green-600 border border-green-200">{(displayText ?? legalStatus) || "Normal"}</span>;
}

function getDocuments(docString?: string | null): PropertyDocument[] {
  if (!docString) return [];
  try {
    const parsed = JSON.parse(docString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── DETAIL ROW ──────────────────────────────────────────────────────────────
const DetailRow = ({
  label,
  value,
  isBadge,
  badgeValue,
}: {
  label: string;
  value: string | number | null | undefined;
  isBadge?: boolean;
  badgeValue?: string;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
    <div className="min-h-[24px] flex items-center">
      {isBadge && value ? (
        getStatusBadge(String(value), badgeValue)
      ) : (
        <span className="text-sm font-medium text-slate-800">
          {value !== null && value !== undefined && value !== ""
            ? typeof value === "number" ? value.toLocaleString() : value
            : "-"}
        </span>
      )}
    </div>
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function PropertyList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const translateValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return value;
    if (typeof value === "number") return value;
    return t(`fieldValues.${value}`, { defaultValue: value });
  };
  const { items: propertyData, isLoadingItems } = useFetchAll<Property>("/api/property", ["property"]);
  const { delete: deleteProperty } = useMutate<Property>("/api/property", "property");

  const { token } = useAuthStore();
  const decoded: any = token ? jwtDecode(token) : {};
  const isSuperAdmin = (decoded?.Role ?? decoded?.role ?? "").toLowerCase() === "superadmin";
  const isAdmin = (decoded?.Role ?? decoded?.role ?? "").toLowerCase() === "admin";
  const Role = decoded?.Role ?? decoded?.role ?? "User";

  const canManageActions = isSuperAdmin || isAdmin;

  // ─── DETAIL MODAL STATE ───────────────────────────────────────────────
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // ─── FILE VIEWER STATE ────────────────────────────────────────────────
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);

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
    province: true,
    landArea: true,
    buildingArea: true,
    legalStatus: true,
    usageName: true,
    ownershipType: true,
    actions: canManageActions,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  // ─── HANDLERS ─────────────────────────────────────────────────────────
  const handleEdit = (id: number) => navigate(`/app/property/edit/${id}`);
  const handleUpload = (id: number) => navigate(`/app/document-vault/add?propertyId=${id}`);
  const handleAddNew = () => navigate("/app/property/add");
  const handleCancel = () => { setDeleteDialogOpen(false); setPropertyToDelete(null); };

  const handleOpenDetails = (item: Property) => { setSelectedProperty(item); setIsDetailsModalOpen(true); };
  const closeDetailsModal = () => { setSelectedProperty(null); setIsDetailsModalOpen(false); };

  const closeFileModal = () => { setIsFileModalOpen(false); setSelectedFileUrl(null); };

  interface ApiResponseViewFile { url: string; }

  const handleViewDocumentById = async (docId: number) => {
    if (!docId) return alert("No valid document ID provided.");
    setIsFileLoading(true);
    try {
      const response = await axiosInstance.get<ApiResponseViewFile>(`/api/view-document?id=${docId}`);
      if (response?.data?.url) {
        setSelectedFileUrl(response.data.url);
        setIsFileModalOpen(true);
      } else {
        alert("No file URL found for this document.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to fetch file.");
    } finally {
      setIsFileLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedFileUrl) return;
    try {
      const response = await fetch(selectedFileUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = selectedFileUrl.split("/").pop()?.split("?")[0] || "document.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(selectedFileUrl, "_blank");
    }
  };

  const filteredProperties = properties.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      searchTerm === "" ||
      (item.propertyType && item.propertyType.toLowerCase().includes(searchLower)) ||
      (item.name && item.name.toLowerCase().includes(searchLower)) ||
      (item.legalStatus && item.legalStatus.toLowerCase().includes(searchLower)) ||
      (item.ownershipType && item.ownershipType.toLowerCase().includes(searchLower)) ||
      (item.usageName && item.usageName.toLowerCase().includes(searchLower)) ||
      (item.province && item.province.toLowerCase().includes(searchLower))
    );
  });

  const totalPages = Math.ceil(filteredProperties.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedProperties = filteredProperties.slice(startIndex, startIndex + entriesPerPage);
  const goToPage = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  const confirmDelete = (item: Property) => { setPropertyToDelete(item); setDeleteDialogOpen(true); };

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-md font-bold text-slate-800 tracking-tight">{t("property.propertyInventory")}</h2>
        </div>
      </div>

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
                  placeholder="Search"
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

          {canManageActions && (
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 text-white shrink-0" onClick={handleAddNew}>
              <span className="mr-2 text-lg leading-none">+</span> {t("common.add")}
            </Button>
          )}
        </div>

        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow className="hover:bg-slate-50/50">
              {columnVisibility.sn && (
                <TableHead className="w-16 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("common.sn")}</TableHead>
              )}
              {columnVisibility.name && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("property.propertyName")}</TableHead>
              )}
              {columnVisibility.propertyType && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("property.propertyType")}</TableHead>
              )}
              {columnVisibility.province && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">{t("property.province")}</TableHead>
              )}
              {(columnVisibility.landArea || columnVisibility.buildingArea) && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("property.area")}</TableHead>
              )}
              {columnVisibility.legalStatus && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("property.legalStatus")}</TableHead>
              )}
              {columnVisibility.usageName && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("property.usageName")}</TableHead>
              )}
              {columnVisibility.ownershipType && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3">{t("property.ownershipType")}</TableHead>
              )}
              {columnVisibility.actions && (
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2 w-24">{t("property.actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProperties.length > 0 ? (
              paginatedProperties.map((item, index) => (
                <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  {columnVisibility.sn && (
                    <TableCell className="text-center text-sm text-slate-500 font-medium py-2">
                      {(currentPage - 1) * entriesPerPage + index + 1}
                    </TableCell>
                  )}
                  {columnVisibility.name && (
                    <TableCell className="font-semibold text-slate-900 py-2">
                      {/* ── Clickable name → opens detail modal ── */}
                      <button
                        onClick={() => handleOpenDetails(item)}
                        className="text-blue-600 underline underline-offset-2 hover:text-blue-800 transition-colors text-left"
                      >
                        {item.name ?? "-"}
                      </button>
                    </TableCell>
                  )}
                  {columnVisibility.propertyType && (
                    <TableCell className="text-sm text-slate-600 py-2">{item.propertyType ?? "-"}</TableCell>
                  )}
                  {columnVisibility.province && (
                    <TableCell className="text-sm text-slate-600 py-4">{item.province ?? "-"}</TableCell>
                  )}
                  {(columnVisibility.landArea || columnVisibility.buildingArea) && (
                    <TableCell className="text-sm text-slate-600 py-2">{getAreaDisplay(item)}</TableCell>
                  )}
                  {columnVisibility.legalStatus && (
                    <TableCell className="text-sm text-slate-600 py-2">{item.legalStatus ?? "-"}</TableCell>
                  )}
                  {columnVisibility.usageName && (
                    <TableCell className="text-sm text-slate-600 py-2">{item.usageName ?? "-"}</TableCell>
                  )}
                  {columnVisibility.ownershipType && (
                    <TableCell className="text-sm text-slate-600 py-2">{item.ownershipType ?? "-"}</TableCell>
                  )}
                  {columnVisibility.actions && (
                    <TableCell className="py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm" variant="ghost"
                          className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => handleUpload(item.id)} title="Upload"
                        >
                          <Upload size={16} strokeWidth={2} />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => handleEdit(item.id)} title="Edit"
                        >
                          <Pencil size={16} strokeWidth={2} />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => confirmDelete(item)} title="Delete"
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
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PROPERTY DETAILS MODAL ─────────────────────────────────────────── */}
      {isDetailsModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{selectedProperty.name}</h2>
                  <p className="text-xs text-slate-500">ID: {selectedProperty.id} • {selectedProperty.propertyType}</p>
                </div>
              </div>
              <button
                onClick={closeDetailsModal}
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
              {/* Location */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                  <MapPin size={16} className="text-blue-500" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">{t("summaryReport.locationDetails", { defaultValue: "Location Details" })}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                  <DetailRow label={t("summaryReport.Province", { defaultValue: "Province" })} value={translateValue(selectedProperty.province)} />
                  <DetailRow label={t("summaryReport.district", { defaultValue: "District" })} value={translateValue(selectedProperty.district)} />
                  <DetailRow label={t("summaryReport.localBody", { defaultValue: "Local Body" })} value={translateValue(selectedProperty.localBody)} />
                  <DetailRow label={t("summaryReport.wardNo", { defaultValue: "Ward No" })} value={selectedProperty.wardNo} />
                  <DetailRow label={t("summaryReport.geographicRegion", { defaultValue: "Geographic Region" })} value={translateValue(selectedProperty.geographicRegion)} />
                  <DetailRow label={t("summaryReport.kittaNumber", { defaultValue: "Kitta Number" })} value={selectedProperty.kittaNumber} />
                </div>
              </div>

              {/* Area & Construction */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                  <LandPlot size={16} className="text-green-500" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">{t("summaryReport.areaConstruction", { defaultValue: "Area & Construction" })}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                  <DetailRow label={t("summaryReport.landArea", { defaultValue: "Land Area (sq.m)" })} value={selectedProperty.landArea} />
                  <DetailRow label={t("summaryReport.buildingArea", { defaultValue: "Building Area (sq.m)" })} value={selectedProperty.buildingArea} />
                  <DetailRow label={t("summaryReport.noOfFloors", { defaultValue: "No. of Floors" })} value={selectedProperty.noOfFloors} />
                  <DetailRow label={t("summaryReport.constructionYear", { defaultValue: "Construction Year" })} value={selectedProperty.constructionYear} />
                  <DetailRow
                    label={t("summaryReport.landCoordinates", { defaultValue: "Land Coordinates" })}
                    value={selectedProperty.land_Latitude && selectedProperty.land_Longitude
                      ? `${selectedProperty.land_Latitude}, ${selectedProperty.land_Longitude}`
                      : null}
                  />
                  <DetailRow
                    label={t("summaryReport.buildingCoordinates", { defaultValue: "Building Coordinates" })}
                    value={selectedProperty.building_Latitude && selectedProperty.building_Longitude
                      ? `${selectedProperty.building_Latitude}, ${selectedProperty.building_Longitude}`
                      : null}
                  />
                </div>
              </div>

              {/* Financial & Legal */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                  <Banknote size={16} className="text-amber-500" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">{t("summaryReport.financialLegal", { defaultValue: "Financial & Legal" })}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                  <DetailRow label={t("summaryReport.valuation", { defaultValue: "Valuation (NPR)" })} value={selectedProperty.valuation} />
                  <DetailRow label={t("summaryReport.taxAmount", { defaultValue: "Tax Amount (NPR)" })} value={selectedProperty.taxAmount} />
                  <DetailRow label={t("summaryReport.ownershipTransferDate", { defaultValue: "Ownership Transfer Date" })} value={selectedProperty.ownershipTransferDate} />
                  <DetailRow label={t("summaryReport.legalStatus", { defaultValue: "Legal Status" })} value={selectedProperty.legalStatus} badgeValue={translateValue(selectedProperty.legalStatus) as string} isBadge />
                </div>
              </div>

              {/* Classifications */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                  <Scale size={16} className="text-purple-500" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">{t("summaryReport.classifications", { defaultValue: "Classifications" })}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                  <DetailRow label={t("summaryReport.ownershipType", { defaultValue: "Ownership Type" })} value={translateValue(selectedProperty.ownershipType)} />
                  <DetailRow label={t("summaryReport.usageRight", { defaultValue: "Usage Right" })} value={translateValue(selectedProperty.usageRight)} />
                  <DetailRow label={t("summaryReport.usageName", { defaultValue: "Usage Name" })} value={translateValue(selectedProperty.usageName)} />
                </div>
              </div>

              {/* Description & Meta */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("summaryReport.description", { defaultValue: "Description" })}</span>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border min-h-[60px]">
                      {selectedProperty.description || "-"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <DetailRow label="Created Date" value={selectedProperty.createdDate?.split("T")[0]} />
                    <DetailRow label="Sheet Number" value={selectedProperty.sheetNumber} />
                  </div>
                </div>
              </div>

              {/* Documents */}
              {getDocuments(selectedProperty.document).length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-slate-700">
                    <FileText size={16} className="text-red-500" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Attached Documents</h3>
                  </div>
                  <div className="space-y-2">
                    {getDocuments(selectedProperty.document).map((doc) => (
                      <button
                        key={doc.Id}
                        onClick={() => handleViewDocumentById(doc.Id)}
                        disabled={isFileLoading}
                        className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors group text-left w-full disabled:opacity-60 disabled:cursor-wait"
                      >
                        <div className="bg-white p-2 rounded border border-slate-200 group-hover:border-blue-200">
                          {isFileLoading
                            ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            : <FileText size={16} className="text-slate-500 group-hover:text-blue-500" />
                          }
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">{doc.FileName}</span>
                        <Eye size={14} className="ml-auto text-slate-300 group-hover:text-blue-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── FILE VIEWER MODAL ──────────────────────────────────────────────── */}
      {isFileModalOpen && selectedFileUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden p-4">
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
            onClick={closeFileModal}
          />
          <div className="relative bg-white w-full max-w-6xl h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <span className="text-red-600 font-bold text-xs">PDF</span>
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-sm font-bold text-slate-800 truncate max-w-[200px] md:max-w-md">
                    {selectedFileUrl.split("/").pop()?.split("?")[0] || "Document Preview"}
                  </h3>
                  <p className="text-[10px] text-slate-400 italic font-medium">Secure Cloud Viewer</p>
                </div>
              </div>
              <button
                onClick={closeFileModal}
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-grow bg-slate-200 flex flex-col overflow-hidden relative">
              {selectedFileUrl.toLowerCase().includes(".pdf") ? (
                <div className="w-full h-full bg-white">
                  <object
                    data={selectedFileUrl}
                    type="application/pdf"
                    className="w-full h-full border-none shadow-inner"
                  >
                    <div className="flex flex-col items-center justify-center h-full p-4 text-slate-600 bg-slate-50">
                      <p className="mb-4 font-semibold text-sm">Your browser doesn't support embedded PDFs.</p>
                      <a
                        href={selectedFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow transition-all"
                      >
                        Open PDF in New Tab
                      </a>
                    </div>
                  </object>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 bg-slate-300 overflow-auto">
                  <img
                    src={selectedFileUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-xl bg-white p-1"
                    onError={(e) => { e.currentTarget.src = "https://placehold.co/600x400?text=Preview+Not+Available"; }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-2 bg-white border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={closeFileModal}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition"
              >
                Close
              </button>
              <div className="flex items-center gap-4">
                {(Role === "Admin" || Role === "admin") ? (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
                  >
                    <Download className="h-4 w-4" /> Download Document
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest italic">View Only Mode</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}