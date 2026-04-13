export interface Suboffice {
    id: number;
    officeId: number;
    name: string;
    title: string | null;
    subTitle: string | null;
    address: string;
    photoFileName: string | null;
    photoUrl: string;
}