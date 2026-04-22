import { useState, useRef, useEffect } from "react";
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
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileX,
  Eye,
  Settings2,
  Download,
  X,
  Plus,
  PencilLine,
} from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import axiosInstance from "@/config/axios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { FiscalYear } from "@/type/fiscalyear";
import type { Payment } from "@/type/payment";
import { useAuthStore } from "@/store/authStore";
import { jwtDecode } from "jwt-decode";
import TaxPaymentForm from "./tax-payment-form";


export default function PaymentList() {
  const navigate = useNavigate();
  
  // --- Auth Logic for Modal Download Button ---
  const {token} = useAuthStore();
  const decoded: any = token ? jwtDecode(token) : {};
  const Role = decoded.Role || "User"; 

  // --- Local State for Fiscal Year ---
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<number | undefined>(undefined);
  
  // --- Property Payment Popup State ---
  const [propertyPopupOpen, setPropertyPopupOpen] = useState(false);
  const [propertyPopupData, setPropertyPopupData] = useState<Payment[]>([]);
  const [propertyPopupLoading, setPropertyPopupLoading] = useState(false);
  const [popupPropertyName, setPopupPropertyName] = useState("");
  
  // --- File View/Modal State ---
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Edit Modal State ---
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // Fetch Fiscal Years Locally
  const { items: fyData, isLoadingItems: isLoadingFy } = useFetchAll<FiscalYear>("/api/fiscalyear", ["fiscalyear"]);

  // Helper to normalize Fiscal Year data
  function getFiscalYears(data: any): FiscalYear[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const nestedData = data.data || data.Data;
    if (Array.isArray(nestedData)) return nestedData;
    return [];
  }

  // --- Effects for Fiscal Years ---
  useEffect(() => {
    const years = getFiscalYears(fyData);
    setFiscalYears(years);
  }, [fyData]);

  useEffect(() => {
    if (fiscalYears.length > 0 && !selectedFiscalYearId) {
      const activeFy = fiscalYears.find((fy) => fy.isActive === true);
      if (activeFy) {
        setSelectedFiscalYearId(activeFy.id);
      } else {
        setSelectedFiscalYearId(fiscalYears[0]?.id);
      }
    }
  }, [fiscalYears, selectedFiscalYearId]);

  // --- Payments Fetching ---
  const { items: paymentData, isLoadingItems } = useFetchAll<Payment>(
    selectedFiscalYearId ? `/api/paymentStatus?fiscalYearId=${selectedFiscalYearId}` : "/api/paymentStatus",
    selectedFiscalYearId ? ["paymentStatus", selectedFiscalYearId] : ["paymentStatus"]
  );

  const handlePropertyClick = async (propertyId: number, propertyName: string) => {
    setPropertyPopupLoading(true);
    setPropertyPopupOpen(true);
    setPopupPropertyName(propertyName);
    try {
      const response = await axiosInstance.get(`/api/payment?propertyId=${propertyId}`);
      const data = response.data;
      const arr = Array.isArray(data) ? data : data.data || [];
      setPropertyPopupData(getPayment(arr));
    } catch (error) {
      console.error("Error fetching property payments:", error);
      setPropertyPopupData([]);
    } finally {
      setPropertyPopupLoading(false);
    }
  };

  // Helper to normalize Payment data
  function getPayment(data: any): Payment[] {
    if (!data) return [];
    
    let arr: any[] = [];
    if (Array.isArray(data)) {
      arr = data;
    } else if (data.data && Array.isArray(data.data)) {
      arr = data.data;
    } else if (data.Data && Array.isArray(data.Data)) {
      arr = data.Data;
    } else {
      return [];
    }

    const normalized = arr.map((item: any) => {
      const normalizedId = item.id ?? item.Id ?? item.taxId ?? item.TaxId ?? item.paymentId ?? item.PaymentId;
      return {
        ...item,
        id: normalizedId,
        taxRecordId: item.taxRecordId ?? item.TaxRecordId ?? item.taxrecordid ?? normalizedId,
        amountPaid: item.amountPaid ?? item.amount ?? item.Amount,
        propertyId: item.propertyId ?? item.PropertyId,
        property: item.property ?? item.Property,
        receiptNo: item.receiptNo ?? item.ReceiptNo,
        paymentMiti: item.paymentMiti ?? item.PaymentMiti,
        isPaid: item.isPaid ?? item.IsPaid,
      };
    });
    
    return normalized as Payment[];
  }

  const payments = getPayment(paymentData);

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pagination State
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // --- Tab State ---
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "unpaid">("all");

  // Column Visibility State
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    sn: true,
    property: true,
    receiptNo: true,
    amountPaid: true,
    paymentMiti: true,
    file: true,
    status: true,
  });

  const handleSearch = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };


  const handleAddNew = () => {
    navigate("/tax-payer/add");
  };

  const handleFiscalYearChange = (val: string) => {
    const id = Number(val);
    setSelectedFiscalYearId(id);
    setCurrentPage(1); 
  };

  // --- View File Logic ---
  interface ApiResponseViewFile {
    url: string;
  }

  const handleViewFile = async (taxRecordId: number) => {
    if (!taxRecordId) {
      console.error("Invalid taxRecordId provided:", taxRecordId);
      alert("Cannot view file: Invalid record ID");
      return;
    }
    try {
      const response = await axiosInstance.get<ApiResponseViewFile>(`/api/view-receipt?id=${taxRecordId}`);
      if (response?.data?.url) {
        setSelectedFileUrl(response.data.url);
        setIsModalOpen(true);
      } else {
        alert("No file URL found for this record.");
      }
    } catch (error) {
      console.error("Error fetching file URL:", error);
      alert("Failed to fetch file. Please try again.");
    }
  };

  // --- Download Logic ---
  const handleDownload = async () => {
    if (!selectedFileUrl) return;
  
    try {
      const response = await fetch(selectedFileUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const fileName = selectedFileUrl.split('/').pop()?.split('?')[0] || 'document.pdf';
      a.download = fileName;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download Error:", error);
      window.open(selectedFileUrl, '_blank');
    }
  };

  // const closeFileModal = () => {
  //   setIsModalOpen(false);
  //   setSelectedFileUrl(null);
  // };

  // Filter Logic
  const filteredpayments = payments.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      const amountStr = item.amountPaid ? item.amountPaid.toString() : "";
      
      const statusMatch =
        activeTab === "all" ||
        (activeTab === "paid" && (item.isPaid === 1 || item.isPaid === 1)) ||
        (activeTab === "unpaid" && item.isPaid !== 1 && item.isPaid !== 1);

      const searchMatch =
        searchTerm === "" ||
        (item.property && typeof item.property === 'string' && item.property.toLowerCase().includes(searchLower)) ||
        (item.receiptNo && item.receiptNo.toLowerCase().includes(searchLower)) ||
        amountStr.includes(searchLower);

      return statusMatch && searchMatch;
    });

  const totalPages = Math.ceil(filteredpayments.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedpayments = filteredpayments.slice(startIndex, startIndex + entriesPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (isLoadingFy || isLoadingItems) {
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
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Payment Status</h2>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="flex gap-2 p-1 bg-white border-b border-slate-200">
        <button
          onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
          className={`px-6 py-2 text-sm font-medium transition-colors rounded-t-lg ${
            activeTab === "all" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          All
        </button>
        <button
          onClick={() => { setActiveTab("paid"); setCurrentPage(1); }}
          className={`px-6 py-2 text-sm font-medium transition-colors rounded-t-lg ${
            activeTab === "paid" ? "bg-green-600 text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Paid
        </button>
        <button
          onClick={() => { setActiveTab("unpaid"); setCurrentPage(1); }}
          className={`px-6 py-2 text-sm font-medium transition-colors rounded-t-lg ${
            activeTab === "unpaid" ? "bg-red-600 text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Unpaid
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 sm:flex-none items-center gap-3 w-full">
          {/* Fiscal Year Selector */}
          <div className="w-full sm:w-48 shrink-0">
             <Select value={selectedFiscalYearId?.toString()} onValueChange={handleFiscalYearChange}>
              <SelectTrigger className="h-9 w-full bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select Fiscal Year" />
              </SelectTrigger>
              <SelectContent>
                {fiscalYears.map((fy) => (
                  <SelectItem key={fy.id} value={fy.id?.toString() ?? ""}>
                    {fy.fiscalYear}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="outline" 
            size="sm"
            className="text-slate-500 border-slate-200 hover:bg-slate-50 p-2 h-9 w-9 shrink-0"
            onClick={() => {
              setSearchOpen(!searchOpen);
              if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
          >
            <Search className="h-4 w-4" />
          </Button>
          
          {searchOpen && (
            <div className="relative w-full sm:w-80">
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search payments..."
                className="pl-3 w-full bg-slate-50 border-2 focus:bg-white focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
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

          <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 text-white shrink-0 w-full sm:w-auto ml-auto" onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" /> Add Payment
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow className="hover:bg-slate-50/50">
              {columnVisibility.sn && (
                <TableHead className="w-16 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3">S.N.</TableHead>
              )}
              {columnVisibility.property && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">Property Name</TableHead>
              )}
              {columnVisibility.receiptNo && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">Receipt No</TableHead>
              )}
{columnVisibility.amountPaid && (
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">Amount Paid</TableHead>
                )}
              {columnVisibility.paymentMiti && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">Payment Date</TableHead>
              )}
              {columnVisibility.status && (
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">Status</TableHead>
              )}
{columnVisibility.file && (
                  <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">Receipt</TableHead>
                )}
             </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedpayments.length > 0 ? (
              paginatedpayments.map((item, index) => (
                <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  {columnVisibility.sn && (
                    <TableCell className="text-center text-sm text-slate-500 font-medium py-2">
                      {(currentPage - 1) * entriesPerPage + index + 1}
                    </TableCell>
                  )}
                  {columnVisibility.property && (
                    <TableCell 
                      className="font-semibold text-slate-900 py-2 cursor-pointer hover:text-blue-600 hover:underline"
                      onClick={() => item.propertyId && handlePropertyClick(item.propertyId, item.property)}
                      title="Click to view payment history"
                    >
                      {item.property ?? "-"}
                    </TableCell>
                  )}
                  {columnVisibility.receiptNo && (
                    <TableCell className="text-sm text-slate-600 py-2">
                      {item.receiptNo ?? "-"}
                    </TableCell>
                  )}
                  {columnVisibility.amountPaid && (
                    <TableCell className="text-sm text-slate-600 font-medium py-2">
                      {item.amountPaid ? `Rs. ${Number(item.amountPaid).toLocaleString()}` : "-"}
                    </TableCell>
                  )}
                  {columnVisibility.paymentMiti && (
                    <TableCell className="text-sm text-slate-600 py-2">
                      {item.paymentMiti ?? "-"}
                    </TableCell>
                  )}
                  {columnVisibility.status && (
                    <TableCell className="text-center text-sm font-semibold py-2">
                      {item.isPaid === 1 || item.isPaid === 1 ? (
                        <span className="text-green-600">Paid</span>
                      ) : (
                        <span className="text-red-600">Unpaid</span>
                      )}
                    </TableCell>
                  )}
                  
{columnVisibility.file && (
                      <TableCell className="text-center text-sm font-semibold py-2">
                        {item.isPaid === 1 || item.isPaid === 1 ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                            onClick={() => handleViewFile(item.taxRecordId)}
                            title="View Receipt"
                          >
                            <Eye size={16} strokeWidth={2} />
                          </Button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={Object.values(columnVisibility).filter(Boolean).length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <FileX className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm font-medium">No payments found.</p>
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
            {filteredpayments.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}
          </span> to <span className="font-medium text-slate-900">
            {Math.min(currentPage * entriesPerPage, filteredpayments.length)}
          </span> of <span className="font-medium text-slate-900">{filteredpayments.length}</span> results
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
              Page {currentPage} of {totalPages || 1}
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
      
      {/* --- POPUP MODAL (File Viewer) --- */}
      {isModalOpen && selectedFileUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4">
          <div 
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
            onClick={() => { setIsModalOpen(false); setSelectedFileUrl(null); }}
          ></div>

          <div className="relative bg-white w-full max-w-6xl h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <span className="text-red-600 font-bold text-xs">PDF</span>
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-sm font-bold text-slate-800 truncate max-w-[200px] md:max-w-md">
                    {selectedFileUrl.split('/').pop()?.split('?')[0] || "Document Preview"}
                  </h3>
                  <p className="text-[10px] text-slate-400 italic font-medium">Secure Cloud Viewer</p>
                </div>
              </div>
              
              <button 
                onClick={() => { setIsModalOpen(false); setSelectedFileUrl(null); }}
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-grow bg-slate-200 flex flex-col overflow-hidden relative">
              {selectedFileUrl.toLowerCase().includes('.pdf') ? (
                <div className="w-full h-full">
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedFileUrl)}&embedded=true`}
                    className="absolute w-full h-[calc(100%+65px)] -top-[65px] left-0 border-none"
                    title="Secure PDF Viewer"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 bg-slate-300 overflow-auto">
                  <img 
                    src={selectedFileUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-xl bg-white p-1"
                    onError={(e) => {
                      e.currentTarget.src = "https://placehold.co/600x400?text=Preview+Not+Available";
                    }}
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-2 bg-white border-t border-gray-100 flex justify-between items-center">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition"
              >
                Close
              </button>

              <div className="flex items-center gap-4">
                {Role === 'Admin' ? (
                  <button 
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
                  >
                    <Download className="h-4 w-4" />
                    Download Document
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

      {/* --- PROPERTY PAYMENT POPUP --- */}
      {propertyPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Payment History</h3>
                <p className="text-sm text-slate-500">{popupPropertyName}</p>
              </div>
              <button 
                onClick={() => setPropertyPopupOpen(false)}
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-grow overflow-auto p-4">
              {propertyPopupLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : propertyPopupData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-slate-50/50">
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase">Receipt No</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase">Amount</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase">Payment Date</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase">Status</TableHead>
                      <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propertyPopupData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.receiptNo ?? "-"}</TableCell>
                        <TableCell>{item.amountPaid ? `Rs. ${Number(item.amountPaid).toLocaleString()}` : "-"}</TableCell>
                        <TableCell>{item.paymentMiti ?? "-"}</TableCell>
                        <TableCell>
                          <span className="text-green-600 font-bold">Paid</span>
                        </TableCell>
                        <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                              onClick={() => handleViewFile(item.taxRecordId)}
                              title="View Receipt"
                            >
                              <Eye size={16} strokeWidth={2} />
                            </Button>

                          
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <FileX className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm font-medium">No payment records found</p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-3 border-t border-gray-200 bg-slate-50 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setPropertyPopupOpen(false)}
                className="px-4 py-2"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg animate-in zoom-in-95 duration-200">
            <TaxPaymentForm 
              mode="edit" 
              initialData={editingPayment} 
              onSuccess={() => setEditingPayment(null)} 
              onCancel={() => setEditingPayment(null)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}