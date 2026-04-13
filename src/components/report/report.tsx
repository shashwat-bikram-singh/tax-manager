import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ChevronLeft,
  Printer
} from "lucide-react";
import { useFetchAll } from "@/hooks/useFetchAll";
import type { UserReport } from "@/type/userReport";
import { useAuthStore } from "@/store/authStore";
import ReportDate from "./report-date";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import printJS from "print-js";



export default function UserReport() {
  const role = useAuthStore((state) => state.role);

  const [reportQuery, setReportQuery] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);

  const { items: rawReportData, isLoadingItems: isLoadingReport, error: reportError } = useFetchAll<any>(
    reportQuery ? `/api/report/userwiseincome${reportQuery}` : "",
    ["userwise-income", reportQuery || ""]
  );

  // Helper to extract data from various API response structures
  const extractData = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const dataCandidate = data.data || data.Data;
    if (Array.isArray(dataCandidate)) return dataCandidate;

    const items: any[] = [];
    let i = 0;
    while (data[i] !== undefined) {
      items.push(data[i]);
      i++;
    }
    return items;
  };

  const reportData = extractData(rawReportData);

  const handleSearch = (fromdate: string, todate: string) => {
    const queryString = `?dateFrom=${fromdate}&dateTo=${todate}`;
    setReportQuery(queryString);
    setDateRange({ from: fromdate, to: todate });
    isLoadingReport ? toast.loading("Fetching report...") : toast.success("Report fetched successfully");
  };


  const downloadExcel = () => {
    const table = document.getElementById("data-table");
    const workbook = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
    XLSX.writeFile(workbook, "table.xlsx");
  };



  const clearReport = () => {
    setReportQuery(null);
  };

  const thStyle = {
    border: "1px solid #d1d5db",
    padding: "8px",
    fontWeight: 700,
    backgroundColor: "#f3f4f6",
    textTransform: "uppercase",
  };

  const tdStyle = {
    border: "1px solid #e5e7eb",
    padding: "8px",
  };


  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Report Result
          </h2>

        </div>
        <div className="w-full sm:w-auto">
          <ReportDate
            onSearch={handleSearch}
            isLoading={isLoadingReport}
            onCancel={reportQuery ? clearReport : undefined}
          />
        </div>


        {/* Show Report Data if available */}
        {reportQuery ? (
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isLoadingReport ? (
              <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 rounded-lg border border-dashed">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Fetching report data...</p>
              </div>
            ) : reportError ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center justify-center">
                <span>Failed to fetch report: {reportError.message}</span>
              </div>
            ) : (
              <>
                {reportData && Array.isArray(reportData) && reportData.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-6 justify-end">
                      <div className="flex justify-end">
                        <button className="ml-auto cursor-pointer" onClick={downloadExcel}>
                          <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24" viewBox="0 0 50 50">
                            <path d="M30 26v9h-4.18c.12-.38.18-.78.18-1.2V26H30zM30 37v9H17c-1.65 0-3-1.35-3-3v-5h7.8c1.03 0 1.98-.37 2.71-1H30zM32 26H48V35H32zM32 37h16v6c0 1.65-1.35 3-3 3H32V37zM30 15v9h-4v-7.8c0-.42-.06-.82-.18-1.2H30zM32 15H48V24H32zM30 4v9h-5.49c-.73-.63-1.68-1-2.71-1H14V7c0-1.65 1.35-3 3-3H30zM48 7v6H32V4h13C46.65 4 48 5.35 48 7zM21.8 36H4.2C2.985 36 2 35.015 2 33.8V16.2C2 14.985 2.985 14 4.2 14h17.6c1.215 0 2.2.985 2.2 2.2v17.6C24 35.015 23.015 36 21.8 36zM7.968 19l3.494 5.978L7.631 31h2.863l2.521-4.716L15.548 31h2.821L14.6 25l3.685-6H15.61l-2.455 4.505L10.832 19H7.968z"></path>
                          </svg>
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={() =>
                          printJS({
                            printable: "printable-report",
                            type: "html",
                            scanStyles: false,
                            css: ["/print.css"],
                          })}>
                          <Printer />
                        </Button>
                      </div>
                    </div>

                    <div className=" rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
                      <div id="printable-report">
                        {/* Header - only visible when printing */}
                        <div className="print-header" style={{ display: 'none' }}>
                          <h2 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '24px', fontWeight: 'bold' }}>User Income Report</h2>
                          {dateRange && (
                            <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#666', fontSize: '16px' }}>
                              Date Range: {dateRange.from} to {dateRange.to}
                            </h3>
                          )}
                        </div>
                        <Table
                          id="data-table"
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "12px",
                            border: "1px solid #d1d5db",
                          }}
                        >
                          {/* TABLE HEADER */}
                          <TableHeader>
                            <TableRow>
                              <TableHead style={thStyle}>S.N.</TableHead>
                              <TableHead style={thStyle}>Username</TableHead>
                              {role === "Admin" && <TableHead style={thStyle}>Sub Office</TableHead>}
                              <TableHead style={{ ...thStyle, textAlign: "right" }}>Amount</TableHead>
                            </TableRow>
                          </TableHeader>

                          {/* TABLE BODY */}
                          <TableBody>
                            {reportData.map((row: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell style={tdStyle}>{index + 1}</TableCell>
                                <TableCell style={tdStyle}>{row.username}</TableCell>
                                {role === "Admin" && (
                                  <TableCell style={tdStyle}>{row.subOffice || "-"}</TableCell>
                                )}
                                <TableCell style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
                                  {row.amount
                                    ? Number(row.amount).toLocaleString("en-IN", {
                                      style: "currency",
                                      currency: "NPR",
                                    })
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            ))}

                            {/* TOTAL ROW */}
                            <TableRow>
                              <TableCell
                                colSpan={role === "Admin" ? 3 : 2}
                                style={{
                                  border: "1px solid #9ca3af",
                                  padding: "8px",
                                  fontWeight: "700",
                                  backgroundColor: "#f3f4f6",
                                }}
                              >
                                Total Amount
                              </TableCell>

                              <TableCell
                                style={{
                                  border: "1px solid #9ca3af",
                                  padding: "8px",
                                  fontWeight: "700",
                                  textAlign: "right",
                                  backgroundColor: "#f3f4f6",
                                }}
                              >
                                {reportData
                                  .reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0)
                                  .toLocaleString("en-IN", {
                                    style: "currency",
                                    currency: "NPR",
                                  })}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No data found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your date range.</p>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button variant="outline" onClick={clearReport} className="hover:bg-gray-100 border-gray-300 text-gray-700">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to User List
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>


          </>
        )
        }
      </div>
    </div >
  );
}
