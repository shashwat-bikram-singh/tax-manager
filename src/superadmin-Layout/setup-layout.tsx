// Layout/super-admin-layout.tsx
import { Outlet } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SuperAdminNavbar from "./super-admin-navbar";
import { useAuthStore } from "@/store/authStore";

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const logoutStore = useAuthStore((state) => state.logout);

  const logout = () => {
    logoutStore();
    sessionStorage.clear();
    navigate("/login");
  };

  const getUserName = () => {
    // You can get the username from token or context
    return sessionStorage.getItem("Username") || "Super Admin";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <SuperAdminNavbar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex justify-between items-center px-6 h-14">
            <div className="flex items-center">
            </div>

            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{getUserName()}</span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}