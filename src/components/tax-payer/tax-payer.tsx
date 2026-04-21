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
  Eye, // Added Eye icon for View Receipt
  Settings2,
  Download,
} from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useFiscalYear } from "@/context/FiscalYearContext";
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

export default function PaymentList() {
  const navigate = useNavigate();
  
  // --- Local State for Fiscal Year ---
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<number | undefined>(undefined);
  
  // --- NEW: File View/Modal State ---
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      // Auto-select active fiscal year
      const activeFy = fiscalYears.find((fy) => fy.isActive === true || fy.isActive === 1);
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

  // Helper to normalize Payment data
  function getPayment(data: any): Payment[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const nestedData = data.data || data.Data;
    if (Array.isArray(nestedData)) return nestedData;
    return [];
  }

  const payments = getPayment(paymentData);

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pagination State
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // --- NEW: Tab State ---
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "unpaid">("all");

  // Column Visibility State
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    sn: true,
    property: true,
    receiptNo: true,
    amount: true,
    paymentMiti: true,
    file: true,
    status: true,
  });

  const handleSearch = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleUpload = (id: number) => {
    navigate(`/documentForm/add?TaxId=${id}`);
  };

  const handleAddNew = () => {
    navigate("/tax-payments/add");
  };

  const handleFiscalYearChange = (val: string) => {
    const id = Number(val);
    setSelectedFiscalYearId(id);
    setCurrentPage(1); 
  };

  // --- NEW: View File Logic ---
  interface ApiResponseViewFile {
    url: string;
  }

  const handleViewFile = async (id: number) => {
    try {
      // 1. Fetch URL using the ID
      const response = await axiosInstance.get<ApiResponseViewFile>(`/api/view-receipt?id=${id}`);

      // 2. Check for URL and open modal
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

  // Close Modal
  const closeFileModal = () => {
    setIsModalOpen(false);
    setSelectedFileUrl(null);
  };

  // Filter Logic
  const filteredpayments = payments.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const amountStr = item.amountPaid ? item.amountPaid.toString() : "";
    
    // 1. Status Filter Logic
    const statusMatch =
      activeTab === "all" ||
      (activeTab === "paid" && (item.isPaid === 1 || item.isPaid === true)) ||
      (activeTab === "unpaid" && item.isPaid !== 1 && item.isPaid !== true);

    // 2. Search Logic
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
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Payment History</h2>
          <p className="text-sm text-slate-500">Manage tax payments and receipts</p>
        </div>
      </div>

      {/* --- NEW: Tabs Section --- */}
      <div className="flex gap-2 p-1 bg-white border-b border-slate-200">
        <button
          onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
          className={`px-6 py-2 text-sm font-medium transition-colors rounded-t-lg ${
            activeTab === "all"
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          All
        </button>
        <button
          onClick={() => { setActiveTab("paid"); setCurrentPage(1); }}
          className={`px-6 py-2 text-sm font-medium transition-colors rounded-t-lg ${
            activeTab === "paid"
              ? "bg-green-600 text-white"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Paid
        </button>
        <button
          onClick={() => { setActiveTab("unpaid"); setCurrentPage(1); }}
          className={`px-6 py-2 text-sm font-medium transition-colors rounded-t-lg ${
            activeTab === "unpaid"
              ? "bg-red-600 text-white"
              : "text-slate-500 hover:bg-slate-100"
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
        </div>

        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 text-white shrink-0 w-full sm:w-auto" onClick={handleAddNew}>
          <span className="mr-2 text-lg leading-none">+</span> Add Payment
        </Button>
      </div>

      {/* Table */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow className="hover:bg-slate-50/50">
              {columnVisibility.sn && (
                <TableHead className="w-16 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">S.N.</TableHead>
              )}
              {columnVisibility.property && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Property Name</TableHead>
              )}
              {columnVisibility.receiptNo && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Receipt No</TableHead>
              )}
              {columnVisibility.amount && (
                <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Amount</TableHead>
              )}
              {columnVisibility.paymentMiti && (
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Payment Date</TableHead>
              )}
              {columnVisibility.status && (
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Status</TableHead>
              )}
              {columnVisibility.file && (
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-4">Receipt</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedpayments.length > 0 ? (
              paginatedpayments.map((item, index) => (
                <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  {columnVisibility.sn && (
                    <TableCell className="text-center text-sm text-slate-500 font-medium py-4">
                      {(currentPage - 1) * entriesPerPage + index + 1}
                    </TableCell>
                  )}
                  {columnVisibility.property && (
                    <TableCell className="font-semibold text-slate-900 py-4">
                      {item.property ?? "-"}
                    </TableCell>
                  )}
                  {columnVisibility.receiptNo && (
                    <TableCell className="text-sm text-slate-600 py-4">
                      {item.receiptNo ?? "-"}
                    </TableCell>
                  )}
                  {columnVisibility.amount && (
                    <TableCell className="text-sm text-slate-600 font-medium py-4">
                      {item.amountPaid ? `Rs. ${Number(item.amountPaid).toLocaleString()}` : "-"}
                    </TableCell>
                  )}
                  {columnVisibility.paymentMiti && (
                    <TableCell className="text-sm text-slate-600 py-4">
                      {item.paymentMiti ?? "-"}
                    </TableCell>
                  )}
                  {columnVisibility.status && (
                    <TableCell className="text-center text-sm font-semibold py-4">
                      {item.isPaid === 1 || item.isPaid === true ? (
                        <span className="text-green-600">Paid</span>
                      ) : (
                        <span className="text-red-600">Unpaid</span>
                      )}
                    </TableCell>
                  )}
                  
                  {/* Receipt Column - View Button Logic */}
                  {columnVisibility.file && (
                    <TableCell className="text-center text-sm font-semibold py-4">
                      {/* Show View Receipt Button if paid */}
                      {item.isPaid === 1 || item.isPaid === true ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                          onClick={() => handleViewFile(item.id)}
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
      
      {/* --- NEW: File Viewer Modal Overlay --- */}
      {isModalOpen && selectedFileUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm transition-opacity duration-300">
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] relative">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Receipt View</h2>
                  <p className="text-sm text-slate-500">Secure preview of your payment record</p>
                </div>
                <button
                  onClick={closeFileModal}
                  className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* File Viewer / Download Section */}
              <div className="flex flex-col items-center justify-center flex-grow h-full">
                {selectedFileUrl.toLowerCase().endsWith('.pdf') ? (
                  // PDF Viewer using Google Docs Viewer
                  <div className="w-full h-full relative rounded-lg overflow-hidden">
                    <iframe 
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedFileUrl)}&embedded=true&embedded=true&source=web`}
                      className="w-full h-full border-none"
                      title="Secure PDF Viewer"
                    />
                  </div>
                ) : (
                  // Image/Other Viewer (using native browser window.open for simplicity in this example, or an image tag)
                  <div className="w-full h-full flex items-center justify-center">
                     {/* Placeholder for non-PDF files or if the user wants a download button */}
                     <div className="flex flex-col items-center gap-4">
                        <Button 
                          onClick={() => window.open(selectedFileUrl, '_blank')}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-transform hover:scale-105"
                        >
                          Open in New Tab
                        </Button>
                        <Button 
                          onClick={() => window.open(selectedFileUrl, '_blank')}
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg transition-transform hover:scale-105"
                         title="Open in New Tab"
                         >
                          <Download className="h-4 w-4" />
                        </Button>
                     </div>
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