import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const role = useAuthStore(state => state.role);
  // const subOffice = sessionStorage.getItem("SubOffice");
  // const username = sessionStorage.getItem("Username");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className={cn(
      "h-full flex flex-col bg-surface-container-low transition-all duration-300",
      isOpen ? "w-64" : "w-20"
    )}>
      {/* Branding */}
      <div className="flex items-center gap-3 p-6">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
        </div>
        {isOpen && (
          <div className="overflow-hidden">
            <h1 className="font-headline font-black text-primary leading-tight truncate">TU PMS</h1>
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold truncate">Property Authority</p>
          </div>
        )}
      </div>  

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <NavItem
          to="/"
          icon="dashboard"
          label="Dashboard"
          isOpen={isOpen}
        />
        <NavItem
          to="/property-inventory"
          icon="domain"
          label="Property Inventory"
          isOpen={isOpen}
        />
        <NavItem
          to="/document-vault"
          icon="folder_shared"
          label="Document Vault"
          isOpen={isOpen}
        />
        <NavItem
          to="/tax-compliance"
          icon="gavel"
          label="Tax Compliance"
          isOpen={isOpen}
          isActiveOverride={true}
        />
        <NavItem
          to="/analytics"
          icon="analytics"
          label="Analytics"
          isOpen={isOpen}
        />

        {/* Existing Modules (Simplified or Collapsible) - can be added back if needed */}
        {role === "Admin" && isOpen && (
          <div className="pt-6 pb-2 px-3">
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold">Administration</p>
          </div>
        )}
        {(role === "Admin" || role === "OfficeAdmin") && (
          <NavItem
            to="/suboffice"
            icon="corporate_fare"
            label="Sub Offices"
            isOpen={isOpen}
          />
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 space-y-4">
        {/* {isOpen && (
          <button className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Generate Report
          </button>
        )} */}


        <div className={cn("pt-4 border-t border-outline/10 space-y-1", !isOpen && "flex flex-col items-center")}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-outline text-sm hover:text-secondary transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

interface NavItemProps {
  to: string;
  icon: string;
  label: string;
  isOpen: boolean;
  isActiveOverride?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isOpen, isActiveOverride }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-3 py-2.5 transition-all rounded-lg text-sm font-medium",
        (isActive || isActiveOverride) ? "bg-white text-primary shadow-sm font-semibold" : "text-outline hover:bg-white/60 hover:text-primary",
        !isOpen && "justify-center px-0"
      )}
      title={label}
    >
      <span className="material-symbols-outlined">{icon}</span>
      {isOpen && <span>{label}</span>}
    </NavLink>
  );
};

export default Sidebar;