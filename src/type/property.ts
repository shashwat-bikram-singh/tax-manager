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

export interface GeographicRegion {
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
    isMunicipality: boolean,
    provinceId: number
}


export interface PropertyDetail {
    id: number;
    userId: number;
    name: string;
    propertyTypeId: number;
    propertyType: string;
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
    geographicRegionId: number;
    ownershipTransferMiti: string;
    defaultArea: string;
    valuation?: number | string;
    encroachmentRisk?: string;
    currentUsage?: number; // used to populate usageRights field in form
    latitude?: string;
    longitude?: string;
    bigha?: number;
    kattha?: number;
    dhur?: number;
    ropani?: number;
    aana?: number;
    paisa?: number;
    daam?: number;
    landArea?: number; // used to calculate area fields
    landGeoCoordinate?: string; // same as geoCoordinates
    building_Latitude: number,
    building_Longitude: number,
    land_Latitude: number,
    land_Longitude: number
    Latitude: number,
    Longitude: number,
    buildingArea: number
}