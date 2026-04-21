export interface ProvinceData {
  ProvinceId: number;
  Name: string;
  TotalProperty: number;
}

export interface DistrictData {
  Name: string;
  DistrictId: number;
  TotalProperty: number;
}

export interface LocalBodyData {
  LocalBodyId: number;
  Name: string;
  TotalProperty: number;
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
}
