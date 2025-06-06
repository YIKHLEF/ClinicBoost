/**
 * Enhanced File Upload Handler
 * 
 * Provides robust file upload handling with chunking, resume capability,
 * comprehensive error handling, and progress tracking.
 */

import { logger } from '../logging-monitoring';
import { EnhancedNetworkHandler } from '../error-handling/enhanced-network-handling';

export interface UploadConfig {
  chunkSize: number; // bytes
  maxFileSize: number; // bytes
  allowedTypes: string[];
  allowedExtensions: string[];
  maxConcurrentUploads: number;
  resumeEnabled: boolean;
  checksumValidation: boolean;
  timeouts: {
    chunk: number;
    total: number;
  };
  retries: {
    maxAttempts: number;
    backoffMultiplier: number;
  };
}

export interface UploadJob {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: {
    uploadedBytes: number;
    totalBytes: number;
    percentage: number;
    speed: number; // bytes per second
    estimatedTimeRemaining: number; // milliseconds
  };
  chunks: ChunkInfo[];
  startedAt?: Date;
  completedAt?: Date;
  error?: UploadError;
  metadata: {
    checksum?: string;
    uploadUrl?: string;
    resumeToken?: string;
  };
}

export interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  size: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  uploadedAt?: Date;
  retryCount: number;
  checksum?: string;
  error?: string;
}

export interface UploadError {
  code: string;
  message: string;
  type: 'validation' | 'network' | 'server' | 'client' | 'quota';
  retryable: boolean;
  chunk?: number;
  details?: any;
}

export interface UploadProgress {
  jobId: string;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  speed: number;
  estimatedTimeRemaining: number;
  activeChunks: number;
}

export class EnhancedUploadHandler {
  private config: UploadConfig;
  private networkHandler: EnhancedNetworkHandler;
  private activeJobs: Map<string, UploadJob> = new Map();
  private uploadQueue: string[] = [];
  private activeUploads = 0;
  private progressCallbacks: Map<string, (progress: UploadProgress) => void> = new Map();

  constructor(config: UploadConfig, networkHandler: EnhancedNetworkHandler) {
    this.config = config;
    this.networkHandler = networkHandler;
  }

  /**
   * Start file upload with chunking and error handling
   */
  async startUpload(
    file: File,
    uploadUrl: string,
    options: {
      onProgress?: (progress: UploadProgress) => void;
      metadata?: Record<string, any>;
      resumeToken?: string;
    } = {}
  ): Promise<string> {
    // Validate file
    const validationError = this.validateFile(file);
    if (validationError) {
      throw validationError;
    }

    const jobId = this.generateJobId();
    const chunks = this.createChunks(file);

    const job: UploadJob = {
      id: jobId,
      file,
      status: 'pending',
      progress: {
        uploadedBytes: 0,
        totalBytes: file.size,
        percentage: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
      },
      chunks,
      metadata: {
        uploadUrl,
        resumeToken: options.resumeToken,
      },
    };

    // Calculate checksum if enabled
    if (this.config.checksumValidation) {
      job.metadata.checksum = await this.calculateChecksum(file);
    }

    this.activeJobs.set(jobId, job);

    if (options.onProgress) {
      this.progressCallbacks.set(jobId, options.onProgress);
    }

    // Add to queue
    this.uploadQueue.push(jobId);
    this.processUploadQueue();

    logger.info('Upload job created', 'enhanced-upload-handler', {
      jobId,
      fileName: file.name,
      fileSize: file.size,
      chunkCount: chunks.length,
    });

    return jobId;
  }

  /**
   * Resume upload from previous session
   */
  async resumeUpload(jobId: string, resumeToken: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Upload job not found: ${jobId}`);
    }

    if (job.status !== 'paused') {
      throw new Error(`Cannot resume upload in status: ${job.status}`);
    }

    // Get upload status from server
    const uploadStatus = await this.getResumeUploadStatus(resumeToken);
    
    // Update chunk statuses based on server response
    this.updateChunkStatuses(job, uploadStatus);

    // Resume upload
    job.status = 'pending';
    this.uploadQueue.push(jobId);
    this.processUploadQueue();

    logger.info('Upload resumed', 'enhanced-upload-handler', {
      jobId,
      resumeToken,
      completedChunks: job.chunks.filter(c => c.status === 'completed').length,
    });
  }

  /**
   * Pause upload
   */
  pauseUpload(jobId: string): void {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Upload job not found: ${jobId}`);
    }

    if (job.status === 'uploading') {
      job.status = 'paused';
      logger.info('Upload paused', 'enhanced-upload-handler', { jobId });
    }
  }

  /**
   * Cancel upload
   */
  cancelUpload(jobId: string): void {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Upload job not found: ${jobId}`);
    }

    job.status = 'cancelled';
    this.activeJobs.delete(jobId);
    this.progressCallbacks.delete(jobId);

    // Remove from queue
    const queueIndex = this.uploadQueue.indexOf(jobId);
    if (queueIndex > -1) {
      this.uploadQueue.splice(queueIndex, 1);
    }

    logger.info('Upload cancelled', 'enhanced-upload-handler', { jobId });
  }

  /**
   * Get upload status
   */
  getUploadStatus(jobId: string): UploadJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Process upload queue
   */
  private async processUploadQueue(): Promise<void> {
    while (
      this.uploadQueue.length > 0 &&
      this.activeUploads < this.config.maxConcurrentUploads
    ) {
      const jobId = this.uploadQueue.shift()!;
      const job = this.activeJobs.get(jobId);

      if (!job || job.status !== 'pending') {
        continue;
      }

      this.activeUploads++;
      this.executeUpload(job).finally(() => {
        this.activeUploads--;
        this.processUploadQueue();
      });
    }
  }

  /**
   * Execute upload for a job
   */
  private async executeUpload(job: UploadJob): Promise<void> {
    try {
      job.status = 'uploading';
      job.startedAt = new Date();

      logger.info('Starting upload', 'enhanced-upload-handler', {
        jobId: job.id,
        fileName: job.file.name,
      });

      // Upload chunks
      await this.uploadChunks(job);

      // Finalize upload
      await this.finalizeUpload(job);

      job.status = 'completed';
      job.completedAt = new Date();
      job.progress.percentage = 100;

      this.notifyProgress(job);

      logger.info('Upload completed', 'enhanced-upload-handler', {
        jobId: job.id,
        duration: job.completedAt.getTime() - job.startedAt!.getTime(),
      });

    } catch (error) {
      job.status = 'failed';
      job.error = this.parseUploadError(error);

      logger.error('Upload failed', 'enhanced-upload-handler', {
        jobId: job.id,
        error: job.error.message,
      });

      this.notifyProgress(job);
    }
  }

  /**
   * Upload chunks with parallel processing
   */
  private async uploadChunks(job: UploadJob): Promise<void> {
    const pendingChunks = job.chunks.filter(chunk => chunk.status === 'pending');
    const maxConcurrentChunks = Math.min(3, pendingChunks.length); // Limit concurrent chunks

    // Process chunks in batches
    for (let i = 0; i < pendingChunks.length; i += maxConcurrentChunks) {
      const batch = pendingChunks.slice(i, i + maxConcurrentChunks);
      const chunkPromises = batch.map(chunk => this.uploadChunk(job, chunk));

      await Promise.all(chunkPromises);

      // Update progress
      this.updateProgress(job);
      this.notifyProgress(job);

      // Check if upload was paused or cancelled
      if (job.status !== 'uploading') {
        throw new Error(`Upload ${job.status}`);
      }
    }
  }

  /**
   * Upload a single chunk
   */
  private async uploadChunk(job: UploadJob, chunk: ChunkInfo): Promise<void> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.config.retries.maxAttempts; attempt++) {
      try {
        chunk.status = 'uploading';

        // Extract chunk data
        const chunkData = job.file.slice(chunk.start, chunk.end);
        
        // Calculate chunk checksum if enabled
        if (this.config.checksumValidation) {
          chunk.checksum = await this.calculateChecksum(chunkData);
        }

        // Upload chunk
        await this.uploadChunkData(job, chunk, chunkData);

        chunk.status = 'completed';
        chunk.uploadedAt = new Date();
        return;

      } catch (error) {
        lastError = error;
        chunk.retryCount++;

        if (attempt < this.config.retries.maxAttempts) {
          const delay = Math.pow(this.config.retries.backoffMultiplier, attempt - 1) * 1000;
          await this.delay(delay);
        }
      }
    }

    chunk.status = 'failed';
    chunk.error = lastError instanceof Error ? lastError.message : 'Unknown error';
    throw new Error(`Chunk ${chunk.index} failed after ${this.config.retries.maxAttempts} attempts`);
  }

  /**
   * Upload chunk data to server
   */
  private async uploadChunkData(job: UploadJob, chunk: ChunkInfo, data: Blob): Promise<void> {
    const formData = new FormData();
    formData.append('chunk', data);
    formData.append('chunkIndex', chunk.index.toString());
    formData.append('totalChunks', job.chunks.length.toString());
    formData.append('fileName', job.file.name);
    
    if (chunk.checksum) {
      formData.append('checksum', chunk.checksum);
    }

    if (job.metadata.resumeToken) {
      formData.append('resumeToken', job.metadata.resumeToken);
    }

    const response = await this.networkHandler.enhancedFetch(job.metadata.uploadUrl!, {
      method: 'POST',
      body: formData,
      timeout: this.config.timeouts.chunk,
    });

    if (!response.ok) {
      throw new Error(`Chunk upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Update resume token if provided
    if (result.resumeToken) {
      job.metadata.resumeToken = result.resumeToken;
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): UploadError | null {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        code: 'FILE_TOO_LARGE',
        message: `File size ${file.size} exceeds maximum ${this.config.maxFileSize}`,
        type: 'validation',
        retryable: false,
      };
    }

    // Check file type
    if (this.config.allowedTypes.length > 0 && !this.config.allowedTypes.includes(file.type)) {
      return {
        code: 'INVALID_FILE_TYPE',
        message: `File type ${file.type} is not allowed`,
        type: 'validation',
        retryable: false,
      };
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (this.config.allowedExtensions.length > 0 && extension && !this.config.allowedExtensions.includes(extension)) {
      return {
        code: 'INVALID_FILE_EXTENSION',
        message: `File extension ${extension} is not allowed`,
        type: 'validation',
        retryable: false,
      };
    }

    return null;
  }

  /**
   * Create chunks for file
   */
  private createChunks(file: File): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    const chunkCount = Math.ceil(file.size / this.config.chunkSize);

    for (let i = 0; i < chunkCount; i++) {
      const start = i * this.config.chunkSize;
      const end = Math.min(start + this.config.chunkSize, file.size);

      chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        status: 'pending',
        retryCount: 0,
      });
    }

    return chunks;
  }

  /**
   * Update progress for job
   */
  private updateProgress(job: UploadJob): void {
    const completedChunks = job.chunks.filter(c => c.status === 'completed');
    const uploadedBytes = completedChunks.reduce((total, chunk) => total + chunk.size, 0);
    
    job.progress.uploadedBytes = uploadedBytes;
    job.progress.percentage = Math.round((uploadedBytes / job.progress.totalBytes) * 100);

    // Calculate speed and ETA
    if (job.startedAt) {
      const elapsed = Date.now() - job.startedAt.getTime();
      job.progress.speed = uploadedBytes / (elapsed / 1000);
      
      const remainingBytes = job.progress.totalBytes - uploadedBytes;
      job.progress.estimatedTimeRemaining = job.progress.speed > 0 
        ? (remainingBytes / job.progress.speed) * 1000 
        : 0;
    }
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(job: UploadJob): void {
    const callback = this.progressCallbacks.get(job.id);
    if (callback) {
      const activeChunks = job.chunks.filter(c => c.status === 'uploading').length;
      
      callback({
        jobId: job.id,
        uploadedBytes: job.progress.uploadedBytes,
        totalBytes: job.progress.totalBytes,
        percentage: job.progress.percentage,
        speed: job.progress.speed,
        estimatedTimeRemaining: job.progress.estimatedTimeRemaining,
        activeChunks,
      });
    }
  }

  /**
   * Utility methods
   */
  private generateJobId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async calculateChecksum(data: Blob): Promise<string> {
    const buffer = await data.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private parseUploadError(error: any): UploadError {
    // Implementation would parse different types of upload errors
    return {
      code: 'UPLOAD_ERROR',
      message: error instanceof Error ? error.message : 'Unknown upload error',
      type: 'network',
      retryable: true,
    };
  }

  private async getResumeUploadStatus(resumeToken: string): Promise<any> {
    // Implementation would get upload status from server
    return {};
  }

  private updateChunkStatuses(job: UploadJob, uploadStatus: any): void {
    // Implementation would update chunk statuses based on server response
  }

  private async finalizeUpload(job: UploadJob): Promise<void> {
    // Implementation would finalize upload on server
  }

  /**
   * Enhanced upload with comprehensive error recovery
   */
  async uploadWithRecovery(
    file: File,
    uploadUrl: string,
    options: {
      onProgress?: (progress: UploadProgress) => void;
      onError?: (error: Error, canRetry: boolean) => void;
      onRecovery?: (recoveryInfo: { resumeToken: string; uploadedBytes: number }) => void;
      metadata?: Record<string, any>;
      resumeToken?: string;
      maxRetries?: number;
      retryDelay?: number;
    } = {}
  ): Promise<{ success: boolean; jobId?: string; error?: Error; resumeToken?: string }> {
    const {
      maxRetries = 3,
      retryDelay = 2000,
      onProgress,
      onError,
      onRecovery
    } = options;

    let lastError: Error;
    let resumeToken = options.resumeToken;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const jobId = await this.startUpload(file, uploadUrl, {
          onProgress,
          metadata: options.metadata,
          resumeToken
        });

        return { success: true, jobId };

      } catch (error) {
        lastError = error as Error;

        logger.warn('Upload attempt failed', 'enhanced-upload-handler', {
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message,
          fileName: file.name
        });

        // Check if error is recoverable
        const isRecoverable = this.isRecoverableError(lastError);

        if (onError) {
          onError(lastError, isRecoverable && attempt < maxRetries - 1);
        }

        // If not recoverable or last attempt, break
        if (!isRecoverable || attempt === maxRetries - 1) {
          break;
        }

        // Try to get resume information
        try {
          const recoveryInfo = await this.getUploadRecoveryInfo(file, uploadUrl);
          if (recoveryInfo) {
            resumeToken = recoveryInfo.resumeToken;
            if (onRecovery) {
              onRecovery(recoveryInfo);
            }
          }
        } catch (recoveryError) {
          logger.warn('Failed to get recovery info', 'enhanced-upload-handler', {
            error: recoveryError
          });
        }

        // Wait before retrying
        if (attempt < maxRetries - 1) {
          await this.delay(retryDelay * Math.pow(2, attempt));
        }
      }
    }

    return {
      success: false,
      error: lastError!,
      resumeToken
    };
  }

  /**
   * Check if upload error is recoverable
   */
  private isRecoverableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network errors are usually recoverable
    if (message.includes('network') || message.includes('timeout') ||
        message.includes('connection') || message.includes('abort')) {
      return true;
    }

    // Server errors (5xx) are recoverable
    if (message.includes('500') || message.includes('502') ||
        message.includes('503') || message.includes('504')) {
      return true;
    }

    // Rate limit errors are recoverable
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }

    // Client errors (4xx) are usually not recoverable
    if (message.includes('400') || message.includes('401') ||
        message.includes('403') || message.includes('404') ||
        message.includes('413') || message.includes('415')) {
      return false;
    }

    return true; // Default to recoverable for unknown errors
  }

  /**
   * Get upload recovery information
   */
  private async getUploadRecoveryInfo(
    file: File,
    uploadUrl: string
  ): Promise<{ resumeToken: string; uploadedBytes: number } | null> {
    try {
      // Check if there's a partial upload stored locally
      const storageKey = `upload_${this.generateFileHash(file)}`;
      const storedInfo = localStorage.getItem(storageKey);

      if (storedInfo) {
        const parsed = JSON.parse(storedInfo);

        // Verify the upload is still valid on the server
        const isValid = await this.verifyPartialUpload(uploadUrl, parsed.resumeToken);

        if (isValid) {
          return parsed;
        } else {
          // Clean up invalid stored info
          localStorage.removeItem(storageKey);
        }
      }

      return null;
    } catch (error) {
      logger.warn('Failed to get upload recovery info', 'enhanced-upload-handler', { error });
      return null;
    }
  }

  /**
   * Verify if partial upload is still valid
   */
  private async verifyPartialUpload(uploadUrl: string, resumeToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${uploadUrl}/verify`, {
        method: 'HEAD',
        headers: {
          'Upload-Resume-Token': resumeToken
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate file hash for storage key
   */
  private generateFileHash(file: File): string {
    return btoa(`${file.name}_${file.size}_${file.lastModified}`).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Store upload progress for recovery
   */
  storeUploadProgress(file: File, resumeToken: string, uploadedBytes: number): void {
    try {
      const storageKey = `upload_${this.generateFileHash(file)}`;
      const info = {
        resumeToken,
        uploadedBytes,
        timestamp: Date.now()
      };

      localStorage.setItem(storageKey, JSON.stringify(info));
    } catch (error) {
      logger.warn('Failed to store upload progress', 'enhanced-upload-handler', { error });
    }
  }

  /**
   * Clean up stored upload progress
   */
  cleanupUploadProgress(file: File): void {
    try {
      const storageKey = `upload_${this.generateFileHash(file)}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      logger.warn('Failed to cleanup upload progress', 'enhanced-upload-handler', { error });
    }
  }
}
