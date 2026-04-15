import React from "react";
import { useParams } from "react-router-dom";
import { Loader } from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FiscalyearForm from "./fiscalyear-form";
import type { FiscalYear } from "@/type/fiscalyear";

const EditFiscalyear: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { items: fyData, isLoadingItems, error } = useFetchAll<FiscalYear>("/api/fiscalyear", ["fiscalyear"]);


  function getFiscalYears(fyData: FiscalYear[] | null): FiscalYear[] {
    if (!fyData) return [];
    if (Array.isArray(fyData)) return fyData;

    return [];
  }

  const fiscalYears = getFiscalYears(fyData);

  const fy: FiscalYear | undefined = fiscalYears?.find(
    (e: FiscalYear) => e.id === Number(id)
  );

  if (isLoadingItems) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (error || !fiscalYears || (fiscalYears.length === 0 && !isLoadingItems)) {
    return (
      <div className="p-6">
        <Card className="p-4">
          <h2 className="text-red-600">Failed to load fiscal year data</h2>
          <Button className="mt-4" onClick={() => window.history.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <FiscalyearForm mode="edit" initialData={fy} />
    </div>
  );
};

export default EditFiscalyear;
