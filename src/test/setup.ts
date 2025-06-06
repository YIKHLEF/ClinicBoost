import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';
import 'vitest-canvas-mock';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock environment variables
process.env.VITE_TWILIO_ACCOUNT_SID = 'test_account_sid';
process.env.VITE_TWILIO_AUTH_TOKEN = 'test_auth_token';
process.env.VITE_TWILIO_PHONE_NUMBER = '+1234567890';
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test_anon_key';
process.env.VITE_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null,
        })),
      })),
    })),
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
      dir: () => 'ltr',
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      pathname: '/',
      search: '',
      hash: '',
      state: null,
    }),
  };
});

// Mock Twilio
vi.mock('../utils/twilio', () => ({
  sendSMS: vi.fn(),
  sendWhatsApp: vi.fn(),
  makeCall: vi.fn(),
  validatePhoneNumber: vi.fn((phone: string) => {
    // Mock validation for Moroccan phone numbers
    const moroccanPattern = /^(\+212|0)[5-7]\d{8}$/;
    return moroccanPattern.test(phone);
  }),
}));

// Mock jsPDF
vi.mock('jspdf', () => {
  const mockAutoTable = vi.fn();
  const mockPDF = {
    setFontSize: vi.fn(),
    text: vi.fn(),
    autoTable: mockAutoTable,
    save: vi.fn(),
  };

  const jsPDF = vi.fn(() => mockPDF);
  jsPDF.mockPDF = mockPDF;
  return { default: jsPDF };
});

// Mock XLSX
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

// Global test utilities
export const createMockPatient = (overrides = {}) => ({
  id: '1',
  first_name: 'Mohammed',
  last_name: 'Karimi',
  email: 'mohammed@example.com',
  phone: '+212612345678',
  date_of_birth: '1990-01-01',
  gender: 'male',
  address: '123 Main St',
  city: 'Casablanca',
  insurance_provider: 'CNSS',
  insurance_number: 'INS123456',
  notes: 'Regular patient',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockAppointment = (overrides = {}) => ({
  id: '1',
  patient_id: '1',
  start_time: '2024-12-15T09:00:00Z',
  end_time: '2024-12-15T10:00:00Z',
  status: 'scheduled',
  treatment_id: null,
  notes: 'Regular checkup',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockTreatment = (overrides = {}) => ({
  id: '1',
  patient_id: '1',
  name: 'Dental Cleaning',
  description: 'Regular dental cleaning',
  cost: 200,
  status: 'completed',
  start_date: '2024-12-10',
  completion_date: '2024-12-10',
  notes: 'No complications',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});
