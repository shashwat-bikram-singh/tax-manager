export interface ProvinceData {
  Id: number;
  Name: string;
  TotalProperty: number;
}

export interface DistrictData {
  Name: string;
  DistrictId: number;
  ProvinceId: number;
  TotalProperty: number;
  TotalLand: number;
  TotalBuilding: number;
}
export interface OwnershipDistribution {
  OwnershipTypeId: number;
  OwnershipName: string;
  ProvinceId: number;
  ProvinceName: string;
  DistrictId: number;
  DistrictName: string;
  LocalBodyId: number;
  LocalBodyName: string;
  TotalProperty: number;
}

export interface LocalBodyData {
  LocalBodyId: number;
  Name: string;
  TotalProperty: number;
  DistrictId?: number; // Optional for backward compatibility
}

export interface DashboardData {
  userRole: string;
  totalProperty: number;
  totalLand: number;
  totalBuilding: number;
  totalPaidProperty: number;
  totalPaidAmount: number;
  paymentPercentage: number;
  provinceData: string; // JSON string
  districtData: string; // JSON string
  localBodyData: string; // JSON string
  ownershipDistribution: string; // JSON string
}

export interface LeaderboardData {
  officeId: number,
  officeName: string,
  totalProperties: number,
  totalValuation: number,
  rankPosition: number
}