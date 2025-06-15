import { eq, desc, and, or, sql } from 'drizzle-orm';
import { db } from './index';
import { transactions } from './schema';
import { Transaction, TransactionType } from '@shared/types';

/**
 * Data access object for transactions
 */
export class TransactionDao {
  /**
   * Create a new transaction
   * @param transaction Transaction to create
   * @returns Created transaction
   */
  async createTransaction(transaction: Transaction): Promise<Transaction> {
    console.log(`[TransactionDAO] createTransaction called for hash: ${transaction.hash}, type: ${transaction.type}`);
    try {
      const dbTransaction = {
        hash: transaction.hash,
        type: transaction.type,
        fromAddress: transaction.from,
        toAddress: transaction.to,
        amount: BigInt(transaction.amount),
        timestamp: BigInt(transaction.timestamp),
        nonce: BigInt(transaction.nonce),
        signature: transaction.signature,
        status: transaction.status,
        blockHeight: transaction.blockHeight,
        fee: transaction.fee ? BigInt(transaction.fee) : null,
        metadata: transaction.metadata ? transaction.metadata : null,
      };

      await db.insert(transactions).values(dbTransaction);
      console.log(`[TransactionDAO] Transaction ${transaction.hash} created successfully.`);
      return transaction;
    } catch (error) {
      console.error(`[TransactionDAO] Error creating transaction ${transaction.hash}:`, error.message);
      throw new Error(`Failed to create transaction ${transaction.hash}: ${error.message}`);
    }
  }

  /**
   * Get transaction by hash
   * @param hash Transaction hash
   * @returns Transaction or null if not found
   */
  async getTransactionByHash(hash: string): Promise<Transaction | null> {
    console.log(`[TransactionDAO] getTransactionByHash called for hash: ${hash}`);
    try {
      const result = await db.select().from(transactions).where(eq(transactions.hash, hash)).limit(1);
      
      if (result.length === 0) {
        console.log(`[TransactionDAO] Transaction with hash ${hash} not found.`);
        return null;
      }
      
      console.log(`[TransactionDAO] Transaction with hash ${hash} found.`);
      const dbTx = result[0];
      // Removed duplicate const dbTx = result[0];
      return {
        hash: dbTx.hash,
        type: dbTx.type as TransactionType,
        from: dbTx.fromAddress,
        to: dbTx.toAddress,
        amount: Number(dbTx.amount),
        timestamp: Number(dbTx.timestamp),
        nonce: Number(dbTx.nonce),
        signature: dbTx.signature,
        status: dbTx.status as 'pending' | 'confirmed' | 'failed',
        blockHeight: dbTx.blockHeight || undefined,
        fee: dbTx.fee ? Number(dbTx.fee) : undefined,
        metadata: dbTx.metadata || undefined,
      };
    } catch (error) {
      console.error(`[TransactionDAO] Error getting transaction by hash ${hash}:`, error.message);
      throw new Error(`Failed to get transaction for hash ${hash}: ${error.message}`);
    }
  }

  /**
   * Get transactions by address (sent or received)
   * @param address Wallet address
   * @param limit Maximum number of transactions to return
   * @param offset Offset for pagination
   * @returns Array of transactions
   */
  async getTransactionsByAddress(address: string, limit: number = 20, offset: number = 0): Promise<Transaction[]> {
    console.log(`[TransactionDAO] getTransactionsByAddress called for address: ${address}, limit: ${limit}, offset: ${offset}`);
    try {
      const result = await db.select().from(transactions)
        .where(
          or(
            eq(transactions.fromAddress, address),
            eq(transactions.toAddress, address)
          )
        )
        .orderBy(desc(transactions.timestamp))
        .limit(limit)
        .offset(offset);
      console.log(`[TransactionDAO] Found ${result.length} transactions for address ${address}.`);
      return result.map(dbTx => ({
        hash: dbTx.hash,
        type: dbTx.type as TransactionType,
        from: dbTx.fromAddress,
        to: dbTx.toAddress,
        amount: Number(dbTx.amount),
        timestamp: Number(dbTx.timestamp),
        nonce: Number(dbTx.nonce),
        signature: dbTx.signature,
        status: dbTx.status as 'pending' | 'confirmed' | 'failed',
        blockHeight: dbTx.blockHeight || undefined,
        fee: dbTx.fee ? Number(dbTx.fee) : undefined,
        metadata: dbTx.metadata || undefined,
      }));
    } catch (error) {
      console.error(`[TransactionDAO] Error getting transactions by address ${address}:`, error.message);
      throw new Error(`Failed to get transactions for address ${address}: ${error.message}`);
    }
  }

  /**
   * Get transactions by block height
   * @param blockHeight Block height
   * @returns Array of transactions
   */
  async getTransactionsByBlockHeight(blockHeight: number): Promise<Transaction[]> {
    console.log(`[TransactionDAO] getTransactionsByBlockHeight called for blockHeight: ${blockHeight}`);
    try {
      const result = await db.select().from(transactions)
        .where(eq(transactions.blockHeight, blockHeight))
        .orderBy(desc(transactions.timestamp));
      console.log(`[TransactionDAO] Found ${result.length} transactions for blockHeight ${blockHeight}.`);
      return result.map(dbTx => ({
        hash: dbTx.hash,
        type: dbTx.type as TransactionType,
        from: dbTx.fromAddress,
        to: dbTx.toAddress,
        amount: Number(dbTx.amount),
        timestamp: Number(dbTx.timestamp),
        nonce: Number(dbTx.nonce),
        signature: dbTx.signature,
        status: dbTx.status as 'pending' | 'confirmed' | 'failed',
        blockHeight: dbTx.blockHeight || undefined,
        fee: dbTx.fee ? Number(dbTx.fee) : undefined,
        metadata: dbTx.metadata || undefined,
      }));
    } catch (error) {
      console.error(`[TransactionDAO] Error getting transactions by blockHeight ${blockHeight}:`, error.message);
      throw new Error(`Failed to get transactions for blockHeight ${blockHeight}: ${error.message}`);
    }
  }

  /**
   * Update transaction status
   * @param hash Transaction hash
   * @param status New status
   * @param blockHeight Optional block height for confirmed transactions
   * @returns Updated transaction
   */
  async updateTransactionStatus(hash: string, status: 'pending' | 'confirmed' | 'failed', blockHeight?: number): Promise<Transaction | null> {
    console.log(`[TransactionDAO] updateTransactionStatus called for hash: ${hash}, status: ${status}, blockHeight: ${blockHeight}`);
    try {
      const updateData: any = { status };
      if (blockHeight !== undefined) {
        updateData.blockHeight = blockHeight;
      }
      
      await db.update(transactions).set(updateData).where(eq(transactions.hash, hash));
      console.log(`[TransactionDAO] Transaction ${hash} status updated to ${status}.`);
      
      return this.getTransactionByHash(hash); // getTransactionByHash already logs
    } catch (error) {
      console.error(`[TransactionDAO] Error updating transaction status for ${hash}:`, error.message);
      throw new Error(`Failed to update transaction status for ${hash}: ${error.message}`);
    }
  }

  /**
   * Get recent transactions
   * @param limit Maximum number of transactions to return
   * @returns Array of transactions
   */
  async getRecentTransactions(limit: number = 20): Promise<Transaction[]> {
    console.log(`[TransactionDAO] getRecentTransactions called with limit: ${limit}`);
    try {
      const result = await db.select().from(transactions).orderBy(desc(transactions.timestamp)).limit(limit);
      console.log(`[TransactionDAO] Found ${result.length} recent transactions.`);
      return result.map(dbTx => ({
        hash: dbTx.hash,
        type: dbTx.type as TransactionType,
        from: dbTx.fromAddress,
        to: dbTx.toAddress,
        amount: Number(dbTx.amount),
        timestamp: Number(dbTx.timestamp),
        nonce: Number(dbTx.nonce),
        signature: dbTx.signature,
        status: dbTx.status as 'pending' | 'confirmed' | 'failed',
        blockHeight: dbTx.blockHeight || undefined,
        fee: dbTx.fee ? Number(dbTx.fee) : undefined,
        metadata: dbTx.metadata || undefined,
      }));
    } catch (error) {
      console.error(`[TransactionDAO] Error getting recent transactions:`, error.message);
      throw new Error(`Failed to get recent transactions: ${error.message}`);
    }
  }

  /**
   * Get transaction count by type in time range
   * @param type Transaction type
   * @param startTime Start timestamp
   * @param endTime End timestamp
   * @returns Transaction count
   */
  async getTransactionCountByType(type: TransactionType, startTime: number, endTime: number): Promise<number> {
    console.log(`[TransactionDAO] getTransactionCountByType called for type: ${type}, startTime: ${startTime}, endTime: ${endTime}`);
    try {
      const result = await db.select({ count: sql<number>`count(*)` }).from(transactions)
        .where(
          and(
            eq(transactions.type, type),
            sql`${transactions.timestamp} >= ${BigInt(startTime)}`,
            sql`${transactions.timestamp} <= ${BigInt(endTime)}`
          )
        );
      const count = Number(result[0]?.count || 0);
      console.log(`[TransactionDAO] Found ${count} transactions of type ${type} in the given time range.`);
      return count;
    } catch (error) {
      console.error(`[TransactionDAO] Error getting transaction count by type ${type}:`, error.message);
      throw new Error(`Failed to get transaction count for type ${type}: ${error.message}`);
    }
  }

  /**
   * Get total transaction count
   * @returns Total transaction count
   */
  async getTotalTransactionCount(): Promise<number> {
    console.log(`[TransactionDAO] getTotalTransactionCount called.`);
    try {
      const result = await db.select({ count: sql<number>`count(*)` }).from(transactions);
      const count = Number(result[0]?.count || 0);
      console.log(`[TransactionDAO] Total transaction count: ${count}.`);
      return count;
    } catch (error) {
      console.error(`[TransactionDAO] Error getting total transaction count:`, error.message);
      throw new Error(`Failed to get total transaction count: ${error.message}`);
    }
  }

  /**
   * Get pending transactions
   * @returns Array of pending transactions
   */
  async getPendingTransactions(): Promise<Transaction[]> {
    console.log(`[TransactionDAO] getPendingTransactions called.`);
    try {
      const result = await db.select().from(transactions)
        .where(eq(transactions.status, 'pending'))
        .orderBy(desc(transactions.timestamp));
      console.log(`[TransactionDAO] Found ${result.length} pending transactions.`);
      return result.map(dbTx => ({
        hash: dbTx.hash,
        type: dbTx.type as TransactionType,
        from: dbTx.fromAddress,
        to: dbTx.toAddress,
        amount: Number(dbTx.amount),
        timestamp: Number(dbTx.timestamp),
        nonce: Number(dbTx.nonce),
        signature: dbTx.signature,
        status: 'pending', // Explicitly pending
        blockHeight: dbTx.blockHeight || undefined,
        fee: dbTx.fee ? Number(dbTx.fee) : undefined,
        metadata: dbTx.metadata || undefined,
      }));
    } catch (error) {
      console.error(`[TransactionDAO] Error getting pending transactions:`, error.message);
      throw new Error(`Failed to get pending transactions: ${error.message}`);
    }
  }
}

// Create a singleton instance
export const transactionDao = new TransactionDao();