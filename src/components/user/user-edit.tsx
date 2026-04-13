import React from "react";
import { useParams } from "react-router-dom";
import { Loader } from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserForm from "./user-form";
import type { User } from "@/type/user";

const EditUser: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { items: subofficeData, isLoadingItems, error } = useFetchAll<User>("/api/user", ["user"]);


  function getSuboffices(subofficeData: any) {
    if (!subofficeData) return [];
    if (Array.isArray(subofficeData)) return subofficeData;
    const dataCandidate = (subofficeData as any).Data || (subofficeData as any).data;
    if (Array.isArray(dataCandidate)) return dataCandidate;
    const items: User[] = [];
    let i = 0;
    while ((subofficeData as any)[i] !== undefined) {
      items.push((subofficeData as any)[i]);
      i++;
    }
    if (items.length > 0) return items;

    return [];
  }

  const suboffices = getSuboffices(subofficeData);

  const suboffice: User | undefined = suboffices?.find(
    (e: User) => e.id === Number(id)
  );

  if (isLoadingItems) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (error || !suboffices || (suboffices.length === 0 && !isLoadingItems)) {
    return (
      <div className="p-6">
        <Card className="p-4">
          <h2 className="text-red-600">Failed to load user data</h2>
          <Button className="mt-4" onClick={() => window.history.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <UserForm mode="edit" initialData={suboffice} />
    </div>
  );
};

export default EditUser;
