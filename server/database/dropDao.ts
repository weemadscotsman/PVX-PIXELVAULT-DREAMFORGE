import { eq, and, gt, desc } from 'drizzle-orm';
import { db } from './index';
import { drops, dropClaims } from './schema';
import { Drop, DropClaim } from '@shared/types';

/**
 * Data access object for drops and drop claims
 */
export class DropDao {
  /**
   * Create a new drop
   * @param drop Drop to create
   * @returns Created drop
   */
  async createDrop(drop: Drop): Promise<Drop> {
    console.log(`[DropDAO] createDrop called for drop ID: ${drop.id}, Name: ${drop.name}`);
    try {
      const dbDrop = {
        id: drop.id,
        name: drop.name,
        description: drop.description,
        type: drop.type,
        rarity: drop.rarity,
        imageUrl: drop.imageUrl,
        tokenAmount: drop.tokenAmount,
        createdAt: drop.createdAt,
        expiresAt: drop.expiresAt,
        claimLimit: drop.claimLimit,
        minWalletAge: drop.minWalletAge,
        minStakingAmount: drop.minStakingAmount,
        minMiningBlocks: drop.minMiningBlocks,
        securityScore: drop.securityScore
      };

      await db.insert(drops).values(dbDrop);
      console.log(`[DropDAO] Drop ${drop.id} - ${drop.name} created successfully.`);
      return drop;
    } catch (error) {
      console.error(`[DropDAO] Error creating drop ${drop.id}:`, error.message);
      throw new Error(`Failed to create drop ${drop.id}: ${error.message}`);
    }
  }

  /**
   * Get drop by ID
   * @param id Drop ID
   * @returns Drop or undefined if not found
   */
  async getDropById(id: string): Promise<Drop | undefined> {
    console.log(`[DropDAO] getDropById called for ID: ${id}`);
    try {
      const result = await db.select().from(drops).where(eq(drops.id, id)).limit(1);
      
      if (result.length === 0) {
        console.log(`[DropDAO] Drop with ID ${id} not found.`);
        return undefined;
      }
      
      console.log(`[DropDAO] Drop with ID ${id} found: ${result[0].name}`);
      const dbDrop = result[0];
      const dbDrop = result[0];
      return {
        id: dbDrop.id,
        name: dbDrop.name,
        description: dbDrop.description,
        type: dbDrop.type,
        rarity: dbDrop.rarity,
        imageUrl: dbDrop.imageUrl,
        tokenAmount: dbDrop.tokenAmount ?? undefined,
        createdAt: dbDrop.createdAt,
        expiresAt: dbDrop.expiresAt,
        claimLimit: dbDrop.claimLimit,
        minWalletAge: dbDrop.minWalletAge,
        minStakingAmount: dbDrop.minStakingAmount,
        minMiningBlocks: dbDrop.minMiningBlocks,
        securityScore: dbDrop.securityScore
      };
    } catch (error) {
      console.error(`[DropDAO] Error getting drop by ID ${id}:`, error.message);
      throw new Error(`Failed to get drop for ID ${id}: ${error.message}`);
    }
  }

  /**
   * Get all active drops
   * @returns Array of active drops
   */
  async getActiveDrops(): Promise<Drop[]> {
    console.log(`[DropDAO] getActiveDrops called.`);
    try {
      const result = await db.select().from(drops)
        .where(gt(drops.expiresAt, new Date()))
        .orderBy(desc(drops.createdAt));
      console.log(`[DropDAO] Found ${result.length} active drops.`);
      return result.map(dbDrop => ({
        id: dbDrop.id,
        name: dbDrop.name,
        description: dbDrop.description,
        type: dbDrop.type,
        rarity: dbDrop.rarity,
        imageUrl: dbDrop.imageUrl,
        tokenAmount: dbDrop.tokenAmount ?? undefined,
        createdAt: dbDrop.createdAt,
        expiresAt: dbDrop.expiresAt,
        claimLimit: dbDrop.claimLimit,
        minWalletAge: dbDrop.minWalletAge,
        minStakingAmount: dbDrop.minStakingAmount,
        minMiningBlocks: dbDrop.minMiningBlocks,
        securityScore: dbDrop.securityScore
      }));
    } catch (error) {
      console.error(`[DropDAO] Error getting active drops:`, error.message);
      throw new Error(`Failed to get active drops: ${error.message}`);
    }
  }

  /**
   * Check if a drop has been claimed by a wallet
   * @param dropId Drop ID
   * @param walletAddress Wallet address
   * @returns True if the drop has been claimed, false otherwise
   */
  async hasDropBeenClaimed(dropId: string, walletAddress: string): Promise<boolean> {
    console.log(`[DropDAO] hasDropBeenClaimed called for DropID: ${dropId}, Wallet: ${walletAddress}`);
    try {
      const result = await db.select().from(dropClaims)
        .where(and(eq(dropClaims.dropId, dropId), eq(dropClaims.walletAddress, walletAddress)))
        .limit(1);
      
      const claimed = result.length > 0;
      console.log(`[DropDAO] Drop ${dropId} ${claimed ? 'has' : 'has not'} been claimed by wallet ${walletAddress}.`);
      return claimed;
    } catch (error) {
      console.error(`[DropDAO] Error checking if drop ${dropId} has been claimed by ${walletAddress}:`, error.message);
      throw new Error(`Failed to check if drop ${dropId} has been claimed: ${error.message}`);
    }
  }

  /**
   * Get the number of claims for a drop
   * @param dropId Drop ID
   * @returns Number of claims
   */
  async getDropClaimCount(dropId: string): Promise<number> {
    console.log(`[DropDAO] getDropClaimCount called for DropID: ${dropId}`);
    try {
      const result = await db.select({ count: db.fn.count() }).from(dropClaims).where(eq(dropClaims.dropId, dropId));
      const count = Number(result[0]?.count || 0);
      console.log(`[DropDAO] Drop ${dropId} has ${count} claims.`);
      return count;
    } catch (error) {
      console.error(`[DropDAO] Error getting drop claim count for ${dropId}:`, error.message);
      throw new Error(`Failed to get drop claim count for ${dropId}: ${error.message}`);
    }
  }

  /**
   * Claim a drop
   * @param dropId Drop ID
   * @param walletAddress Wallet address
   * @param transactionHash Optional transaction hash
   * @returns Created drop claim
   */
  async claimDrop(dropId: string, walletAddress: string, transactionHash?: string): Promise<DropClaim> {
    console.log(`[DropDAO] claimDrop called for DropID: ${dropId}, Wallet: ${walletAddress}`);
    try {
      const drop = await this.getDropById(dropId); // Already logs
      if (!drop) {
        console.error(`[DropDAO] Attempted to claim non-existent drop ${dropId}.`);
        throw new Error(`Drop not found: ${dropId}`);
      }
      
      const hasBeenClaimed = await this.hasDropBeenClaimed(dropId, walletAddress);
      if (hasBeenClaimed) {
        throw new Error('Drop has already been claimed by this wallet');
      }
      
      const hasBeenClaimed = await this.hasDropBeenClaimed(dropId, walletAddress); // Already logs
      if (hasBeenClaimed) {
        console.warn(`[DropDAO] Wallet ${walletAddress} has already claimed drop ${dropId}.`);
        throw new Error('Drop has already been claimed by this wallet');
      }

      const claimCount = await this.getDropClaimCount(dropId); // Already logs
      if (claimCount >= drop.claimLimit) {
        console.warn(`[DropDAO] Claim limit reached for drop ${dropId}. Limit: ${drop.claimLimit}, Count: ${claimCount}`);
        throw new Error('Drop claim limit has been reached');
      }
      
      if (new Date() > drop.expiresAt) {
        console.warn(`[DropDAO] Attempted to claim expired drop ${dropId}. Expires: ${drop.expiresAt}`);
        throw new Error('Drop has expired');
      }
      
      console.log(`[DropDAO] All checks passed for claiming drop ${dropId} by wallet ${walletAddress}. Creating claim...`);
      const dropClaim: DropClaim = {
        dropId,
        walletAddress,
        claimedAt: new Date(),
        transactionHash
      };
      
      const dbDropClaim = {
        dropId: dropClaim.dropId,
        walletAddress: dropClaim.walletAddress,
        claimedAt: dropClaim.claimedAt,
        transactionHash: dropClaim.transactionHash
      };

      await db.insert(dropClaims).values(dbDropClaim);
      console.log(`[DropDAO] Drop ${dropId} successfully claimed by wallet ${walletAddress}. TxHash: ${transactionHash}`);
      return dropClaim;
    } catch (error) {
      // Error already logged by sub-functions if they throw, or specific error logged here.
      // Avoid re-logging generic "Error claiming drop" if a specific reason was already thrown.
      if (!error.message.startsWith('Drop not found') && !error.message.startsWith('Drop has already been claimed') &&
          !error.message.startsWith('Drop claim limit') && !error.message.startsWith('Drop has expired')) {
        console.error(`[DropDAO] Error claiming drop ${dropId} for wallet ${walletAddress}:`, error.message);
      }
      throw error; // Re-throw original error for controller to handle
    }
  }

  /**
   * Get drop claims by wallet address
   * @param walletAddress Wallet address
   * @returns Array of drop claims
   */
  async getDropClaimsByWallet(walletAddress: string): Promise<DropClaim[]> {
    console.log(`[DropDAO] getDropClaimsByWallet called for Wallet: ${walletAddress}`);
    try {
      const result = await db.select().from(dropClaims)
        .where(eq(dropClaims.walletAddress, walletAddress))
        .orderBy(desc(dropClaims.claimedAt));
      console.log(`[DropDAO] Found ${result.length} drop claims for wallet ${walletAddress}.`);
      return result.map(dbDropClaim => ({
        dropId: dbDropClaim.dropId,
        walletAddress: dbDropClaim.walletAddress,
        claimedAt: dbDropClaim.claimedAt,
        transactionHash: dbDropClaim.transactionHash ?? undefined
      }));
    } catch (error) {
      console.error(`[DropDAO] Error getting drop claims for wallet ${walletAddress}:`, error.message);
      throw new Error(`Failed to get drop claims for wallet ${walletAddress}: ${error.message}`);
    }
  }

  /**
   * Get drop claims by drop ID
   * @param dropId Drop ID
   * @returns Array of drop claims
   */
  async getDropClaimsByDropId(dropId: string): Promise<DropClaim[]> {
    console.log(`[DropDAO] getDropClaimsByDropId called for DropID: ${dropId}`);
    try {
      const result = await db.select().from(dropClaims)
        .where(eq(dropClaims.dropId, dropId))
        .orderBy(desc(dropClaims.claimedAt));
      console.log(`[DropDAO] Found ${result.length} claims for drop ${dropId}.`);
      return result.map(dbDropClaim => ({
        dropId: dbDropClaim.dropId,
        walletAddress: dbDropClaim.walletAddress,
        claimedAt: dbDropClaim.claimedAt,
        transactionHash: dbDropClaim.transactionHash ?? undefined
      }));
    } catch (error) {
      console.error(`[DropDAO] Error getting drop claims for drop ${dropId}:`, error.message);
      throw new Error(`Failed to get drop claims for drop ${dropId}: ${error.message}`);
    }
  }

  /**
   * Update transaction hash for a drop claim
   * @param dropId Drop ID
   * @param walletAddress Wallet address
   * @param transactionHash Transaction hash
   * @returns Success status
   */
  async updateDropClaimTransactionHash(dropId: string, walletAddress: string, transactionHash: string): Promise<boolean> {
    console.log(`[DropDAO] updateDropClaimTransactionHash called for DropID: ${dropId}, Wallet: ${walletAddress}, TxHash: ${transactionHash}`);
    try {
      const result = await db.update(dropClaims).set({ transactionHash })
        .where(and(eq(dropClaims.dropId, dropId), eq(dropClaims.walletAddress, walletAddress)))
        .returning(); // Check if update was successful
      
      if (result && result.length > 0) {
        console.log(`[DropDAO] Transaction hash for drop claim (DropID: ${dropId}, Wallet: ${walletAddress}) updated successfully.`);
        return true;
      } else {
        console.warn(`[DropDAO] No drop claim found to update transaction hash for DropID: ${dropId}, Wallet: ${walletAddress}.`);
        return false;
      }
    } catch (error) {
      console.error(`[DropDAO] Error updating drop claim transaction hash for DropID: ${dropId}, Wallet: ${walletAddress}:`, error.message);
      throw new Error(`Failed to update drop claim transaction hash for DropID: ${dropId}, Wallet: ${walletAddress}: ${error.message}`);
    }
  }
}

// Create a singleton instance
export const dropDao = new DropDao();