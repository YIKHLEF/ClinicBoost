# Testing ClinicBoost Offline Functionality

This guide provides step-by-step instructions for testing the offline capabilities of ClinicBoost.

## 🚀 Quick Start

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Open Browser Developer Tools
- Press `F12` or right-click → "Inspect"
- Go to the **Network** tab
- Check the **Offline** checkbox to simulate offline mode

### 3. Run the Offline Demo
Open the browser console and run:
```javascript
// Initialize and run the demo
const demo = new OfflineDemo();
await demo.runDemo();
```

## 🧪 Manual Testing Scenarios

### Scenario 1: Create Patients Offline

1. **Go Offline**
   - Open DevTools → Network tab
   - Check "Offline" checkbox
   - Verify offline indicator appears in the header

2. **Create a New Patient**
   - Navigate to Patients page
   - Click "Add Patient"
   - Fill in patient details:
     ```
     First Name: Ahmed
     Last Name: Benali
     Email: ahmed.benali@example.com
     Phone: +212-6-12-34-56-78
     ```
   - Click "Save"

3. **Verify Offline Behavior**
   - ✅ Patient should be created immediately
   - ✅ Toast notification: "Patient Created Offline"
   - ✅ Patient appears in the list with temporary ID
   - ✅ Sync indicator shows "1 pending"

### Scenario 2: Data Persistence

1. **Refresh the Page** (while still offline)
   - Press `F5` or `Ctrl+R`
   - ✅ Patient data should still be visible
   - ✅ Offline indicator should still show
   - ✅ Pending operations should be preserved

2. **Close and Reopen Browser**
   - Close the browser completely
   - Reopen and navigate to the app
   - ✅ All offline data should be preserved

### Scenario 3: Sync When Back Online

1. **Go Back Online**
   - Uncheck "Offline" in DevTools
   - ✅ Offline indicator should change to "Online"
   - ✅ Auto-sync should trigger automatically

2. **Verify Sync Process**
   - ✅ Sync status should show "Syncing..."
   - ✅ Pending operations count should decrease
   - ✅ Success toast: "Sync Complete"
   - ✅ Patient ID should change from temporary to real ID

### Scenario 4: Appointment Management Offline

1. **Go Offline Again**
   - Check "Offline" in DevTools

2. **Create an Appointment**
   - Navigate to Appointments
   - Click "New Appointment"
   - Select the offline-created patient
   - Set appointment details:
     ```
     Date: Tomorrow
     Time: 10:00 AM
     Type: Consultation
     Notes: Regular checkup
     ```
   - Save appointment

3. **Verify Offline Appointment**
   - ✅ Appointment created immediately
   - ✅ Appears in calendar/list view
   - ✅ Sync queue shows 2 pending operations

### Scenario 5: Search and Filter Offline

1. **Test Patient Search** (while offline)
   - Go to Patients page
   - Use search box to search for "Ahmed"
   - ✅ Should find the offline-created patient

2. **Test Appointment Filtering**
   - Go to Appointments page
   - Filter by date range
   - ✅ Should show offline-created appointments

### Scenario 6: Update and Delete Operations

1. **Update Patient** (while offline)
   - Edit the offline-created patient
   - Change phone number to: `+212-6-99-88-77-66`
   - Save changes
   - ✅ Changes should be applied immediately
   - ✅ Sync queue should show update operation

2. **Delete Appointment** (while offline)
   - Delete the offline-created appointment
   - ✅ Appointment should be removed from view
   - ✅ Delete operation should be queued for sync

## 🔧 Advanced Testing

### Testing with Browser Console

```javascript
// Check offline storage stats
const demo = new OfflineDemo();
await demo.showOfflineStats();

// Manually trigger sync
const { triggerSync } = useOffline();
await triggerSync();

// Check sync queue
const queue = await offlineStorageService.getSyncQueue();
console.log('Sync queue:', queue);

// Check storage stats
const stats = await offlineStorageService.getStorageStats();
console.log('Storage stats:', stats);
```

### Testing Network Conditions

1. **Slow Connection**
   - DevTools → Network tab
   - Change throttling to "Slow 3G"
   - ✅ App should detect slow connection
   - ✅ Offline indicator should show "(Slow)"

2. **Intermittent Connection**
   - Toggle offline/online repeatedly
   - ✅ App should handle connection changes gracefully
   - ✅ Sync should resume when connection is stable

### Testing PWA Features

1. **Install as PWA**
   - Look for install prompt in browser
   - Click "Install" or use browser menu
   - ✅ App should install as standalone app

2. **Test Offline in PWA**
   - Open installed PWA
   - Disconnect internet completely
   - ✅ App should still work
   - ✅ Offline page should show for new navigation

## 📊 Monitoring and Debugging

### Check Offline Status
```javascript
// Get current offline context
const offlineContext = useOffline();
console.log({
  isOnline: offlineContext.isOnline,
  pendingOperations: offlineContext.pendingOperations,
  lastSyncTime: offlineContext.lastSyncTime,
  storageStats: offlineContext.storageStats
});
```

### View IndexedDB Data
1. Open DevTools
2. Go to **Application** tab
3. Expand **Storage** → **IndexedDB** → **ClinicBoostDB**
4. Browse stored data in each object store

### Check Service Worker
1. DevTools → **Application** tab
2. Click **Service Workers**
3. Verify service worker is registered and running

### Monitor Network Requests
1. DevTools → **Network** tab
2. Watch for failed requests when offline
3. Verify requests are queued and retried when online

## ✅ Expected Behaviors

### When Offline:
- ✅ All CRUD operations work immediately
- ✅ Data is stored locally in IndexedDB
- ✅ Operations are queued for sync
- ✅ UI shows offline indicators
- ✅ Toast notifications inform about offline mode

### When Coming Back Online:
- ✅ Auto-sync triggers automatically
- ✅ Queued operations are processed
- ✅ Conflicts are resolved appropriately
- ✅ UI updates to show online status
- ✅ Success notifications are shown

### Data Persistence:
- ✅ Data survives page refreshes
- ✅ Data survives browser restarts
- ✅ Sync queue is preserved
- ✅ Settings are maintained

## 🐛 Troubleshooting

### Common Issues:

1. **IndexedDB Not Working**
   - Check browser compatibility
   - Ensure HTTPS in production
   - Clear browser storage if corrupted

2. **Sync Not Triggering**
   - Check network connectivity
   - Verify service worker is running
   - Check console for errors

3. **Data Not Persisting**
   - Check browser storage quotas
   - Verify IndexedDB permissions
   - Check for storage cleanup

### Debug Commands:
```javascript
// Clear all offline data
await offlineStorageService.clear('patients');
await offlineStorageService.clear('appointments');
await offlineStorageService.clear('syncQueue');

// Force sync
await syncService.syncAll();

// Check storage quota
navigator.storage.estimate().then(console.log);
```

## 🎯 Success Criteria

The offline functionality is working correctly if:

- ✅ All operations work seamlessly offline
- ✅ Data persists across sessions
- ✅ Sync works automatically when online
- ✅ UI provides clear feedback
- ✅ No data loss occurs
- ✅ Performance remains good offline

## 📱 Mobile Testing

Test on actual mobile devices:
1. Install PWA on mobile
2. Turn off mobile data/WiFi
3. Test all functionality
4. Verify sync when connection returns

This comprehensive testing ensures the offline functionality works reliably in all scenarios.
