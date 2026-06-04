import { createContext, useContext, useState, type ReactNode } from 'react';
import { useFetchAll } from '@/hooks/useFetchAll';
import type { FiscalYear } from '@/type/fiscalyear';
import { useLocation } from 'react-router-dom';

interface FiscalYearContextType {
  selectedFiscalYearId: number | null;
  selectedFiscalYear: FiscalYear | null;
  serverActiveFiscalYearId: number | null;
  serverActiveFiscalYear: FiscalYear | null;
  activeFiscalYearId: number | null;
  activeFiscalYear: FiscalYear | null;
  fiscalYears: FiscalYear[];
  isLoading: boolean;
  setSelectedFiscalYear: (id: number) => void;
}

const FiscalYearContext = createContext<FiscalYearContextType>({
  selectedFiscalYearId: null,
  selectedFiscalYear: null,
  serverActiveFiscalYearId: null,
  serverActiveFiscalYear: null,
  activeFiscalYearId: null,
  activeFiscalYear: null,
  fiscalYears: [],
  isLoading: true,
  setSelectedFiscalYear: () => { },
});

export const useFiscalYear = () => {
  const context = useContext(FiscalYearContext);
  // Return context directly, handle missing context in component
  return context;
};

interface FiscalYearProviderProps {
  children: ReactNode;
}

export function FiscalYearProvider({ children }: FiscalYearProviderProps) {
  const route = useLocation();
  console.log("FiscalYearProvider - Current Route:", route.pathname);
  const { items: fyData, isLoadingItems } = useFetchAll<FiscalYear>('/api/fiscalyear', ['fiscalyear']);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<number | null>(null);

  function getFiscalYears(data: any): FiscalYear[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const nestedData = data.data || data.Data;
    if (Array.isArray(nestedData)) return nestedData;
    return [];
  }

  const fiscalYears = getFiscalYears(fyData);
  const serverActiveFiscalYear = fiscalYears.find(fy => fy.isActive === true);
  const serverActiveFiscalYearId = serverActiveFiscalYear?.id && serverActiveFiscalYear.id > 0 ? serverActiveFiscalYear.id : null;

  // Use selected FY if set, otherwise fall back to server active FY
  const currentSelectedId = selectedFiscalYearId || serverActiveFiscalYearId;
  const selectedFiscalYear = fiscalYears.find(fy => fy.id === currentSelectedId) || null;

  const setSelectedFiscalYear = (id: number) => {
    setSelectedFiscalYearId(id);
  };

  return (
    <FiscalYearContext.Provider
      value={{
        selectedFiscalYearId: currentSelectedId,
        selectedFiscalYear,
        serverActiveFiscalYearId,
        serverActiveFiscalYear: serverActiveFiscalYear || null,
        activeFiscalYearId: currentSelectedId,
        activeFiscalYear: selectedFiscalYear,
        fiscalYears,
        isLoading: isLoadingItems,
        setSelectedFiscalYear,
      }}
    >
      {children}
    </FiscalYearContext.Provider>
  );
}