import React, { useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useFetchAll } from "@/hooks/useFetchAll";
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
// Keeping import if Sidebar/Outlet need it, but removing dependency for the header display
import { useFiscalYear } from '@/context/FiscalYearContext'; 
import type { FiscalYear } from '@/type/fiscalyear';
import { Calendar, Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Fetch the full list of fiscal years
  const { items: rawFyData, isLoadingItems: isLoadingFy } = useFetchAll<any>("/api/fiscalyear", ["fiscalyear"]);

  // Helper to normalize data
  const fiscalYears = useMemo(() => {
    if (!rawFyData) return [];
    if (Array.isArray(rawFyData)) return rawFyData;
    const nestedData = rawFyData.data || rawFyData.Data;
    if (Array.isArray(nestedData)) return nestedData;
    return [];
  }, [rawFyData]);

  // Logic: Find the specific Fiscal Year from the API where isActive is 1 or true
  const displayFy = useMemo(() => {
    if (!fiscalYears || fiscalYears.length === 0) return null;
    
    // Filter for the active fiscal year
    const activeFy = fiscalYears.find((fy: FiscalYear) => 
      fy.isActive === 1 || fy.isActive === true
    );

    return activeFy || null;
  }, [fiscalYears]);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-surface px-6">
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onOpenChange={setIsMobileSidebarOpen}
          sidebarOpen={isSidebarOpen}
          onSidebarToggle={toggleSidebar}
        />
        <div className="flex-1">
          <h1 className="font-headline font-bold text-primary">System</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <span className="material-symbols-outlined text-outline">search</span>
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300 z-50 ambient-shadow",
          isSidebarOpen ? "w-60" : "w-20"
        )}>
          <Sidebar isOpen={isSidebarOpen} />
        </aside>

        {/* Main Content */}
        <main className={cn("flex-1 lg:transition-all lg:duration-300 bg-surface")}>
          {/* Desktop Header */}
          <DesktopHeader
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={toggleSidebar}
            activeFy={displayFy}
            isLoading={isLoadingFy}
          />

          {/* Page Content */}
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

interface DesktopHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeFy?: FiscalYear | null;
  isLoading?: boolean;
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  onToggleSidebar,
  activeFy,
  isLoading,
}) => {
  return (
    <header className="hidden lg:flex h-16 items-center justify-between px-8 sticky top-0 z-40 bg-surface text-primary">
      <div className="flex items-center gap-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-10 w-10 hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined">menu</span>
        </Button>
        
        <h2 className="font-headline font-bold tracking-tight text-xl">Tax Compliance Tracker</h2>
        
        {/* Active Fiscal Year Display based on API Flag */}
        {isLoading ? (
          <div className="flex items-center gap-2 h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg w-[140px] animate-pulse">
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
            <span className="text-sm text-slate-400">Loading...</span>
          </div>
        ) : activeFy ? (
          <div className="flex items-center gap-2 h-10 px-3 bg-primary/5 border border-primary/20 rounded-lg">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              FY {activeFy.fiscalYear}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 h-10 px-3 bg-red-50 border border-red-200 rounded-lg">
            <Calendar className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-600">
              No Active FY Found
            </span>
          </div>
        )}

      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <span className="material-symbols-outlined p-2 text-outline hover:bg-surface-container-low rounded-full transition-colors cursor-pointer">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border-2 border-surface"></span>
        </div>
        <span className="material-symbols-outlined p-2 text-outline hover:bg-surface-container-low rounded-full transition-colors cursor-pointer">settings</span>
        <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant">
          <img
            alt="Administrator Profile"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_jRfTD3DULUoQVmnnXWVmhyQ_-UhhVFJYd8ORvgG5bqf8QS9AtYAiuP9Hmm55BVDalwG8e9khsOtpBG7a-F53RbA0UqzlX_cQkw-PIxpZS8Am8qyqzJa3HaG721QlNxP4yHuyb4KWmMVVpTFPRJc8XseAsOsRtXxxsX-pZFyHHM5eQviN3FKCoB2vGgg5oTxdkGQHiu5zbaSWBFByan5R9g-xq13EXnjkBACd6nVpOa3WX_IqD9KxXJoPbsC6XzqlXFyWem96GW8"
          />
        </div>
      </div>
    </header>
  );
};

export default MainLayout;