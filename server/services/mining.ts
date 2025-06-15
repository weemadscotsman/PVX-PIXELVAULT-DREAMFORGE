import { IStorage } from "../storage";
import { calculateBlockReward } from "../utils/crypto";
import { MiningStats, MiningReward, TransactionType } from "@shared/types";

export class MiningService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Get the current block reward
   */
  async getCurrentBlockReward(): Promise<number> {
    console.log(`[MiningService] getCurrentBlockReward called.`);
    try {
      const blockHeight = await this.storage.getCurrentBlockHeight();
      const reward = calculateBlockReward(blockHeight);
      console.log(`[MiningService] Current block height: ${blockHeight}, Calculated reward: ${reward}.`);
      return reward;
    } catch (error) {
      console.error("[MiningService] Error getting current block reward:", error.message);
      const fallbackReward = 150;
      console.warn(`[MiningService] Returning fallback block reward: ${fallbackReward}.`);
      return fallbackReward;
    }
  }

  /**
   * Get halving progress information
   */
  async getHalvingProgress(): Promise<{
    current: number;
    total: number;
    nextEstimate: string;
  }> {
    console.log(`[MiningService] getHalvingProgress called.`);
    try {
      const blockHeight = await this.storage.getCurrentBlockHeight();
      console.log(`[MiningService] Current block height for halving progress: ${blockHeight}.`);
      const halvingInterval = 210000;
      
      const currentHalvingPeriod = Math.floor(blockHeight / halvingInterval);
      const nextHalvingHeight = (currentHalvingPeriod + 1) * halvingInterval;
      
      const current = blockHeight % halvingInterval;
      const total = halvingInterval;
      
      const blocksRemaining = nextHalvingHeight - blockHeight;
      const secondsRemaining = blocksRemaining * 15; // Assuming 15 seconds per block
      const daysRemaining = Math.ceil(secondsRemaining / (60 * 60 * 24));
      
      let nextEstimate: string;
      if (daysRemaining > 365) {
        const years = Math.floor(daysRemaining / 365);
        nextEstimate = `~${years} ${years === 1 ? 'year' : 'years'}`;
      } else if (daysRemaining > 30) {
        const months = Math.floor(daysRemaining / 30);
        nextEstimate = `~${months} ${months === 1 ? 'month' : 'months'}`;
      } else {
        nextEstimate = `~${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`;
      }
      
      const progress = { current, total, nextEstimate };
      console.log(`[MiningService] Halving progress: Current=${current}, Total=${total}, Next Estimate=${nextEstimate}.`);
      return progress;
    } catch (error) {
      console.error("[MiningService] Error getting halving progress:", error.message);
      const fallbackProgress = { current: 0, total: 210000, nextEstimate: "~4 years" };
      console.warn(`[MiningService] Returning fallback halving progress.`);
      return fallbackProgress;
    }
  }

  /**
   * Get mining reward distribution
   */
  async getRewardDistribution(): Promise<{
    miner: number;
    governance: number;
    staking: number;
    reserve: number;
  }> {
    console.log(`[MiningService] getRewardDistribution called.`);
    try {
      const blockReward = await this.getCurrentBlockReward(); // Already logs
      const distribution = {
        miner: blockReward * 0.5,
        governance: blockReward * 0.25,
        staking: blockReward * 0.15,
        reserve: blockReward * 0.1
      };
      console.log(`[MiningService] Calculated reward distribution for block reward ${blockReward}:`, distribution);
      return distribution;
    } catch (error) {
      console.error("[MiningService] Error getting reward distribution:", error.message);
      const fallbackDistribution = { miner: 75, governance: 37.5, staking: 22.5, reserve: 15 };
      console.warn(`[MiningService] Returning fallback reward distribution.`);
      return fallbackDistribution;
    }
  }

  /**
   * Start mining for an address
   */
  async startMining(address: string, threads: number = 2): Promise<boolean> {
    console.log(`[MiningService] startMining called for address: ${address}, threads: ${threads}.`);
    let stats = await this.storage.getMiningStats(address);
    
    if (!stats) {
      console.log(`[MiningService] No existing mining stats for ${address}. Creating new entry.`);
      stats = {
        address,
        blocksMined: 0,
        totalRewards: 0,
        isCurrentlyMining: false,
        currentHashRate: 0
      };
    }
    
    if (stats.isCurrentlyMining) {
      console.warn(`[MiningService] Address ${address} is already mining. No action taken.`);
      return true; // Or false, depending on desired behavior for already mining
    }

    stats.isCurrentlyMining = true;
    stats.currentHashRate = threads * 50; // Mock hash rate
    
    await this.storage.updateMiningStats(stats);
    console.log(`[MiningService] Mining started for ${address}. Hashrate: ${stats.currentHashRate}.`);
    return true;
  }

  /**
   * Stop mining for an address
   */
  async stopMining(address: string): Promise<boolean> {
    console.log(`[MiningService] stopMining called for address: ${address}.`);
    const stats = await this.storage.getMiningStats(address);
    
    if (!stats) {
      console.warn(`[MiningService] No mining stats found for ${address}. Cannot stop mining.`);
      return false;
    }
    
    if (!stats.isCurrentlyMining) {
      console.warn(`[MiningService] Address ${address} is not currently mining. No action taken.`);
      return true;
    }

    stats.isCurrentlyMining = false;
    stats.currentHashRate = 0;
    
    await this.storage.updateMiningStats(stats);
    console.log(`[MiningService] Mining stopped for ${address}.`);
    return true;
  }

  /**
   * Get mining stats for an address
   */
  async getMiningStats(address: string): Promise<MiningStats> {
    console.log(`[MiningService] getMiningStats called for address: ${address}.`);
    let stats = await this.storage.getMiningStats(address);
    
    if (!stats) {
      console.log(`[MiningService] No mining stats found for ${address}. Creating and returning default entry.`);
      stats = {
        address,
        blocksMined: 0,
        totalRewards: 0,
        isCurrentlyMining: false,
        currentHashRate: 0
      };
      // Optionally save the new default stats, or just return them transiently
      // await this.storage.updateMiningStats(stats); // Uncomment if new stats should be persisted
    }
    console.log(`[MiningService] Retrieved mining stats for ${address}:`, stats);
    return stats;
  }

  /**
   * Get mining rewards for an address
   */
  async getMiningRewards(address: string): Promise<MiningReward[]> {
    console.log(`[MiningService] getMiningRewards called for address: ${address}.`);
    const rewards = await this.storage.getMiningRewards(address);
    console.log(`[MiningService] Found ${rewards.length} mining rewards for ${address}.`);
    return rewards;
  }

  /**
   * Simulate mining a block
   */
  async simulateMining(address: string): Promise<MiningReward> {
    console.log(`[MiningService] simulateMining called for address: ${address}.`);
    const blockHeight = await this.storage.getCurrentBlockHeight() + 1;
    console.log(`[MiningService] Simulating mining for new block height: ${blockHeight}.`);
    
    const blockReward = calculateBlockReward(blockHeight); // Assuming this is a pure function
    const minerReward = blockReward * 0.5;
    console.log(`[MiningService] Calculated miner reward for block ${blockHeight}: ${minerReward}.`);
    
    const reward: Omit<MiningReward, 'id'> = {
      blockHeight,
      amount: minerReward,
      timestamp: new Date(),
      address
    };
    
    const reward: Omit<MiningReward, 'id'> = { blockHeight, amount: minerReward, timestamp: new Date(), address };

    console.log(`[MiningService] Adding mining reward for ${address}, block ${blockHeight}.`);
    const miningReward = await this.storage.addMiningReward(reward);
    
    const rewardTx = {
      type: TransactionType.MINING_REWARD,
      fromAddress: "zk_PVX:coinbase", // Consider making this a constant
      toAddress: address,
      amount: minerReward,
      timestamp: new Date(),
      blockHeight,
      note: `Block ${blockHeight} mining reward`
    };
    console.log(`[MiningService] Creating MINING_REWARD transaction for ${address}, block ${blockHeight}.`);
    await this.storage.createTransaction(rewardTx);
    
    console.log(`[MiningService] Mining simulation for ${address} completed. Reward ID: ${miningReward.id}`);
    return miningReward;
  }
}
