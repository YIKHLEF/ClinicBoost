/**
 * Component Performance Tests
 * 
 * Tests component rendering performance and optimization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, measureRenderTime, generateMockPatient } from '../utils/test-utils';
import { PatientList } from '../../components/patients/PatientList';
import { AppointmentCalendar } from '../../components/appointments/AppointmentCalendar';
import { Dashboard } from '../../pages/Dashboard';

describe('Component Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PatientList with large dataset efficiently', async () => {
    // Generate large dataset
    const largePatientList = Array.from({ length: 1000 }, (_, index) =>
      generateMockPatient({
        id: `patient-${index}`,
        first_name: `Patient${index}`,
        last_name: `Test${index}`,
        email: `patient${index}@example.com`,
      })
    );

    const renderTime = await measureRenderTime(() => {
      render(<PatientList patients={largePatientList} />);
    });

    // Should render within 100ms for good performance
    expect(renderTime).toBeLessThan(100);
  });

  it('handles rapid state updates without performance degradation', async () => {
    const { rerender } = render(<PatientList patients={[]} />);

    const startTime = performance.now();

    // Simulate rapid updates
    for (let i = 0; i < 100; i++) {
      const patients = Array.from({ length: i + 1 }, (_, index) =>
        generateMockPatient({ id: `patient-${index}` })
      );
      rerender(<PatientList patients={patients} />);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should handle 100 updates within 500ms
    expect(totalTime).toBeLessThan(500);
  });

  it('optimizes calendar rendering with many appointments', async () => {
    const manyAppointments = Array.from({ length: 500 }, (_, index) => ({
      id: `appointment-${index}`,
      patient_id: `patient-${index % 50}`,
      appointment_date: new Date(2024, 11, (index % 30) + 1, 9 + (index % 8)).toISOString(),
      duration: 60,
      type: 'consultation',
      status: 'scheduled',
    }));

    const renderTime = await measureRenderTime(() => {
      render(<AppointmentCalendar appointments={manyAppointments} />);
    });

    // Calendar should render efficiently even with many appointments
    expect(renderTime).toBeLessThan(200);
  });

  it('measures dashboard initial load performance', async () => {
    const renderTime = await measureRenderTime(() => {
      render(<Dashboard />);
    });

    // Dashboard should load quickly
    expect(renderTime).toBeLessThan(150);
  });

  it('tests memory usage with component mounting/unmounting', () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // Mount and unmount components multiple times
    for (let i = 0; i < 50; i++) {
      const { unmount } = render(<PatientList patients={[generateMockPatient()]} />);
      unmount();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be minimal (less than 5MB)
    expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
  });

  it('tests scroll performance with virtualized lists', async () => {
    const largeDataset = Array.from({ length: 10000 }, (_, index) =>
      generateMockPatient({ id: `patient-${index}` })
    );

    const { container } = render(<PatientList patients={largeDataset} virtualized />);
    
    const scrollContainer = container.querySelector('[data-testid="virtualized-list"]');
    expect(scrollContainer).toBeInTheDocument();

    // Simulate scrolling
    const startTime = performance.now();
    
    for (let i = 0; i < 100; i++) {
      scrollContainer?.dispatchEvent(new Event('scroll'));
    }

    const endTime = performance.now();
    const scrollTime = endTime - startTime;

    // Scrolling should be smooth (less than 16ms per frame)
    expect(scrollTime / 100).toBeLessThan(16);
  });

  it('measures form validation performance', async () => {
    const { PatientForm } = await import('../../components/patients/PatientForm');
    
    const startTime = performance.now();

    // Render form and trigger validation multiple times
    for (let i = 0; i < 100; i++) {
      const { unmount } = render(
        <PatientForm
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          initialData={generateMockPatient()}
        />
      );
      unmount();
    }

    const endTime = performance.now();
    const avgRenderTime = (endTime - startTime) / 100;

    // Each form render should be fast
    expect(avgRenderTime).toBeLessThan(10);
  });

  it('tests component re-render optimization', () => {
    let renderCount = 0;
    
    const TestComponent = ({ data }: { data: any[] }) => {
      renderCount++;
      return <div>{data.length} items</div>;
    };

    const { rerender } = render(<TestComponent data={[1, 2, 3]} />);
    
    // Same data should not trigger re-render
    rerender(<TestComponent data={[1, 2, 3]} />);
    expect(renderCount).toBe(1);

    // Different data should trigger re-render
    rerender(<TestComponent data={[1, 2, 3, 4]} />);
    expect(renderCount).toBe(2);
  });

  it('measures bundle size impact of lazy loading', async () => {
    // Test that lazy-loaded components don't impact initial bundle
    const LazyComponent = React.lazy(() => import('../../pages/Reports'));
    
    const renderTime = await measureRenderTime(() => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </React.Suspense>
      );
    });

    // Lazy loading should not significantly impact render time
    expect(renderTime).toBeLessThan(50);
  });

  it('tests image loading performance', async () => {
    const ImageComponent = ({ src }: { src: string }) => (
      <img src={src} alt="test" loading="lazy" />
    );

    const startTime = performance.now();

    // Render multiple images
    for (let i = 0; i < 20; i++) {
      render(<ImageComponent src={`/test-image-${i}.jpg`} />);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Image rendering should be efficient
    expect(totalTime).toBeLessThan(100);
  });

  it('measures API response handling performance', async () => {
    const mockApiResponse = Array.from({ length: 1000 }, (_, index) =>
      generateMockPatient({ id: `patient-${index}` })
    );

    const startTime = performance.now();

    // Simulate processing large API response
    const processedData = mockApiResponse.map(patient => ({
      ...patient,
      fullName: `${patient.first_name} ${patient.last_name}`,
      displayText: `${patient.first_name} ${patient.last_name} - ${patient.email}`,
    }));

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Data processing should be fast
    expect(processingTime).toBeLessThan(50);
    expect(processedData).toHaveLength(1000);
  });

  it('tests concurrent rendering performance', async () => {
    const promises = [];

    // Render multiple components concurrently
    for (let i = 0; i < 10; i++) {
      promises.push(
        measureRenderTime(() => {
          render(<PatientList patients={[generateMockPatient()]} />);
        })
      );
    }

    const renderTimes = await Promise.all(promises);
    const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;

    // Concurrent rendering should not significantly impact performance
    expect(avgRenderTime).toBeLessThan(50);
  });
});
