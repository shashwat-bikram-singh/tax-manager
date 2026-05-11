export interface IssueSummary {
  Category: string;
  Total: number;
}
export interface PropertyIssueRawResponse {
  summary: string;
  litigationDetails: string;
  encroachedDetails: string;
  missingDocumentDetails: string;
}
export interface PropertyDetail {
  Id: number;
  PropertyTypeId: number;
  OwnershipTypeId: number;
  OwnershipName: string;
  ProvinceId: number;
  ProvinceName: string;
  DistrictId: number;
  DistrictName: string;
  LocalBodyId: number;
  LocalBodyName: string;
  KittaNumber: string;
  SheetNumber: string;
  Area?: number;
}
export interface PropertyIssueData {
  summary: IssueSummary[];
  litigationDetails: PropertyDetail[];
  encroachedDetails: PropertyDetail[];
  missingDocumentDetails: PropertyDetail[];
}