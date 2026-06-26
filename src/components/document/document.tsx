import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useFetchAll } from "@/hooks/useFetchAll";

import { Search, Download, X, ChevronDown } from 'lucide-react';
import axiosInstance from '@/config/axios';
import { useAuthStore } from '@/store/authStore';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';
import React from 'react';

// ─── REUSABLE SEARCHABLE SELECT COMPONENT ─────────────────────────────
interface SearchableSelectProps {
  options: any[];
  value: string | undefined;
  onChange: (value: string) => void;
  getLabel: (item: any) => string;
  placeholder: string;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onClear?: () => void;
}

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  getLabel,
  placeholder,
  className = "",
  disabled = false,
  isLoading = false,
  onClear
}: SearchableSelectProps) => {
  const [inputValue, setInputValue] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (value) {
      const selectedOption = options.find((item) => item.id == value);
      if (selectedOption) {
        setInputValue(getLabel(selectedOption));
      }
    } else {
      setInputValue("");
    }
  }, [value, options, getLabel]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setShowOptions(val.length > 0);
    if (val.length === 0 && onClear) onClear();
  };

  const handleSelect = (item: any) => {
    setInputValue(getLabel(item));
    onChange(item.id.toString());
    setShowOptions(false);
  };

  const filteredOptions = options.filter((item) =>
    getLabel(item).toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowOptions(!disabled)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`w-full bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <ChevronDown size={16} />
        </div>
        {value && inputValue && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInputValue("");
              onChange("");
              if (onClear) onClear();
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showOptions && !disabled && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto">
          {isLoading ? (
            <li className="p-4 text-center text-sm text-gray-500">Loading...</li>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((item, index) => (
              <li
                key={index}
                onClick={() => handleSelect(item)}
                className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-50 last:border-0"
              >
                {getLabel(item)}
              </li>
            ))
          ) : (
            <li className="p-4 text-center text-sm text-gray-400 italic">No matches found</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default function DocumentSearchForm() {
  const { token } = useAuthStore();
  const decoded: any = jwtDecode(token!)
  const Role = decoded.Role;
  const { t } = useTranslation();

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

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [activeSearchParams, setActiveSearchParams] = useState<Record<string, string> | null>(null);

  // --- Data Fetching ---
  const { items: rawDocumentData, isLoadingItems: isLoadingDocument } = useFetchAll<any>("/api/documenttype", ["document type"]);
  const documentData = rawDocumentData?.data || [];

  const { items: rawOfficeData, isLoadingItems: isLoadingOffice } = useFetchAll<any>("/api/office", ["office"]);
  const officeData = rawOfficeData?.data || [];

  const { items: rawPropertyTypeData, isLoadingItems: isLoadingPropertyType } = useFetchAll<any>("/api/propertytype", ["property type"]);
  const propertyTypeData = rawPropertyTypeData?.data || [];

  const { items: rawFiscalyearData, isLoadingItems: isLoadingFiscalYear } = useFetchAll<any>("/api/fiscalyear", ["fiscal year"]);
  const fiscalyearData = rawFiscalyearData?.data || [];

  const { items: rawFileData, isLoadingItems: isLoadingFileTag } = useFetchAll<any>("/api/filetag", ["file tag"]);
  const fileData = rawFileData?.data || [];

  const { items: rawPropertyData, isLoadingItems: isLoadingProperty } = useFetchAll<any>("/api/property", ["property"]);
  const propertyData = rawPropertyData?.data || [];

  const documentSearchUrl = activeSearchParams
    ? `/api/document?${new URLSearchParams(activeSearchParams).toString()}`
    : "";

  const {
    items: searchResponse,
    isLoadingItems: isSearchLoading,
    error: searchError,
    refetchItems: refetchSearch,
  } = useFetchAll<any>(documentSearchUrl, ["document-search", documentSearchUrl]);

  function dedupeLatestDocuments(data: unknown): any[] {
    const res = data as Record<string, unknown> | unknown[] | null;
    let results: any[] = [];
    if (Array.isArray(res)) {
      results = res;
    } else if (res && typeof res === "object") {
      const nested = (res as Record<string, unknown>).data ?? (res as Record<string, unknown>).Data;
      results = Array.isArray(nested) ? nested : [];
    }

    const sortedResults = [...results].sort((a: any, b: any) => b.id - a.id);
    const uniqueMap = new Map<string, any>();

    sortedResults.forEach((doc: any) => {
      const key = `${doc.property}_${doc.documentTypeName}_${doc.fiscalYear}`.trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, doc);
      }
    });

    return Array.from(uniqueMap.values());
  }

  useEffect(() => {
    if (!activeSearchParams || isSearchLoading) return;

    if (searchError) {
      console.error(searchError);
      setShowTable(false);
      return;
    }

    setSearchResults(dedupeLatestDocuments(searchResponse));
    setShowTable(true);
  }, [activeSearchParams, isSearchLoading, searchResponse, searchError]);

  // --- File View Handler ---
  const handleViewFile = async (id: string) => {
    if (!id) {
      console.error("No id provided");
      return;
    }
    try {
      const { data } = await axiosInstance.get(`/api/view-document?id=${id}`);
      if (data && data.url) {
        setSelectedFileUrl(data.url);
        setIsModalOpen(true);
      } else {
        alert("No URL found in response.");
      }
    } catch (error) {
      console.error(error);
      alert("Unsuccessfull to load the File.");
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

  // --- Form Handlers ---
  const handleChange = (name: string, value: string) => {
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const activeParams = Object.fromEntries(
      Object.entries(searchParams).filter(([_, value]) => value !== "")
    ) as Record<string, string>;
    const queryString = new URLSearchParams(activeParams).toString();
    const currentQuery = activeSearchParams
      ? new URLSearchParams(activeSearchParams).toString()
      : "";

    if (activeSearchParams && queryString === currentQuery) {
      refetchSearch();
    } else {
      setActiveSearchParams(activeParams);
    }
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
    setActiveSearchParams(null);
    setShowTable(false);
    setSearchResults([]);
    setIsModalOpen(false);
  };

  return (
    <div className="w-full bg-gray-50 border-b border-gray-200 pb-20">
      <div className="-mt-7 max-w-8xl mx-auto bg-white rounded-xl shadow-md">

        {/* Header */}
        <div className="bg-white px-4 py-2 sm:px-5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 rounded-t-xl shadow-sm">
          <div>
            <h2 className="text-md font-bold text-slate-800">{t("document.documentSearch")}</h2>
            <p className="text-slate-800 font-semibold text-sm mt-1">{t("document.filterBy")}</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-4">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">

            {/* Field: Property Name */}
            <div className="flex flex-col">
              <label htmlFor="propertyCombobox" className="text-sm font-semibold text-slate-600 mb-1.5">
                {t("property.propertyName")}
              </label>
              <SearchableSelect
                options={propertyData ?? []}
                value={searchParams.propertyid ?? ""}
                onChange={(val) => handleChange('propertyid', val)}
                getLabel={(item) => (item && item.name) ? item.name : ""}
                placeholder={isLoadingProperty ? "Loading..." : "Select Property Name..."}
                disabled={isLoadingProperty}
                className="h-8 px-2"
              />
            </div>

            {/* Field: Document Type */}
            <div className="flex flex-col">
              <label htmlFor="documenttypeid" className="text-sm font-semibold text-slate-600 mb-1.5">{t("document.documentType")}</label>
              <SearchableSelect
                options={documentData}
                value={searchParams.documenttypeid}
                onChange={(val) => handleChange('documenttypeid', val)}
                getLabel={(item) => item.name}
                placeholder={isLoadingDocument ? "Loading..." : "Select Type..."}
                disabled={isLoadingDocument}
                className="h-8 px-2"
              />
            </div>

            {/* Field: Property Type */}
            <div className="flex flex-col">
              <label htmlFor="propertytypeid" className="text-sm font-semibold text-slate-600 mb-1.5">{t("document.propertyType")}</label>
              <SearchableSelect
                options={propertyTypeData}
                value={searchParams.propertytypeid}
                onChange={(val) => handleChange('propertytypeid', val)}
                getLabel={(item) => item.propertyType}
                placeholder={isLoadingPropertyType ? "Loading..." : "Select Type..."}
                disabled={isLoadingPropertyType}
                className="h-8 px-2"
              />
            </div>

            {/* Field: Fiscal Year */}
            <div className="flex flex-col">
              <label htmlFor="fiscalyearid" className="text-sm font-semibold text-slate-600 mb-1.5">{t("sidebar.fiscalYear")}</label>
              <SearchableSelect
                options={fiscalyearData}
                value={searchParams.fiscalyearid}
                onChange={(val) => handleChange('fiscalyearid', val)}
                getLabel={(item) => item.fiscalYear}
                placeholder={isLoadingFiscalYear ? "Loading..." : "Select Year..."}
                disabled={isLoadingFiscalYear}
                className="h-8 px-2"
              />
            </div>

            {/* Field: File Tag */}
            <div className="flex flex-col">
              <label htmlFor="fileTagId" className="text-sm font-semibold text-slate-600 mb-1.5">{t("property.fileTag")}</label>
              <SearchableSelect
                options={fileData}
                value={searchParams.fileTagId}
                onChange={(val) => handleChange('fileTagId', val)}
                getLabel={(item) => item.name}
                placeholder={isLoadingFileTag ? "Loading..." : "Select Tag..."}
                disabled={isLoadingFileTag}
                className="h-8 px-2"
              />
            </div>

            {/* Field: Office */}
            <div className="flex flex-col">
              <label htmlFor="officeId" className="text-sm font-semibold text-slate-600 mb-1.5">{t("common.office")}</label>
              <SearchableSelect
                options={officeData}
                value={searchParams.officeId}
                onChange={(val) => handleChange('officeId', val)}
                getLabel={(item) => item.name}
                placeholder={isLoadingOffice ? "Loading..." : "Select Office..."}
                disabled={isLoadingOffice}
                className="h-8 px-2"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
            <button type="button" onClick={handleReset} className="px-3 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-sm">
              {t("common.clear")}
            </button>
            <button
              type="submit"
              disabled={isSearchLoading}
              className="px-3 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isSearchLoading ? (
                <>
                  <Search className="h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  {t("common.search")}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Search Results Table */}
        {showTable && (
          <div className="mt-8 animate-in fade-in duration-500 border-t border-gray-100">
            <div className="p-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4 max-w-9xl mx-auto">
                <h3 className="text-lg font-bold text-slate-800">{t("document.searchResults")}</h3>
                <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
                  {searchResults.length} {t("document.itemsFound")}
                </span>
              </div>

              <div className="max-w-9xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">{t("common.name")}</th>
                        <th className="px-6 py-3">{t("document.documentType")}</th>
                        <th className="px-6 py-3">{t("document.propertyType")}</th>
                        <th className="px-6 py-3">{t("sidebar.fiscalYear")}</th>
                        <th className="px-6 py-3">{t("document.fileTag")}</th>
                        <th className="px-6 py-3">{t("common.office")}</th>
                        <th className="px-6 py-3">{t("common.action")}</th>
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
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded transition shadow-sm text-sm font-medium"
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

      {/* --- POPUP MODAL (File Viewer) --- */}
      {isModalOpen && selectedFileUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4">
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
            onClick={() => { setIsModalOpen(false); setSelectedFileUrl(null); }}
          ></div>

          <div className="relative bg-white w-full max-w-6xl h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
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

            {/* Modal Content */}
            <div className="flex-grow bg-slate-200 flex flex-col overflow-hidden relative">
              {selectedFileUrl.toLowerCase().includes('.pdf') ? (
                <div className="w-full h-full overflow-hidden relative border-none shadow-inner">
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

            {/* Modal Footer */}
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