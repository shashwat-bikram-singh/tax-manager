export interface PropertyType {
    id: number;
    propertyType: string;
}


export interface LegalStatus {
    id: number;
    name: string;
}

export interface UsageRights {
    id: number;
    name: string;
}

export interface UsageType {
    id: number;
    name: string;
}

export interface OwnershipType {
    id: number;
    name: string;
}

export interface Province {
    id: number,
    name: string,
    nameNp: string,
    displayOrder: number
}

export interface District {
    id: number,
    name: string,
    provinceId: number
}

export interface Localbody {
    id: number,
    name: string,
    districtId: number,
    isMunicipality: boolean
}

