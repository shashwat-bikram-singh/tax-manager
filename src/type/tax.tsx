export interface Tax{
    id?: number,
    OfficeId: number,
    receiptNo: string,
    FIscalYearId: number,
    PropertyId: number,
    amount: number,
    FilePath: string,
    BlobPath: string,
    FileExtension: string,
    UserId: number,
    File: string,
    isPaid: number | boolean,
    property: string,
    FiscalYearName?: string,
    paymentMiti: string
}