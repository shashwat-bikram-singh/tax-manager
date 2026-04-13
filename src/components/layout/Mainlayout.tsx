import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
// import UserDropdown from './UserDropdown';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
        {/* Desktop Sidebar - Fixed with external toggle */}
        <aside className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300 z-50 ambient-shadow",
          isSidebarOpen ? "w-60" : "w-20"
        )}>
          <Sidebar isOpen={isSidebarOpen} />
        </aside>

        {/* Main Content */}
        <main className={cn("flex-1 lg:transition-all lg:duration-300 bg-surface")}>
          {/* Desktop Header with Sidebar Toggle */}
          <DesktopHeader
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={toggleSidebar}
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
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  onToggleSidebar,
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
        <div className="relative group">
          <div className="flex items-center gap-2 bg-surface-container-low px-4 py-1.5 rounded-full text-xs font-semibold text-primary border border-primary/10">
            <span>F/Y 2080/81</span>
            <span className="material-symbols-outlined text-sm">expand_more</span>
          </div>
        </div>
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