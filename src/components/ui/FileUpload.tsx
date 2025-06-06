/**
 * Enhanced File Upload Component
 * 
 * File upload component with comprehensive error handling, progress tracking,
 * and network status awareness
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../hooks/useToast';
import { fileUploadErrorHandler } from '../../lib/file-upload/error-handling';

export interface FileUploadProps {
  onUpload: (file: File) => Promise<any>;
  accept?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface UploadState {
  file: File | null;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = [],
  allowedExtensions = [],
  multiple = false,
  disabled = false,
  className = '',
  children
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    progress: 0,
    status: 'idle',
    error: null
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const resetUploadState = useCallback(() => {
    setUploadState({
      file: null,
      progress: 0,
      status: 'idle',
      error: null
    });
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // Handle single file for now
    
    // Reset previous state
    resetUploadState();
    
    setUploadState(prev => ({
      ...prev,
      file,
      status: 'uploading'
    }));

    // Check network connectivity
    if (!isOnline) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: t('upload.offlineError', 'File upload requires an internet connection.')
      }));
      return;
    }

    try {
      // Upload with comprehensive error handling
      const result = await fileUploadErrorHandler.uploadWithErrorHandling(
        file,
        async (file: File) => {
          // Simulate progress updates
          const progressInterval = setInterval(() => {
            setUploadState(prev => ({
              ...prev,
              progress: Math.min(prev.progress + 10, 90)
            }));
          }, 200);

          try {
            const uploadResult = await onUpload(file);
            clearInterval(progressInterval);
            
            setUploadState(prev => ({
              ...prev,
              progress: 100
            }));

            return uploadResult;
          } catch (error) {
            clearInterval(progressInterval);
            throw error;
          }
        },
        {
          maxSize,
          allowedTypes,
          allowedExtensions,
          timeout: 60000, // 60 seconds
          retries: 2
        }
      );

      if (result.success) {
        setUploadState(prev => ({
          ...prev,
          status: 'success',
          progress: 100
        }));

        addToast({
          type: 'success',
          title: t('upload.success', 'Upload Successful'),
          message: t('upload.successMessage', 'File uploaded successfully.'),
        });
      } else if (result.error) {
        const errorMessage = fileUploadErrorHandler.getUserMessage(result.error);
        
        setUploadState(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage
        }));

        addToast({
          type: 'error',
          title: t('upload.failed', 'Upload Failed'),
          message: errorMessage,
        });
      }
    } catch (error: any) {
      const uploadError = fileUploadErrorHandler.handleUploadError(error, file);
      const errorMessage = fileUploadErrorHandler.getUserMessage(uploadError);
      
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage
      }));

      addToast({
        type: 'error',
        title: t('upload.failed', 'Upload Failed'),
        message: errorMessage,
      });
    }
  }, [onUpload, maxSize, allowedTypes, allowedExtensions, isOnline, t, addToast, resetUploadState]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && isOnline) {
      setIsDragOver(true);
    }
  }, [disabled, isOnline]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled || !isOnline) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [disabled, isOnline, handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    if (!disabled && isOnline && uploadState.status !== 'uploading') {
      fileInputRef.current?.click();
    }
  }, [disabled, isOnline, uploadState.status]);

  const handleRemove = useCallback(() => {
    resetUploadState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetUploadState]);

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'uploading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Upload className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (uploadState.status) {
      case 'uploading':
        return t('upload.uploading', 'Uploading...');
      case 'success':
        return t('upload.completed', 'Upload completed');
      case 'error':
        return uploadState.error || t('upload.failed', 'Upload failed');
      default:
        return !isOnline 
          ? t('upload.offlineMessage', 'Upload unavailable (offline)')
          : t('upload.dropOrClick', 'Drop files here or click to browse');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || !isOnline}
      />
      
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver && isOnline && !disabled ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' : ''}
          ${!isOnline ? 'border-gray-300 bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${uploadState.status === 'error' ? 'border-red-300 bg-red-50 dark:bg-red-950' : ''}
          ${uploadState.status === 'success' ? 'border-green-300 bg-green-50 dark:bg-green-950' : ''}
        `}
      >
        {/* Network Status Indicator */}
        <div className="absolute top-2 right-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" title={t('upload.online', 'Online')} />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" title={t('upload.offline', 'Offline')} />
          )}
        </div>

        <div className="flex flex-col items-center space-y-2">
          {getStatusIcon()}
          
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {getStatusText()}
          </div>
          
          {uploadState.file && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {uploadState.file.name} ({fileUploadErrorHandler.formatFileSize(uploadState.file.size)})
            </div>
          )}
          
          {uploadState.status === 'uploading' && (
            <div className="w-full max-w-xs">
              <Progress value={uploadState.progress} className="h-2" />
              <div className="text-xs text-gray-500 mt-1">
                {uploadState.progress}%
              </div>
            </div>
          )}
          
          {uploadState.status === 'success' && uploadState.file && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
            >
              <X className="h-4 w-4 mr-1" />
              {t('upload.remove', 'Remove')}
            </Button>
          )}
          
          {children}
        </div>
      </div>
    </div>
  );
};
