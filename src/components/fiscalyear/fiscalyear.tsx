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
  CirclePower,
  FileX,
  CheckCircle2,
  Clock,
  XCircle,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useMutate } from "@/hooks/useMutate";
import FiscalyearForm from "./fiscalyear-form";
import type { FiscalYear } from "@/type/fiscalyear";
import { useTranslation } from "react-i18next";
import { t } from "i18next";

// Helper Component for Status Badges
const StatusBadge: React.FC<{ status: number; isActive?: boolean }> = ({ status, isActive }) => {
  const { t } = useTranslation();
  const variants: Record<number, { label: string; className: string; icon: React.ReactNode }> = {
    2: { label: t("fiscalYear.pending"), className: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3 mr-1" /> },
    3: { label: "Closed", className: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3 h-3 mr-1" /> },
  };

  if (isActive) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-100 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="w-3 h-3 mr-1" />
      </span>
    );
  }

  if (status === 2 || status === 3) {
    const config = variants[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  }

  return null;
};

export default function FiscalyearList() {
  const { items: fyData, isLoadingItems } = useFetchAll<FiscalYear>("/api/fiscalyear", ["fiscalyear"]);
  const { delete: deleteFy } = useMutate<FiscalYear>("/api/fiscalyear", "fiscalyear");
  const { update } = useMutate<FiscalYear>("/api/changefiscalyear", "fiscalyear");

  const [fyToActive, setFyToActive] = useState<FiscalYear | null>(null);

  function getfiscalYears(data: any): FiscalYear[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const nestedData = data.data || data.Data;
    if (Array.isArray(nestedData)) return nestedData;
    return [];
  }

  const fiscalYears = getfiscalYears(fyData);

  const [editingFy, setEditingFy] = useState<FiscalYear | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [sortConfig, setSortConfig] = useState<{
    key: keyof FiscalYear;
    direction: "ascending" | "descending";
  } | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeDialogOpen, setActiveDialogOpen] = useState(false);
  const [fyToDelete, setFyToDelete] = useState<FiscalYear | null>(null);

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    sn: true,
    fiscalYear: true,
    status: true,
    startMiti: true,
    endMiti: true,
    actions: true,
  });

  const handleEdit = (id: number) => {
    const item = fiscalYears.find((v) => v.id === id);
    if (item) setEditingFy(item);
  };

  const handleAddNew = () => setIsAddingNew(true);

  function sortFiscalYears<T extends Record<string, any>>(
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
        return sortConfig.direction === "ascending" ? aValue - bValue : bValue - aValue;
      }
      if (typeof aValue === "boolean" && typeof bValue === "boolean") {
        return sortConfig.direction === "ascending"
          ? (aValue === bValue ? 0 : aValue ? 1 : -1)
          : (aValue === bValue ? 0 : aValue ? -1 : 1);
      }
      return 0;
    });
    return sortableItems;
  }

  const sortedFiscalYears = sortFiscalYears(fiscalYears, sortConfig);

  const filteredFiscalYears = sortedFiscalYears.filter((item) => {
    return searchTerm === "" ||
      (item.fiscalYear && item.fiscalYear.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const totalPages = Math.ceil(filteredFiscalYears.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedFiscalYears = filteredFiscalYears.slice(startIndex, startIndex + entriesPerPage);

  const requestSort = (key: keyof FiscalYear) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof FiscalYear) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? (
      <ChevronUp className="inline h-3 w-3 ml-1 text-slate-400" />
    ) : (
      <ChevronDown className="inline h-3 w-3 ml-1 text-slate-400" />
    );
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const confirmDelete = (item: FiscalYear) => {
    setFyToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmActive = (item: FiscalYear) => {
    setFyToActive(item);
    setActiveDialogOpen(true);
  };

  const handleActive = () => {
    if (!fyToActive || !fyToActive.id) return;
    update.mutate({
      id: fyToActive.id,
      fiscalYear: fyToActive.fiscalYear
    } as unknown as FiscalYear, {
      onSuccess: () => {
        toast.success(`Fiscal Year ${fyToActive.fiscalYear} is now active ✅`, {
          style: { background: "#10b981", color: "white" },
        });
        setActiveDialogOpen(false);
        setFyToActive(null);
      },
      onError: () => toast.error("Failed to activate Fiscal Year ❌"),
    });
  };

  const handleDelete = async () => {
    if (fyToDelete && fyToDelete.id) {
      try {
        await deleteFy.mutateAsync(fyToDelete.id);
        toast.success("Fiscal Year deleted successfully ✅");
        setDeleteDialogOpen(false);
        setFyToDelete(null);
      } catch (err) {
        toast.error("Failed to delete fiscal year");
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

  const MobileFiscalyearCard = ({ item }: { item: FiscalYear }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-slate-900">{item.fiscalYear}</h3>
          <div className="mt-2 flex gap-2">
            <StatusBadge status={item.status} isActive={!!item.isActive} />
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-3 mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">{t("fiscalYear.startMiti")}</span>
          <span className="text-sm font-medium text-slate-700">{item.startMiti || "-"}</span>
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">{t("fiscalYear.endMiti")}</span>
          <span className="text-sm font-medium text-slate-700">{item.endMiti || "-"}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50 h-9 w-9 p-0" onClick={() => confirmActive(item)} title={t("fiscalYear.activate")}>
          <CirclePower size={18} />
        </Button>
        <Button size="sm" variant="ghost" className="text-slate-600 hover:bg-slate-100 h-9 w-9 p-0" onClick={() => handleEdit(item.id!)} title={t("common.edit")}>
          <Pencil size={18} />
        </Button>
        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 h-9 w-9 p-0" onClick={() => confirmDelete(item)} title={t("common.delete")}>
          <Trash size={18} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="-mt-5 md:p-1 max-w-9xl mx-auto space-y-3">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t("fiscalYear.fiscalYearList")}</h2>

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
            <span className="mr-2 text-lg leading-none">+</span> {t("fiscalYear.addFiscalYear")}
          </Button>
        </div>
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow className="hover:bg-slate-50/50">
              {columnVisibility.sn && (
                <TableHead className="w-16 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3">{t("common.sn")}</TableHead>
              )}
              {columnVisibility.fiscalYear && (
                <TableHead className="cursor-pointer text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2 hover:text-slate-700 transition-colors" onClick={() => requestSort("fiscalYear")}>
                  {t("sidebar.fiscalYear")} {getSortIndicator("fiscalYear")}
                </TableHead>
              )}
              {columnVisibility.startMiti && (
                <TableHead className="cursor-pointer text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2 hover:text-slate-700 transition-colors" onClick={() => requestSort("startMiti")}>
                  {t("fiscalYear.startMiti")} {getSortIndicator("startMiti")}
                </TableHead>
              )}
              {columnVisibility.endMiti && (
                <TableHead className="cursor-pointer text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2 hover:text-slate-700 transition-colors" onClick={() => requestSort("endMiti")}>
                  {t("fiscalYear.endMiti")} {getSortIndicator("endMiti")}
                </TableHead>
              )}

              {columnVisibility.actions && (
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2 w-24">{t("common.action")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedFiscalYears.length > 0 ? (
              paginatedFiscalYears.map((item, index) => (
                <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  {columnVisibility.sn && (
                    <TableCell className="text-center text-sm text-slate-500 font-medium">
                      {(currentPage - 1) * entriesPerPage + index + 1}
                    </TableCell>
                  )}
                  {columnVisibility.fiscalYear && (
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.fiscalYear}</span>
                        <StatusBadge status={item.status} isActive={!!item.isActive} />
                      </div>
                    </TableCell>
                  )}
                  {columnVisibility.startMiti && (
                    <TableCell className="text-sm text-slate-600 py-2">{item.startMiti ?? "-"}</TableCell>
                  )}
                  {columnVisibility.endMiti && (
                    <TableCell className="text-sm text-slate-600 py-2">{item.endMiti ?? "-"}</TableCell>
                  )}
                  {columnVisibility.actions && (
                    <TableCell className="py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.isActive ? (
                          <div className="h-8 w-8 flex items-center justify-center text-green-600" title={t("fiscalYear.active")}>
                            <CheckCircle2 size={16} strokeWidth={2.5} />
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => confirmActive(item)} title={t("fiscalYear.activate")}>
                            <CirclePower size={16} strokeWidth={2.5} />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => handleEdit(item.id!)} title={t("common.edit")}>
                          <Pencil size={16} strokeWidth={2} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => confirmDelete(item)} title={t("common.delete")}>
                          <Trash size={16} strokeWidth={2} />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={Object.values(columnVisibility).filter(Boolean).length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <FileX className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm font-medium">{t("fiscalYear.noFiscalYearsFound")}</p>
                    <p className="text-xs mt-1">{t("fiscalYear.tryAdjustingSearchOrFilters")}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {paginatedFiscalYears.length > 0 ? (
          paginatedFiscalYears.map((item) => (
            <MobileFiscalyearCard key={item.id} item={item} />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <FileX className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">{t("fiscalYear.noFiscalYearsFound")}</p>
            <p className="text-xs mt-1">{t("fiscalYear.tryAdjustingSearchOrFilters")}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="hidden sm:flex items-center justify-between px-2 pt-4">
        <div className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-900">
            {filteredFiscalYears.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}
          </span> to <span className="font-medium text-slate-900">
            {Math.min(currentPage * entriesPerPage, filteredFiscalYears.length)}
          </span> of <span className="font-medium text-slate-900">{filteredFiscalYears.length}</span> results
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{t("fiscalYear.deleteFiscalYear")}</DialogTitle>
            <DialogDescription className="text-slate-500 pt-2">
              {t("fiscalYear.sureYouWantToDelete")} <strong className="text-slate-800">{fyToDelete?.fiscalYear}</strong>? {t("fiscalYear.thisActionCannotBeUndone")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Confirmation Dialog */}
      <Dialog open={activeDialogOpen} onOpenChange={setActiveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{t("fiscalYear.activateFiscalYear")}</DialogTitle>
            <DialogDescription className="text-slate-500 pt-2">
              {t("fiscalYear.sureYouWantToActivate")} <strong className="text-slate-800">{fyToActive?.fiscalYear}</strong> {t("fiscalYear.asTheCurrentActiveFiscalYear")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setActiveDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="outline" onClick={handleActive}>{t("fiscalYear.activate")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editingFy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg animate-in zoom-in-95 duration-200">
            <FiscalyearForm mode="edit" initialData={editingFy} onSuccess={() => setEditingFy(null)} onCancel={() => setEditingFy(null)} />
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg animate-in zoom-in-95 duration-200">
            <FiscalyearForm mode="add" onSuccess={() => setIsAddingNew(false)} onCancel={() => setIsAddingNew(false)} />
          </div>
        </div>
      )}
    </div>
  );
}