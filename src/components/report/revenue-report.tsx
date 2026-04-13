import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "cmdk";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ChevronLeft, Printer, ChevronDown, Check, ChevronUp } from "lucide-react";
import NepaliDatePicker from "../ui/NepaliDatePicker";
import { useFetchAll } from "@/hooks/useFetchAll";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import printJS from "print-js";
import axiosInstance from "@/config/axios";
import { useAuthStore } from "@/store/authStore";

// --- Types ---
type Module = { id: number; name: string };
type SubModule = { id: number; name: string; moduleId: number };
type Category = { id: number; name: string; moduleId?: number; subModuleId?: number };
type TaxPayer = { id: number; name: string };
type FiscalYear = { id: number; name: string; isActive?: boolean };


// --- Schema ---

const filterSchema = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    fiscalYearId: z.coerce.number().optional(),
    officeId: z.coerce.number().optional(),
    subOfficeId: z.coerce.number().optional(),
    moduleId: z.coerce.number().optional(),
    subModuleId: z.coerce.number().optional(),
    categoryId: z.coerce.number().optional(),
    taxPayerNo: z.coerce.number().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

export default function RevenueReport() {
    const [hasQueried, setHasQueried] = useState<boolean>(false);
    const [reportData, setReportData] = useState<any[]>([]);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [reportError, setReportError] = useState<Error | null>(null);
    const { role, moduleId: userModuleId } = useAuthStore();
    const isAdmin = role === "Admin" || role === "Super Admin";
    const sessionSubOfficeId = Number(sessionStorage.getItem("SubOfficeId") || "0");
    const [showMore, setShowMore] = useState(false);

    // --- Form Setup ---
    const form = useForm<FilterValues>({
        resolver: zodResolver(filterSchema) as any,
        defaultValues: {
            dateFrom: "",
            dateTo: "",
            fiscalYearId: 0,
            officeId: 0,
            subOfficeId: 0,
            moduleId: 0,
            subModuleId: 0,
            categoryId: 0,
            taxPayerNo: 0,
        },
    });

    useEffect(() => {
        if (!isAdmin && userModuleId) {
            form.setValue("moduleId", userModuleId as number);
        }
        if (!isAdmin && sessionSubOfficeId) {
            form.setValue("subOfficeId", sessionSubOfficeId);
        }
    }, [isAdmin, userModuleId, sessionSubOfficeId, form]);

    const watchModuleId = form.watch("moduleId") || 0;
    const watchSubModuleId = form.watch("subModuleId") || 0;

    // --- Data Fetching Filters ---
    const { items: moduleRes } = useFetchAll<Module>("/api/module", ["module"]);
    const { items: subModuleRes } = useFetchAll<SubModule>(watchModuleId ? `/api/submodule?moduleId=${watchModuleId}` : "", ["submodule", watchModuleId]);
    const categoryQueryUrl = watchModuleId && watchSubModuleId ? `/api/category?moduleId=${watchModuleId}&subModuleId=${watchSubModuleId}` : watchModuleId ? `/api/category?moduleId=${watchModuleId}` : "";
    const { items: categoryRes } = useFetchAll<Category>(categoryQueryUrl, ["category", watchModuleId, watchSubModuleId]);
    const { items: taxPayerRes } = useFetchAll<TaxPayer>("/api/taxpayer", ["taxpayer"]);
    const { items: fyRes } = useFetchAll<FiscalYear>("/api/fiscalyear", ["fiscalyear"]);


    const extractData = (data: any) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        const candidate = data.data || data.Data;
        if (Array.isArray(candidate)) return candidate;

        const items: any[] = [];
        let i = 0;
        while (data[i] !== undefined) {
            items.push(data[i]);
            i++;
        }
        return items;
    };


    const modules = extractData(moduleRes);
    const subModules = extractData(subModuleRes);
    const categories = extractData(categoryRes);
    const taxPayers = extractData(taxPayerRes);
    const fiscalYears = extractData(fyRes).filter((fy: any) => fy.isActive);

    const [taxpayerSearch, setTaxpayerSearch] = useState("");
    const [tableSearch, setTableSearch] = useState("");

    // Filter displayed rows by the table search term across all visible columns
    const filteredData = reportData.filter((row: any) => {
        if (!tableSearch.trim()) return true;
        const search = tableSearch.toLowerCase();
        return Object.entries(row)
            .filter(([key]) => !['id', 'moduleid', 'submoduleid', 'categoryid', 'subofficeid'].includes(key.toLowerCase()))
            .some(([, val]) => {
                if (val === null || val === undefined) return false;
                if (typeof val === 'object') return (val as any)?.name?.toLowerCase().includes(search) || false;
                return String(val).toLowerCase().includes(search);
            });
    });

    const calculateTotalAmount = (data: any[]) => {
        return data.reduce((sum, row) => {
            const amountKey = Object.keys(row).find(key =>
                key.toLowerCase().includes('amount') || key.toLowerCase() === 'total' || key.toLowerCase().includes('netamount')
            );
            const val = amountKey ? row[amountKey] : 0;
            return sum + (typeof val === 'number' ? val : 0);
        }, 0);
    };

    const moduleStats: Record<string, { total: number; count: number }> = {};

    if (reportData && Array.isArray(reportData)) {
        reportData.forEach((row: any) => {
            const mod = row.module || row.Module || row.moduleName;

            const moduleName =
                mod && typeof mod === "object"
                    ? mod.name || mod.Name || "Unknown"
                    : mod || "Unknown Module";

            const amountKey = Object.keys(row).find(
                (key) =>
                    key.toLowerCase().includes("amount") ||
                    key.toLowerCase() === "total" ||
                    key.toLowerCase().includes("netamount")
            );

            const val = amountKey ? row[amountKey] : 0;
            const numVal = typeof val === "number" ? val : 0;

            if (!moduleStats[moduleName]) {
                moduleStats[moduleName] = { total: 0, count: 0 };
            }

            moduleStats[moduleName].total += numVal;
            moduleStats[moduleName].count += 1; // 👈 count per module
        });
    }

    const moduleTotals = Object.entries(moduleStats).map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
    }));

    // --- Search Handler ---
    const onSubmit = async (values: FilterValues) => {
        setHasQueried(true);
        setIsLoadingReport(true);
        setReportError(null);

        try {
            const payload = {
                dateFrom: values.dateFrom || "",
                dateTo: values.dateTo || "",
                fiscalYearId: values.fiscalYearId || 0,
                officeId: values.officeId || 0,
                subOfficeId: isAdmin ? (values.subOfficeId || 0) : (sessionSubOfficeId || 0),
                taxPayerNo: values.taxPayerNo || 0,
                categoryId: values.categoryId || 0,
                moduleId: isAdmin ? (values.moduleId || 0) : (userModuleId || 0),
                subModuleId: values.subModuleId || 0,
                userId: 0
            };
            const response = await axiosInstance.post("/api/report/revenuereport", payload);
            setReportData(extractData(response.data));
            toast.success("Report fetched successfully");
        } catch (err: any) {
            setReportError(err);
            toast.error("Failed to fetch report");
        } finally {
            setIsLoadingReport(false);
        }
    };

    const clearReport = () => {

        setHasQueried(false);
        setReportData([]);
        setReportError(null);
    };

    const downloadExcel = () => {
        const container = document.getElementById("printable-revenue-report");
        const table = container?.querySelector("table");
        if (table) {
            const workbook = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
            XLSX.writeFile(workbook, "RevenueReport.xlsx");
        }
    };

    return (
        <div className="min-h-screen ">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {/* Main Card */}
                <div className="bg-white max-w-7xl rounded-xl shadow-lg border border-gray-200 overflow-hidden">

                    {/* Compact Header Section */}
                    <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-5 py-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                Revenue Report
                            </h1>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={downloadExcel}
                                    className="h-8 text-xs"
                                >
                                    <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v2H7V4zm0 4h6v2H7V8zm0 4h6v2H7v-2z" clipRule="evenodd" />
                                    </svg>
                                    Export
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => printJS({ printable: "printable-revenue-report", type: "html", scanStyles: false, css: ["/print.css"] })}
                                    className="h-8 text-xs"
                                >
                                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                                    Print
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Always Visible Filters Section - Compact */}
                    <div className="bg-white border-b border-gray-100">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                {/* Main Filter Row - Always Visible */}
                                <div className="p-4 space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <FormField control={form.control} name="dateFrom" render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-xs font-medium text-gray-600">Start Date</FormLabel>
                                                <FormControl>
                                                    <NepaliDatePicker
                                                        id="dateFrom"
                                                        className="w-full h-8 text-sm"
                                                        placeholder="Start date"
                                                        value={field.value || ""}
                                                        onSelect={(val: any) => field.onChange(val.value)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="dateTo" render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-xs font-medium text-gray-600">End Date</FormLabel>
                                                <FormControl>
                                                    <NepaliDatePicker
                                                        id="dateTo"
                                                        className="w-full h-8 text-sm"
                                                        placeholder="End date"
                                                        value={field.value || ""}
                                                        onSelect={(val: any) => field.onChange(val.value)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="fiscalYearId" render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-xs font-medium text-gray-600">Fiscal Year</FormLabel>
                                                <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? field.value.toString() : "0"}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-8 text-sm bg-white">
                                                            <SelectValue placeholder="Select fiscal year" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="0">All Fiscal Years</SelectItem>
                                                        {fiscalYears.map((item: any) => (
                                                            <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <div className="flex items-end gap-2">
                                            <Button
                                                type="submit"
                                                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-xs font-medium flex-1"
                                            >
                                                <Search className="mr-1.5 h-3 w-3" />
                                                Generate
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => form.reset()}
                                                className="h-8 px-3 text-xs font-medium"
                                            >
                                                Clear
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setShowMore(!showMore)}
                                                className="h-8 px-2 text-xs font-medium text-gray-600 hover:text-gray-900"
                                            >
                                                {showMore ? (
                                                    <>
                                                        More Option <ChevronUp className="h-3.5 w-3.5" />
                                                    </>
                                                ) : (
                                                    <>
                                                        More Option <ChevronDown className="h-3.5 w-3.5" />
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Collapsible Advanced Filters */}
                                    {showMore && (
                                        <div className="pt-3 space-y-3 border-t border-gray-100 animate-in fade-in duration-200">
                                            {/* Revenue Classification */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {isAdmin && (
                                                    <FormField control={form.control} name="moduleId" render={({ field }) => (
                                                        <FormItem className="space-y-1">
                                                            <FormLabel className="text-xs font-medium text-gray-600">Module</FormLabel>
                                                            <Select
                                                                onValueChange={(val) => {
                                                                    field.onChange(Number(val));
                                                                    form.setValue("subModuleId", 0);
                                                                    form.setValue("categoryId", 0);
                                                                }}
                                                                value={field.value ? field.value.toString() : "0"}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger className="h-8 text-sm bg-white">
                                                                        <SelectValue placeholder="Module" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="0">All Modules</SelectItem>
                                                                    {modules.map((m: any) => (
                                                                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                )}

                                                <FormField control={form.control} name="subModuleId" render={({ field }) => (
                                                    <FormItem className="space-y-1">
                                                        <FormLabel className="text-xs font-medium text-gray-600">Sub Module</FormLabel>
                                                        <Select
                                                            onValueChange={(val) => {
                                                                field.onChange(Number(val));
                                                                form.setValue("categoryId", 0);
                                                            }}
                                                            value={field.value ? field.value.toString() : "0"}
                                                            disabled={!watchModuleId}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className={`h-8 text-sm bg-white ${!watchModuleId ? "opacity-50" : ""}`}>
                                                                    <SelectValue placeholder={watchModuleId ? "Sub module" : "Select module first"} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="0">All Sub Modules</SelectItem>
                                                                {subModules.map((sm: any) => (
                                                                    <SelectItem key={sm.id} value={sm.id.toString()}>{sm.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />

                                                <FormField control={form.control} name="categoryId" render={({ field }) => (
                                                    <FormItem className="space-y-1">
                                                        <FormLabel className="text-xs font-medium text-gray-600">Category</FormLabel>
                                                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? field.value.toString() : "0"}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-8 text-sm bg-white">
                                                                    <SelectValue placeholder="Category" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="0">All Categories</SelectItem>
                                                                {categories.map((c: any) => (
                                                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>

                                            {/* Tax Payer Section - Conditional */}
                                            {watchModuleId === 3 && (
                                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                    <FormField control={form.control} name="taxPayerNo" render={({ field }) => (
                                                        <FormItem className="space-y-1">
                                                            <FormLabel className="text-xs font-medium text-gray-600">Tax Payer</FormLabel>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <FormControl>
                                                                        <Button
                                                                            variant="outline"
                                                                            role="combobox"
                                                                            className="w-full justify-between font-normal bg-white hover:bg-gray-50 h-8 text-sm"
                                                                        >
                                                                            {field.value
                                                                                ? taxPayers.find((item: any) => item.id === field.value)?.name || "Unknown Taxpayer"
                                                                                : "All Tax Payers"}
                                                                            <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                                        </Button>
                                                                    </FormControl>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-[300px] p-0" align="start">
                                                                    <Command>
                                                                        <CommandInput
                                                                            placeholder="Search tax payer..."
                                                                            value={taxpayerSearch}
                                                                            onValueChange={setTaxpayerSearch}
                                                                            className="border-b h-8 text-sm"
                                                                        />
                                                                        <CommandEmpty>No tax payer found.</CommandEmpty>
                                                                        <CommandGroup className="max-h-48 overflow-auto">
                                                                            <CommandItem
                                                                                value="all"
                                                                                onSelect={() => field.onChange(0)}
                                                                                className="cursor-pointer text-sm"
                                                                            >
                                                                                <Check className={cn("mr-2 h-3 w-3", !field.value ? "opacity-100" : "opacity-0")} />
                                                                                All Tax Payers
                                                                            </CommandItem>
                                                                            {taxPayers
                                                                                .filter((t: any) => t.name.toLowerCase().includes(taxpayerSearch.toLowerCase()))
                                                                                .map((item: any) => (
                                                                                    <CommandItem
                                                                                        key={item.id}
                                                                                        value={item.name}
                                                                                        onSelect={() => {
                                                                                            field.onChange(item.id);
                                                                                            setTaxpayerSearch("");
                                                                                        }}
                                                                                        className="cursor-pointer text-sm"
                                                                                    >
                                                                                        <Check className={cn("mr-2 h-3 w-3", field.value === item.id ? "opacity-100" : "opacity-0")} />
                                                                                        {item.name}
                                                                                    </CommandItem>
                                                                                ))}
                                                                        </CommandGroup>
                                                                    </Command>
                                                                </PopoverContent>
                                                            </Popover>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </form>
                        </Form>
                    </div>

                    {/* Report Results */}
                    {hasQueried && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {isLoadingReport ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="relative">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                    </div>
                                    <p className="mt-3 text-sm font-medium text-gray-600">Loading report...</p>
                                </div>
                            ) : reportError ? (
                                <div className="p-6 m-4 bg-red-50 rounded-lg border border-red-200 text-center">
                                    <svg className="w-10 h-10 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="text-base font-semibold text-red-800 mb-1">Failed to Load Report</h3>
                                    <p className="text-sm text-red-600">{reportError.message}</p>
                                    <Button variant="outline" onClick={clearReport} className="mt-3 h-8 text-sm">
                                        Try Again
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {reportData && Array.isArray(reportData) && reportData.length > 0 ? (
                                        <div className="p-4">
                                            {/* Compact Summary Cards */}
                                            {moduleTotals.length > 0 && (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                                    {moduleTotals.map((mt, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="bg-gradient-to-br from-amber-50/80 to-orange-50 border border-amber-100 rounded-lg p-3"
                                                        >
                                                            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider truncate">
                                                                {mt.name}
                                                            </p>
                                                            <h3 className="text-base font-bold text-amber-800 mt-1">
                                                                {mt.total.toLocaleString("en-IN", {
                                                                    style: "currency",
                                                                    currency: "NPR",
                                                                })}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                {mt.count} entries
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Report Table */}
                                            <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden bg-white">
                                                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                                                    <div className="relative flex-1 max-w-xs">
                                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search..."
                                                            value={tableSearch}
                                                            onChange={(e) => setTableSearch(e.target.value)}
                                                            className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                        {filteredData.length} / {reportData.length}
                                                    </span>
                                                </div>

                                                <div className="overflow-x-auto" id="printable-revenue-report">
                                                    <div className="print-header hidden p-4 text-center border-b">
                                                        <h2 className="text-xl font-bold text-gray-900">Revenue Report</h2>
                                                        <p className="text-xs text-gray-600 mt-1">Generated on {new Date().toLocaleString()}</p>
                                                    </div>
                                                    <Table className="min-w-full">
                                                        <TableHeader className="bg-gray-50">
                                                            <TableRow className="border-b border-gray-200">
                                                                <TableHead className="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</TableHead>
                                                                {Object.keys(reportData[0] || {})
                                                                    .filter(key => !['id', 'moduleid', 'submoduleid', 'categoryid', 'subofficeid'].includes(key.toLowerCase()))
                                                                    .map(key => (
                                                                        <TableHead key={key} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).substring(0, 20)}
                                                                        </TableHead>
                                                                    ))}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {filteredData.map((row: any, index: number) => (
                                                                <TableRow key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                                                    <TableCell className="px-3 py-2 text-xs text-gray-600">
                                                                        {index + 1}
                                                                    </TableCell>
                                                                    {Object.entries(row)
                                                                        .filter(([key]) => !['id', 'moduleid', 'submoduleid', 'categoryid', 'subofficeid'].includes(key.toLowerCase()))
                                                                        .map(([key, val]: [string, any], i) => (
                                                                            <TableCell key={i} className="px-3 py-2 text-xs">
                                                                                <div className={cn("truncate max-w-xs", typeof val === 'number' && "text-right")}>
                                                                                    {typeof val === 'number' && (key.toLowerCase().includes('amount') ||
                                                                                        key.toLowerCase().includes('total') ||
                                                                                        key.toLowerCase().includes('fine') ||
                                                                                        key.toLowerCase().includes('discount'))
                                                                                        ? val.toLocaleString("en-IN", { style: "currency", currency: "NPR" })
                                                                                        : (val && typeof val === 'object' ? (val.name || val.Name || "-") : (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val) ? val.split('T')[0] : String(val ?? "-")))}
                                                                                </div>
                                                                            </TableCell>
                                                                        ))}
                                                                </TableRow>
                                                            ))}

                                                            <TableRow className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                                                                <TableCell colSpan={Math.max(1, Object.keys(reportData[0] || {}).filter(k => !['id', 'moduleid', 'submoduleid', 'categoryid'].includes(k.toLowerCase())).length)} className="px-3 py-2 text-right text-xs text-gray-700">
                                                                    Grand Total
                                                                </TableCell>
                                                                <TableCell className="px-3 py-2 text-xs text-right text-blue-700 font-bold whitespace-nowrap">
                                                                    {calculateTotalAmount(filteredData).toLocaleString("en-IN", { style: "currency", currency: "NPR" })}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="mt-4 flex justify-between items-center">
                                                <Button
                                                    variant="ghost"
                                                    onClick={clearReport}
                                                    className="h-8 text-xs text-gray-600"
                                                >
                                                    <ChevronLeft className="mr-1 h-3 w-3" />
                                                    Back
                                                </Button>
                                                <div className="text-xs text-gray-400">
                                                    Updated: {new Date().toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 px-4">
                                            <div className="bg-gray-100 rounded-full p-3 mb-3">
                                                <Search className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-900 mb-1">No Data Found</h3>
                                            <p className="text-xs text-gray-500 text-center max-w-md">
                                                No records match your filters.
                                            </p>
                                            <Button variant="outline" onClick={clearReport} className="mt-4 h-8 text-sm">
                                                Modify Filters
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

