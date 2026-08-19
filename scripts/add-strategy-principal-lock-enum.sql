-- Add STRATEGY_PRINCIPAL_LOCK to TransactionType enum
-- Run this SQL script in your PostgreSQL database

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'STRATEGY_PRINCIPAL_LOCK';

