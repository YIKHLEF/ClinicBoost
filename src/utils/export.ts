import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ExportOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
}

export const exportToPDF = (data: any[], columns: any[], filename?: string) => {
  const doc = new jsPDF();
  const defaultFilename = filename || `report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;

  // Format data for autoTable
  const tableData = data.map(item =>
    columns.map(col => item[col.accessorKey])
  );

  const tableColumns = columns.map(col => ({
    header: col.header,
    dataKey: col.accessorKey
  }));

  (doc as any).autoTable({
    head: [tableColumns.map(col => col.header)],
    body: tableData,
    startY: 15,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }, // Primary blue
  });

  doc.save(defaultFilename);
};

export const exportToExcel = (data: any[], columns: any[], filename?: string) => {
  const defaultFilename = filename || `report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

  // Format data for Excel
  const excelData = data.map(item => {
    const row: any = {};
    columns.forEach(col => {
      row[col.header] = item[col.accessorKey];
    });
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  XLSX.writeFile(wb, defaultFilename);
};