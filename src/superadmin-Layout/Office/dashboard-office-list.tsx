// components/SuperAdmin/dashboard-office-list.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, MapPin, Phone, Mail, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchAll } from "@/hooks/useFetchAll";


interface Office {
  id: number;
  key: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logoFileName: string | null;
  logoUrl: string;
  resourceAccessKey?: string | null;
}

export default function DashboardOfficeList() {
  // const { data: offices = [], isLoading } = useOffice();
  const { items: officeData, isLoadingItems } = useFetchAll<Office>("/api/office", ["office"]);
  const [visibleCount, _setVisibleCount] = useState(6);

  function getOfficeData() {
    if (!officeData) return [];
    if (Array.isArray(officeData)) return officeData;
    const dataCandidate = (officeData as any).Data || (officeData as any).data;
    if (Array.isArray(dataCandidate)) return dataCandidate;

    const items: Office[] = [];
    let i = 0;
    while ((officeData as any)[i] !== undefined) {
      items.push((officeData as any)[i]);
      i++;
    }
    if (items.length > 0) return items;

    return [];
  }

  const offices = getOfficeData();

  // Show only limited offices
  const displayedOffices = offices.slice(0, visibleCount);

  if (isLoadingItems) {
    return <OfficeListSkeleton />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Office List</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {offices.length} offices total
        </span>
      </div>

      {/* Offices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {displayedOffices.map((office: Office) => (
          <OfficeCard key={office.id} office={office} />
        ))}
      </div>

      {/* Empty State */}
      {offices.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Offices Found</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Get started by creating your first office branch to manage your locations and resources.
          </p>
          <Link to="/super-admin/office/add">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Add First Office
            </Button>
          </Link>
        </div>
      )}


      <div className="flex justify-center border-t pt-6">
        <Link to="/super-admin/offices" className="w-full max-w-sm">
          <Button variant="outline" className="w-full">
            <Eye className="h-4 w-4 mr-2" />
            View All Offices ({offices.length})
          </Button>
        </Link>
      </div>

    </div>
  );
}

// Office Card Component
function OfficeCard({ office }: { office: Office }) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 bg-white hover:border-purple-200">
      {/* Header with Logo and Name */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {office.logoUrl && !office.logoUrl.includes("fileName=&") ? (
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
              <img
                src={office.logoUrl}
                alt={`${office.name} logo`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to building icon if image fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building className="h-6 w-6 text-purple-600" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{office.name}</h3>
            <p className="text-xs text-gray-500 mt-1">ID: {office.id}</p>
          </div>
        </div>
      </div>

      {/* Office Details */}
      <div className="space-y-3">
        {/* Address */}
        <div className="flex items-start space-x-3">
          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Address</p>
            <p className="text-sm text-gray-600 mt-1">{office.address || "Not specified"}</p>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center space-x-3">
          <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Phone</p>
            <p className="text-sm text-gray-600 mt-1">{office.phone || "Not specified"}</p>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center space-x-3">
          <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Email</p>
            <p className="text-sm text-gray-600 mt-1 truncate">{office.email || "Not specified"}</p>
          </div>
        </div>

      </div>

      {/* Action Button */}
      <div className="mt-5 pt-4 border-t border-gray-200">
        <Link to={`/super-admin/office/edit/${office.id}`}>
          <Button variant="outline" size="sm" className="w-full">
            Edit Office
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Skeleton Loading Component
function OfficeListSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="border border-gray-200 rounded-xl p-5">
            {/* Header Skeleton */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>

            {/* Details Skeleton */}
            <div className="space-y-3">
              {[...Array(5)].map((_, detailIndex) => (
                <div key={detailIndex} className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>

            {/* Button Skeleton */}
            <Skeleton className="h-9 w-full mt-5 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}