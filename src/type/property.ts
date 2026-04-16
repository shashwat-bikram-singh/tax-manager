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


export interface PropertyDetail {
    id: number;
    userId: number;
    name: string;
    propertyTypeId: number;
    fiscalYearId: number;
    provinceId: number;
    districtId: number;
    localBodyId: number;
    wardNo: number;
    kittaNumber: string;
    sheetNumber: string | null;
    description: string;
    areaInSqMeters: number;
    geoCoordinates: string;
    noOfFloor: number;
    constructionYear: string;
    usageId: number;
    legalStatusId: number;
    usageRightsId: number;
    ownershipTypeId: number;
    ownershipTransferMiti: string;

}