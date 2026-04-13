export interface CurrentOffice {
    id: number;
    key: string;
    name: string;
    title: string | null;
    subTitle: string | null;
    address: string;
    phone: string;
    email: string;
    logoFileName: string | null;
    logoUrl: string | null;
    resourceAccessKey: string | null;
}