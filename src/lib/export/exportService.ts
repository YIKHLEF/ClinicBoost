/**
 * Export Service
 * 
 * Service for exporting reports and data in various formats
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ExportOptions, Report, ChartConfig, TableData } from '../analytics/types';

class ExportService {
  /**
   * Export report to PDF
   */
  async exportToPDF(
    elementId: string,
    options: ExportOptions
  ): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element not found');
      }

      // Create canvas from HTML element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Add metadata
      pdf.setProperties({
        title: `Clinic Report - ${new Date().toLocaleDateString()}`,
        subject: 'Clinic Analytics Report',
        author: 'ClinicBoost',
        creator: 'ClinicBoost Analytics'
      });

      // Save file
      const filename = options.filename || `clinic-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to export PDF');
    }
  }

  /**
   * Export data to Excel
   */
  async exportToExcel(
    data: any[],
    options: ExportOptions
  ): Promise<void> {
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Add main data sheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');

      // Add summary sheet if available
      if (options.includeData) {
        const summaryData = this.generateSummaryData(data);
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      }

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
      });

      // Save file
      const filename = options.filename || `clinic-data-${new Date().toISOString().split('T')[0]}.xlsx`;
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      saveAs(blob, filename);
    } catch (error) {
      console.error('Excel export failed:', error);
      throw new Error('Failed to export Excel file');
    }
  }

  /**
   * Export data to CSV
   */
  async exportToCSV(
    data: any[],
    options: ExportOptions
  ): Promise<void> {
    try {
      // Convert data to CSV format
      const csv = this.convertToCSV(data);
      
      // Create blob and save
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const filename = options.filename || `clinic-data-${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, filename);
    } catch (error) {
      console.error('CSV export failed:', error);
      throw new Error('Failed to export CSV file');
    }
  }

  /**
   * Export data to JSON
   */
  async exportToJSON(
    data: any,
    options: ExportOptions
  ): Promise<void> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const filename = options.filename || `clinic-data-${new Date().toISOString().split('T')[0]}.json`;
      saveAs(blob, filename);
    } catch (error) {
      console.error('JSON export failed:', error);
      throw new Error('Failed to export JSON file');
    }
  }

  /**
   * Export chart as image
   */
  async exportChartAsImage(
    chartElementId: string,
    format: 'png' | 'jpg' = 'png',
    filename?: string
  ): Promise<void> {
    try {
      const element = document.getElementById(chartElementId);
      if (!element) {
        throw new Error('Chart element not found');
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const defaultFilename = `chart-${new Date().toISOString().split('T')[0]}.${format}`;
          saveAs(blob, filename || defaultFilename);
        }
      }, `image/${format}`);
    } catch (error) {
      console.error('Chart export failed:', error);
      throw new Error('Failed to export chart');
    }
  }

  /**
   * Export complete report with multiple formats
   */
  async exportReport(
    report: Report,
    elementId: string,
    options: ExportOptions
  ): Promise<void> {
    switch (options.format) {
      case 'pdf':
        await this.exportToPDF(elementId, options);
        break;
      case 'excel':
        const excelData = this.extractDataFromReport(report);
        await this.exportToExcel(excelData, options);
        break;
      case 'csv':
        const csvData = this.extractDataFromReport(report);
        await this.exportToCSV(csvData, options);
        break;
      case 'json':
        await this.exportToJSON(report, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  /**
   * Extract data from report for export
   */
  private extractDataFromReport(report: Report): any[] {
    const data: any[] = [];

    report.sections.forEach(section => {
      if (section.type === 'table' && section.content) {
        const tableData = section.content as TableData;
        const headers = tableData.headers;
        
        tableData.rows.forEach(row => {
          const rowObject: any = {};
          headers.forEach((header, index) => {
            rowObject[header] = row[index];
          });
          data.push(rowObject);
        });
      } else if (section.type === 'chart' && section.content) {
        const chartData = section.content as ChartConfig;
        chartData.data.forEach(point => {
          data.push({
            section: section.title,
            label: point.label,
            value: point.value,
            category: point.category || 'N/A'
          });
        });
      }
    });

    return data;
  }

  /**
   * Generate summary data for Excel export
   */
  private generateSummaryData(data: any[]): any[] {
    if (!data || data.length === 0) {
      return [];
    }

    const summary = [
      { Metric: 'Total Records', Value: data.length },
      { Metric: 'Export Date', Value: new Date().toLocaleDateString() },
      { Metric: 'Export Time', Value: new Date().toLocaleTimeString() }
    ];

    // Add numeric summaries if available
    const numericFields = Object.keys(data[0]).filter(key => 
      typeof data[0][key] === 'number'
    );

    numericFields.forEach(field => {
      const values = data.map(row => row[field]).filter(val => typeof val === 'number');
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        summary.push(
          { Metric: `${field} - Total`, Value: sum },
          { Metric: `${field} - Average`, Value: avg.toFixed(2) },
          { Metric: `${field} - Minimum`, Value: min },
          { Metric: `${field} - Maximum`, Value: max }
        );
      }
    });

    return summary;
  }

  /**
   * Validate export options
   */
  validateExportOptions(options: ExportOptions): boolean {
    const validFormats = ['pdf', 'excel', 'csv', 'json'];
    return validFormats.includes(options.format);
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats(): string[] {
    return ['pdf', 'excel', 'csv', 'json'];
  }

  /**
   * Estimate export file size
   */
  estimateFileSize(data: any[], format: string): string {
    const dataSize = JSON.stringify(data).length;
    
    switch (format) {
      case 'json':
        return `${(dataSize / 1024).toFixed(1)} KB`;
      case 'csv':
        return `${(dataSize * 0.7 / 1024).toFixed(1)} KB`;
      case 'excel':
        return `${(dataSize * 1.2 / 1024).toFixed(1)} KB`;
      case 'pdf':
        return `${(dataSize * 2 / 1024).toFixed(1)} KB`;
      default:
        return 'Unknown';
    }
  }
}

export const exportService = new ExportService();
