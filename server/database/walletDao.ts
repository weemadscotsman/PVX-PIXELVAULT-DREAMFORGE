import { eq } from 'drizzle-orm';
import { db } from './index';
import { wallets } from './schema';
import { Wallet } from '../mem-blockchain';

/**
 * Data access object for wallets
 */
import crypto from 'crypto'; // Ensure crypto is imported if used for emergency credentials

export class WalletDao {
  /**
   * Create a new wallet
   * @param wallet Wallet to create
   * @returns Created wallet
   */
  async createWallet(wallet: Wallet): Promise<Wallet> {
    console.log(`[WalletDAO] createWallet called for address: ${wallet.address}`);
    try {
      // Log incoming data, masking sensitive parts if necessary in a real scenario
      console.log('[WalletDAO] Incoming wallet data for creation:', {
        address: wallet.address,
        hasPublicKey: !!wallet.publicKey,
        hasPassphraseSalt: !!wallet.passphraseSalt,
        hasPassphraseHash: !!wallet.passphraseHash,
      });
      
      // Safety check - ensure the wallet has credentials (existing logic)
      if (!wallet.passphraseSalt || !wallet.passphraseHash) {
        console.error(`[WalletDAO] CRITICAL: Wallet ${wallet.address} is missing credentials during creation. Generating emergency credentials.`);
        // Emergency recovery logic (existing)
        const recoveryPassphrase = wallet.address;
        const salt = crypto.createHash('md5').update(wallet.address).digest('hex');
        const hash = wallet.address.replace('PVX_', '') + 
                     crypto.createHash('sha256').update(wallet.address + salt).digest('hex').substring(0, 32);
        wallet.passphraseSalt = salt;
        wallet.passphraseHash = hash;
        console.log(`[WalletDAO] Emergency credentials generated for wallet: ${wallet.address}`);
      }

      // Use direct pool query for maximum reliability
      const { pool } = await import('../db'); // Assuming this is the intended pool for raw queries
      // Removed duplicate: const { pool } = await import('../db');
      
      try {
        console.log(`[WalletDAO] Executing insert/update query for wallet: ${wallet.address}`);
        // Use raw SQL with explicit params for maximum control (existing logic)
        await pool.query(
          `INSERT INTO wallets 
           (address, public_key, balance, created_at, last_updated, passphrase_salt, passphrase_hash) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (address) 
           DO UPDATE SET
             public_key = EXCLUDED.public_key,
             balance = EXCLUDED.balance,
             last_updated = EXCLUDED.last_updated,
             passphrase_salt = EXCLUDED.passphrase_salt,
             passphrase_hash = EXCLUDED.passphrase_hash
           RETURNING *`, // RETURNING * might not be strictly necessary if not used, but good for debug
          [
            wallet.address,
            wallet.publicKey || '',
            wallet.balance || '0',
            wallet.createdAt || new Date(),
            wallet.lastUpdated || new Date(),
            wallet.passphraseSalt,
            wallet.passphraseHash
          ]
        );
        console.log(`[WalletDAO] Wallet ${wallet.address} created/updated successfully in DB.`);
        
        // Verify credentials were saved (existing logic)
        const verifyResult = await pool.query(
          `SELECT passphrase_salt, passphrase_hash FROM wallets WHERE address = $1`,
          [wallet.address]
        );
        if (verifyResult.rows.length > 0) {
          const savedWallet = verifyResult.rows[0];
          console.log(`[WalletDAO] Wallet ${wallet.address} credential verification in DB: salt_saved=${!!savedWallet.passphrase_salt}, hash_saved=${!!savedWallet.passphrase_hash}`);
        }
      } catch (sqlError) {
        console.error(`[WalletDAO] SQL error during wallet creation/verification for ${wallet.address}:`, sqlError.message);
        throw new Error(`SQL operation failed for wallet ${wallet.address}: ${sqlError.message}`); // Re-throw with context
      }
      
      return wallet;
    } catch (error) {
      console.error(`[WalletDAO] Error in createWallet for address ${wallet.address}:`, error.message);
      throw new Error(`Failed to create wallet ${wallet.address}: ${error.message}`);
    }
  }

  /**
   * Get wallet by address
   * @param address Wallet address
   * @returns Wallet or undefined if not found
   */
  async getWalletByAddress(address: string): Promise<Wallet | undefined> {
    console.log(`[WalletDAO] getWalletByAddress called for address: ${address}`);
    try {
      const { pool } = await import('../db'); // Assuming this is the intended pool
      console.log(`[WalletDAO] Executing SELECT query for wallet: ${address}`);
      const sqlResult = await pool.query(
        `SELECT * FROM wallets WHERE address = $1`,
        [address]
      );
      
      if (sqlResult.rows.length === 0) {
        console.log(`[WalletDAO] No wallet found in DB for address ${address}`);
        return undefined;
      }
      
      const dbRow = sqlResult.rows[0];
      console.log(`[WalletDAO] Wallet ${address} found in DB. Salt present: ${!!dbRow.passphrase_salt}, Hash present: ${!!dbRow.passphrase_hash}`);
      
      const wallet: Wallet = {
        address: dbRow.address,
        publicKey: dbRow.public_key || '',
        balance: dbRow.balance,
        createdAt: new Date(dbRow.created_at),
        lastUpdated: new Date(dbRow.last_updated),
        lastSynced: new Date(dbRow.last_updated), // Keep both for compatibility 
        passphraseSalt: dbRow.passphrase_salt, // direct mapping
        passphraseHash: dbRow.passphrase_hash  // direct mapping
      };
      
      console.log(`[WalletDAO] Mapped Wallet object for ${address}. Salt present: ${!!wallet.passphraseSalt}, Hash present: ${!!wallet.passphraseHash}`);
      return wallet;
    } catch (error) {
      console.error(`[WalletDAO] Error in getWalletByAddress for ${address}:`, error.message);
      // Do not throw generic "Failed to get wallet" to allow controller to distinguish and try memory store
      throw error; // Re-throw original error
    }
  }

  /**
   * Update wallet
   * @param wallet Wallet to update
   * @returns Updated wallet
   */
  async updateWallet(wallet: Wallet): Promise<Wallet> {
    console.log(`[WalletDAO] updateWallet called for address: ${wallet.address}`);
    try {
      // Check if wallet exists (uses the already logged getWalletByAddress)
      const existingWallet = await this.getWalletByAddress(wallet.address);
      if (!existingWallet) {
        console.log(`[WalletDAO] Wallet ${wallet.address} not found for update, attempting to create instead.`);
        return this.createWallet(wallet); // Or throw error if update implies existence
      }
      
      console.log(`[WalletDAO] Updating wallet ${wallet.address} in DB.`);
      const dbWallet = {
        balance: wallet.balance,
        last_updated: wallet.lastUpdated || wallet.lastSynced, // Use lastUpdated with fallback to lastSynced
        passphrase_salt: wallet.passphraseSalt,
        passphrase_hash: wallet.passphraseHash,
      };

      // Update wallet using Drizzle ORM (db instance from ./index)
      await db.update(wallets)
        .set(dbWallet) // dbWallet already has snake_case names from manual construction
        .where(eq(wallets.address, wallet.address));
      
      console.log(`[WalletDAO] Wallet ${wallet.address} updated successfully in DB.`);
      return wallet; // Return the input wallet object as it reflects the new state
    } catch (error) {
      console.error(`[WalletDAO] Error in updateWallet for ${wallet.address}:`, error.message);
      throw new Error(`Failed to update wallet ${wallet.address}: ${error.message}`);
    }
  }

  /**
   * Get all wallets
   * @returns Array of wallets
   */
  async getAllWallets(): Promise<Wallet[]> {
    console.log('[WalletDAO] getAllWallets called.');
    try {
      const result = await db.select().from(wallets); // Uses Drizzle ORM
      console.log(`[WalletDAO] Fetched ${result.length} wallets from DB.`);
      
      return result.map(dbWallet => {
        // Convert DB result to raw object with proper property access
        const rawDbObj = JSON.parse(JSON.stringify(dbWallet));
        
        return {
          address: dbWallet.address,
          publicKey: dbWallet.public_key,
          balance: dbWallet.balance,
          createdAt: dbWallet.created_at,
          lastUpdated: dbWallet.last_updated,
          lastSynced: dbWallet.last_updated, // Keep both for compatibility
          // Ensure correct mapping, especially for potentially null/undefined fields
          passphraseSalt: dbWallet.passphrase_salt || undefined,
          passphraseHash: dbWallet.passphrase_hash || undefined,
        };
      });
    } catch (error) {
      console.error('[WalletDAO] Error in getAllWallets:', error.message);
      throw new Error(`Failed to get all wallets: ${error.message}`);
    }
  }

  /**
   * Update wallet balance
   * @param address Wallet address
   * @param balance New balance
   * @returns Updated wallet
   */
  async updateWalletBalance(address: string, balance: string): Promise<Wallet | undefined> {
    console.log(`[WalletDAO] updateWalletBalance called for address: ${address} with balance: ${balance}`);
    try {
      // Check if wallet exists (uses the already logged getWalletByAddress)
      const existingWallet = await this.getWalletByAddress(address);
      if (!existingWallet) {
        console.log(`[WalletDAO] Wallet ${address} not found for balance update.`);
        return undefined;
      }
      
      console.log(`[WalletDAO] Updating balance for wallet ${address} in DB.`);
      await db.update(wallets)
        .set({ 
          balance, 
          last_updated: new Date()
        })
        .where(eq(wallets.address, address));
      
      console.log(`[WalletDAO] Balance for wallet ${address} updated successfully in DB.`);
      // Return updated wallet data (reflecting the change)
      return { ...existingWallet, balance, lastUpdated: new Date(), lastSynced: new Date() };
    } catch (error) {
      console.error(`[WalletDAO] Error in updateWalletBalance for ${address}:`, error.message);
      throw new Error(`Failed to update wallet balance for ${address}: ${error.message}`);
    }
  }

  /**
   * Delete wallet
   * @param address Wallet address
   * @returns Success status
   */
  async deleteWallet(address: string): Promise<boolean> {
    console.log(`[WalletDAO] deleteWallet called for address: ${address}`);
    try {
      console.log(`[WalletDAO] Deleting wallet ${address} from DB.`);
      const result = await db.delete(wallets)
        .where(eq(wallets.address, address)).returning(); // .returning() can give info on rows affected
      
      if (result && result.length > 0) {
        console.log(`[WalletDAO] Wallet ${address} deleted successfully from DB.`);
        return true;
      } else {
        console.log(`[WalletDAO] Wallet ${address} not found in DB for deletion, or delete had no effect.`);
        return false; // Or true depending on desired idempotency interpretation
      }
    } catch (error) {
      console.error(`[WalletDAO] Error in deleteWallet for ${address}:`, error.message);
      throw new Error(`Failed to delete wallet ${address}: ${error.message}`);
    }
  }
}

// Create a singleton instance
export const walletDao = new WalletDao();