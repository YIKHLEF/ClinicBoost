/**
 * Mock Service Worker (MSW) Server Setup
 * 
 * Provides API mocking for testing environments
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup server with request handlers
export const server = setupServer(...handlers);
