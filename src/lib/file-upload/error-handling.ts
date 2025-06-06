/**
 * File Upload Error Handling
 * 
 * Comprehensive error handling for file upload operations
 */

import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';

export interface FileUploadError {
  code: string;
  message: string;
  file?: File;
  details?: any;
  userMessage: string;
}

export const FILE_UPLOAD_ERROR_CODES = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  VIRUS_DETECTED: 'VIRUS_DETECTED',
  CORRUPTED_FILE: 'CORRUPTED_FILE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

export const FILE_UPLOAD_ERROR_MESSAGES = {
  [FILE_UPLOAD_ERROR_CODES.FILE_TOO_LARGE]: 'File size exceeds the maximum allowed limit',
  [FILE_UPLOAD_ERROR_CODES.INVALID_FILE_TYPE]: 'File type is not supported',
  [FILE_UPLOAD_ERROR_CODES.UPLOAD_FAILED]: 'Failed to upload file',
  [FILE_UPLOAD_ERROR_CODES.NETWORK_ERROR]: 'Network error during file upload',
  [FILE_UPLOAD_ERROR_CODES.TIMEOUT_ERROR]: 'File upload timed out',
  [FILE_UPLOAD_ERROR_CODES.QUOTA_EXCEEDED]: 'Storage quota exceeded',
  [FILE_UPLOAD_ERROR_CODES.VIRUS_DETECTED]: 'File contains malicious content',
  [FILE_UPLOAD_ERROR_CODES.CORRUPTED_FILE]: 'File appears to be corrupted',
  [FILE_UPLOAD_ERROR_CODES.PERMISSION_DENIED]: 'Permission denied for file upload',
};

export class FileUploadErrorHandler {
  private static instance: FileUploadErrorHandler;

  public static getInstance(): FileUploadErrorHandler {
    if (!FileUploadErrorHandler.instance) {
      FileUploadErrorHandler.instance = new FileUploadErrorHandler();
    }
    return FileUploadErrorHandler.instance;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}): FileUploadError | null {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = [],
      allowedExtensions = []
    } = options;

    // Check file size
    if (file.size > maxSize) {
      return {
        code: FILE_UPLOAD_ERROR_CODES.FILE_TOO_LARGE,
        message: `File size ${this.formatFileSize(file.size)} exceeds maximum allowed size ${this.formatFileSize(maxSize)}`,
        file,
        userMessage: `File is too large. Maximum size allowed is ${this.formatFileSize(maxSize)}.`
      };
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        code: FILE_UPLOAD_ERROR_CODES.INVALID_FILE_TYPE,
        message: `File type ${file.type} is not allowed`,
        file,
        userMessage: `File type not supported. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file extension
    if (allowedExtensions.length > 0) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        return {
          code: FILE_UPLOAD_ERROR_CODES.INVALID_FILE_TYPE,
          message: `File extension .${extension} is not allowed`,
          file,
          userMessage: `File extension not supported. Allowed extensions: ${allowedExtensions.join(', ')}`
        };
      }
    }

    return null;
  }

  /**
   * Handle upload errors
   */
  handleUploadError(error: any, file?: File): FileUploadError {
    logger.error('File upload error', 'file-upload', { error, fileName: file?.name });

    // Network/timeout errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return {
        code: FILE_UPLOAD_ERROR_CODES.TIMEOUT_ERROR,
        message: error.message || 'Upload timed out',
        file,
        details: error,
        userMessage: 'Upload timed out. Please try again with a smaller file or check your connection.'
      };
    }

    // Network errors
    if (error.name === 'NetworkError' || !navigator.onLine) {
      return {
        code: FILE_UPLOAD_ERROR_CODES.NETWORK_ERROR,
        message: error.message || 'Network error during upload',
        file,
        details: error,
        userMessage: 'Network error. Please check your connection and try again.'
      };
    }

    // HTTP errors
    if (error.status) {
      switch (error.status) {
        case 413:
          return {
            code: FILE_UPLOAD_ERROR_CODES.FILE_TOO_LARGE,
            message: 'File too large',
            file,
            details: error,
            userMessage: 'File is too large for upload.'
          };
        case 415:
          return {
            code: FILE_UPLOAD_ERROR_CODES.INVALID_FILE_TYPE,
            message: 'Unsupported file type',
            file,
            details: error,
            userMessage: 'File type is not supported.'
          };
        case 403:
          return {
            code: FILE_UPLOAD_ERROR_CODES.PERMISSION_DENIED,
            message: 'Permission denied',
            file,
            details: error,
            userMessage: 'You do not have permission to upload this file.'
          };
        case 507:
          return {
            code: FILE_UPLOAD_ERROR_CODES.QUOTA_EXCEEDED,
            message: 'Storage quota exceeded',
            file,
            details: error,
            userMessage: 'Storage quota exceeded. Please free up space and try again.'
          };
      }
    }

    // Generic upload error
    return {
      code: FILE_UPLOAD_ERROR_CODES.UPLOAD_FAILED,
      message: error.message || 'Upload failed',
      file,
      details: error,
      userMessage: 'Failed to upload file. Please try again.'
    };
  }

  /**
   * Upload file with comprehensive error handling
   */
  async uploadWithErrorHandling(
    file: File,
    uploadFn: (file: File) => Promise<any>,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<{ success: boolean; data?: any; error?: FileUploadError }> {
    const {
      timeout = 60000, // 60 seconds
      retries = 2
    } = options;

    try {
      // Validate file first
      const validationError = this.validateFile(file, options);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // Attempt upload with retries
      let lastError: any;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Create timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Upload timeout')), timeout);
          });

          // Race between upload and timeout
          const result = await Promise.race([
            uploadFn(file),
            timeoutPromise
          ]);

          logger.info('File uploaded successfully', 'file-upload', {
            fileName: file.name,
            fileSize: file.size,
            attempt: attempt + 1
          });

          return { success: true, data: result };
        } catch (error) {
          lastError = error;
          
          // Don't retry on certain errors
          if (error.status === 413 || error.status === 415 || error.status === 403) {
            break;
          }

          // Wait before retry
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }

      const uploadError = this.handleUploadError(lastError, file);
      return { success: false, error: uploadError };
    } catch (error) {
      const uploadError = this.handleUploadError(error, file);
      return { success: false, error: uploadError };
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: FileUploadError): string {
    return error.userMessage || FILE_UPLOAD_ERROR_MESSAGES[error.code] || 'An error occurred during file upload.';
  }
}

export const fileUploadErrorHandler = FileUploadErrorHandler.getInstance();
