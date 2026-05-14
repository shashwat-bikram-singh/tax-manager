import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Building,
  FolderOpen,
  Scale,
  Calendar,
  LogOut,
  Users,
  Building2,
  Calculator,
  FileCheck,
  Split
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { t } from 'i18next';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const { token } = useAuthStore();

  let decoded: any = null;
  if (token && typeof token === "string") {
    try {
      decoded = jwtDecode(token);
    } catch (error) {
      console.error("Invalid token:", error);
      sessionStorage.removeItem("token");
    }
  }

  const Role = decoded?.Role;

  const handleLogout = () => {
    logout();
    navigate("/generic-page"); // ✅ Redirect to generic-page on logout
  };

  const iconMap: Record<string, React.ElementType> = {
    dashboard: LayoutDashboard,
    domain: Building,
    folder_shared: FolderOpen,
    gavel: Scale,
    converter: Calculator,
    CalendarDays: Calendar,
    logout: LogOut,
    person: Users,
    corporate_fare: Building2,
    FileCheck: FileCheck,
    Split: Split,
  };

  return (
    <aside
      className={cn(
        "h-full flex flex-col bg-slate-50 border-r border-slate-200 transition-all duration-300 relative z-20",
        isOpen ? "w-60" : "w-20"
      )}
    >
      {/* Branding */}
      <div className="flex items-center justify-between p-6 h-20">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <img src="/TU.png" alt="TU" className="w-8 h-8 object-contain" />
          </div>
          {isOpen && (
            <div className="overflow-hidden transition-opacity duration-200">
              <h1 className="font-bold text-slate-900 leading-tight truncate text-lg">{t("app.title")}</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold truncate">Property Authority</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <NavItem
          to="/app"
          icon="dashboard"
          label={t("sidebar.dashboard")}
          isOpen={isOpen}
          iconMap={iconMap}
        />
        <NavItem
          to="/app/property"
          icon="domain"
          label={t("sidebar.propertyInventory")}
          isOpen={isOpen}
          iconMap={iconMap}
        />
        <NavItem
          to="/app/document-vault"
          icon="folder_shared"
          label={t("sidebar.documentVault")}
          isOpen={isOpen}
          iconMap={iconMap}
        />
        <NavItem
          to="/app/tax-compliance"
          icon="gavel"
          label={t("sidebar.taxCompliance")}
          isOpen={isOpen}
          iconMap={iconMap}
        />
        <NavItem
          to="/app/converter"
          icon="converter"
          label={t("sidebar.areaConverter")}
          isOpen={isOpen}
          iconMap={iconMap}
        />

        {/* --- Administration Section --- */}
        {(Role === "Admin" || Role === "SuperAdmin") && isOpen && (
          <div className="pt-6 pb-2 px-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t("sidebar.administration")}</p>
          </div>
        )}

        {(Role === "Admin" || Role === "SuperAdmin") && (
          <>
            <NavItem
              to="/app/fiscalyear"
              icon="CalendarDays"
              label={t("sidebar.fiscalYear")}
              isOpen={isOpen}
              iconMap={iconMap}
            />
            <NavItem
              to="/app/office"
              icon="corporate_fare"
              label={t("sidebar.office")}
              isOpen={isOpen}
              iconMap={iconMap}
            />
            <NavItem
              to="/app/user"
              icon="person"
              label={t("sidebar.user")}
              isOpen={isOpen}
              iconMap={iconMap}
            />
          </>
        )}

        {Role === "SuperAdmin" && (
          <>
            <div className="pt-6 pb-2 px-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Reports</p>
            </div>
            <NavItem
              to="/app/tax-compliance-report"
              icon="FileCheck"
              label="Tax Compliance Report"
              isOpen={isOpen}
              iconMap={iconMap}
            />
            <NavItem
              to="/app/result"
              icon="Split"
              label="Decision Logic"
              isOpen={isOpen}
              iconMap={iconMap}
            />
          </>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-slate-500 text-sm hover:text-red-600 hover:bg-red-50 transition-colors w-full rounded-lg group",
            !isOpen && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          {isOpen && <span>{t("sidebar.logout")}</span>}
        </button>
      </div>
    </aside>
  );
};

interface NavItemProps {
  to: string;
  icon: string;
  label: string;
  isOpen: boolean;
  iconMap: Record<string, React.ElementType>;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isOpen, iconMap }) => {
  const IconComponent = iconMap[icon];

  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-3 py-2.5 transition-all rounded-lg text-sm font-medium",
        isActive
          ? "bg-white text-blue-600 shadow-sm border border-slate-100"
          : "text-slate-600 hover:bg-white hover:text-slate-900",
        !isOpen && "justify-center px-0 py-2.5"
      )}
      title={!isOpen ? label : undefined}
    >
      {IconComponent && (
        <IconComponent className="w-5 h-5 shrink-0" />
      )}
      {isOpen && <span className="truncate">{label}</span>}
    </NavLink>
  );
};

export default Sidebar;