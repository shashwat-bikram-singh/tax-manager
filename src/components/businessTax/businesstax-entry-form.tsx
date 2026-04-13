import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axiosInstance from "@/config/axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useFetchAll } from "@/hooks/useFetchAll";
import { Building, Layers, Loader2, Phone, PlusCircle, Receipt, Save, Tag, Trash2, UserPlus } from "lucide-react";
import { Label } from "../ui/label";

export type TicketDetail = {
    categoryId: number;
    quantity: number;
    rate: number;
    fineAmount: number;
    basicAmount: number;
    discountAmount: number;
    amount: number;
};

export type TicketPayload = {
    subTotal: number;
    discount: number;
    netAmount: number;
    fine: number;
    contactNumber?: string | null;
    email?: string | null;
    remarks?: string | null;
    details: TicketDetail[];
    taxPayerNo: number;
    name: string;
    monthId: number,
};

export const ticketDetailSchema = z.object({
    categoryId: z.number().min(1, "Category is required"),
    quantity: z.number().min(1, "At least 1 quantity required"),
    rate: z.number().min(0),
    basicAmount: z.number().min(0),
    fineAmount: z.number().min(0),
    discountAmount: z.number().min(0),
    amount: z.number().min(0),
});

export const ticketSchema = z.object({
    subTotal: z.number().min(0),
    discount: z.number().min(0),
    netAmount: z.number().min(0),
    fine: z.number().min(0),
    contactNumber: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    remarks: z.string().nullable().optional(),
    details: z.array(ticketDetailSchema).min(1, "Add at least one ticket"),
    taxPayerNo: z.number(),
    name: z.string(),
    monthId: z.number()

});

export type TicketFormValues = z.infer<typeof ticketSchema>;

// FIX: Added Props type
export type BusinessTaxEntryFormProps = {
    defaultName?: string | null;
    defaultContactNo?: string | null;
    defaultEmail?: string | null;
    taxPayerNo?: number,
    categoryId?: number,
    onCancel?: () => void;
    onSuccess?: () => void;
};

export default function BusinessTaxForm({
    defaultName,
    defaultContactNo,
    defaultEmail,
    categoryId,
    taxPayerNo,
    onSuccess
}: BusinessTaxEntryFormProps) {
    const [details, setDetails] = useState<TicketDetail[]>([
        {
            categoryId: categoryId || 0,
            quantity: 1,
            rate: 0,
            fineAmount: 0,
            basicAmount: 0,
            discountAmount: 0,
            amount: 0,
        },
    ]);
    const [loadingRow, setLoadingRow] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { items: currentdocResponse, isLoadingItems: isDocLoading } = useFetchAll<any>("/api/currentdocnumber", ["currentdocnumber"]);
    const { items: categoryData } = useFetchAll<any>("/api/category?moduleId=3", ["category", 3]);

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

    function extractDocNumber(response: unknown): string | null {
        if (!response) return null;
        const res = response as any;
        return res.data || res.Data || null;
    }

    const docNumber = extractDocNumber(currentdocResponse);
    const suboffice = sessionStorage.getItem("SubOffice");

    const form = useForm<TicketFormValues>({
        resolver: zodResolver(ticketSchema),
        defaultValues: {
            subTotal: 0,
            discount: 0,
            netAmount: 0,
            fine: 0,
            contactNumber: defaultContactNo || null,
            email: defaultEmail || null,
            remarks: null,
            taxPayerNo: taxPayerNo,
            name: defaultName || "",
            monthId: 0,
            details: [],
        },
    });

    const subTotal = details.reduce((s, d) => s + d.basicAmount, 0);
    const discount = details.reduce((s, d) => s + (Number(d.discountAmount) || 0), 0);
    const fine = details.reduce((s, d) => s + (Number(d.fineAmount) || 0), 0);
    const netAmount = subTotal - discount + fine;

    useEffect(() => {
        form.setValue("details", details, { shouldValidate: true });
    }, [details, form]);

    useEffect(() => {
        form.setValue("subTotal", subTotal);
        form.setValue("discount", discount);
        form.setValue("fine", fine);
        form.setValue("netAmount", netAmount);
    }, [subTotal, discount, fine, netAmount, form]);

    const fetchcategoryRate = async (categoryId: number) => {
        const res = await axiosInstance.get(`/api/rateforcategory?categoryId=${categoryId}`);
        return res.data.data as number;
    };

    // Auto-fetch rate when categoryId is provided from taxpayer selection
    useEffect(() => {
        if (categoryId && categoryId > 0) {
            (async () => {
                try {
                    setLoadingRow(0);
                    const rate = await fetchcategoryRate(categoryId);
                    setDetails((prev) => {
                        const updated = [...prev];
                        const row = updated[0];
                        row.categoryId = categoryId;
                        row.rate = rate;
                        row.basicAmount = (Number(row.quantity) || 0) * rate;
                        row.amount = row.basicAmount - (Number(row.discountAmount) || 0) + (Number(row.fineAmount) || 0);
                        return updated;
                    });
                } catch {
                    toast.error("Failed to fetch rate for category");
                } finally {
                    setLoadingRow(null);
                }
            })();
        }
    }, [categoryId]);

    const categorys = extractData(categoryData).filter((cat: any) => cat.moduleId === 3);

    const addRow = () => {
        setDetails((prev) => [
            ...prev,
            { categoryId: 0, quantity: 1, rate: 0, fineAmount: 0, basicAmount: 0, discountAmount: 0, amount: 0 },
        ]);
    };

    const updateRow = async (index: number, key: keyof TicketDetail, value: number) => {
        const updated = [...details];
        const row = { ...updated[index], [key]: value };
        updated[index] = row;

        if (key === "categoryId") {
            try {
                setLoadingRow(index);
                const rate = await fetchcategoryRate(Number(value));
                row.rate = rate;
            } catch {
                toast.error("Failed to fetch rate");
                row.rate = 0;
            } finally {
                setLoadingRow(null);
            }
        }

        row.basicAmount = (Number(row.quantity) || 0) * (row.rate || 0);
        row.amount = row.basicAmount - (Number(row.discountAmount) || 0) + (Number(row.fineAmount) || 0);
        setDetails(updated);
    };

    const removeRow = (index: number) => {
        const updated = details.filter((_, i) => i !== index);
        if (updated.length === 0) {
            setDetails([{ categoryId: 0, quantity: 1, rate: 0, fineAmount: 0, basicAmount: 0, discountAmount: 0, amount: 0 }]);
        } else {
            setDetails(updated);
        }
    };

    const onSubmit = async (values: TicketFormValues) => {
        try {
            setIsSubmitting(true);
            const payload = {
                ...values,
                details: values.details.map((d) => ({
                    ...d,
                })),
                taxPayerNo: taxPayerNo,
                name: values.name,
                monthId: 0
            };
            const response = await axiosInstance.post("/api/ticket", payload);
            toast.success("Ticket saved successfully ✅");

            const ticketId = response.data.data;
            if (ticketId) {
                window.open(`/ticket-print-revenue/${ticketId}`, "_blank");
            }

            form.reset();
            setDetails([{ categoryId: 0, quantity: 1, rate: 0, fineAmount: 0, basicAmount: 0, discountAmount: 0, amount: 0 }]);
            onSuccess?.();
        } catch (error: any) {
            console.error("API ERROR ❌", error);
            const errorMsg = error.response?.data?.message || "Failed to save ticket";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onError = (errors: any) => {
        console.error("VALIDATION ERRORS ❌", errors);
        toast.error("Please fix the validation errors");
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex-1">
                    {isDocLoading ? (
                        <div className="h-12 w-48 bg-gradient-to-r from-gray-100 to-gray-200 animate-pulse rounded-lg"></div>
                    ) : docNumber ? (
                        <div className="p-3 border border-gray-200 rounded-lg bg-white">
                            <div className="flex items-center gap-2 mb-1">
                                <Receipt className="h-4 w-4 text-gray-500" />
                                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Ticket No</span>
                            </div>
                            <span className="font-mono text-xl font-semibold text-gray-800">{docNumber}</span>
                        </div>
                    ) : null}
                </div>
                <div className="flex-1">
                    <div className="p-3 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Building className="h-4 w-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Sub Office</span>
                        </div>
                        <span className="font-sans text-xl font-semibold text-gray-800">{suboffice}</span>
                    </div>
                </div>
            </div>

            <form
                onSubmit={form.handleSubmit(onSubmit, onError)}
                className="space-y-6"
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            >
                {/* Ticket Details Table (Unchanged) */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">Add Item Details</h3>
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        {details.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                <UserPlus className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-base font-medium text-gray-600 mb-1">No items added</h3>
                                <p className="text-gray-500 text-sm mb-4">Start by adding items to create a ticket</p>
                                <Button type="button" onClick={addRow} className="bg-gray-800 hover:bg-gray-900">
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Add First Item
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700"><div className="flex items-center gap-2"><Layers className="h-3.5 w-3.5" />Item</div></th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">quantity</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Rate (₹)</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Basic Amount</th>
                                            {/* <th className="text-left py-3 px-4 text-sm font-medium text-gray-700"><div className="flex items-center gap-2"><Tag className="h-3.5 w-3.5" />Discount</div></th> */}
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700"><div className="flex items-center gap-2"><Tag className="h-3.5 w-3.5" />Fine</div></th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                                            <th className="w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {details.map((row, i) => (
                                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 last:border-0">
                                                <td className="py-3 px-4">
                                                    <Select onValueChange={(v) => updateRow(i, "categoryId", Number(v))} value={row.categoryId ? String(row.categoryId) : ""}>
                                                        <SelectTrigger className={`w-full ${form.formState.errors.details?.[i]?.categoryId ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categorys.map((item: any) => (
                                                                console.log("Kaeek", item),
                                                                <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={row.quantity}
                                                        onChange={(e) => updateRow(i, "quantity", Number(e.target.value) || 0)}
                                                        className="w-32 border-gray-200 text-center" /></td>
                                                <td className="py-3 px-4">
                                                    <div className="relative">
                                                        <Input type="number" value={row.rate} readOnly className="w-32 bg-gray-50 border-gray-200 text-center" placeholder={loadingRow === i ? "Loading..." : ""} />
                                                        {loadingRow === i && <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-500" />}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4"><div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm font-medium text-gray-800 text-center">₹{row.basicAmount.toLocaleString()}</div></td>
                                                {/* <td className="py-3 px-4"><Input type="number" min={0} value={row.discountAmount} onChange={(e) => updateRow(i, "discountAmount", Number(e.target.value) || 0)} className="w-32 border-gray-200 text-center" /></td> */}
                                                <td className="py-3 px-4"><Input type="number" min={0} value={row.fineAmount} onChange={(e) => updateRow(i, "fineAmount", Number(e.target.value) || 0)} className="w-32 border-gray-200 text-center" /></td>
                                                <td className="py-3 px-4"><div className="px-3 py-1.5 w-full bg-green-50 border border-green-200 rounded text-sm font-semibold text-green-700 text-center">₹{row.amount.toLocaleString()}</div></td>

                                                <td className="py-3 px-4">
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)} className="h-8 w-8 p-0 text-gray-400 hover:text-red-500">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <SelectSeparator />
                        <div className="px-6 py-4 border-b border-gray-100">
                            <div className="flex flex-col sm:flex-row justify-start sm:items-center">
                                <Button type="button" onClick={addRow} variant="outline" className="border-gray-200 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700">
                                    <PlusCircle className="h-4 w-4 mr-2" /> Add Item
                                </Button>
                            </div>
                        </div>
                        {form.formState.errors.details?.root && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                                {form.formState.errors.details.root.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact and Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Phone className="h-5 w-5 text-gray-500" />
                            Contact Details
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="contactNumber" className="text-sm font-medium text-gray-700 mb-1 block">Contact Number</Label>
                                <Input id="contactNumber" placeholder="+977 98765 43210" {...form.register("contactNumber")} className="border-gray-200" />
                            </div>
                            <div>
                                <Label htmlFor="taxPayerNo" className="text-sm font-medium text-gray-700 mb-1 block">Tax Payer Number</Label>
                                <Input id="taxPayerNo" type="text" placeholder="Tax Payer Number" {...form.register("taxPayerNo")} className={`border-gray-200 ${form.formState.errors.taxPayerNo ? "border-red-300 bg-red-50" : ""}`} />
                                {form.formState.errors.taxPayerNo && (
                                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.taxPayerNo.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1 block">Tax Payer Name</Label>
                                <Input id="name" type="text" placeholder="Tax Payer Name" {...form.register("name")} className={`border-gray-200 ${form.formState.errors.name ? "border-red-300 bg-red-50" : ""}`} />
                                {form.formState.errors.name && (
                                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="remarks" className="text-sm font-medium text-gray-700 mb-1 block">Remarks</Label>
                                <Input id="remarks" placeholder="Special requirements or notes" {...form.register("remarks")} className="border-gray-200" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600">Sub Total</span>
                                <span className="font-medium text-gray-800">₹{subTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600">Fine</span>
                                <span className="font-medium text-red-600">₹{fine.toLocaleString()}</span>
                            </div>
                            {/* <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600">Total Discount</span>
                                <span className="font-medium text-red-600">- ₹{discount.toLocaleString()}</span>
                            </div> */}
                            <div className="border-t border-gray-200 my-2"></div>
                            <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
                                <span className="font-semibold text-gray-800">Net Payable Amount</span>
                                <span className="text-xl font-bold text-gray-900">₹{netAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="sticky bottom-4 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                    <Button
                        type="submit"
                        disabled={isSubmitting || details.length === 0}
                        className={`w-full py-4 font-medium ${details.length === 0 ? 'bg-blue-200 text-gray-400 ' : 'bg-blue-600 hover:bg-blue-900 text-white cursor-pointer'}`}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing Ticket...</>
                        ) : (
                            <><Save className="h-4 w-4 mr-2" /> {details.length === 0 ? 'Add Visitors to Continue' : 'Save Ticket & Print'}</>
                        )}
                    </Button>
                </div>
            </form >
        </div >
    );
}