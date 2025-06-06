import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { auditService, type AuditSearchFilters, type ComplianceAuditLog } from '../../lib/compliance';
import {
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  Shield,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Monitor
} from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ComplianceAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditSearchFilters>({
    limit: pageSize,
    offset: 0
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, [filters]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const result = await auditService.searchLogs(filters);
      setLogs(result.logs);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      showToast('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AuditSearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset to first page when filters change
    }));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setFilters(prev => ({
      ...prev,
      offset: (page - 1) * pageSize
    }));
  };

  const handleExportLogs = async () => {
    try {
      setLoading(true);
      const result = await auditService.searchLogs({
        ...filters,
        limit: 10000, // Export more records
        offset: 0
      });

      const csvContent = convertToCSV(result.logs);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Audit logs exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      showToast('Failed to export audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const convertToCSV = (logs: ComplianceAuditLog[]): string => {
    const headers = ['Timestamp', 'User ID', 'Action', 'Resource Type', 'Resource ID', 'Risk Level', 'IP Address', 'Compliance Flags'];
    const rows = logs.map(log => [
      log.created_at,
      log.user_id || '',
      log.action,
      log.resource_type,
      log.resource_id,
      log.risk_level || '',
      log.ip_address || '',
      (log.compliance_flags || []).join(';')
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  };

  const getRiskLevelColor = (riskLevel: string | null) => {
    switch (riskLevel) {
      case 'critical':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low':
      default:
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('delete')) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (action.includes('create')) return <Shield className="h-4 w-4 text-green-600" />;
    if (action.includes('update')) return <Activity className="h-4 w-4 text-blue-600" />;
    if (action.includes('view') || action.includes('access')) return <Eye className="h-4 w-4 text-gray-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('audit.title', 'Audit Log Viewer')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {t('audit.description', 'View and search compliance audit logs')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {t('audit.filters', 'Filters')}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportLogs}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('audit.export', 'Export')}
          </Button>
          <Button
            onClick={loadAuditLogs}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('audit.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('audit.searchFilters', 'Search Filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('audit.action', 'Action')}
                </label>
                <input
                  type="text"
                  value={filters.action || ''}
                  onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
                  placeholder={t('audit.actionPlaceholder', 'e.g., create, update, delete')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('audit.resourceType', 'Resource Type')}
                </label>
                <select
                  value={filters.resourceType || ''}
                  onChange={(e) => handleFilterChange('resourceType', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{t('audit.allResources', 'All Resources')}</option>
                  <option value="patient">Patient</option>
                  <option value="user">User</option>
                  <option value="appointment">Appointment</option>
                  <option value="treatment">Treatment</option>
                  <option value="invoice">Invoice</option>
                  <option value="consent">Consent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('audit.riskLevel', 'Risk Level')}
                </label>
                <select
                  value={filters.riskLevel || ''}
                  onChange={(e) => handleFilterChange('riskLevel', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{t('audit.allRiskLevels', 'All Risk Levels')}</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('audit.userId', 'User ID')}
                </label>
                <input
                  type="text"
                  value={filters.userId || ''}
                  onChange={(e) => handleFilterChange('userId', e.target.value || undefined)}
                  placeholder={t('audit.userIdPlaceholder', 'Enter user ID')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('audit.dateFrom', 'From Date')}
                </label>
                <input
                  type="date"
                  onChange={(e) => {
                    const dateRange = filters.dateRange || { start: new Date(), end: new Date() };
                    handleFilterChange('dateRange', {
                      ...dateRange,
                      start: new Date(e.target.value)
                    });
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('audit.dateTo', 'To Date')}
                </label>
                <input
                  type="date"
                  onChange={(e) => {
                    const dateRange = filters.dateRange || { start: new Date(), end: new Date() };
                    handleFilterChange('dateRange', {
                      ...dateRange,
                      end: new Date(e.target.value)
                    });
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({ limit: pageSize, offset: 0 });
                    setCurrentPage(1);
                  }}
                >
                  {t('audit.clearFilters', 'Clear Filters')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <div>
          {t('audit.showing', 'Showing')} {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} {t('audit.of', 'of')} {totalCount} {t('audit.results', 'results')}
        </div>
        <div>
          {t('audit.page', 'Page')} {currentPage} {t('audit.of', 'of')} {totalPages}
        </div>
      </div>

      {/* Audit Logs */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('audit.timestamp', 'Timestamp')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('audit.action', 'Action')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('audit.resource', 'Resource')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('audit.user', 'User')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('audit.riskLevel', 'Risk Level')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('audit.details', 'Details')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div>
                          <div className="font-medium">{log.resource_type}</div>
                          <div className="text-gray-500 text-xs">{log.resource_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {log.user_id || 'System'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(log.risk_level)}`}>
                          {log.risk_level || 'low'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        >
                          {expandedLog === log.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                          <div className="space-y-3">
                            {log.ip_address && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-300">IP Address:</span>
                                <span className="text-gray-900 dark:text-gray-100">{log.ip_address}</span>
                              </div>
                            )}
                            {log.user_agent && (
                              <div className="flex items-center gap-2 text-sm">
                                <Monitor className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-300">User Agent:</span>
                                <span className="text-gray-900 dark:text-gray-100 truncate">{log.user_agent}</span>
                              </div>
                            )}
                            {log.compliance_flags && log.compliance_flags.length > 0 && (
                              <div className="flex items-center gap-2 text-sm">
                                <Shield className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-300">Compliance Flags:</span>
                                <div className="flex gap-1">
                                  {log.compliance_flags.map((flag, index) => (
                                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                                      {flag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(log.old_data || log.new_data) && (
                              <div className="text-sm">
                                <span className="text-gray-600 dark:text-gray-300">Data Changes:</span>
                                <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                                  {JSON.stringify({ old: log.old_data, new: log.new_data }, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {t('audit.previous', 'Previous')}
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            {t('audit.next', 'Next')}
          </Button>
        </div>
      )}
    </div>
  );
};
