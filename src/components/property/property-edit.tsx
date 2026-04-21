import React from "react";
import { useParams } from "react-router-dom";
import { Loader } from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PropertyForm from "./PropertyForm";
import type { PropertyDetail } from "@/type/property";

const EditProperty: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { items: propertyData, isLoadingItems, error } = useFetchAll<PropertyDetail>("/api/property", ["property"]);

  function getProperties(data: any): PropertyDetail[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const nestedData = data.data || data.Data;
    if (Array.isArray(nestedData)) return nestedData;
    return [];
  }

  const properties = getProperties(propertyData);

  const property: PropertyDetail | undefined = properties?.find(
    (e: PropertyDetail) => e.id === Number(id)
  );

  if (isLoadingItems) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (error || !properties || (properties.length === 0 && !isLoadingItems)) {
    return (
      <div className="p-6">
        <Card className="p-4">
          <h2 className="text-red-600">Failed to load property data</h2>
          <Button className="mt-4" onClick={() => window.history.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PropertyForm mode="edit" initialData={property} onSuccess={() => window.location.href = "/property"} />
    </div>
  );
};

export default EditProperty;