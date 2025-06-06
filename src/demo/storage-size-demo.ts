/**
 * Demo script to showcase storage size calculation functionality
 */

import { offlineStorageService } from '../lib/offline/storage-service';
import { logger } from '../lib/logging-monitoring';

export class StorageSizeDemo {
  async runDemo(): Promise<void> {
    try {
      console.log('🚀 Starting Storage Size Calculation Demo...\n');

      // Initialize the offline storage service
      await offlineStorageService.init();
      console.log('✅ Offline storage initialized\n');

      // Add some sample data
      await this.addSampleData();

      // Get basic storage statistics
      console.log('📊 Basic Storage Statistics:');
      const basicStats = await offlineStorageService.getStorageStats();
      console.log(`- Total Items: ${basicStats.totalItems}`);
      console.log(`- Unsynced Items: ${basicStats.unsyncedItems}`);
      console.log(`- Sync Queue Size: ${basicStats.syncQueueSize}`);
      console.log(`- Storage Size: ${offlineStorageService.formatStorageSize(basicStats.storageSize)}`);
      console.log('');

      // Get detailed storage statistics
      console.log('📈 Detailed Storage Statistics:');
      const detailedStats = await offlineStorageService.getDetailedStorageStats();
      
      console.log('Total Stats:');
      console.log(`- Total Items: ${detailedStats.totalStats.totalItems}`);
      console.log(`- Unsynced Items: ${detailedStats.totalStats.unsyncedItems}`);
      console.log(`- Sync Queue Size: ${detailedStats.totalStats.syncQueueSize}`);
      console.log(`- Total Storage Size: ${offlineStorageService.formatStorageSize(detailedStats.totalStats.storageSize)}`);
      console.log('');

      console.log('Per-Store Stats:');
      for (const [storeName, stats] of Object.entries(detailedStats.storeStats)) {
        console.log(`- ${storeName}:`);
        console.log(`  • Items: ${stats.itemCount}`);
        console.log(`  • Size: ${offlineStorageService.formatStorageSize(stats.storageSize)}`);
        console.log(`  • Unsynced: ${stats.unsyncedCount}`);
      }
      console.log('');

      // Check storage quota if available
      const usagePercentage = await offlineStorageService.getStorageUsagePercentage();
      if (usagePercentage !== null) {
        console.log(`💾 Storage Usage: ${usagePercentage.toFixed(2)}% of available quota`);
      } else {
        console.log('💾 Storage quota information not available');
      }
      console.log('');

      // Demonstrate size calculation for different data types
      await this.demonstrateSizeCalculation();

      console.log('✅ Storage Size Calculation Demo completed successfully!');

    } catch (error) {
      console.error('❌ Demo failed:', error);
      logger.error('Storage size demo failed', 'demo', { error });
    }
  }

  private async addSampleData(): Promise<void> {
    console.log('📝 Adding sample data...');

    // Add sample patients
    const patients = [
      {
        id: 'patient-1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        dateOfBirth: '1990-01-15',
        address: '123 Main St, City, State 12345',
        medicalHistory: [
          'Hypertension',
          'Diabetes Type 2',
          'Previous surgery: Appendectomy (2015)'
        ],
        allergies: ['Penicillin', 'Shellfish'],
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Spouse',
          phone: '+1234567891'
        }
      },
      {
        id: 'patient-2',
        name: 'Alice Smith',
        email: 'alice.smith@example.com',
        phone: '+1234567892',
        dateOfBirth: '1985-06-20',
        address: '456 Oak Ave, City, State 12346',
        medicalHistory: ['Asthma', 'Seasonal allergies'],
        allergies: ['Pollen', 'Dust mites'],
        emergencyContact: {
          name: 'Bob Smith',
          relationship: 'Husband',
          phone: '+1234567893'
        }
      }
    ];

    for (const patient of patients) {
      await offlineStorageService.storePatient(patient as any, false);
    }

    // Add sample appointments
    const appointments = [
      {
        id: 'appointment-1',
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        date: '2024-01-15',
        time: '10:00',
        duration: 30,
        type: 'Consultation',
        status: 'scheduled',
        notes: 'Regular checkup for diabetes management',
        provider: 'Dr. Johnson'
      },
      {
        id: 'appointment-2',
        patientId: 'patient-2',
        clinicId: 'clinic-1',
        date: '2024-01-16',
        time: '14:30',
        duration: 45,
        type: 'Follow-up',
        status: 'completed',
        notes: 'Asthma medication review and adjustment',
        provider: 'Dr. Williams'
      }
    ];

    for (const appointment of appointments) {
      await offlineStorageService.storeAppointment(appointment as any, Math.random() > 0.5);
    }

    // Add sample treatments
    const treatments = [
      {
        id: 'treatment-1',
        patientId: 'patient-1',
        appointmentId: 'appointment-1',
        clinicId: 'clinic-1',
        date: '2024-01-15',
        diagnosis: 'Type 2 Diabetes Mellitus',
        treatment: 'Medication adjustment and lifestyle counseling',
        medications: [
          {
            name: 'Metformin',
            dosage: '500mg',
            frequency: 'Twice daily',
            duration: '3 months'
          }
        ],
        followUpDate: '2024-04-15',
        cost: 150.00
      }
    ];

    for (const treatment of treatments) {
      await offlineStorageService.storeTreatment(treatment as any, false);
    }

    console.log('✅ Sample data added successfully\n');
  }

  private async demonstrateSizeCalculation(): Promise<void> {
    console.log('🔍 Demonstrating size calculation for different data types:');

    const sampleData = {
      string: 'Hello, World!',
      number: 42,
      boolean: true,
      date: new Date(),
      array: [1, 2, 3, 'four', 'five'],
      object: {
        name: 'Sample Object',
        nested: {
          value: 100,
          active: true
        }
      },
      largeString: 'A'.repeat(1000), // 1KB string
      complexObject: {
        patients: Array.from({ length: 10 }, (_, i) => ({
          id: `patient-${i}`,
          name: `Patient ${i}`,
          data: Array.from({ length: 50 }, (_, j) => `data-${j}`)
        }))
      }
    };

    // Calculate sizes using the same method as the storage service
    const indexedDBManager = (offlineStorageService as any).indexedDBManager;
    const calculateObjectSize = indexedDBManager.calculateObjectSize.bind(indexedDBManager);

    for (const [key, value] of Object.entries(sampleData)) {
      const size = calculateObjectSize(value);
      console.log(`- ${key}: ${offlineStorageService.formatStorageSize(size)}`);
    }

    console.log('');
  }
}

// Export for use in other parts of the application
export const storageSizeDemo = new StorageSizeDemo();

// Auto-run demo if this file is executed directly
if (typeof window !== 'undefined' && (window as any).runStorageSizeDemo) {
  storageSizeDemo.runDemo().catch(console.error);
}
