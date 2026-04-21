import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useFetchAll } from "@/hooks/useFetchAll";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, Download, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import axiosInstance from '@/config/axios';
import { useAuthStore } from '@/store/authStore';
import { jwtDecode } from 'jwt-decode';

// Added userRole to props so we can control admin features


export default function DocumentSearchForm (){
  const [propertyPopoverOpen, setPropertyPopoverOpen] = useState(false);
  const [selectedPropertyName, setSelectedPropertyName] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showTable, setShowTable] = useState(false);
  const {token} = useAuthStore();
   const decoded: any = jwtDecode(token!)
   const Role = decoded.Role;
  
  // --- Modal States ---
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Initialize state
  const [searchParams, setSearchParams] = useState({
    id: '',
    propertyid: '',
    propertytypeid: '',
    fiscalyearid: '',
    fileTagId: '',
    documenttypeid: '',
    officeId: ''
  });

  // --- Data Fetching ---
  const { items: rawDocumentData } = useFetchAll<any>("/api/documenttype", ["document type"]);
  const documentData = rawDocumentData?.data || [];

  const { items: rawOfficeData } = useFetchAll<any>("/api/office", ["office"]);
  const officeData = rawOfficeData?.data || [];

  const { items: rawPropertyTypeData } = useFetchAll<any>("/api/propertytype", ["property type"]);
  const propertyTypeData = rawPropertyTypeData?.data || [];

  const { items: rawFiscalyearData } = useFetchAll<any>("/api/fiscalyear", ["fiscal year"]);
  const fiscalyearData = rawFiscalyearData?.data || [];

  const { items: rawFileData } = useFetchAll<any>("/api/filetag", ["file tag"]);
  const fileData = rawFileData?.data || [];

  const { items: rawPropertyData } = useFetchAll<any>("/api/property", ["property"]);
  const propertyData = rawPropertyData?.data || [];

  const { mutate: performSearch, isPending } = useMutation({
    mutationFn: async (params: any) => {
      const queryString = new URLSearchParams(params).toString();
      const { data } = await axiosInstance.get(`/api/document?${queryString}`);
      return data;
    },
    onSuccess: (data) => {
      console.log("Results found:", data);
      const results = data?.data || data || [];
      setSearchResults(results);
      setShowTable(true);
    },
    onError: (error) => {
      console.error("Search failed", error);
      setShowTable(false);
    }
  });

  // --- File View Handler ---
  const handleViewFile = async (id: string) => {
    if (!id) {
      console.error("No id provided");
      return;
    }
    try {
      const { data } = await axiosInstance.get(`/api/view-document?id=${id}`);
      
      // Assuming API returns { url: "..." }
      if (data && data.url) {
        setSelectedFileUrl(data.url); 
        setIsModalOpen(true); 
      } else {
        alert("No URL found in response.");
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      alert("File load garna sakiyena. URL check garnu hola.");
    }
  };

  // --- Download Handler ---
  // const handleDownload = async () => {
  //   if (!selectedFileUrl) return;
    
  //   try {
  //     // Fetch the file as a blob
  //     const response = await axiosInstance.get(selectedFileUrl, { responseType: 'blob' });
  //     const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      
  //     // Create a temporary link to trigger download
  //     const link = document.createElement('a');
  //     link.href = blobUrl;
  //     link.setAttribute('download', 'document-file'); // You can improve this filename logic later
  //     document.body.appendChild(link);
  //     link.click();
      
  //     // Cleanup
  //     link.remove();
  //     window.URL.revokeObjectURL(blobUrl);
  //   } catch (err) {
  //     console.error(err);
  //     alert("Download failed. Direct access restricted or network error.");
  //   }
  // };
  const handleDownload = async () => {
  if (!selectedFileUrl) return;

  try {
    // 1. Fetch data directly using the standard fetch API
    // Yasle Axios ko settings sanga conflict gardaina
    const response = await fetch(selectedFileUrl);
    
    if (!response.ok) throw new Error('Network response was not ok');

    const blob = await response.blob();
    
    // 2. Blob lai URL ma convert garne
    const url = window.URL.createObjectURL(blob);
    
    // 3. Hidden link banayera click garne
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    // File name nikalne logic (yedi xaina bhane default name rakhne)
    const fileName = selectedFileUrl.split('/').pop()?.split('?')[0] || 'document.pdf';
    a.download = fileName;
    
    document.body.appendChild(a);
    a.click();
    
    // 4. Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Download Error:", error);
    // Yedi mathiko method fail bhayo bhane, last option: New Tab ma khulne
    window.open(selectedFileUrl, '_blank');
  }
};

  // --- Form Handlers ---
  const handleChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const activeParams = Object.fromEntries(
      Object.entries(searchParams).filter(([_, value]) => value !== "")
    );
    performSearch(activeParams);
  };

  const handleReset = () => {
    setSearchParams({
      id: '',
      propertyid: '',
      propertytypeid: '',
      fiscalyearid: '',
      fileTagId: '',
      documenttypeid: '',
      officeId: ''
    });
    setSelectedPropertyName("");
    setShowTable(false);
    setSearchResults([]);
    setIsModalOpen(false); // Close modal on reset
  };

  return (
    <div className="w-full bg-gray-50 border-b border-gray-200 pb-20">
      <div className="-mt-7 max-w-8xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-white px-4 py-2 sm:px-5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 rounded-t-xl shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Document Search</h2>
            <p className="text-slate-800 font-semibold text-sm mt-1">Filter by</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            
            {/* Field: Property Name */}
            <div className="flex flex-col">
              <label htmlFor="propertyCombobox" className="text-sm font-semibold text-slate-600 mb-1.5">
                Name (Property)
              </label>
              <Popover open={propertyPopoverOpen} onOpenChange={setPropertyPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={propertyPopoverOpen}
                    className="w-full justify-between text-left h-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm"
                  >
                    {selectedPropertyName || "Select Property Name..."}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                
                <PopoverContent className="w-full p-0" align="start">
                  <Command className="w-full">
                    <CommandInput placeholder="Search property..." />
                    <CommandList>
                      <CommandEmpty>No property found.</CommandEmpty>
                      <CommandGroup>
                        {propertyData.map((item: any) => (
                          <CommandItem
                            key={item.id}
                            value={item.name}
                            onSelect={(currentValue) => {
                              setSelectedPropertyName(currentValue);
                              setSearchParams(prev => ({ ...prev, propertyid: item.id }));
                              setPropertyPopoverOpen(false);
                            }}
                          >
                            {item.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Other Fields (Compact for brevity, same as your code) */}
            <div className="flex flex-col">
              <label htmlFor="documenttypeid" className="text-sm font-semibold text-slate-600 mb-1.5">Document Type</label>
              <select id="documenttypeid" name="documenttypeid" value={searchParams.documenttypeid} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white">
                <option value="">Select Type...</option>
                {documentData.map((items: any) => (<option key={items.id} value={items.id}>{items.name}</option>))}
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="propertytypeid" className="text-sm font-semibold text-slate-600 mb-1.5">Property Type</label>
              <select id="propertytypeid" name="propertytypeid" value={searchParams.propertytypeid} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white">
                <option value="">Select Type...</option>
                {propertyTypeData.map((items: any) => (<option key={items.id} value={items.id}>{items.propertyType}</option>))}
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="fiscalyearid" className="text-sm font-semibold text-slate-600 mb-1.5">Fiscal Year</label>
              <select id="fiscalyearid" name="fiscalyearid" value={searchParams.fiscalyearid} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white">
                <option value="">Select Year...</option>
                {fiscalyearData.map((items: any) => (<option key={items.id} value={items.id}>{items.fiscalYear}</option>))}
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="fileTagId" className="text-sm font-semibold text-slate-600 mb-1.5">File Tag</label>
              <select id="fileTagId" name="fileTagId" value={searchParams.fileTagId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white">
                <option value="">Select Tag...</option>
                {fileData.map((items: any) => (<option key={items.id} value={items.id}>{items.name}</option>))}
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="officeId" className="text-sm font-semibold text-slate-600 mb-1.5">Office</label>
              <select id="officeId" name="officeId" value={searchParams.officeId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white">
                <option value="">Select Office...</option>
                {officeData.map((office: any) => (<option key={office.id} value={office.id}>{office.name}</option>))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
            <button type="button" onClick={handleReset} className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-sm">
              Clear Filters
            </button>
            <button type="submit" disabled={isPending} className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              {isPending ? 'Searching...' : <><Search className="h-4 w-4" /> Search Documents</>}
            </button>
          </div>
        </form>

        {/* Search Results Table */}
        {showTable && (
          <div className="mt-8 animate-in fade-in duration-500 border-t border-gray-100">
            <div className="p-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4 max-w-7xl mx-auto">
                <h3 className="text-lg font-bold text-slate-800">Search Results</h3>
                <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
                  {searchResults.length} items found
                </span>
              </div>
              
              <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Document type</th>
                        <th className="px-6 py-3">Property Type</th>
                        <th className="px-6 py-3">Fiscal Year</th>
                        <th className="px-6 py-3">File Tag</th>
                        <th className="px-6 py-3">Office</th>
                        <th className="px-6 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {searchResults.length > 0 ? (
                        searchResults.map((doc: any) => (
                          <tr key={doc.id} className="hover:bg-blue-50 transition-colors group">
                            <td className="px-6 py-3 font-medium text-slate-700">{doc.property}</td>
                            <td className="px-6 py-3 font-medium text-slate-800">{doc.documentTypeName || "N/A"}</td>
                            <td className="px-6 py-3">{doc.propertyType || "-"}</td>
                            <td className="px-6 py-3 text-slate-600">{doc.fiscalYear || "-"}</td>
                            <td className="px-6 py-3 text-slate-600">{doc.fileTag || "-"}</td>
                            <td className="px-6 py-3 text-slate-600">{doc.officeName || "-"}</td>
                            <td className="px-6 py-3">
                              <button 
                                onClick={() => handleViewFile(doc.id)} 
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition shadow-sm text-sm font-medium"
                              >
                                View File
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                            No documents found matching your criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- POPUP MODAL (Moved OUTSIDE the loop) --- */}
     {isModalOpen && selectedFileUrl && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4">
    {/* १. ब्याकग्राउन्ड ओभरले */}
    <div 
      className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
      onClick={() => { setIsModalOpen(false); setSelectedFileUrl(null); }}
    ></div>

    {/* २. मोडल बडी */}
    <div className="relative bg-white w-full max-w-6xl h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
      
      {/* ३. हेडर */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-lg">
            <span className="text-red-600 font-bold text-xs">PDF</span>
          </div>
          <div className="overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 truncate max-w-[200px] md:max-w-md">
              {/* URL बाट फाइलको नाम निकाल्ने कोसिस */}
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

      {/* ४. कन्टेन्ट एरिया (परिमार्जित Logic) */}
      <div className="flex-grow bg-slate-200 flex flex-col overflow-hidden relative">
        {selectedFileUrl.toLowerCase().includes('.pdf') ? (
          <div className="w-full h-full">
            {/* Google Docs Viewer ले क्लाउड लिङ्कहरूलाई राम्रोसँग ह्यान्डल गर्छ */}
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedFileUrl)}&embedded=true`}
              className="w-full h-full border-none shadow-inner"
              title="Secure PDF Viewer"
            />
          </div>
        ) : (
          /* यदि इमेज हो भने */
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

      {/* ५. फुटर */}
      <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center">
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
    </div>
  );
}