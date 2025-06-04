import { describe, it, expect, vi } from 'vitest';
import { exportToPDF, exportToExcel } from './export';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Mock jsPDF and XLSX
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    autoTable: vi.fn(),
    save: vi.fn()
  }))
}));

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn()
  },
  writeFile: vi.fn()
}));

describe('Export Utils', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ];

  const mockColumns = [
    { header: 'ID', accessorKey: 'id' },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Email', accessorKey: 'email' }
  ];

  describe('exportToPDF', () => {
    it('should create PDF with correct configuration', () => {
      const options = {
        filename: 'test-report',
        title: 'Test Report',
        subtitle: 'Generated Report'
      };

      exportToPDF(mockData, mockColumns, options);

      expect(jsPDF).toHaveBeenCalled();
      const mockPDF = jsPDF.mock.results[0].value;
      
      expect(mockPDF.setFontSize).toHaveBeenCalledWith(16);
      expect(mockPDF.text).toHaveBeenCalledWith('Test Report', 14, 15);
      expect(mockPDF.autoTable).toHaveBeenCalled();
      expect(mockPDF.save).toHaveBeenCalledWith('test-report.pdf');
    });

    it('should use default filename when not provided', () => {
      exportToPDF(mockData, mockColumns);

      const mockPDF = jsPDF.mock.results[0].value;
      expect(mockPDF.save).toHaveBeenCalledWith(expect.stringMatching(/report-\d{4}-\d{2}-\d{2}\.pdf/));
    });
  });

  describe('exportToExcel', () => {
    it('should create Excel file with correct data', () => {
      const options = {
        filename: 'test-report'
      };

      exportToExcel(mockData, mockColumns, options);

      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        'test-report.xlsx'
      );
    });

    it('should use default filename when not provided', () => {
      exportToExcel(mockData, mockColumns);

      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/report-\d{4}-\d{2}-\d{2}\.xlsx/)
      );
    });
  });
});