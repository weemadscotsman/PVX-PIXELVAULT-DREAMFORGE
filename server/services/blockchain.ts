import { IStorage } from "../storage";
import { calculateBlockReward, getHalvingInterval } from "../utils/crypto";
import {
  Block,
  NetworkStats,
  Transaction,
  TransactionType
} from "@shared/types";

export class BlockchainService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Get current network statistics
   */
  async getNetworkStats(): Promise<NetworkStats> {
    try {
      return this.storage.getNetworkStats();
    } catch (error) {
      console.error("Error getting network stats:", error);
      // Return default fallback values
      return {
        blockHeight: 3421869,
        blockTime: "~15 sec",
        peers: 24,
        hashRate: "12.4 TH/s",
        lastBlockTimestamp: new Date(),
        difficulty: 12876954,
        circulatingSupply: 5850000000,
        totalSupply: 6009420000
      };
    }
  }

  /**
   * Get current blockchain height
   */
  async getCurrentBlockHeight(): Promise<number> {
    return this.storage.getCurrentBlockHeight();
  }

  /**
   * Get recent blocks from the blockchain
   */
  async getRecentBlocks(limit: number = 10): Promise<Block[]> {
    return this.storage.getRecentBlocks(limit);
  }

  /**
   * Get transactions for a specific address
   */
  async getTransactionsByAddress(address: string, limit: number = 10): Promise<Transaction[]> {
    return this.storage.getTransactionsByAddress(address, limit);
  }

  /**
   * Get the current block reward based on the blockchain height
   */
  async getCurrentBlockReward(): Promise<number> {
    const blockHeight = await this.storage.getCurrentBlockHeight();
    return calculateBlockReward(blockHeight);
  }

  /**
   * Get halving progress information
   */
  async getHalvingProgress(): Promise<{
    current: number;
    total: number;
    nextEstimate: string;
  }> {
    const blockHeight = await this.storage.getCurrentBlockHeight();
    const halvingInterval = getHalvingInterval();
    
    const currentHalvingPeriod = Math.floor(blockHeight / halvingInterval);
    const nextHalvingHeight = (currentHalvingPeriod + 1) * halvingInterval;
    
    const current = blockHeight % halvingInterval;
    const total = halvingInterval;
    
    // Estimate next halving (assuming 15 seconds per block)
    const blocksRemaining = nextHalvingHeight - blockHeight;
    const secondsRemaining = blocksRemaining * 15;
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
    
    return {
      current,
      total,
      nextEstimate
    };
  }

  /**
   * Process a transaction and update related state
   */
  async processTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const newTransaction = await this.storage.createTransaction(transaction);
    
    // If it's a transfer, update wallet balances
    if (transaction.type === TransactionType.TRANSFER) {
      const senderBalance = await this.storage.getWalletBalance(transaction.fromAddress);
      const receiverBalance = await this.storage.getWalletBalance(transaction.toAddress);
      
      await this.storage.updateWalletBalance(
        transaction.fromAddress,
        senderBalance - transaction.amount
      );
      
      await this.storage.updateWalletBalance(
        transaction.toAddress,
        receiverBalance + transaction.amount
      );
    }
    
    return newTransaction;
  }

  /**
   * Mine a new block and distribute rewards
   */
  async mineBlock(minerAddress: string): Promise<Block> {
    const blockHeight = await this.storage.getCurrentBlockHeight() + 1;
    const prevBlocks = await this.storage.getRecentBlocks(1);
    const previousBlock = prevBlocks[0];
    
    // Calculate reward
    const blockReward = calculateBlockReward(blockHeight);
    
    // Create a new block
    const newBlock: Omit<Block, 'id'> = {
      height: blockHeight,
      hash: `block_${blockHeight}_${Date.now()}`,
      previousHash: previousBlock.hash,
      timestamp: new Date(),
      nonce: Math.floor(Math.random() * 100000),
      difficulty: previousBlock.difficulty,
      transactions: [],
      miner: minerAddress,
      reward: blockReward
    };
    
    // Add the block to storage
    const block = await this.storage.addBlock(newBlock);
    
    // Create mining reward transaction
    const rewardTransaction: Omit<Transaction, 'id'> = {
      type: TransactionType.MINING_REWARD,
      fromAddress: "zk_PVX:coinbase",
      toAddress: minerAddress,
      amount: blockReward * 0.5, // 50% to miner
      timestamp: new Date(),
      blockHeight,
      note: `Block ${blockHeight} mining reward`
    };
    
    await this.storage.createTransaction(rewardTransaction);
    
    // Distribute remaining rewards: 25% governance, 15% staking, 10% reserve
    const governanceReward: Omit<Transaction, 'id'> = {
      type: TransactionType.TRANSFER,
      fromAddress: "zk_PVX:coinbase",
      toAddress: "zk_PVX:governance",
      amount: blockReward * 0.25,
      timestamp: new Date(),
      blockHeight,
      note: `Block ${blockHeight} governance allocation`
    };
    
    const stakingReward: Omit<Transaction, 'id'> = {
      type: TransactionType.TRANSFER,
      fromAddress: "zk_PVX:coinbase",
      toAddress: "zk_PVX:staking_pool",
      amount: blockReward * 0.15,
      timestamp: new Date(),
      blockHeight,
      note: `Block ${blockHeight} staking allocation`
    };
    
    const reserveReward: Omit<Transaction, 'id'> = {
      type: TransactionType.TRANSFER,
      fromAddress: "zk_PVX:coinbase",
      toAddress: "zk_PVX:vault_reserve",
      amount: blockReward * 0.1,
      timestamp: new Date(),
      blockHeight,
      note: `Block ${blockHeight} vault reserve allocation`
    };
    
    await this.storage.createTransaction(governanceReward);
    await this.storage.createTransaction(stakingReward);
    await this.storage.createTransaction(reserveReward);
    
    // Update miner balance
    const minerBalance = await this.storage.getWalletBalance(minerAddress);
    await this.storage.updateWalletBalance(
      minerAddress,
      minerBalance + blockReward * 0.5
    );
    
    return block;
  }
}
