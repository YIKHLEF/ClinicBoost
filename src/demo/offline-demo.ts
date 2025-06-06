/**
 * Offline Functionality Demo
 * 
 * This script demonstrates the offline capabilities of ClinicBoost.
 * Run this in the browser console to see offline functionality in action.
 */

import { offlineStorageService } from '../lib/offline/storage-service';
import { offlinePatientService } from '../lib/offline/offline-patient-service';
import { syncService } from '../lib/offline/sync-service';
import { logger } from '../lib/logging-monitoring';

export class OfflineDemo {
  private demoClinicId = 'demo-clinic-123';
  
  async runDemo() {
    console.log('🚀 Starting ClinicBoost Offline Demo...\n');
    
    try {
      // Initialize offline storage
      await this.initializeStorage();
      
      // Demo 1: Create patients offline
      await this.demoOfflinePatientCreation();
      
      // Demo 2: Show offline data retrieval
      await this.demoOfflineDataRetrieval();
      
      // Demo 3: Show sync queue
      await this.demoSyncQueue();
      
      // Demo 4: Simulate going online and syncing
      await this.demoOnlineSync();
      
      console.log('✅ Offline demo completed successfully!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }
  
  private async initializeStorage() {
    console.log('📦 Initializing offline storage...');
    await offlineStorageService.init();
    console.log('✅ Offline storage initialized\n');
  }
  
  private async demoOfflinePatientCreation() {
    console.log('👥 Demo 1: Creating patients offline...');
    
    // Simulate offline mode
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    console.log('📱 Simulating offline mode (navigator.onLine = false)');
    
    const patients = [
      {
        first_name: 'Ahmed',
        last_name: 'Benali',
        email: 'ahmed.benali@example.com',
        phone: '+212-6-12-34-56-78',
        clinic_id: this.demoClinicId,
      },
      {
        first_name: 'Fatima',
        last_name: 'Zahra',
        email: 'fatima.zahra@example.com',
        phone: '+212-6-87-65-43-21',
        clinic_id: this.demoClinicId,
      },
      {
        first_name: 'Omar',
        last_name: 'Idrissi',
        email: 'omar.idrissi@example.com',
        phone: '+212-6-11-22-33-44',
        clinic_id: this.demoClinicId,
      }
    ];
    
    for (const patientData of patients) {
      const patient = await offlinePatientService.createPatient(patientData);
      console.log(`✅ Created patient offline: ${patient.first_name} ${patient.last_name} (ID: ${patient.id})`);
    }
    
    console.log('📊 All patients created offline and queued for sync\n');
  }
  
  private async demoOfflineDataRetrieval() {
    console.log('📖 Demo 2: Retrieving data offline...');
    
    const patients = await offlinePatientService.getPatients(this.demoClinicId);
    console.log(`📋 Found ${patients.length} patients in offline storage:`);
    
    patients.forEach((patient, index) => {
      console.log(`   ${index + 1}. ${patient.first_name} ${patient.last_name} - ${patient.email}`);
    });
    
    // Demo search functionality
    console.log('\n🔍 Testing offline search...');
    const searchResults = await offlinePatientService.searchPatientsOffline(this.demoClinicId, 'Ahmed');
    console.log(`🎯 Search for "Ahmed" found ${searchResults.length} result(s)`);
    
    console.log('');
  }
  
  private async demoSyncQueue() {
    console.log('⏳ Demo 3: Checking sync queue...');
    
    const syncQueue = await offlineStorageService.getSyncQueue();
    console.log(`📝 Sync queue contains ${syncQueue.length} pending operations:`);
    
    syncQueue.forEach((operation, index) => {
      console.log(`   ${index + 1}. ${operation.type.toUpperCase()} ${operation.table} (ID: ${operation.id})`);
    });
    
    const stats = await offlineStorageService.getStorageStats();
    console.log(`📊 Storage stats: ${stats.totalItems} total, ${stats.unsyncedItems} unsynced, ${stats.syncQueueSize} in queue\n`);
  }
  
  private async demoOnlineSync() {
    console.log('🌐 Demo 4: Simulating online sync...');
    
    // Simulate going back online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    console.log('📶 Simulating online mode (navigator.onLine = true)');
    
    // Note: In a real scenario, this would sync with the actual server
    console.log('🔄 In a real application, this would:');
    console.log('   1. Process the sync queue');
    console.log('   2. Send offline changes to the server');
    console.log('   3. Pull latest data from server');
    console.log('   4. Resolve any conflicts');
    console.log('   5. Mark data as synced');
    
    // For demo purposes, let's show what the sync process would look like
    const syncQueue = await offlineStorageService.getSyncQueue();
    console.log(`\n📤 Would sync ${syncQueue.length} operations:`);
    
    for (const operation of syncQueue) {
      console.log(`   ✅ Synced: ${operation.type} ${operation.table}`);
      // In real sync, we would:
      // await this.processSyncOperation(operation);
      // await offlineStorageService.removeSyncOperation(operation.id);
    }
    
    console.log('🎉 Sync completed! All data is now synchronized\n');
  }
  
  async showOfflineStats() {
    console.log('📊 Current Offline Statistics:');
    console.log('================================');
    
    const stats = await offlineStorageService.getStorageStats();
    console.log(`Total Items: ${stats.totalItems}`);
    console.log(`Unsynced Items: ${stats.unsyncedItems}`);
    console.log(`Sync Queue Size: ${stats.syncQueueSize}`);
    console.log(`Storage Size: ${stats.storageSize} bytes`);
    
    const patients = await offlinePatientService.getPatients();
    console.log(`\nPatients in offline storage: ${patients.length}`);
    
    const unsyncedPatients = await offlinePatientService.getUnsyncedPatients();
    console.log(`Unsynced patients: ${unsyncedPatients.length}`);
    
    const patientStats = await offlinePatientService.getOfflineStats();
    console.log(`Temporary patients: ${patientStats.tempPatients}`);
  }
  
  async clearDemo() {
    console.log('🧹 Clearing demo data...');
    await offlineStorageService.clear('patients');
    await offlineStorageService.clear('syncQueue');
    console.log('✅ Demo data cleared');
  }
}

// Export for use in browser console
(window as any).OfflineDemo = OfflineDemo;

// Auto-run demo if in development mode
if (import.meta.env.DEV) {
  console.log('🔧 Development mode detected. OfflineDemo class available in window.OfflineDemo');
  console.log('💡 Run: new OfflineDemo().runDemo() to start the demo');
}

export default OfflineDemo;
