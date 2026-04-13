// components/SuperAdmin/super-admin-navbar.tsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Building,
  ChevronDown,
  ChevronRight,
  LayoutDashboard
} from "lucide-react";

export default function SuperAdminNavbar() {
  const [isOfficeOpen, setIsOfficeOpen] = useState(false);
  const location = useLocation();

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const menuItemClass = (isActive: boolean) =>
    `flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${isActive
      ? 'bg-purple-100 text-purple-700 border-l-4 border-purple-600'
      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <nav className="w-64 bg-white shadow-lg min-h-screen p-4">
      {/* Logo/Brand */}
      <div className="flex items-center justify-center mb-8 p-4 border-b">
        <LayoutDashboard className="h-8 w-8 text-purple-600 mr-2" />
        <h1 className="text-xl font-bold text-gray-800"> Super Admin</h1>
      </div>

      {/* Navigation Menu */}
      <div className="space-y-2">
        {/* Dashboard */}
        <Link
          to="/super-admin"
          className={menuItemClass(isActiveRoute('/super-admin'))}
        >
          <LayoutDashboard className="h-4 w-4 mr-3" />
          Dashboard
        </Link>

        {/* Office Menu */}
        <div>
          <button
            onClick={() => setIsOfficeOpen(!isOfficeOpen)}
            className={`flex items-center justify-between w-full px-4 py-2 text-sm rounded-lg transition-colors ${isOfficeOpen
              ? 'bg-purple-50 text-purple-700'
              : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <div className="flex items-center">
              <Building className="h-4 w-4 mr-3" />
              Office Management
            </div>
            {isOfficeOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {isOfficeOpen && (
            <div className="ml-6 mt-1 space-y-1">
              <Link
                to="/super-admin/offices"
                className={menuItemClass(isActiveRoute('/super-admin/offices'))}
              >
                All Offices
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}