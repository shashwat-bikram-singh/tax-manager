import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash, X, Printer, } from "lucide-react";
import { toast } from "sonner";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useMutate } from "@/hooks/useMutate";
import type { Get_Ticket } from "@/type/ticket";
import { useAuthStore } from "@/store/authStore";


export default function BusinessTaxInformation() {
    const { items: ticketData, isLoadingItems, error: fetchError } = useFetchAll<Get_Ticket>("/api/ticket", ["ticket"]);
    const { delete: deleteticket } = useMutate<Get_Ticket>("/api/ticket", "ticket");
    const role = useAuthStore(state => state.role)
    console.log("ticket", ticketData)
    function getTickets(ticketData: any) {
        if (!ticketData) return [];
        if (Array.isArray(ticketData)) return ticketData;
        const dataCandidate = (ticketData as any).Data || (ticketData as any).data;
        if (Array.isArray(dataCandidate)) return dataCandidate;

        const items: Get_Ticket[] = [];
        let i = 0;
        while ((ticketData as any)[i] !== undefined) {
            items.push((ticketData as any)[i]);
            i++;
        }
        if (items.length > 0) return items;

        return [];
    }

    const tickets = getTickets(ticketData);

    const [searchTerm, setSearchTerm] = useState("");
    const [entriesPerPage, setEntriesPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Get_Ticket;
        direction: "ascending" | "descending";
    } | null>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [subofficeToDelete, setSubofficeToDelete] = useState<Get_Ticket | null>(null);
    const [columnVisibility, setColumnVisibility] = useState<
        Record<string, boolean>
    >({
        sn: true,
        ticketMiti: true,
        ticketNumber: true,
        subOffice: true,
        user: true,
        transactionMode: true,
        netAmount: true,
        actions: true,
    });

    function sortTicket<T extends Record<string, any>>(
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
                return sortConfig.direction === "ascending"
                    ? aValue - bValue
                    : bValue - aValue;
            }

            return 0;
        });

        return sortableItems;
    }

    const sortedTickets = sortTicket(tickets, sortConfig);

    // Handle filtering and search
    const filteredTickets = sortedTickets.filter((item) => {
        const matchesSearch =
            searchTerm === "" ||
            (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.displayTicketNo && item.displayTicketNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.address && item.address.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
    });

    // Pagination
    const totalPages = Math.ceil(filteredTickets.length / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const paginatedTickets = filteredTickets.slice(startIndex, startIndex + entriesPerPage);

    // Calculate total net amount from all filtered tickets
    const totalNetAmount = filteredTickets.reduce((sum, ticket) => sum + (Number(ticket.netAmount) || 0), 0);


    // Request sort
    const requestSort = (key: keyof Get_Ticket) => {
        let direction: "ascending" | "descending" = "ascending";
        if (
            sortConfig &&
            sortConfig.key === key &&
            sortConfig.direction === "ascending"
        ) {
            direction = "descending";
        }
        setSortConfig({ key, direction });
    };

    // Get sort indicator
    const getSortIndicator = (key: keyof Get_Ticket) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === "ascending" ? (
            <ChevronUp className="inline h-4 w-4" />
        ) : (
            <ChevronDown className="inline h-4 w-4" />
        );
    };

    // Page navigation
    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Handle delete
    const confirmDelete = (item: Get_Ticket) => {
        setSubofficeToDelete(item);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (subofficeToDelete) {
            try {
                await deleteticket.mutateAsync(subofficeToDelete.id);
                toast.success("Ticket cancelled successfully ✅", {
                    style: { background: "#10b981", color: "white" },
                });
                setDeleteDialogOpen(false);
                setSubofficeToDelete(null);
            } catch (err) {
                toast.error("Failed to cancel ticket", {
                    style: { background: "#c6212d", color: "white" },
                });
            }
        }
    };

    if (isLoadingItems) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    if (fetchError) return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load suboffices: {fetchError.message}</div>;

    // Mobile responsive card view
    const MobileSubofficeCard = ({ item }: { item: Get_Ticket }) => (
        <div className="bg-white rounded-lg border p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                    <h3 className="font-medium text-md text-blue-600 cursor-pointer underline" onClick={() => window.open(`/ticket-print/${item.id}`, "_blank")}>{item.displayTicketNo}</h3>
                    <p className="text-sm text-gray-500">Miti: {item.ticketMiti}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">

                {role === "Admin" && (
                    <div>
                        <span className="text-gray-400">SubOffice:</span> {item.subOffice || "-"}
                    </div>
                )}
                <div>
                    <span className="text-gray-400">Amount:</span> {item.netAmount || "-"}
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <h4 className="font-medium text-sm">User: {item.user}</h4>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t">

                <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    onClick={() => confirmDelete(item)}
                >
                    <Trash size={16} />
                </Button>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-6 bg-white rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-semibold text-gray-800">Ticket Information</h2>
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div className="relative w-full lg:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        type="search"
                        placeholder="Search ticket..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="hidden sm:flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto">
                                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {Object.entries(columnVisibility).map(([key, visible]) => (
                                    <DropdownMenuCheckboxItem
                                        key={key}
                                        checked={visible}
                                        onCheckedChange={() =>
                                            setColumnVisibility({
                                                ...columnVisibility,
                                                [key]: !visible,
                                            })
                                        }
                                    >
                                        {key.charAt(0).toUpperCase() + key.slice(1)}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Desktop Table (hidden on mobile) */}
            <div className="hidden md:block rounded-md border mb-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columnVisibility.sn && (
                                <TableHead className="w-12">S.N.</TableHead>
                            )}
                            {columnVisibility.ticketNumber && (
                                <TableHead
                                    className="cursor-pointer"
                                    onClick={() => requestSort("displayTicketNo")}
                                >
                                    Ticket Number {getSortIndicator("displayTicketNo")}
                                </TableHead>
                            )}
                            {columnVisibility.ticketMiti && (
                                <TableHead
                                    className="cursor-pointer"
                                    onClick={() => requestSort("ticketMiti")}
                                >
                                    Miti {getSortIndicator("ticketMiti")}
                                </TableHead>
                            )}
                            {columnVisibility.subOffice && role === "Admin" && (
                                < TableHead
                                    className="cursor-pointer"
                                    onClick={() => requestSort("subOffice")}
                                >
                                    SubOffice {getSortIndicator("subOffice")}
                                </TableHead>
                            )}

                            {columnVisibility.user && (
                                <TableHead
                                    className="cursor-pointer"
                                    onClick={() => requestSort("user")}
                                >
                                    User {getSortIndicator("user")}
                                </TableHead>
                            )}
                            {columnVisibility.netAmount && (
                                <TableHead
                                    className="cursor-pointer"
                                    onClick={() => requestSort("netAmount")}
                                >
                                    Amount {getSortIndicator("netAmount")}
                                </TableHead>
                            )}
                            {columnVisibility.actions && (
                                <TableHead className="text-center">Actions</TableHead>
                            )}
                        </TableRow>

                    </TableHeader>
                    <TableBody>
                        {paginatedTickets.length > 0 ? (
                            paginatedTickets.map((item, index) => (
                                <TableRow key={item.id}>
                                    {columnVisibility.sn && (
                                        <TableCell>
                                            {(currentPage - 1) * entriesPerPage + index + 1}
                                        </TableCell>
                                    )}
                                    {columnVisibility.ticketNumber && (
                                        <TableCell className="text-blue-600 font-semibold cursor-pointer underline" onClick={() => window.open(`/ticket-print-agri/${item.id}`, "_blank")}>{item.displayTicketNo || "-"}</TableCell>
                                    )}
                                    {columnVisibility.ticketMiti && (
                                        <TableCell >{item.ticketMiti}</TableCell>
                                    )}
                                    {columnVisibility.subOffice && role === "Admin" && (
                                        <TableCell >{item.subOffice}</TableCell>
                                    )}

                                    {columnVisibility.user && (
                                        <TableCell>{item.user || "-"}</TableCell>
                                    )}
                                    {columnVisibility.netAmount && (
                                        <TableCell>{"Rs. " + item.netAmount}</TableCell>
                                    )}
                                    {columnVisibility.actions && (
                                        <TableCell className="flex gap-2 justify-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                                onClick={() => window.open(`/ticket-print-revenue/${item.id}`, "_blank")}
                                            >
                                                <Printer size={16} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                onClick={() => confirmDelete(item)}
                                            >
                                                <X size={16} />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={
                                        Object.values(columnVisibility).filter(Boolean).length
                                    }
                                    className="h-24 text-center"
                                >
                                    No suboffices found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    {/* Total Footer Row */}
                    {paginatedTickets.length > 0 && (
                        <TableBody>
                            <TableRow className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                                {/* Left side - Total Tickets Count */}
                                {columnVisibility.sn && (
                                    <TableCell className="font-bold text-blue-700">
                                        Total: {filteredTickets.length}
                                    </TableCell>
                                )}
                                {/* Middle columns - "Total Amount:" label */}
                                <TableCell
                                    colSpan={
                                        Object.values(columnVisibility).filter(Boolean).length -
                                        (columnVisibility.sn ? 1 : 0) -
                                        (columnVisibility.netAmount ? 1 : 0) -
                                        (columnVisibility.subOffice ? 1 : 0) -
                                        (columnVisibility.actions ? 1 : 0)
                                    }
                                    className="text-right font-bold"
                                >
                                    Total Amount:
                                </TableCell>
                                {/* Right side - Total Amount */}
                                {columnVisibility.netAmount && (
                                    <TableCell className="font-bold text-center text-green-700">
                                        Rs. {totalNetAmount.toLocaleString('en-IN')}
                                    </TableCell>
                                )}

                            </TableRow>
                        </TableBody>
                    )

                    }
                </Table>
            </div>

            {/* Mobile Cards (visible only on mobile) */}
            <div className="md:hidden">
                {paginatedTickets.length > 0 ? (
                    paginatedTickets.map((item) => (
                        <MobileSubofficeCard key={item.id} item={item} />
                    ))
                ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">No suboffices found.</p>
                    </div>
                )}
            </div>
            {/* Pagination */}
            <div className="hidden sm:flex items-center justify-between px-2 mt-4 flex-col sm:flex-row gap-4">
                <div className="flex items-center text-sm text-muted-foreground">
                    Showing{" "}
                    {filteredTickets.length === 0
                        ? 0
                        : (currentPage - 1) * entriesPerPage + 1}{" "}
                    to {Math.min(currentPage * entriesPerPage, filteredTickets.length)} of{" "}
                    {filteredTickets.length} entries
                </div>

                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Show</p>
                        <Select
                            value={entriesPerPage.toString()}
                            onValueChange={(value) => {
                                setEntriesPerPage(Number(value));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={entriesPerPage} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
                                    <SelectItem key={pageSize} value={pageSize.toString()}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-sm font-medium">entries</p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="text-sm">
                            Page {currentPage} of {totalPages}
                        </span>

                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Cancellation</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to Cancel the ticket{" "}
                            {subofficeToDelete?.displayTicketNo}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
