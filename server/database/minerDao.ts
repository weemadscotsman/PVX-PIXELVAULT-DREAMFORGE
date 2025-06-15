import { eq, desc } from 'drizzle-orm';
import { db } from './index';
import { minerStats } from './schema';
import { MiningStats } from '@shared/types';

/**
 * Data access object for miner stats
 */
export class MinerDao {
  /**
   * Create new miner stats
   * @param stats Mining stats to create
   * @returns Created mining stats
   */
  async createMinerStats(stats: MiningStats): Promise<MiningStats> {
    console.log(`[MinerDAO] createMinerStats called for address: ${stats.address}`);
    try {
      const dbStats = {
        address: stats.address,
        blocksMined: stats.blocksMined,
        totalRewards: stats.totalRewards,
        lastBlockMined: BigInt(stats.lastBlockMined),
        isCurrentlyMining: stats.isCurrentlyMining,
        hardware: stats.hardware,
        joinedAt: stats.joinedAt,
        currentHashRate: stats.currentHashRate,
      };

      await db.insert(minerStats).values(dbStats);
      console.log(`[MinerDAO] Miner stats for ${stats.address} created successfully.`);
      return stats;
    } catch (error) {
      console.error(`[MinerDAO] Error creating miner stats for ${stats.address}:`, error.message);
      throw new Error(`Failed to create miner stats for ${stats.address}: ${error.message}`);
    }
  }

  /**
   * Get miner stats by address
   * @param address Miner address
   * @returns Mining stats or undefined if not found
   */
  async getMinerStatsByAddress(address: string): Promise<MiningStats | undefined> {
    console.log(`[MinerDAO] getMinerStatsByAddress called for address: ${address}`);
    try {
      const result = await db.select().from(minerStats).where(eq(minerStats.address, address)).limit(1);
      
      if (result.length === 0) {
        console.log(`[MinerDAO] Miner stats not found for address ${address}.`);
        return undefined;
      }
      
      console.log(`[MinerDAO] Miner stats found for address ${address}.`);
      const dbStats = result[0];
      const dbStats = result[0];
      return {
        address: dbStats.address,
        blocksMined: dbStats.blocksMined,
        totalRewards: dbStats.totalRewards,
        lastBlockMined: Number(dbStats.lastBlockMined),
        isCurrentlyMining: dbStats.isCurrentlyMining,
        hardware: dbStats.hardware as 'CPU' | 'GPU' | 'ASIC', // Cast to specific types
        joinedAt: dbStats.joinedAt,
        currentHashRate: dbStats.currentHashRate, // Ensure this is number if DB stores number
      };
    } catch (error) {
      console.error(`[MinerDAO] Error getting miner stats for address ${address}:`, error.message);
      throw new Error(`Failed to get miner stats for ${address}: ${error.message}`);
    }
  }

  /**
   * Update miner stats
   * @param stats Mining stats to update
   * @returns Updated mining stats
   */
  async updateMinerStats(stats: MiningStats): Promise<MiningStats> {
    console.log(`[MinerDAO] updateMinerStats called for address: ${stats.address}`);
    try {
      const existingStats = await this.getMinerStatsByAddress(stats.address); // Already logs
      if (!existingStats) {
        console.log(`[MinerDAO] Miner stats for ${stats.address} not found for update, creating instead.`);
        return this.createMinerStats(stats); // Already logs
      }
      
      console.log(`[MinerDAO] Updating miner stats for ${stats.address} in DB.`);
      const dbStats = {
        blocksMined: stats.blocksMined,
        totalRewards: stats.totalRewards,
        lastBlockMined: BigInt(stats.lastBlockMined),
        isCurrentlyMining: stats.isCurrentlyMining,
        hardware: stats.hardware,
        currentHashRate: stats.currentHashRate,
        updatedAt: new Date(),
      };

      await db.update(minerStats).set(dbStats).where(eq(minerStats.address, stats.address));
      console.log(`[MinerDAO] Miner stats for ${stats.address} updated successfully.`);
      return stats;
    } catch (error) {
      console.error(`[MinerDAO] Error updating miner stats for ${stats.address}:`, error.message);
      throw new Error(`Failed to update miner stats for ${stats.address}: ${error.message}`);
    }
  }

  /**
   * Get all active miners
   * @returns Array of active mining stats
   */
  async getAllActiveMiners(): Promise<MiningStats[]> {
    console.log(`[MinerDAO] getAllActiveMiners called.`);
    try {
      const result = await db.select().from(minerStats).where(eq(minerStats.isCurrentlyMining, true));
      console.log(`[MinerDAO] Found ${result.length} active miners.`);
      return result.map(dbStats => ({
        address: dbStats.address,
        blocksMined: dbStats.blocksMined,
        totalRewards: dbStats.totalRewards,
        lastBlockMined: Number(dbStats.lastBlockMined),
        isCurrentlyMining: dbStats.isCurrentlyMining,
        hardware: dbStats.hardware as 'CPU' | 'GPU' | 'ASIC', // Cast
        joinedAt: dbStats.joinedAt,
        currentHashRate: dbStats.currentHashRate, // Ensure type match
      }));
    } catch (error) {
      console.error(`[MinerDAO] Error getting all active miners:`, error.message);
      throw new Error(`Failed to get all active miners: ${error.message}`);
    }
  }

  /**
   * Get top miners by blocks mined
   * @param limit Maximum number of miners to return
   * @returns Array of mining stats
   */
  async getTopMinersByBlocksMined(limit: number = 10): Promise<MiningStats[]> {
    console.log(`[MinerDAO] getTopMinersByBlocksMined called with limit: ${limit}`);
    try {
      const result = await db.select().from(minerStats).orderBy(desc(minerStats.blocksMined)).limit(limit);
      console.log(`[MinerDAO] Found ${result.length} top miners.`);
      return result.map(dbStats => ({
        address: dbStats.address,
        blocksMined: dbStats.blocksMined,
        totalRewards: dbStats.totalRewards,
        lastBlockMined: Number(dbStats.lastBlockMined),
        isCurrentlyMining: dbStats.isCurrentlyMining,
        hardware: dbStats.hardware as 'CPU' | 'GPU' | 'ASIC', // Cast
        joinedAt: dbStats.joinedAt,
        currentHashRate: dbStats.currentHashRate, // Ensure type match
      }));
    } catch (error) {
      console.error(`[MinerDAO] Error getting top miners:`, error.message);
      throw new Error(`Failed to get top miners: ${error.message}`);
    }
  }

  /**
   * Get total network hash rate
   * @returns Total hash rate of all active miners
   */
  async getTotalNetworkHashRate(): Promise<number> {
    console.log(`[MinerDAO] getTotalNetworkHashRate called.`);
    try {
      const activeMiners = await this.getAllActiveMiners(); // Already logs
      // Ensure currentHashRate is treated as a number for reduction.
      // The schema defines currentHashRate as INTEGER, so it should be a number.
      const totalHashRate = activeMiners.reduce((total, miner) => {
        const rate = typeof miner.currentHashRate === 'string'
          ? parseFloat(miner.currentHashRate.replace(/[^0-9.-]+/g,"")) // Attempt to parse if string
          : miner.currentHashRate;
        return total + (Number(rate) || 0);
      }, 0);
      console.log(`[MinerDAO] Calculated total network hashrate: ${totalHashRate}`);
      return totalHashRate;
    } catch (error) {
      console.error(`[MinerDAO] Error getting total network hash rate:`, error.message);
      throw new Error(`Failed to get total network hash rate: ${error.message}`);
    }
  }

  /**
   * Update miner status (active/inactive)
   * @param address Miner address
   * @param isActive Whether the miner is active
   * @returns Updated mining stats
   */
  async updateMinerStatus(address: string, isActive: boolean): Promise<MiningStats | undefined> {
    console.log(`[MinerDAO] updateMinerStatus called for address: ${address}, isActive: ${isActive}`);
    try {
      const existingStats = await this.getMinerStatsByAddress(address); // Already logs
      if (!existingStats) {
        console.log(`[MinerDAO] Miner stats for ${address} not found for status update.`);
        return undefined;
      }
      
      console.log(`[MinerDAO] Updating miner status for ${address} to ${isActive} in DB.`);
      await db.update(minerStats)
        .set({ isCurrentlyMining: isActive, updatedAt: new Date() })
        .where(eq(minerStats.address, address));
      
      console.log(`[MinerDAO] Miner status for ${address} updated successfully.`);
      return { ...existingStats, isCurrentlyMining: isActive, updatedAt: new Date() }; // Reflect updatedAt
    } catch (error) {
      console.error(`[MinerDAO] Error updating miner status for ${address}:`, error.message);
      throw new Error(`Failed to update miner status for ${address}: ${error.message}`);
    }
  }
}

// Create a singleton instance
export const minerDao = new MinerDao();