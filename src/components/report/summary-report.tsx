import { useState, useRef } from "react";
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
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    FileX,
    Settings2,
    Eye,
    Download,
    X,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
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
import axiosInstance from "@/config/axios";
import { useAuthStore } from "@/store/authStore";
import { jwtDecode } from "jwt-decode";

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
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-red-100 text-red-600 border border-red-200">{(displayText ?? legalStatus) || "-"}</span>;
    if (s.includes("encroach"))
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 border border-amber-200">{(displayText ?? legalStatus) || "-"}</span>;
    if (s.includes("verified & clear"))
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-green-100 text-green-600 border border-green-200">{(displayText ?? legalStatus) || "-"}</span>;
    if (s.includes("in registration") || s.includes("in-registration"))
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-600 border border-yellow-200">{(displayText ?? legalStatus) || "-"}</span>;
    return <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-green-100 text-green-600 border border-green-200">{(displayText ?? legalStatus) || "-"}</span>;
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

// function getLatestDocumentId(item: Property): number | null {
//     const docs = getDocuments(item.document);
//     if (docs.length === 0) return null;
//     return docs.reduce((max, doc) => (doc.Id > max.Id ? doc : max), docs[0]).Id;
// }

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function SummaryReport() {
    const { t, i18n } = useTranslation();
    const numberLocale = i18n.language?.startsWith("np") ? "ne-NP" : "en-US";
    const formatNumber = (value: number) => new Intl.NumberFormat(numberLocale).format(value);
    const translateValue = (value?: string | number | null) => {
        if (value === null || value === undefined || value === "") return "-";
        if (typeof value === "number") return formatNumber(value);
        return t(`fieldValues.${value}`, { defaultValue: value });
    };
    const { token } = useAuthStore();
    const decoded: any = (() => {
        if (!token) return {};
        try {
            return jwtDecode(token);
        } catch {
            return {};
        }
    })();
    const Role = decoded.Role || "User";

    const { items: propertyData, isLoadingItems } = useFetchAll<Property>("/api/property", ["property"]);
    const { delete: deleteProperty } = useMutate<Property>("/api/property", "property");

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "id", direction: "asc" });

    // ─── MODAL STATES ─────────────────────────────────────────────────────
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
    const [isFileLoading, setIsFileLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
        id: true, name: true, propertyType: true, province: true,
        landArea: true, buildingArea: true, legalStatus: true,
        usageName: true, ownershipType: true, actions: true,
    });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

    const columnLabelMap: Record<string, string> = {
        id: t("common.sn"),
        name: t("property.propertyName"),
        propertyType: t("property.propertyType"),
        province: t("property.province"),
        landArea: t("property.area"),
        buildingArea: t("property.area"),
        legalStatus: t("property.legalStatus"),
        usageName: t("property.usageName"),
        ownershipType: t("property.ownershipType"),
        actions: t("property.actions"),
    };

    const getAreaDisplay = (item: Property) => {
        const land = item.landArea;
        const building = item.buildingArea;
        if (land && building) return `${formatNumber(land)} ${t("summaryReport.sqmShort")} / ${formatNumber(building)} ${t("summaryReport.sqmShort")}`;
        if (land) return `${formatNumber(land)} ${t("summaryReport.sqmShort")}`;
        if (building) return `${formatNumber(building)} ${t("summaryReport.sqmShort")}`;
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

    const handleCancel = () => { setDeleteDialogOpen(false); setPropertyToDelete(null); };

    const filteredProperties = properties.filter((item) => {
        const s = searchTerm.toLowerCase();
        return (
            searchTerm === "" ||
            item.propertyType?.toLowerCase().includes(s) ||
            item.name?.toLowerCase().includes(s) ||
            item.legalStatus?.toLowerCase().includes(s) ||
            item.ownershipType?.toLowerCase().includes(s) ||
            item.usageName?.toLowerCase().includes(s) ||
            item.province?.toLowerCase().includes(s)
        );
    });

    const handleSort = (key: string) => {
        setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
        setCurrentPage(1);
    };

    const sortedProperties = [...filteredProperties].sort((a, b) => {
        if (sortConfig.key === "id") return sortConfig.direction === "asc" ? a.id - b.id : b.id - a.id;
        return 0;
    });

    const totalPages = Math.ceil(filteredProperties.length / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const paginatedProperties = sortedProperties.slice(startIndex, startIndex + entriesPerPage);
    const goToPage = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

    // ─── DETAILS MODAL ────────────────────────────────────────────────────
    const handleOpenDetails = (item: Property) => { setSelectedProperty(item); setIsDetailsModalOpen(true); };
    const closeDetailsModal = () => { setSelectedProperty(null); setIsDetailsModalOpen(false); };

    // ─── FILE VIEWER ──────────────────────────────────────────────────────
    interface ApiResponseViewFile { url: string; }

    const closeModal = () => { setIsModalOpen(false); setSelectedFileUrl(null); };

    const handleViewDocumentById = async (docId: number) => {
        if (!docId) return alert(t("summaryReport.noValidDocumentId"));
        setIsFileLoading(true);
        try {
            const response = await axiosInstance.get<ApiResponseViewFile>(`/api/view-document?id=${docId}`);
            if (response?.data?.url) {
                setSelectedFileUrl(response.data.url);
                setIsModalOpen(true);
            } else {
                alert(t("summaryReport.noFileUrlFound"));
            }
        } catch (error) {
            console.error(error);
            alert(t("summaryReport.failedToFetchFile"));
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
            a.download = selectedFileUrl.split("/").pop()?.split("?")[0] || t("summaryReport.documentFileName");
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch {
            window.open(selectedFileUrl, "_blank");
        }
    };

    const handleDelete = async () => {
        if (propertyToDelete?.id) {
            try {
                await deleteProperty.mutateAsync(propertyToDelete.id);
                toast.success(t("property.deleteSuccess"));
                setDeleteDialogOpen(false);
                setPropertyToDelete(null);
            } catch {
                toast.error(t("property.deleteError"));
            }
        }
    };

    if (isLoadingItems) {
        return (
            <div className="p-8 flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    const DetailRow = ({
        label,
        value,
        isBadge,
    }: {
        label: string;
        value: string | number | null | undefined;
        isBadge?: boolean;
    }) => (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
            <div className="min-h-[24px] flex items-center">
                {isBadge && value ? (
                    getStatusBadge(String(value), t(`fieldValues.${String(value)}`, { defaultValue: String(value) }))
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

    return (
        <div className="-mt-5 md:p-1 max-w-9xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-md font-bold text-slate-800 tracking-tight">{t("property.propertyInventory")}</h2>
            </div>

            {/* Table */}
            <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline" size="sm"
                            className="text-slate-500 border-slate-200 hover:bg-slate-50 p-2 h-9 w-9 shrink-0"
                            onClick={() => setSearchOpen(!searchOpen)}
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                        {searchOpen && (
                            <div className="relative w-full sm:w-80">
                                <Input
                                    ref={searchInputRef}
                                    type="search"
                                    placeholder={t("common.search")}
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
                                <DropdownMenuLabel>{t("summaryReport.toggleColumns")}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {Object.entries(columnVisibility).map(([key, visible]) => (
                                    <DropdownMenuCheckboxItem
                                        key={key}
                                        checked={visible}
                                        onCheckedChange={() => setColumnVisibility({ ...columnVisibility, [key]: !visible })}
                                    >
                                        {columnLabelMap[key] ?? key}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow className="hover:bg-slate-50/50">
                            {columnVisibility.id && (
                                <TableHead
                                    className="w-16 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2 cursor-pointer hover:text-slate-700 select-none"
                                    onClick={() => handleSort("id")}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        {t("common.sn")} {" "}
                                        {sortConfig.key === "id"
                                            ? sortConfig.direction === "asc"
                                                ? <ArrowUp className="w-3 h-3 text-blue-600" />
                                                : <ArrowDown className="w-3 h-3 text-blue-600" />
                                            : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                                    </div>
                                </TableHead>
                            )}
                            {columnVisibility.name && <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("property.propertyName")}</TableHead>}
                            {columnVisibility.propertyType && <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("property.propertyType")}</TableHead>}
                            {columnVisibility.province && <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">{t("property.province")}</TableHead>}
                            {(columnVisibility.landArea || columnVisibility.buildingArea) && <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("property.area")}</TableHead>}
                            {columnVisibility.legalStatus && <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("property.legalStatus")}</TableHead>}
                            {columnVisibility.usageName && <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">{t("property.usageName")}</TableHead>}
                            {columnVisibility.ownershipType && <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3">{t("property.ownershipType")}</TableHead>}
                            {/* {columnVisibility.actions && <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2 w-24">{t("property.actions")}</TableHead>} */}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedProperties.length > 0 ? (
                            paginatedProperties.map((item) => (
                                <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    {columnVisibility.id && <TableCell className="text-center text-sm text-slate-500 font-medium py-2">{item.id}</TableCell>}
                                    {columnVisibility.name && (
                                        <TableCell className="font-semibold text-slate-900 py-2">
                                            <button
                                                onClick={() => handleOpenDetails(item)}
                                                className="text-blue-600 underline underline-offset-2 transition-colors text-left"
                                            >
                                                {item.name ?? "-"}
                                            </button>
                                        </TableCell>
                                    )}
                                    {columnVisibility.propertyType && <TableCell className="text-sm text-slate-600 py-2">{translateValue(item.propertyType)}</TableCell>}
                                    {columnVisibility.province && <TableCell className="text-sm text-slate-600 py-4">{translateValue(item.province)}</TableCell>}
                                    {(columnVisibility.landArea || columnVisibility.buildingArea) && <TableCell className="text-sm text-slate-600 py-2">{getAreaDisplay(item)}</TableCell>}
                                    {columnVisibility.legalStatus && <TableCell className="text-sm text-slate-600 py-2">{getStatusBadge(item.legalStatus ?? "", translateValue(item.legalStatus) as string)}</TableCell>}
                                    {columnVisibility.usageName && <TableCell className="text-sm text-slate-600 py-2">{translateValue(item.usageName)}</TableCell>}
                                    {columnVisibility.ownershipType && <TableCell className="text-sm text-slate-600 py-2">{translateValue(item.ownershipType)}</TableCell>}
                                    {/* {columnVisibility.actions && (
                                        <TableCell className="py-2">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                                                    onClick={() => {
                                                        const latestDocId = getLatestDocumentId(item);
                                                        if (latestDocId) handleViewDocumentById(latestDocId);
                                                        else alert(t("summaryReport.noDocumentsAttached"));
                                                    }}
                                                    title={t("summaryReport.viewLatestDocument")}
                                                >
                                                    <Eye size={16} strokeWidth={2} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )} */}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={Object.values(columnVisibility).filter(Boolean).length + 1} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <FileX className="w-12 h-12 mb-3 opacity-50" />
                                        <p className="text-sm font-medium">{t("property.noPropertiesFound")}</p>
                                        <p className="text-xs mt-1">{t("property.tryAdjustingYourSearchOrFilters")}</p>
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
                    {t("summaryReport.showing")} {" "}
                    <span className="font-medium text-slate-900">{formatNumber(filteredProperties.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1)}</span>
                    {" "}{t("summaryReport.to")} {" "}
                    <span className="font-medium text-slate-900">{formatNumber(Math.min(currentPage * entriesPerPage, filteredProperties.length))}</span>
                    {" "}{t("summaryReport.of")} {" "}
                    <span className="font-medium text-slate-900">{formatNumber(filteredProperties.length)}</span> {t("summaryReport.results")}
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-slate-700">{t("summaryReport.rowsPerPage")}</p>
                        <Select value={entriesPerPage.toString()} onValueChange={(v) => { setEntriesPerPage(Number(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={entriesPerPage} /></SelectTrigger>
                            <SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={formatNumber(entriesPerPage)} /></SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((size) => <SelectItem key={size} value={size.toString()}>{formatNumber(size)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="flex w-[100px] items-center justify-center text-sm font-medium text-slate-700">
                            {t("summaryReport.pageOf", { page: formatNumber(currentPage), totalPages: formatNumber(totalPages) })}
                        </div>
                                                            {columnVisibility.id && <TableCell className="text-center text-sm text-slate-500 font-medium py-2">{formatNumber(item.id)}</TableCell>}
                                                            <p className="text-xs text-slate-500">{t("summaryReport.id")}: {formatNumber(selectedProperty.id)} • {translateValue(selectedProperty.propertyType)}</p>
                        <div className="flex items-center space-x-1">
                            <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => goToPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
                            <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}><ChevronsRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Dialog */}
            {deleteDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-slate-900">{t("summaryReport.deleteProperty")}</h3>
                        <p className="mt-2 text-sm text-slate-500">{t("summaryReport.deletePropertyMessage")}</p>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={handleCancel}>{t("common.cancel")}</Button>
                            <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── PROPERTY DETAILS MODAL ───────────────────────────────────────── */}
            {isDetailsModalOpen && selectedProperty && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Building2 size={20} /></div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">{selectedProperty.name}</h2>
                                    <p className="text-xs text-slate-500">{t("summaryReport.id")}: {selectedProperty.id} • {translateValue(selectedProperty.propertyType)}</p>
                                </div>
                            </div>
                            <button onClick={closeDetailsModal} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
                            {/* Location */}
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-4 text-slate-700">
                                    <MapPin size={16} className="text-blue-500" />
                                    <h3 className="font-bold text-sm uppercase tracking-wider">{t('summaryReport.locationDetails')}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                                    <DetailRow label={t("summaryReport.province", { defaultValue: "Province" })} value={translateValue(selectedProperty.province)} />
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
                                    <DetailRow label={t("summaryReport.landCoordinates", { defaultValue: "Land Coordinates" })} value={selectedProperty.land_Latitude && selectedProperty.land_Longitude ? `${selectedProperty.land_Latitude}, ${selectedProperty.land_Longitude}` : null} />
                                    <DetailRow label={t("summaryReport.buildingCoordinates", { defaultValue: "Building Coordinates" })} value={selectedProperty.building_Latitude && selectedProperty.building_Longitude ? `${selectedProperty.building_Latitude}, ${selectedProperty.building_Longitude}` : null} />
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
                                    <DetailRow label={t("summaryReport.legalStatus", { defaultValue: "Legal Status" })} value={selectedProperty.legalStatus} isBadge />
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

                            {/* Description & meta */}
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("summaryReport.description", { defaultValue: "Description" })}</span>
                                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border min-h-[60px]">{selectedProperty.description || "-"}</p>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <DetailRow label={t("summaryReport.createdDate", { defaultValue: "Created Date" })} value={selectedProperty.createdDate?.split("T")[0]} />
                                        <DetailRow label={t("summaryReport.sheetNumber", { defaultValue: "Sheet Number" })} value={selectedProperty.sheetNumber} />
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            {getDocuments(selectedProperty.document).length > 0 && (
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 text-slate-700">
                                        <FileText size={16} className="text-red-500" />
                                        <h3 className="font-bold text-sm uppercase tracking-wider">{t("summaryReport.attachedDocuments")}</h3>
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

            {/* ─── FILE VIEWER MODAL ────────────────────────────────────────────── */}
            {isModalOpen && selectedFileUrl && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
                        onClick={closeModal}
                    />
                    <div className="relative bg-white w-full max-w-6xl h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-100 p-2 rounded-lg">
                                    <span className="text-red-600 font-bold text-xs">{t("summaryReport.pdfBadge")}</span>
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="text-sm font-bold text-slate-800 truncate max-w-[200px] md:max-w-md">
                                        {selectedFileUrl.split("/").pop()?.split("?")[0] || t("summaryReport.documentPreview")}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 italic font-medium">{t("summaryReport.secureCloudViewer")}</p>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
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
                                            <p className="mb-4 font-semibold text-sm">
                                                {t("summaryReport.pdfNotSupported")}
                                            </p>
                                            <a
                                                href={selectedFileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow transition-all"
                                            >
                                                {t("summaryReport.openPdfInNewTab")}
                                            </a>
                                        </div>
                                    </object>
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center p-4 bg-slate-300 overflow-auto">
                                        <img
                                            src={selectedFileUrl}
                                            alt={t("summaryReport.previewAlt")}
                                            className="max-w-full max-h-full object-contain rounded-lg shadow-xl bg-white p-1"
                                            onError={(e) => { e.currentTarget.src = `https://placehold.co/600x400?text=${encodeURIComponent(t("summaryReport.previewNotAvailable"))}`; }}
                                        />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-2 bg-white border-t border-gray-100 flex justify-between items-center">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition"
                            >
                                {t("common.close")}
                            </button>
                            <div className="flex items-center gap-4">
                                {Role === "Admin" ? (
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                    >
                                        <Download className="h-4 w-4" /> {t("summaryReport.downloadDocument")}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                                        <span className="text-[10px] font-bold uppercase tracking-widest italic">{t("summaryReport.viewOnlyMode")}</span>
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