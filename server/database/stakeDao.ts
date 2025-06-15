import { eq, desc, and, isNotNull, isNull } from 'drizzle-orm';
import { db } from './index';
import { stakeRecords, stakingPools } from './schema';
import { StakeRecord, StakingPool } from '@shared/types';

/**
 * Data access object for stake records and staking pools
 */
export class StakeDao {
  /**
   * Create a new stake record
   * @param stake Stake record to create
   * @returns Created stake record
   */
  async createStakeRecord(stake: StakeRecord): Promise<StakeRecord> {
    console.log(`[StakeDAO] createStakeRecord called for stake ID: ${stake.id}, pool ID: ${stake.poolId}, wallet: ${stake.walletAddress}`);
    try {
      const dbStake = {
        id: stake.id,
        walletAddress: stake.walletAddress,
        poolId: stake.poolId,
        amount: stake.amount,
        startTime: BigInt(stake.startTime),
        endTime: stake.endTime ? BigInt(stake.endTime) : undefined,
        isActive: stake.isActive,
        rewards: stake.rewards,
        lastRewardClaim: BigInt(stake.lastRewardClaim),
        autoCompound: stake.autoCompound
      };

      // Insert stake record
      await db.insert(stakeRecords).values(dbStake);
      console.log(`[StakeDAO] Stake record ${stake.id} inserted successfully.`);
      
      await this.updatePoolStatistics(stake.poolId);
      
      return stake;
    } catch (error) {
      console.error(`[StakeDAO] Error creating stake record ${stake.id}:`, error.message);
      throw new Error(`Failed to create stake record ${stake.id}: ${error.message}`);
    }
  }

  /**
   * Get stake record by ID
   * @param id Stake record ID
   * @returns Stake record or undefined if not found
   */
  async getStakeById(id: string): Promise<StakeRecord | undefined> {
    console.log(`[StakeDAO] getStakeById called for ID: ${id}`);
    try {
      const result = await db.select().from(stakeRecords).where(eq(stakeRecords.id, id)).limit(1);
      
      if (result.length === 0) {
        console.log(`[StakeDAO] Stake record with ID ${id} not found.`);
        return undefined;
      }
      
      console.log(`[StakeDAO] Stake record with ID ${id} found.`);
      const dbStake = result[0];
      // Removed duplicate const dbStake = result[0];
      return {
        id: dbStake.id,
        walletAddress: dbStake.walletAddress,
        poolId: dbStake.poolId,
        amount: dbStake.amount,
        startTime: Number(dbStake.startTime),
        endTime: dbStake.endTime ? Number(dbStake.endTime) : undefined,
        isActive: dbStake.isActive,
        rewards: dbStake.rewards,
        lastRewardClaim: Number(dbStake.lastRewardClaim),
        autoCompound: dbStake.autoCompound
      };
    } catch (error) {
      console.error(`[StakeDAO] Error getting stake by ID ${id}:`, error.message);
      throw new Error(`Failed to get stake record for ID ${id}: ${error.message}`);
    }
  }

  /**
   * Get all stake records by wallet address
   * @param address Wallet address
   * @returns Array of stake records
   */
  async getStakesByAddress(address: string): Promise<StakeRecord[]> {
    console.log(`[StakeDAO] getStakesByAddress called for address: ${address}`);
    try {
      const result = await db.select().from(stakeRecords).where(eq(stakeRecords.walletAddress, address)).orderBy(desc(stakeRecords.startTime));
      console.log(`[StakeDAO] Found ${result.length} stake records for address ${address}.`);
      return result.map(dbStake => ({
        id: dbStake.id,
        walletAddress: dbStake.walletAddress,
        poolId: dbStake.poolId,
        amount: dbStake.amount,
        startTime: Number(dbStake.startTime),
        endTime: dbStake.endTime ? Number(dbStake.endTime) : undefined,
        isActive: dbStake.isActive,
        rewards: dbStake.rewards,
        lastRewardClaim: Number(dbStake.lastRewardClaim),
        autoCompound: dbStake.autoCompound
      }));
    } catch (error) {
      console.error(`[StakeDAO] Error getting stakes by address ${address}:`, error.message);
      throw new Error(`Failed to get stake records for address ${address}: ${error.message}`);
    }
  }

  /**
   * Get active stake records by wallet address
   * @param address Wallet address
   * @returns Array of active stake records
   */
  async getActiveStakesByAddress(address: string): Promise<StakeRecord[]> {
    console.log(`[StakeDAO] getActiveStakesByAddress called for address: ${address}`);
    try {
      const result = await db.select().from(stakeRecords).where(
        and(
          eq(stakeRecords.walletAddress, address),
          eq(stakeRecords.isActive, true)
        )
      ).orderBy(desc(stakeRecords.startTime));
      console.log(`[StakeDAO] Found ${result.length} active stake records for address ${address}.`);
      return result.map(dbStake => ({
        id: dbStake.id,
        walletAddress: dbStake.walletAddress,
        poolId: dbStake.poolId,
        amount: dbStake.amount,
        startTime: Number(dbStake.startTime),
        endTime: dbStake.endTime ? Number(dbStake.endTime) : undefined,
        isActive: dbStake.isActive,
        rewards: dbStake.rewards,
        lastRewardClaim: Number(dbStake.lastRewardClaim),
        autoCompound: dbStake.autoCompound
      }));
    } catch (error) {
      console.error(`[StakeDAO] Error getting active stakes by address ${address}:`, error.message);
      throw new Error(`Failed to get active stake records for address ${address}: ${error.message}`);
    }
  }

  /**
   * Get active stake records by pool ID
   * @param poolId Staking pool ID
   * @returns Array of active stake records
   */
  async getActiveStakesByPoolId(poolId: string): Promise<StakeRecord[]> {
    console.log(`[StakeDAO] getActiveStakesByPoolId called for pool ID: ${poolId}`);
    try {
      const result = await db.select().from(stakeRecords).where(
        and(
          eq(stakeRecords.poolId, poolId),
          eq(stakeRecords.isActive, true)
        )
      ).orderBy(desc(stakeRecords.startTime));
      console.log(`[StakeDAO] Found ${result.length} active stake records for pool ID ${poolId}.`);
      return result.map(dbStake => ({
        id: dbStake.id,
        walletAddress: dbStake.walletAddress,
        poolId: dbStake.poolId,
        amount: dbStake.amount,
        startTime: Number(dbStake.startTime),
        endTime: dbStake.endTime ? Number(dbStake.endTime) : undefined,
        isActive: dbStake.isActive,
        rewards: dbStake.rewards,
        lastRewardClaim: Number(dbStake.lastRewardClaim),
        autoCompound: dbStake.autoCompound
      }));
    } catch (error) {
      console.error(`[StakeDAO] Error getting active stakes by pool ID ${poolId}:`, error.message);
      throw new Error(`Failed to get active stake records for pool ID ${poolId}: ${error.message}`);
    }
  }

  /**
   * Update a stake record
   * @param stake Stake record to update
   * @returns Updated stake record
   */
  async updateStakeRecord(stake: StakeRecord): Promise<StakeRecord> {
    console.log(`[StakeDAO] updateStakeRecord called for stake ID: ${stake.id}`);
    try {
      const existingStake = await this.getStakeById(stake.id); // getStakeById already logs
      if (!existingStake) {
        console.log(`[StakeDAO] Stake record ${stake.id} not found for update, attempting to create instead.`);
        return this.createStakeRecord(stake); // createStakeRecord already logs
      }
      
      console.log(`[StakeDAO] Updating stake record ${stake.id} in DB.`);
      const dbStake = {
        amount: stake.amount,
        endTime: stake.endTime ? BigInt(stake.endTime) : null,
        isActive: stake.isActive,
        rewards: stake.rewards,
        lastRewardClaim: BigInt(stake.lastRewardClaim),
        autoCompound: stake.autoCompound,
        updatedAt: new Date()
      };

      await db.update(stakeRecords).set(dbStake).where(eq(stakeRecords.id, stake.id));
      console.log(`[StakeDAO] Stake record ${stake.id} updated successfully in DB.`);
      
      if (existingStake.isActive !== stake.isActive) {
        console.log(`[StakeDAO] Stake ${stake.id} active status changed, updating pool statistics for pool ${stake.poolId}.`);
        await this.updatePoolStatistics(stake.poolId);
      }
      
      return stake;
    } catch (error) {
      console.error(`[StakeDAO] Error updating stake record ${stake.id}:`, error.message);
      throw new Error(`Failed to update stake record ${stake.id}: ${error.message}`);
    }
  }

  /**
   * End an active stake
   * @param stakeId Stake record ID
   * @param endTime End timestamp
   * @returns Updated stake record
   */
  async endStake(stakeId: string, endTime: number): Promise<StakeRecord | undefined> {
    console.log(`[StakeDAO] endStake called for stake ID: ${stakeId} with endTime: ${endTime}`);
    try {
      const stake = await this.getStakeById(stakeId); // getStakeById already logs
      if (!stake) {
        console.log(`[StakeDAO] Stake ${stakeId} not found, cannot end.`);
        return undefined;
      }
      if (!stake.isActive) {
        console.log(`[StakeDAO] Stake ${stakeId} is already inactive, cannot end.`);
        return undefined;
      }

      stake.isActive = false;
      stake.endTime = endTime;
      
      stake.isActive = false;
      stake.endTime = endTime;
      
      console.log(`[StakeDAO] Marking stake ${stakeId} as inactive and setting end time.`);
      return await this.updateStakeRecord(stake); // updateStakeRecord already logs
    } catch (error) {
      console.error(`[StakeDAO] Error ending stake ${stakeId}:`, error.message);
      throw new Error(`Failed to end stake ${stakeId}: ${error.message}`);
    }
  }

  /**
   * Get all staking pools
   * @returns Array of staking pools
   */
  async getStakingPools(): Promise<StakingPool[]> {
    console.log(`[StakeDAO] getStakingPools called.`);
    try {
      const result = await db.select().from(stakingPools).orderBy(desc(stakingPools.apr));
      console.log(`[StakeDAO] Found ${result.length} staking pools.`);
      return result.map(dbPool => ({
        id: dbPool.id,
        name: dbPool.name,
        description: dbPool.description,
        apr: dbPool.apr,
        minStakeAmount: dbPool.minStakeAmount,
        lockupPeriod: dbPool.lockupPeriod,
        totalStaked: dbPool.totalStaked,
        activeStakers: dbPool.activeStakers
      }));
    } catch (error) {
      console.error(`[StakeDAO] Error getting staking pools:`, error.message);
      throw new Error(`Failed to get staking pools: ${error.message}`);
    }
  }

  /**
   * Get staking pool by ID
   * @param id Staking pool ID
   * @returns Staking pool or undefined if not found
   */
  async getStakingPoolById(id: string): Promise<StakingPool | undefined> {
    console.log(`[StakeDAO] getStakingPoolById called for ID: ${id}`);
    try {
      const result = await db.select().from(stakingPools).where(eq(stakingPools.id, id)).limit(1);
      
      if (result.length === 0) {
        console.log(`[StakeDAO] Staking pool with ID ${id} not found.`);
        return undefined;
      }
      console.log(`[StakeDAO] Staking pool with ID ${id} found: ${result[0].name}`);
      const dbPool = result[0];
      // Removed duplicate const dbPool = result[0];
      return {
        id: dbPool.id,
        name: dbPool.name,
        description: dbPool.description,
        apr: dbPool.apr,
        minStakeAmount: dbPool.minStakeAmount,
        lockupPeriod: dbPool.lockupPeriod,
        totalStaked: dbPool.totalStaked,
        activeStakers: dbPool.activeStakers
      };
    } catch (error) {
      console.error(`[StakeDAO] Error getting staking pool by ID ${id}:`, error.message);
      throw new Error(`Failed to get staking pool for ID ${id}: ${error.message}`);
    }
  }

  /**
   * Create a new staking pool
   * @param pool Staking pool to create
   * @returns Created staking pool
   */
  async createStakingPool(pool: StakingPool): Promise<StakingPool> {
    console.log(`[StakeDAO] createStakingPool called for pool ID: ${pool.id}, Name: ${pool.name}`);
    try {
      const dbPool = {
        id: pool.id,
        name: pool.name,
        description: pool.description,
        apr: pool.apr,
        minStakeAmount: pool.minStakeAmount,
        lockupPeriod: pool.lockupPeriod,
        totalStaked: pool.totalStaked,
        activeStakers: pool.activeStakers
      };

      await db.insert(stakingPools).values(dbPool);
      console.log(`[StakeDAO] Staking pool ${pool.id} - ${pool.name} created successfully.`);
      return pool;
    } catch (error) {
      console.error(`[StakeDAO] Error creating staking pool ${pool.id}:`, error.message);
      throw new Error(`Failed to create staking pool ${pool.id}: ${error.message}`);
    }
  }

  /**
   * Update a staking pool
   * @param pool Staking pool to update
   * @returns Updated staking pool
   */
  async updateStakingPool(pool: StakingPool): Promise<StakingPool> {
    console.log(`[StakeDAO] updateStakingPool called for pool ID: ${pool.id}, Name: ${pool.name}`);
    try {
      const existingPool = await this.getStakingPoolById(pool.id); // getStakingPoolById already logs
      if (!existingPool) {
        console.log(`[StakeDAO] Staking pool ${pool.id} not found for update, attempting to create instead.`);
        return this.createStakingPool(pool); // createStakingPool already logs
      }
      
      console.log(`[StakeDAO] Updating staking pool ${pool.id} - ${pool.name} in DB.`);
      const dbPool = {
        name: pool.name,
        description: pool.description,
        apr: pool.apr,
        minStakeAmount: pool.minStakeAmount,
        lockupPeriod: pool.lockupPeriod,
        totalStaked: pool.totalStaked,
        activeStakers: pool.activeStakers,
        updatedAt: new Date()
      };

      await db.update(stakingPools).set(dbPool).where(eq(stakingPools.id, pool.id));
      console.log(`[StakeDAO] Staking pool ${pool.id} - ${pool.name} updated successfully.`);
      return pool;
    } catch (error) {
      console.error(`[StakeDAO] Error updating staking pool ${pool.id}:`, error.message);
      throw new Error(`Failed to update staking pool ${pool.id}: ${error.message}`);
    }
  }

  /**
   * Update pool statistics based on active stakes
   * @param poolId Staking pool ID
   */
  private async updatePoolStatistics(poolId: string): Promise<void> {
    console.log(`[StakeDAO] updatePoolStatistics called for pool ID: ${poolId}`);
    try {
      const pool = await this.getStakingPoolById(poolId); // getStakingPoolById already logs
      if (!pool) {
        // Error already logged by getStakingPoolById if it throws, or it returns undefined.
        // If it returned undefined, getStakingPoolById would have logged "not found".
        // Throwing a new error here might be redundant if getStakingPoolById already threw.
        // However, if it returned undefined, this provides a specific context.
        console.error(`[StakeDAO] Cannot update statistics: Staking pool ${poolId} not found.`);
        throw new Error(`Staking pool not found: ${poolId} when trying to update statistics.`);
      }
      
      const activeStakes = await this.getActiveStakesByPoolId(poolId); // this method also logs
      const totalStaked = activeStakes.reduce((sum, stake) => (BigInt(sum) + BigInt(stake.amount)).toString(), '0');
      
      console.log(`[StakeDAO] Updating statistics for pool ${poolId}: Total Staked = ${totalStaked}, Active Stakers = ${activeStakes.length}`);
      await db.update(stakingPools)
        .set({ 
          totalStaked,
          activeStakers: activeStakes.length,
          updatedAt: new Date()
        })
        .where(eq(stakingPools.id, poolId));
      console.log(`[StakeDAO] Pool statistics for ${poolId} updated successfully.`);
    } catch (error) {
      // Avoid re-wrapping error if it's already specific from a sub-call that threw
      const errorMessage = error.message.includes('Failed to get') ? error.message : `Failed to update pool statistics for ${poolId}: ${error.message}`;
      console.error(`[StakeDAO] Error updating pool statistics for ${poolId}:`, error.message);
      throw new Error(errorMessage);
    }
  }
}

// Create a singleton instance
export const stakeDao = new StakeDao();