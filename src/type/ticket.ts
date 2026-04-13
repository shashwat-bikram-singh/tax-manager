export interface Get_Ticket {
    id: number;
    displayTicketNo: string;
    fiscalYearId: number;
    fiscalYear: string;
    officeId: number;
    office: string;
    subOffice: string;
    subOfficeId: number;
    email: string | null;
    contactNumber: string | null;
    remarks: string | null;
    user: string;
    ticketMiti: string;
    gatewayReferenceId: string | null;
    transactionMode: string;
    entryStatus: boolean;
    ticketDate: string;
    subTotal: number;
    discount: number;
    netAmount: number;
    details: TicketDetail[];
}

export interface TicketDetail {
    id: number;
    ticketId: number;
    numberOfPerson: number;
    visitorType: "Nepalese" | "Foreigner" | "Child" | string;
    rate: number;
    basicAmount: number;
    discountAmount: number;
    amount: number;
}
