import React from "react";
import { useParams } from "react-router-dom";
import { Loader } from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DocumentNumberingForm from "./documentNumbering-form";
import type { DocumentNumbering } from "@/type/documentnumbering";

const EditDocumentNumbering: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { items: numberData, isLoadingItems, error } = useFetchAll<DocumentNumbering>("/api/documentnumber", ["d"]);


  function getDocumentNumbers(numberData: any) {
    if (!numberData) return [];
    if (Array.isArray(numberData)) return numberData;
    const dataCandidate = (numberData as any).Data || (numberData as any).data;
    if (Array.isArray(dataCandidate)) return dataCandidate;

    // Handle if the response is an object with numeric keys (0, 1, 2...)
    const items: DocumentNumbering[] = [];
    let i = 0;
    while ((numberData as any)[i] !== undefined) {
      items.push((numberData as any)[i]);
      i++;
    }
    if (items.length > 0) return items;

    return [];
  }

  const documentNumbers = getDocumentNumbers(numberData);

  const documentNumber: DocumentNumbering | undefined = documentNumbers?.find(
    (e: DocumentNumbering) => e.id === Number(id)
  );

  if (isLoadingItems) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (error || !documentNumbers || (documentNumbers.length === 0 && !isLoadingItems)) {
    return (
      <div className="p-6">
        <Card className="p-4">
          <h2 className="text-red-600">Failed to load document number data</h2>
          <Button className="mt-4" onClick={() => window.history.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <DocumentNumberingForm mode="edit" initialData={documentNumber} />
    </div>
  );
};

export default EditDocumentNumbering;
