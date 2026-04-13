// components/SuperAdmin/super-admin-dashboard.tsx
import { Users, Settings, Plus } from "lucide-react";
import { Link } from "react-router-dom";
// import DashboardOfficeList from "./Office/dashboard-office-list";

export default function SuperAdminDashboard() {


  const quickActions = [
    {
      title: "Add New Office",
      description: "Create a new office branch",
      icon: Plus,
      link: "/super-admin/office/add",
      color: "text-blue-600 bg-blue-50"
    },
    {
      title: "Manage Users",
      description: "View and manage all users",
      icon: Users,
      link: "/super-admin/users",
      color: "text-green-600 bg-green-50"
    },
    {
      title: "System Settings",
      description: "Configure system preferences",
      icon: Settings,
      link: "/super-admin/settings",
      color: "text-purple-600 bg-purple-50"
    }
  ];

  return (
    <div className="space-y-6">


      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className={`p-4 rounded-lg border-2 border-transparent hover:border-current transition-colors ${action.color}`}
            >
              <div className="flex items-center space-x-3">
                <action.icon className="h-8 w-8" />
                <div>
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm opacity-75">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Office List Section */}
      {/* <DashboardOfficeList /> */}
    </div>
  );
}