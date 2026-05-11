export interface ProvinceTaxSummary {
  provinceId: number;
  provinceName: string;
  totalProperties: number;
  totalTaxLiability: number;
  totalTaxPaid: number;
  outstandingBalance: number;
  previousYearPaid: number;
  paidGrowthPercent: number | null;
}

export interface OverallTaxSummary {
  overallProperties: number;
  overallTaxLiabilities: number;
  overallTaxPaid: number;
  overallOutstandingBalance: number;
}

export interface TaxDashboardData {
  table: ProvinceTaxSummary[];
  table1: OverallTaxSummary[];
}

export interface ApiResponse {
  data: TaxDashboardData;
  success: boolean;
  message: string | null;
  errors: any;
}