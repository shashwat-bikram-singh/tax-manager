export interface DocumentNumbering {
    id: number,
    fiscalYearId: number,
    fiscalYear: string,
    officeId: number,
    subOfficeId: number,
    subOffice: string,
    moduleId: number,
    module: string,
    subModuleId: number,
    subModule: string,
    startNumber: number,
    prefix: string,
    suffix: string,
    length: number
}