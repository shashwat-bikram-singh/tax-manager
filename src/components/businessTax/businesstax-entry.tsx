import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Receipt, X, ChevronLeft } from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import BusinessTaxForm from "./businesstax-entry-form";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Input } from "@/components/ui/input";

const Schema = z.object({
  name: z.string().min(1, "Name is required"),
  fiscalYearId: z.string().min(1, "Fiscal Year is required"),
});

type BusinessTaxValues = z.infer<typeof Schema>;

type BusinessTaxProps = {
  onCancel?: () => void;
  onSuccess?: () => void;
  initialData?: {
    name: string;
    contactNo: string | null;
    email: string | null;
  };
};

export default function BusinessTaxEntry({ onCancel, onSuccess }: BusinessTaxProps) {
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [selectedTaxPayer, setSelectedTaxPayer] = useState<any>(null);
  const [taxPayerNoForStatus, setTaxPayerNoForStatus] = useState<string>("");
  const [fiscalYearIdForStatus, setFiscalYearIdForStatus] = useState<string>("");
  const [pendingTaxPayer, setPendingTaxPayer] = useState<any>(null);
  const [isAlreadyPaid, setIsAlreadyPaid] = useState(false);

  const [payerSearch, setPayerSearch] = useState("");
  const [debouncedPayerSearch, setDebouncedPayerSearch] = useState("");
  const [fiscalYearSearch, setFiscalYearSearch] = useState("");

  // Debounce the search input before hitting the API
  const payerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePayerSearchChange = (value: string) => {
    setPayerSearch(value);
    if (payerDebounceRef.current) clearTimeout(payerDebounceRef.current);
    payerDebounceRef.current = setTimeout(() => {
      setDebouncedPayerSearch(value.trim());
    }, 300);
  };

  const { items: fiscalYearData } = useFetchAll<any>("/api/fiscalyear", ["fiscalyear"]);
  const { items: paymentStatusData } = useFetchAll<any>(taxPayerNoForStatus && fiscalYearIdForStatus ? `/api/paymentstatus?taxpayerNo=${taxPayerNoForStatus}&fiscalYearId=${fiscalYearIdForStatus}&monthId=0` : "", ["paymentstatus", taxPayerNoForStatus, fiscalYearIdForStatus]);

  const { items: taxPayerData } = useFetchAll<any>("/api/taxpayer", ["taxpayer"]);

  // Search API — only fires when user has typed something
  const searchUrl = debouncedPayerSearch
    ? `/api/taxpayer?query=${encodeURIComponent(debouncedPayerSearch)}`
    : "";
  const { items: searchResults } = useFetchAll<any>(searchUrl, ["taxpayer-search-biz", debouncedPayerSearch]);

  const form = useForm<BusinessTaxValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: "",
      fiscalYearId: "",
    },
  });

  const extractData = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const dataCandidate = data.data || data.Data;
    if (Array.isArray(dataCandidate)) return dataCandidate;
    const items: any[] = [];
    let i = 0;
    while (data[i] !== undefined) {
      items.push(data[i]);
      i++;
    }
    return items;
  };

  const taxPayers = extractData(taxPayerData);
  const fiscalYears = extractData(fiscalYearData);

  const baseFilteredTaxPayers = taxPayers?.filter(
    (item: any) => item.moduleId === 3
  );

  // Search results come from the API
  const searchedTaxPayers = extractData(searchResults);
  const searchedFiscalYears = fiscalYears?.filter((item: any) =>
    item.name?.toLowerCase().includes(fiscalYearSearch.toLowerCase())
  );


  useEffect(() => {
    if (pendingTaxPayer && paymentStatusData !== undefined) {
      const statusData = paymentStatusData as any;
      const dataVal = statusData?.data ?? statusData?.Data;

      if (dataVal === 1) {
        // Not Paid / Can proceed
        setSelectedTaxPayer(pendingTaxPayer);
        setShowEntryForm(true);
        toast.success("Opening entry form...");
        setIsAlreadyPaid(false);
      } else if (dataVal === 0) {
        // Paid
        setIsAlreadyPaid(true);
      }

      setPendingTaxPayer(null);
      setTaxPayerNoForStatus("");
      setFiscalYearIdForStatus("");
    }
  }, [paymentStatusData, pendingTaxPayer]);

  const onSubmit = (values: BusinessTaxValues) => {
    // Check in baseFilteredTaxPayers first, then searchedTaxPayers
    let foundTp = baseFilteredTaxPayers.find((tp: any) => tp.name === values.name);
    if (!foundTp) {
      foundTp = searchedTaxPayers.find((tp: any) => tp.name === values.name);
    }
    if (!foundTp) {
      toast.error("Tax payer not found.");
      return;
    }

    // Reset state for new check
    setIsAlreadyPaid(false);
    setPendingTaxPayer(foundTp);
    setTaxPayerNoForStatus(String(foundTp.taxPayerNo));
    setFiscalYearIdForStatus(values.fiscalYearId);
  };

  const handleBack = () => {
    setShowEntryForm(false);
    setSelectedTaxPayer(null);
    form.reset();
  };

  const handleSuccess = () => {
    setShowEntryForm(false);
    setSelectedTaxPayer(null);
    form.reset();
    onSuccess?.();
  };

  if (showEntryForm) {
    return (
      <div className="p-4 md:p-6 bg-white rounded-lg shadow-sm">
        <div className="flex justify-start mb-4">
          <Button variant="outline" onClick={handleBack} className="hover:bg-gray-100 border-gray-300 text-gray-700">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
        <BusinessTaxForm
          defaultName={selectedTaxPayer?.name}
          defaultContactNo={selectedTaxPayer?.contactNo}
          defaultEmail={selectedTaxPayer?.email}
          taxPayerNo={selectedTaxPayer?.taxPayerNo}
          categoryId={selectedTaxPayer?.categoryId}
          onCancel={handleBack}
          onSuccess={handleSuccess}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col gap-6">
        {isAlreadyPaid && (
          <div className="p-8 my-6 bg-red-50 border-2 border-red-200 rounded-xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-red-800 mb-2">Tax Has Been Paid</h3>
            <p className="text-red-700 max-w-md mb-6">
              The selected tax payer has already completed their business tax payment for the chosen fiscal year. No further entry is required.
            </p>
            <Button onClick={() => setIsAlreadyPaid(false)} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 px-8">
              Check Another Tax Payer
            </Button>
          </div>
        )}

        <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-lg">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">
              Business Tax Entry
            </h2>

            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="rounded-full"
              >
                <X className="h-5 w-5 text-gray-600" />
              </Button>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-4">

              {/* Tax Payer Name — simple input with API-driven dropdown */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => {
                  const [showDropdown, setShowDropdown] = useState(false);

                  return (
                    <FormItem className="flex flex-col flex-1">
                      <FormLabel>Search by Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                          <Input
                            placeholder="Type to search taxpayer..."
                            value={payerSearch}
                            onChange={(e) => {
                              const val = e.target.value;
                              handlePayerSearchChange(val);
                              field.onChange(val);
                              setShowDropdown(true);
                            }}
                            onFocus={() => {
                              if (debouncedPayerSearch) setShowDropdown(true);
                            }}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                            className="pl-9 border-gray-300 focus:ring-2 focus:ring-blue-500"
                            autoComplete="off"
                          />
                          {showDropdown && debouncedPayerSearch && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[260px] overflow-y-auto">
                              {searchedTaxPayers?.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No tax payer found.
                                </div>
                              ) : (
                                searchedTaxPayers?.map((tp: any) => (
                                  <div
                                    key={tp.id}
                                    onMouseDown={() => {
                                      field.onChange(tp.name);
                                      setPayerSearch(tp.name);
                                      setDebouncedPayerSearch("");
                                      setShowDropdown(false);
                                    }}
                                    className={cn(
                                      "flex cursor-pointer select-none items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                                      field.value === tp.name && "bg-accent"
                                    )}
                                  >
                                    {tp.name}
                                    {field.value === tp.name && (
                                      <Check className="ml-auto h-4 w-4" />
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Fiscal Year */}
              <FormField
                control={form.control}
                name="fiscalYearId"
                render={({ field }) => {
                  const [open, setOpen] = useState(false);

                  return (
                    <FormItem className="flex flex-col flex-1">
                      <FormLabel>Fiscal Year</FormLabel>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className={cn(
                                "w-full border border-gray-300 rounded-lg px-6 py-3 focus:ring-2 focus:ring-blue-500 transition-all justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? fiscalYears.find((fy: any) => String(fy.id) === field.value)?.name || field.value
                                : "Select fiscal year"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-0"
                          style={{ width: 'var(--radix-popover-trigger-width)' }}
                          align="start"
                        >
                          <Input
                            placeholder="Search fiscal year..."
                            value={fiscalYearSearch}
                            onChange={(e) => setFiscalYearSearch(e.target.value)}
                            className="border-0 border-b rounded-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="max-h-[300px] overflow-y-auto py-1">
                            {searchedFiscalYears?.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                No fiscal year found.
                              </div>
                            ) : (
                              searchedFiscalYears?.map((fy: any) => (
                                <div
                                  key={fy.id}
                                  onClick={() => {
                                    form.setValue(field.name, String(fy.id));
                                    setFiscalYearSearch("");
                                    setOpen(false);
                                  }}
                                  className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    String(fy.id) === field.value && "bg-accent"
                                  )}
                                >
                                  {fy.name}
                                  {String(fy.id) === field.value && (
                                    <Check className="ml-auto h-4 w-4" />
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <Button type="submit">
                <Search className="mr-2 h-4 w-4" /> Search
              </Button>

            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}