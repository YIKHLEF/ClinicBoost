# ClinicBoost Offline Capabilities

This document outlines the comprehensive offline functionality implemented in ClinicBoost, enabling seamless operation even without internet connectivity.

## 🌟 Features Overview

### ✅ Offline Data Access
- **Local Data Storage**: All patient, appointment, treatment, and clinic data is stored locally using IndexedDB
- **Instant Access**: Data is available immediately, even when offline
- **Smart Caching**: Automatic caching of frequently accessed data
- **Data Persistence**: Data persists across browser sessions

### ✅ Data Synchronization
- **Automatic Sync**: Background synchronization when connection is restored
- **Conflict Resolution**: Intelligent handling of data conflicts
- **Retry Mechanism**: Exponential backoff for failed sync operations
- **Queue Management**: Offline operations are queued and processed when online

## 🏗️ Architecture

### Core Components

1. **IndexedDB Manager** (`src/lib/offline/indexeddb.ts`)
   - Low-level database operations
   - Schema management and migrations
   - Data versioning support

2. **Storage Service** (`src/lib/offline/storage-service.ts`)
   - High-level data operations
   - Entity-specific methods
   - Sync queue management

3. **Sync Service** (`src/lib/offline/sync-service.ts`)
   - Background synchronization
   - Conflict resolution
   - Error handling and retries

4. **Offline Patient Service** (`src/lib/offline/offline-patient-service.ts`)
   - Patient-specific offline operations
   - Optimistic updates
   - Search functionality

### React Integration

1. **Offline Context** (`src/contexts/OfflineContext.tsx`)
   - Global offline state management
   - Sync status tracking
   - Network monitoring

2. **Enhanced React Query** (`src/lib/react-query.ts`)
   - Offline-first query behavior
   - Automatic fallback to local storage
   - Optimistic mutations

3. **Network Status Hook** (`src/hooks/useNetworkStatus.ts`)
   - Real-time network monitoring
   - Connection quality detection
   - Offline/online state tracking

## 🎯 User Experience

### Visual Indicators

1. **Offline Indicator** (`src/components/offline/OfflineIndicator.tsx`)
   - Shows current connection status
   - Displays sync progress
   - Indicates pending operations

2. **Offline Banner** 
   - Prominent notification when offline
   - Shows number of pending changes
   - Auto-hides when online

3. **Sync Dashboard** (`src/components/offline/SyncDashboard.tsx`)
   - Detailed sync status
   - Storage statistics
   - Manual sync controls

### Progressive Web App (PWA)

- **Service Worker**: Caches application assets
- **App Manifest**: Enables installation on devices
- **Offline Page**: Custom offline fallback page
- **Background Sync**: Syncs data when connection is restored

## 🔧 Implementation Details

### Data Flow

1. **Online Operations**:
   ```
   User Action → API Call → Success → Store Locally (synced=true)
   ```

2. **Offline Operations**:
   ```
   User Action → Store Locally (synced=false) → Add to Sync Queue
   ```

3. **Sync Process**:
   ```
   Connection Restored → Process Sync Queue → Update Local Data → Mark as Synced
   ```

### Storage Schema

```typescript
interface StoredData<T> {
  id: string;
  data: T;
  timestamp: number;
  version: number;
  synced: boolean;
  lastModified: number;
}
```

### Sync Queue Operations

```typescript
interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}
```

## 🚀 Usage Examples

### Creating a Patient Offline

```typescript
const { mutate: createPatient } = useCreatePatient();

// Works both online and offline
createPatient({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  clinic_id: 'clinic-123'
});
```

### Checking Offline Status

```typescript
const { isOffline, pendingOperations, triggerSync } = useOffline();

if (isOffline) {
  console.log(`Working offline with ${pendingOperations} pending changes`);
}

// Manual sync when back online
if (!isOffline && pendingOperations > 0) {
  triggerSync();
}
```

### Network-Aware Queries

```typescript
const { data: patients } = usePatients();
// Automatically falls back to offline data when needed
```

## 🔒 Data Integrity

### Conflict Resolution Strategies

1. **Client Wins**: Local changes take precedence
2. **Server Wins**: Server data overwrites local changes
3. **Merge**: Intelligent merging of changes
4. **Manual**: User-guided conflict resolution

### Data Validation

- Schema validation before storage
- Data integrity checks during sync
- Automatic cleanup of old data
- Version control for data migrations

## 📊 Monitoring & Analytics

### Storage Statistics

- Total items stored offline
- Number of unsynced items
- Sync queue size
- Storage space usage

### Sync Metrics

- Sync success/failure rates
- Average sync duration
- Network quality metrics
- Error tracking and reporting

## 🧪 Testing

### Unit Tests

```bash
npm run test src/lib/offline/__tests__/
```

### Integration Tests

```bash
npm run test:integration
```

### Offline Testing

1. Use browser DevTools to simulate offline mode
2. Test data creation, modification, and deletion
3. Verify sync behavior when connection is restored
4. Check conflict resolution scenarios

## 🔧 Configuration

### Environment Variables

```env
# PWA Configuration
VITE_PWA_ENABLED=true
VITE_PWA_AUTO_UPDATE=true

# Offline Settings
VITE_OFFLINE_STORAGE_MAX_AGE=604800000  # 7 days
VITE_SYNC_RETRY_ATTEMPTS=3
VITE_SYNC_RETRY_DELAY=1000
```

### Customization

```typescript
// Configure sync behavior
const syncService = new SyncService({
  maxRetries: 3,
  retryDelay: 1000,
  autoSyncInterval: 30000
});

// Configure storage limits
const storageService = new OfflineStorageService({
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxItems: 10000
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Storage Quota Exceeded**
   - Clear old data automatically
   - Implement storage limits
   - Provide manual cleanup options

2. **Sync Conflicts**
   - Implement conflict resolution UI
   - Log conflicts for review
   - Provide manual resolution tools

3. **Performance Issues**
   - Optimize IndexedDB queries
   - Implement data pagination
   - Use background processing

### Debug Mode

```typescript
// Enable debug logging
localStorage.setItem('debug', 'offline:*');
```

## 🔮 Future Enhancements

- [ ] Selective sync (sync only specific data types)
- [ ] Peer-to-peer sync between devices
- [ ] Advanced conflict resolution UI
- [ ] Offline analytics and reporting
- [ ] Background data prefetching
- [ ] Smart caching based on usage patterns

## 📚 Resources

- [IndexedDB API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker Guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Best Practices](https://web.dev/pwa/)
- [React Query Offline Support](https://tanstack.com/query/latest/docs/react/guides/offline)
