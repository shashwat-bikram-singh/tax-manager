import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFetchAll } from "@/hooks/useFetchAll";
import { useFiscalYear } from "@/context/FiscalYearContext";
import type { FiscalYear } from "@/type/fiscalyear";
import type { Tax } from "@/type/tax";
import { cn } from '@/lib/utils';
import {
  Building,
  Receipt,
  DollarSign,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  FileText,
  Calendar,
  ChevronRight,
} from "lucide-react";

interface DashboardStats {
  totalProperties: number;
  paidProperties: number;
  unpaidProperties: number;
  totalTaxDue: number;
  totalCollected: number;
  complianceRate: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedFiscalYearId, selectedFiscalYear } = useFiscalYear();
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    paidProperties: 0,
    unpaidProperties: 0,
    totalTaxDue: 0,
    totalCollected: 0,
    complianceRate: 0,
  });

  const { items: paymentData, isLoadingItems: loadingPayments } = useFetchAll<Tax>(
    selectedFiscalYearId ? `/api/paymentStatus?fiscalYearId=${selectedFiscalYearId}` : "/api/paymentStatus",
    selectedFiscalYearId ? ["payments-dashboard", selectedFiscalYearId] : ["payments-dashboard"]
  );

  const { items: propertyData, isLoadingItems: loadingProperties } = useFetchAll<{ id: number }>("/api/property", ["property-count"]);

  useEffect(() => {
    if (paymentData && paymentData.data) {
      const payments = paymentData.data as Tax[];
      const paid = payments.filter(p => p.isPaid === 1 || p.isPaid === true);
      const unpaid = payments.filter(p => p.isPaid !== 1 && p.isPaid !== true);
      
      const totalDue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalCollected = paid.reduce((sum, p) => sum + (p.amount || 0), 0);
      const rate = payments.length > 0 ? (paid.length / payments.length) * 100 : 0;

      setStats({
        totalProperties: payments.length,
        paidProperties: paid.length,
        unpaidProperties: unpaid.length,
        totalTaxDue: totalDue,
        totalCollected: totalCollected,
        complianceRate: rate,
      });
    }
  }, [paymentData]);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    trend?: string; 
    color: string;
  }) => (
    <div className={cn("p-6 rounded-2xl space-y-2 border-l-4 shadow-sm hover:shadow-md transition-shadow", color)}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
      <h3 className="font-headline text-3xl font-black">{value}</h3>
      {trend && (
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </div>
      )}
    </div>
  );

  const loading = loadingPayments || loadingProperties;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 text-sm">
            Fiscal Year: <span className="font-semibold text-primary">{selectedFiscalYear?.fiscalYear || "Not Selected"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">{new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Properties" 
          value={stats.totalProperties} 
          icon={Building}
          color="bg-slate-50 border-slate-300"
        />
        <StatCard 
          title="Tax Due" 
          value={`Rs. ${(stats.totalTaxDue / 100000).toFixed(1)}L`} 
          icon={DollarSign}
          color="bg-blue-50 border-blue-400"
        />
        <StatCard 
          title="Collected" 
          value={`Rs. ${(stats.totalCollected / 100000).toFixed(1)}L`} 
          icon={CheckCircle}
          color="bg-green-50 border-green-400"
        />
        <StatCard 
          title="Compliance" 
          value={`${stats.complianceRate.toFixed(1)}%`} 
          icon={Activity}
          color="bg-purple-50 border-purple-400"
        />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Status Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
          <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
            <h4 className="font-headline font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Payment Status
            </h4>
            <button 
              onClick={() => navigate("/tax-compliance")}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                  <th className="px-6 py-3">Property</th>
                  <th className="px-6 py-3">Receipt No</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {paymentData?.data?.slice(0, 5).map((item: Tax, idx: number) => (
                  <tr key={item.id} className={cn(
                    "hover:bg-slate-50 transition-colors border-b border-slate-100",
                    idx % 2 !== 0 && "bg-slate-50/30"
                  )}>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.property || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{item.receiptNo || "-"}</td>
                    <td className="px-6 py-4 text-right font-medium">Rs. {Number(item.amount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        item.isPaid === 1 || item.isPaid === true 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      )}>
                        {item.isPaid === 1 || item.isPaid === true ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!paymentData?.data || paymentData.data.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      No payment records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h4 className="font-headline font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Summary
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-slate-600">Paid</span>
                </div>
                <span className="font-bold text-green-600">{stats.paidProperties}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-slate-600">Unpaid</span>
                </div>
                <span className="font-bold text-red-600">{stats.unpaidProperties}</span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500 h-full rounded-full transition-all" 
                    style={{ width: `${stats.complianceRate}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 text-right">{stats.complianceRate.toFixed(1)}% Compliance</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-primary text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <h4 className="font-headline font-bold text-lg mb-4">Quick Actions</h4>
              <button 
                onClick={() => navigate("/tax-payer/add")}
                className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              >
                <Receipt className="w-5 h-5" />
                Add Payment
              </button>
              <button 
                onClick={() => navigate("/document-vault")}
                className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              >
                <FileText className="w-5 h-5" />
                View Documents
              </button>
              <button 
                onClick={() => navigate("/property")}
                className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              >
                <Building className="w-5 h-5" />
                Properties
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}