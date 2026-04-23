import React, { useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useFetchAll } from "@/hooks/useFetchAll";
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import type { FiscalYear } from '@/type/fiscalyear';
import { Calendar, Loader2, Languages, ChevronDown } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import i18n from '@/config/i18n'; // Direct import to ensure changeLanguage is always available
import { t } from 'i18next';

const LanguageSwitcher = () => {
  const [open, setOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English', short: 'En' },
    { code: 'np', label: 'नेपाली', short: 'ने' },
  ];

  // Use the imported i18n instance directly to prevent runtime errors
  const currentLangObj = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-2 px-3">
          <Languages className="h-4 w-4" />
          <span className="text-sm font-medium">{currentLangObj.short}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={i18n.language === lang.code ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleLanguageChange(lang.code)}
          >
            {lang.label}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

const MainLayout: React.FC = () => {
  // Use the hook here to ensure the layout text updates when language changes
  const { t } = useTranslation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Fetch the full list of fiscal years
  const { items: rawFyData, isLoadingItems: isLoadingFy } = useFetchAll<any>("/api/fiscalyear", ["fiscalyear"]);

  // Helper to normalize data
  const fiscalYears = useMemo(() => {
    if (!rawFyData) return [];
    if (Array.isArray(rawFyData)) return rawFyData;
    const nestedData = rawFyData.data || rawFyData.data;
    if (Array.isArray(nestedData)) return nestedData;
    return [];
  }, [rawFyData]);

  // Logic: Find the specific Fiscal Year from the API where isActive is 1 or true
  const displayFy = useMemo(() => {
    if (!fiscalYears || fiscalYears.length === 0) return null;

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
            <span className="material-symbols-outlined text-outline">{t("common.search")}</span>
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
          <div className="p-4 max-w-7xl mx-auto space-y-8">
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
    <header className="hidden lg:flex h-16 items-center justify-between px-5 sticky top-0 z-40 bg-surface text-primary">
      <div className="flex items-center ">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-10 w-10 hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined">menu</span>
        </Button>
      </div>

      <div className="flex items-center gap-6 mx-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 h-10 px-3 bg-slate-50 w-[160px] animate-pulse
    border-[3px] border-transparent
    [border-image-source:url('data:image/svg+xml,%3Csvg_width=%2220%22_height=%2220%22_viewBox=%220_0_20_20%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath_d=%22M0_10_Q_5_0,_10_10_T_20_10%22_fill=%22none%22_stroke=%22%23cbd5e1%22_stroke-width=%223%22/%3E%3C/svg%3E')]
    [border-image-slice:30%] [border-image-repeat:round]">
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
            <span className="text-sm text-slate-400">{t("dashboard.loading")}</span>
          </div>
        ) : activeFy ? (
          <div className="flex items-center gap-2 h-10 px-3 bg-primary/5
    border-[3px] border-transparent
    [border-image-source:url('data:image/svg+xml,%3Csvg_width=%2220%22_height=%2220%22_viewBox=%220_0_20_20%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath_d=%22M0_10_Q_5_0,_10_10_T_20_10%22_fill=%22none%22_stroke=%22%233b82f6%22_stroke-width=%223%22/%3E%3C/svg%3E')]
    [border-image-slice:30%] [border-image-repeat:round]">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">FY {activeFy.fiscalYear}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 h-10 px-3 bg-red-50
    border-[3px] border-transparent
    [border-image-source:url('data:image/svg+xml,%3Csvg_width=%2220%22_height=%2220%22_viewBox=%220_0_20_20%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath_d=%22M0_10_Q_5_0,_10_10_T_20_10%22_fill=%22none%22_stroke=%22%23ef4444%22_stroke-width=%223%22/%3E%3C/svg%3E')]
    [border-image-slice:30%] [border-image-repeat:round]">
            <Calendar className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-600">{t("dashboard.noActiveFYFound")}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <NotificationPanel />
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