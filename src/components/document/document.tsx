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
import { ChevronDown, Search } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import axiosInstance from '@/config/axios';

export default function DocumentSearchForm  ()  {
  const [propertyPopoverOpen, setPropertyPopoverOpen] = useState(false);
  const [selectedPropertyName, setSelectedPropertyName] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showTable, setShowTable] = useState(false);

  // 1. Initialize state
  const [searchParams, setSearchParams] = useState({
    id: '',
    propertyid: '',       // For the "Name" selection (Property ID)
    propertytypeid: '',    // Added separate key for "Property Type" to prevent collision
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
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

  const { mutate: performSearch, isPending } = useMutation({
    mutationFn: async (params: any) => {
      const queryString = new URLSearchParams(params).toString();
      const { data } = await axiosInstance.get(`/api/document?${queryString}`);
      return data;
    },
    onSuccess: (data) => {
      console.log("Results found:", data);
      // Fixed: 'data' here is the response object from Axios. 
      // We assume the API returns { data: [...] } or just [...]
      const results = data?.data || data || [];
      setSearchResults(results);
      setShowTable(true);
    },
    onError: (error) => {
      console.error("Search failed", error);
      setShowTable(false);
    }
  });
  const handleViewFile = async(id: string) => {
    if (!id) {
      console.error("No id provided");
      return;
    }
  const { data } = await axiosInstance.get(`/api/view-document?id=${id}`);

  const url =data.url;
  window.open(url)   
  };

  // 2. Handle Input Changes
  const handleChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 3. Handle Search Submit
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Filter out empty values so query string is clean
    const activeParams = Object.fromEntries(
      Object.entries(searchParams).filter(([_, value]) => value !== "")
    );

    performSearch(activeParams);
  };

  // 4. Handle Reset
  const handleReset = () => {
    setSearchParams({
      id: '',
      propertyid: '',
      propertytypeid: '', // Reset new field
      fiscalyearid: '',
      fileTagId: '',
      documenttypeid: '',
      officeId: ''
    });
    setSelectedPropertyName("");
    setShowTable(false);
    setSearchResults([]);
  };

  return (
    <div className="w-full bg-gray-50 border-b border-gray-200">
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
            
            {/* Field: Property Name (Command) */}
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

            {/* Field: Document Type */}
            <div className="flex flex-col">
              <label htmlFor="documenttypeid" className="text-sm font-semibold text-slate-600 mb-1.5">
                Document Type
              </label>
              <select
                id="documenttypeid"
                name="documenttypeid"
                value={searchParams.documenttypeid}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm bg-white"
              >
                <option value="">Select Type...</option>
                {documentData.map((items: any) => (
                  <option key={items.id} value={items.id}>
                    {items.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Property Type */}
            <div className="flex flex-col">
              <label htmlFor="propertytypeid" className="text-sm font-semibold text-slate-600 mb-1.5">
                Property Type
              </label>
              <select
                id="propertytypeid"
                name="propertytypeid"
                value={searchParams.propertytypeid}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm bg-white"
              >
                <option value="">Select Type...</option>
                {propertyTypeData.map((items: any) => (
                  <option key={items.id} value={items.id}>
                    {items.propertyType}
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Fiscal Year */}
            <div className="flex flex-col">
              <label htmlFor="fiscalyearid" className="text-sm font-semibold text-slate-600 mb-1.5">
                Fiscal Year
              </label>
              <select
                id="fiscalyearid"
                name="fiscalyearid"
                value={searchParams.fiscalyearid}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm bg-white"
              >
                <option value="">Select Year...</option>
                {fiscalyearData.map((items: any) => (
                  <option key={items.id} value={items.id}>
                    {items.fiscalYear}
                  </option>
                ))}
              </select>
            </div>

            {/* Field: File Tag */}
            <div className="flex flex-col">
              <label htmlFor="fileTagId" className="text-sm font-semibold text-slate-600 mb-1.5">
                File Tag
              </label>
              <select
                id="fileTagId"
                name="fileTagId"
                value={searchParams.fileTagId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm bg-white"
              >
                <option value="">Select Tag...</option>
                {fileData.map((items: any) => (
                  <option key={items.id} value={items.id}>
                    {items.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Office */}
            <div className="flex flex-col">
              <label htmlFor="officeId" className="text-sm font-semibold text-slate-600 mb-1.5">
                Office
              </label>
              <select
                id="officeId"
                name="officeId"
                value={searchParams.officeId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm bg-white"
              >
                <option value="">Select Office...</option>
                {officeData.map((office: any) => (
                  <option key={office.id} value={office.id}>
                    {office.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3  pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors text-sm"
            >
              Clear Filters
            </button>
            
            {/* Search Button */}
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isPending ? (
                'Searching...'
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search Documents
                </>
              )}
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
                            <td className="px-6 py-3">
                              {doc.propertyType || "-"}
                            </td>
                            <td className="px-6 py-3 text-slate-600">{doc.fiscalYear || "-"}</td>
                            <td className="px-6 py-3 text-slate-600">{doc.fileTag || "-"}
                            </td>
                             <td className="px-6 py-3 text-slate-600">{doc.officeName || "-"}</td>
                             <td className="px-6 py-3">
                              <button
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs uppercase tracking-wide hover:underline"
                              onClick={() => 
                                handleViewFile(doc.id)} 
                              >Download
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Search className="h-8 w-8 opacity-20" />
                              <span>No documents found matching your criteria.</span>
                            </div>
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
    </div>
  );
};