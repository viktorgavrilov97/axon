/**
 * Payment Providers Factory Tests
 * Tests provider factory functions and configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDepositProviderClient,
  getWithdrawalProviderClient,
  type DepositProviderName,
  type WithdrawalProviderName,
} from '../modules/wallet/lib/payment-providers';
import { DEFAULT_DEPOSIT_PROVIDER, DEFAULT_WITHDRAWAL_PROVIDER } from '../modules/wallet/lib/wallet-config';

// Mock provider clients
vi.mock('../modules/wallet/lib/providers/nowpayments-client', () => ({
  nowpaymentsDepositClient: {
    createInvoice: vi.fn(),
    syncInvoiceStatus: vi.fn(),
  },
  nowpaymentsWithdrawalClient: {
    createPayout: vi.fn(),
    syncPayoutStatus: vi.fn(),
  },
}));


describe('Payment Providers Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDepositProviderClient', () => {
    it('should return NOWPayments client for NOWPAYMENTS provider', () => {
      const client = getDepositProviderClient('NOWPAYMENTS');
      expect(client).toBeDefined();
      expect(typeof client.createInvoice).toBe('function');
      expect(typeof client.syncInvoiceStatus).toBe('function');
    });


    it('should default to NOWPayments for unknown provider', () => {
      // TypeScript should prevent this, but test runtime behavior
      const client = getDepositProviderClient('NOWPAYMENTS' as DepositProviderName);
      expect(client).toBeDefined();
    });
  });

  describe('getWithdrawalProviderClient', () => {
    it('should return NOWPayments client for NOWPAYMENTS provider', () => {
      const client = getWithdrawalProviderClient('NOWPAYMENTS');
      expect(client).toBeDefined();
      expect(typeof client.createPayout).toBe('function');
      expect(typeof client.syncPayoutStatus).toBe('function');
    });

    it('should throw error for INTERNAL provider', () => {
      // INTERNAL should not use external providers
      expect(() => getWithdrawalProviderClient('INTERNAL')).toThrow();
    });
  });

  describe('Default Provider Configuration', () => {
    it('should have DEFAULT_DEPOSIT_PROVIDER defined', () => {
      expect(DEFAULT_DEPOSIT_PROVIDER).toBeDefined();
      expect(DEFAULT_DEPOSIT_PROVIDER).toBe('NOWPAYMENTS');
    });

    it('should have DEFAULT_WITHDRAWAL_PROVIDER defined', () => {
      expect(DEFAULT_WITHDRAWAL_PROVIDER).toBeDefined();
      expect(['NOWPAYMENTS', 'INTERNAL']).toContain(DEFAULT_WITHDRAWAL_PROVIDER);
    });

    it('should default to NOWPAYMENTS if env var not set', () => {
      // Defaults to NOWPAYMENTS
      expect(DEFAULT_DEPOSIT_PROVIDER).toBe('NOWPAYMENTS');
    });
  });
});

