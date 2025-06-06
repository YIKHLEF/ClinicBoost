import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { gdprService } from '../../lib/compliance';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Download,
  Settings,
  Trash2,
  User,
  Calendar,
  FileText,
  Filter,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DataSubjectRequest {
  id: string;
  request_type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  requester_email: string;
  requester_name?: string;
  patient_id?: string;
  user_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  description?: string;
  verification_token?: string;
  verified_at?: string;
  processed_by?: string;
  processed_at?: string;
  response_data?: any;
  notes?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export const DataSubjectRequestManager: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<DataSubjectRequest[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const pageSize = 10;

  useEffect(() => {
    loadRequests();
  }, [selectedStatus, currentPage]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const status = selectedStatus === 'all' ? undefined : selectedStatus as any;
      const { requests: data, total } = await gdprService.getAllDataSubjectRequests(
        status,
        pageSize,
        currentPage * pageSize
      );
      
      // Filter by search term if provided
      const filteredRequests = searchTerm
        ? data.filter(req => 
            req.requester_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.requester_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.id.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : data;

      setRequests(filteredRequests);
      setTotalRequests(total);
    } catch (error) {
      console.error('Failed to load data subject requests:', error);
      showToast('Failed to load data subject requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (requestId: string) => {
    if (!user) return;

    try {
      setProcessingRequest(requestId);
      await gdprService.processDataSubjectRequest(requestId, user.id);
      showToast('Request processed successfully', 'success');
      await loadRequests();
    } catch (error) {
      console.error('Failed to process request:', error);
      showToast('Failed to process request', 'error');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleUpdateStatus = async (
    requestId: string, 
    status: 'pending' | 'in_progress' | 'completed' | 'rejected',
    notes?: string
  ) => {
    if (!user) return;

    try {
      await gdprService.updateDataSubjectRequestStatus(requestId, status, user.id, notes);
      showToast('Request status updated', 'success');
      await loadRequests();
    } catch (error) {
      console.error('Failed to update request status:', error);
      showToast('Failed to update request status', 'error');
    }
  };

  const getRequestStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'access':
        return <Eye className="h-4 w-4" />;
      case 'portability':
        return <Download className="h-4 w-4" />;
      case 'rectification':
        return <Settings className="h-4 w-4" />;
      case 'erasure':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'rejected':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
    }
  };

  const isOverdue = (request: DataSubjectRequest) => {
    if (!request.due_date || request.status === 'completed') return false;
    return new Date(request.due_date) < new Date();
  };

  const totalPages = Math.ceil(totalRequests / pageSize);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('compliance.dataSubjectRequests.title', 'Data Subject Requests')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by email, name, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-sm"
              />
              <Button onClick={loadRequests} size="sm">
                Search
              </Button>
            </div>
          </div>

          {/* Request List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No data subject requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getRequestTypeIcon(request.request_type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1)} Request
                            </h4>
                            {isOverdue(request) && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                Overdue
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            <div>From: {request.requester_name || request.requester_email}</div>
                            <div>Submitted: {new Date(request.created_at).toLocaleDateString()}</div>
                            {request.due_date && (
                              <div>Due: {new Date(request.due_date).toLocaleDateString()}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {getRequestStatusIcon(request.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                        >
                          {expandedRequest === request.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRequest === request.id && (
                    <div className="border-t border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="font-medium text-sm">Request ID:</span>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{request.id}</p>
                        </div>
                        <div>
                          <span className="font-medium text-sm">Requester Email:</span>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{request.requester_email}</p>
                        </div>
                        {request.description && (
                          <div className="md:col-span-2">
                            <span className="font-medium text-sm">Description:</span>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{request.description}</p>
                          </div>
                        )}
                        {request.notes && (
                          <div className="md:col-span-2">
                            <span className="font-medium text-sm">Notes:</span>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{request.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(request.id, 'in_progress')}
                              disabled={processingRequest === request.id}
                            >
                              Start Processing
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(request.id, 'rejected', 'Request rejected after review')}
                              disabled={processingRequest === request.id}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        
                        {request.status === 'in_progress' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleProcessRequest(request.id)}
                              disabled={processingRequest === request.id}
                              className="flex items-center gap-2"
                            >
                              {processingRequest === request.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              ) : (
                                <CheckCircle className="h-3 w-3" />
                              )}
                              Complete Processing
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(request.id, 'rejected', 'Unable to complete request')}
                              disabled={processingRequest === request.id}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalRequests)} of {totalRequests} requests
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
