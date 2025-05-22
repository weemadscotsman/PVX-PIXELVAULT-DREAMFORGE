import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';
import { and, desc, eq, or, sql, count, avg, max } from 'drizzle-orm';
import * as sha3 from 'js-sha3';
import {
  User, InsertUser, Transaction, Block, MiningStats,
  MiningReward, Stake, Proposal, VoteOption, NFT, NetworkStats,
  users, wallets, transactions, blocks, mining_stats,
  mining_rewards, stakes, proposals, votes, nfts, user_feedback,
  UserFeedback, InsertUserFeedback, VetoGuardian, InsertVetoGuardian,
  VetoAction, InsertVetoAction, veto_guardians, veto_actions,
  GameLeaderboard, InsertGameLeaderboard, game_leaderboards
} from '@shared/schema';

export interface IStorage {
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Wallet related methods
  getWalletByAddress(address: string): Promise<any | undefined>;
  createWallet(address: string, initialBalance?: number): Promise<any>;
  getWalletBalance(address: string): Promise<number>;
  updateWalletBalance(address: string, newBalance: number): Promise<boolean>;
  
  // Transaction related methods
  createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction>;
  getTransactionsByAddress(address: string, limit?: number): Promise<Transaction[]>;
  getRecentTransactions(limit?: number): Promise<Transaction[]>;
  
  // Block related methods
  getCurrentBlockHeight(): Promise<number>;
  getRecentBlocks(limit?: number): Promise<Block[]>;
  addBlock(block: Omit<Block, 'id'>): Promise<Block>;
  
  // Mining related methods
  getMiningStats(address: string): Promise<MiningStats | undefined>;
  updateMiningStats(stats: MiningStats): Promise<MiningStats>;
  getMiningRewards(address: string): Promise<MiningReward[]>;
  addMiningReward(reward: Omit<MiningReward, 'id'>): Promise<MiningReward>;
  
  // Staking related methods
  getStakes(address: string): Promise<Stake[]>;
  createStake(stake: Omit<Stake, 'id'>): Promise<Stake>;
  unstake(stakeId: string): Promise<boolean>;
  
  // Governance related methods
  getProposals(): Promise<Proposal[]>;
  getProposal(proposalId: string): Promise<Proposal | undefined>;
  createProposal(proposal: Omit<Proposal, 'id'>): Promise<Proposal>;
  getVotes(address: string): Promise<{proposalId: string, option: VoteOption}[]>;
  vote(address: string, proposalId: string, option: VoteOption): Promise<boolean>;
  
  // Game Leaderboard methods
  getGameLeaderboards(gameType: string, limit?: number): Promise<GameLeaderboard[]>;
  getLeaderboardsByUser(userId: number): Promise<GameLeaderboard[]>;
  getLeaderboardsByWalletAddress(walletAddress: string): Promise<GameLeaderboard[]>;
  addGameScore(entry: InsertGameLeaderboard): Promise<GameLeaderboard>;
  getTopScores(gameType: string, limit?: number): Promise<GameLeaderboard[]>;
  getUserRank(userId: number, gameType: string): Promise<number>; // Returns rank position (1st, 2nd, etc.)
  getRecentScores(limit?: number): Promise<GameLeaderboard[]>;
  getGameStats(gameType: string): Promise<{
    totalPlayers: number;
    highestScore: number;
    averageScore: number;
    totalGamesPlayed: number;
  }>;
  
  // Veto Guardian related methods
  getVetoGuardians(): Promise<VetoGuardian[]>;
  getVetoGuardian(id: number): Promise<VetoGuardian | undefined>;
  getVetoGuardianByAddress(address: string): Promise<VetoGuardian | undefined>;
  createVetoGuardian(guardian: InsertVetoGuardian): Promise<VetoGuardian>;
  updateVetoGuardian(id: number, isActive: boolean): Promise<VetoGuardian | undefined>;
  vetoProposal(guardianId: number, proposalId: number, reason: string): Promise<VetoAction | undefined>;
  
  // NFT related methods
  getNFTs(): Promise<any[]>;
  getNFTsByOwner(ownerAddress: string): Promise<any[]>;
  getNFT(id: string): Promise<any | undefined>;
  mintNFT(nft: any): Promise<any>;
  transferNFT(id: string, fromAddress: string, toAddress: string): Promise<boolean>;
  
  // Drops and Thringlets methods
  getSecretDrops(): Promise<any[]>;
  getSecretDropByCode(code: string): Promise<any | undefined>;
  createSecretDrop(drop: any): Promise<any>;
  updateSecretDrop(drop: any): Promise<any>;
  getThringletsByOwner(ownerAddress: string): Promise<any[]>;
  getThringlet(id: string): Promise<any | undefined>;
  createThringlet(thringlet: any): Promise<any>;
  updateThringlet(thringlet: any): Promise<any>;
  
  // User Feedback methods
  getUserFeedback(limit?: number): Promise<UserFeedback[]>;
  getUserFeedbackById(id: string): Promise<UserFeedback | undefined>;
  getFeedbackByAddress(address: string, limit?: number): Promise<UserFeedback[]>;
  createFeedback(feedback: InsertUserFeedback): Promise<UserFeedback>;
  updateFeedbackStatus(id: string, isResolved: boolean, resolutionNote?: string): Promise<UserFeedback | undefined>;
  getFeedbackStats(): Promise<{
    total: number;
    resolved: number;
    unresolved: number;
    byType: Record<string, number>;
    bySentiment: Record<string, number>;
  }>;
  
  // Network stats
  getNetworkStats(): Promise<NetworkStats>;
}

export class DatabaseStorage implements IStorage {
  // User feedback in-memory storage - will be replaced with proper DB implementation
  private userFeedback: UserFeedback[] = [];
  
  // In-memory game leaderboards storage, initial sample data
  private gameLeaderboards: GameLeaderboard[] = [
    {
      id: 1,
      user_id: 1,
      wallet_address: "zk_PVX:0x1234567890abcdef1234567890abcdef12345678",
      username: "CryptoNinja",
      game_type: "hashlord",
      score: 42069,
      difficulty: 3,
      time_spent: 600,
      blocks_mined: 5,
      gas_saved: null,
      staking_rewards: null,
      created_at: new Date(Date.now() - 86400000 * 2) // 2 days ago
    },
    {
      id: 2,
      user_id: 2,
      wallet_address: "zk_PVX:0xabcdef1234567890abcdef1234567890abcdef12",
      username: "BlockchainWizard",
      game_type: "hashlord",
      score: 38420,
      difficulty: 2,
      time_spent: 480,
      blocks_mined: 4,
      gas_saved: null,
      staking_rewards: null,
      created_at: new Date(Date.now() - 86400000 * 1) // 1 day ago
    },
    {
      id: 3,
      user_id: 3,
      wallet_address: "zk_PVX:0x7890abcdef1234567890abcdef1234567890abcd",
      username: "CipherPunk",
      game_type: "hashlord",
      score: 69420,
      difficulty: 4,
      time_spent: 720,
      blocks_mined: 7,
      gas_saved: null,
      staking_rewards: null,
      created_at: new Date(Date.now() - 86400000 * 3) // 3 days ago
    }
  ];
  
  // Secret Drops in-memory storage
  private secretDrops: any[] = [
    {
      id: "drop-001",
      name: "Genesis Drop",
      code: "ZKVAULT2025",
      description: "The first secret drop on PVX network",
      tier: 'legendary',
      reward: 69420000, // 69.42 PVX
      claimable: true,
      expiresAt: new Date(Date.now() + 86400000 * 7), // 7 days from now
      claimedBy: []
    },
    {
      id: "drop-002",
      name: "Early Adopter",
      code: "PIXELEARLY",
      description: "Reward for early PVX adopters",
      tier: 'epic',
      reward: 5000000, // 5 PVX
      claimable: true,
      expiresAt: new Date(Date.now() + 86400000 * 3), // 3 days from now
      claimedBy: []
    }
  ];
  
  private thringlets: any[] = [
    {
      id: "thring-001",
      name: "Matrix Hacker",
      rarity: 'legendary',
      ownerAddress: "zk_PVX:0x1234567890abcdef1234567890abcdef12345678",
      properties: {
        speed: 95,
        hack: 85,
        stealth: 90,
        special: "Can access hidden terminals"
      },
      createdAt: new Date(),
      mintTxHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    },
    {
      id: "thring-002",
      name: "Crypto Ghost",
      rarity: 'epic',
      ownerAddress: "zk_PVX:0x1234567890abcdef1234567890abcdef12345678",
      properties: {
        speed: 80,
        hack: 75,
        stealth: 100,
        special: "Invisible to tracking systems"
      },
      createdAt: new Date(),
      mintTxHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }
  ];
  
  // In-memory veto guardians for testing
  private vetoGuardians: VetoGuardian[] = [];
  private vetoActions: VetoAction[] = [];
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async getWalletByAddress(address: string): Promise<any | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.address, address));
    return wallet || undefined;
  }
  
  async createWallet(address: string, initialBalance: number = 0): Promise<any> {
    const [wallet] = await db
      .insert(wallets)
      .values({ 
        address, 
        balance: initialBalance.toString(),
        created_at: new Date(),
        last_updated: new Date()
      })
      .returning();
    return wallet;
  }
  
  async getWalletBalance(address: string): Promise<number> {
    const wallet = await this.getWalletByAddress(address);
    return wallet ? Number(wallet.balance) : 0;
  }
  
  async updateWalletBalance(address: string, newBalance: number): Promise<boolean> {
    const wallet = await this.getWalletByAddress(address);
    if (!wallet) return false;
    
    await db
      .update(wallets)
      .set({ 
        balance: newBalance.toString(),
        last_updated: new Date()
      })
      .where(eq(wallets.address, address));
    return true;
  }
  
  async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    // Fill in any missing fields
    const txData = {
      type: transaction.type,
      hash: transaction.hash || sha3.sha3_256(JSON.stringify(transaction) + Date.now()),
      from_address: transaction.fromAddress,
      to_address: transaction.toAddress,
      amount: transaction.amount.toString(),
      timestamp: transaction.timestamp || new Date(),
      block_height: transaction.blockHeight || null,
      note: transaction.note || null
    };
    
    const [newTransaction] = await db
      .insert(transactions)
      .values(txData)
      .returning();
    
    // Convert to application schema
    return {
      id: newTransaction.id.toString(),
      type: newTransaction.type as any,
      hash: newTransaction.hash,
      fromAddress: newTransaction.from_address,
      toAddress: newTransaction.to_address,
      amount: Number(newTransaction.amount),
      timestamp: newTransaction.timestamp,
      blockHeight: newTransaction.block_height || undefined,
      note: newTransaction.note || undefined
    };
  }
  
  async getTransactionsByAddress(address: string, limit: number = 10): Promise<Transaction[]> {
    const results = await db
      .select()
      .from(transactions)
      .where(
        or(
          eq(transactions.from_address, address),
          eq(transactions.to_address, address)
        )
      )
      .limit(limit);
    
    // Convert from database schema to application schema
    return results.map(tx => ({
      id: tx.id.toString(),
      type: tx.type as any,
      hash: tx.hash,
      fromAddress: tx.from_address,
      toAddress: tx.to_address,
      amount: Number(tx.amount),
      timestamp: tx.timestamp,
      blockHeight: tx.block_height || undefined,
      note: tx.note || undefined
    }));
  }
  
  async getRecentTransactions(limit: number = 20): Promise<Transaction[]> {
    try {
      const results = await db
        .select()
        .from(transactions)
        .orderBy(desc(transactions.timestamp))
        .limit(limit);
      
      // Convert from database schema to application schema
      return results.map(tx => ({
        id: tx.id.toString(),
        type: tx.type as any,
        hash: tx.hash,
        fromAddress: tx.from_address,
        toAddress: tx.to_address,
        amount: Number(tx.amount),
        timestamp: tx.timestamp,
        blockHeight: tx.block_height || undefined,
        note: tx.note || undefined
      }));
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      // Return an empty array on error
      return [];
    }
  }
  
  async getCurrentBlockHeight(): Promise<number> {
    const [result] = await db
      .select({ max: sql<number>`max(${blocks.height})` })
      .from(blocks);
    return result?.max || 0;
  }
  
  async getRecentBlocks(limit: number = 10): Promise<Block[]> {
    const results = await db
      .select()
      .from(blocks)
      .orderBy(desc(blocks.height))
      .limit(limit);
    
    // Convert from database schema to application schema
    return results.map(block => ({
      id: block.id.toString(),
      height: block.height,
      hash: block.hash,
      previousHash: block.previous_hash,
      timestamp: block.timestamp,
      nonce: block.nonce,
      difficulty: block.difficulty,
      transactions: [], // Would need to fetch transactions by block height
      miner: block.miner,
      reward: Number(block.reward)
    }));
  }
  
  async addBlock(block: Omit<Block, 'id'>): Promise<Block> {
    const blockData = {
      height: block.height,
      hash: block.hash,
      previous_hash: block.previousHash,
      timestamp: block.timestamp,
      nonce: block.nonce,
      difficulty: block.difficulty,
      miner: block.miner,
      reward: block.reward.toString()
    };
    
    const [newBlock] = await db
      .insert(blocks)
      .values(blockData)
      .returning();
    
    // Convert to application schema
    return {
      id: newBlock.id.toString(),
      height: newBlock.height,
      hash: newBlock.hash,
      previousHash: newBlock.previous_hash,
      timestamp: newBlock.timestamp,
      nonce: newBlock.nonce,
      difficulty: newBlock.difficulty,
      transactions: [], // Would need to populate transactions
      miner: newBlock.miner,
      reward: Number(newBlock.reward)
    };
  }
  
  async getMiningStats(address: string): Promise<MiningStats | undefined> {
    const [stats] = await db
      .select()
      .from(mining_stats)
      .where(eq(mining_stats.address, address));
    
    if (!stats) return undefined;
    
    // Convert to application schema
    return {
      address: stats.address,
      blocksMined: stats.blocks_mined,
      totalRewards: Number(stats.total_rewards),
      isCurrentlyMining: stats.is_currently_mining,
      currentHashRate: Number(stats.current_hash_rate),
      lastBlockMined: stats.last_block_mined || undefined
    };
  }
  
  async updateMiningStats(stats: MiningStats): Promise<MiningStats> {
    const existingStats = await this.getMiningStats(stats.address);
    
    const statsData = {
      address: stats.address,
      blocks_mined: stats.blocksMined,
      total_rewards: stats.totalRewards.toString(),
      is_currently_mining: stats.isCurrentlyMining,
      current_hash_rate: stats.currentHashRate.toString(),
      last_block_mined: stats.lastBlockMined || null
    };
    
    if (existingStats) {
      const [updatedStats] = await db
        .update(mining_stats)
        .set(statsData)
        .where(eq(mining_stats.address, stats.address))
        .returning();
      
      // Convert to application schema
      return {
        address: updatedStats.address,
        blocksMined: updatedStats.blocks_mined,
        totalRewards: Number(updatedStats.total_rewards),
        isCurrentlyMining: updatedStats.is_currently_mining,
        currentHashRate: Number(updatedStats.current_hash_rate),
        lastBlockMined: updatedStats.last_block_mined || undefined
      };
    } else {
      const [newStats] = await db
        .insert(mining_stats)
        .values(statsData)
        .returning();
      
      // Convert to application schema
      return {
        address: newStats.address,
        blocksMined: newStats.blocks_mined,
        totalRewards: Number(newStats.total_rewards),
        isCurrentlyMining: newStats.is_currently_mining,
        currentHashRate: Number(newStats.current_hash_rate),
        lastBlockMined: newStats.last_block_mined || undefined
      };
    }
  }
  
  async getMiningRewards(address: string): Promise<MiningReward[]> {
    const results = await db
      .select()
      .from(mining_rewards)
      .where(eq(mining_rewards.address, address))
      .orderBy(desc(mining_rewards.timestamp));
    
    // Convert to application schema
    return results.map(reward => ({
      id: reward.id.toString(),
      blockHeight: reward.block_height,
      amount: Number(reward.amount),
      timestamp: reward.timestamp,
      address: reward.address
    }));
  }
  
  async addMiningReward(reward: Omit<MiningReward, 'id'>): Promise<MiningReward> {
    const rewardData = {
      block_height: reward.blockHeight,
      amount: reward.amount.toString(),
      timestamp: reward.timestamp,
      address: reward.address
    };
    
    const [newReward] = await db
      .insert(mining_rewards)
      .values(rewardData)
      .returning();
    
    // Convert to application schema
    return {
      id: newReward.id.toString(),
      blockHeight: newReward.block_height,
      amount: Number(newReward.amount),
      timestamp: newReward.timestamp,
      address: newReward.address
    };
  }
  
  async getStakes(address: string): Promise<Stake[]> {
    const results = await db
      .select()
      .from(stakes)
      .where(eq(stakes.address, address));
    
    // Convert to application schema
    return results.map(stake => ({
      id: stake.id.toString(),
      address: stake.address,
      amount: Number(stake.amount),
      startTime: stake.start_time,
      endTime: stake.end_time,
      duration: stake.duration,
      votingPower: Number(stake.voting_power),
      isActive: stake.is_active
    }));
  }
  
  async createStake(stake: Omit<Stake, 'id'>): Promise<Stake> {
    const stakeData = {
      address: stake.address,
      amount: stake.amount.toString(),
      start_time: stake.startTime,
      end_time: stake.endTime,
      duration: stake.duration,
      voting_power: stake.votingPower.toString(),
      is_active: stake.isActive
    };
    
    const [newStake] = await db
      .insert(stakes)
      .values(stakeData)
      .returning();
    
    // Convert to application schema
    return {
      id: newStake.id.toString(),
      address: newStake.address,
      amount: Number(newStake.amount),
      startTime: newStake.start_time,
      endTime: newStake.end_time,
      duration: newStake.duration,
      votingPower: Number(newStake.voting_power),
      isActive: newStake.is_active
    };
  }
  
  async unstake(stakeId: string): Promise<boolean> {
    const numId = parseInt(stakeId, 10);
    const result = await db
      .update(stakes)
      .set({ is_active: false })
      .where(eq(stakes.id, numId));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  async getProposals(): Promise<Proposal[]> {
    const results = await db
      .select()
      .from(proposals);
    
    // Convert to application schema
    return results.map(proposal => ({
      id: proposal.id.toString(),
      title: proposal.title,
      description: proposal.description || "",
      creatorAddress: proposal.creator_address,
      createTime: proposal.create_time,
      endTime: proposal.end_time,
      status: proposal.status as any,
      yesVotes: proposal.yes_votes,
      noVotes: proposal.no_votes,
      abstainVotes: proposal.abstain_votes,
      quorum: proposal.quorum,
      voteCount: proposal.vote_count,
      ttl: proposal.ttl
    }));
  }
  
  async getProposal(proposalId: string): Promise<Proposal | undefined> {
    const numId = parseInt(proposalId, 10);
    const [proposal] = await db
      .select()
      .from(proposals)
      .where(eq(proposals.id, numId));
    
    if (!proposal) return undefined;
    
    // Convert to application schema
    return {
      id: proposal.id.toString(),
      title: proposal.title,
      description: proposal.description || "",
      creatorAddress: proposal.creator_address,
      createTime: proposal.create_time,
      endTime: proposal.end_time,
      status: proposal.status as any,
      yesVotes: proposal.yes_votes,
      noVotes: proposal.no_votes,
      abstainVotes: proposal.abstain_votes,
      quorum: proposal.quorum,
      voteCount: proposal.vote_count,
      ttl: proposal.ttl
    };
  }
  
  async createProposal(proposal: Omit<Proposal, 'id'>): Promise<Proposal> {
    const proposalData = {
      title: proposal.title,
      description: proposal.description || null,
      creator_address: proposal.creatorAddress,
      create_time: proposal.createTime,
      end_time: proposal.endTime,
      status: proposal.status,
      yes_votes: proposal.yesVotes,
      no_votes: proposal.noVotes,
      abstain_votes: proposal.abstainVotes,
      quorum: proposal.quorum,
      vote_count: proposal.voteCount,
      ttl: proposal.ttl
    };
    
    const [newProposal] = await db
      .insert(proposals)
      .values(proposalData)
      .returning();
    
    // Convert to application schema
    return {
      id: newProposal.id.toString(),
      title: newProposal.title,
      description: newProposal.description || "",
      creatorAddress: newProposal.creator_address,
      createTime: newProposal.create_time,
      endTime: newProposal.end_time,
      status: newProposal.status as any,
      yesVotes: newProposal.yes_votes,
      noVotes: newProposal.no_votes,
      abstainVotes: newProposal.abstain_votes,
      quorum: newProposal.quorum,
      voteCount: newProposal.vote_count,
      ttl: newProposal.ttl
    };
  }
  
  async getVotes(address: string): Promise<{proposalId: string, option: VoteOption}[]> {
    const voteRecords = await db
      .select()
      .from(votes)
      .where(eq(votes.address, address));
    
    return voteRecords.map(vote => ({
      proposalId: vote.proposal_id.toString(),
      option: vote.option as VoteOption
    }));
  }
  
  async vote(address: string, proposalId: string, option: VoteOption): Promise<boolean> {
    const numProposalId = parseInt(proposalId, 10);
    const [existingVote] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.address, address),
          eq(votes.proposal_id, numProposalId)
        )
      );
    
    if (existingVote) {
      const result = await db
        .update(votes)
        .set({ option })
        .where(eq(votes.id, existingVote.id));
      return result.rowCount ? result.rowCount > 0 : false;
    } else {
      await db
        .insert(votes)
        .values({
          proposal_id: numProposalId,
          address,
          option,
          timestamp: new Date()
        });
      return true;
    }
  }
  
  async getNFTs(): Promise<any[]> {
    const nftRecords = await db
      .select()
      .from(nfts);
      
    // Convert from database schema to application schema
    return nftRecords.map(nft => ({
      id: nft.id.toString(),
      name: nft.name,
      description: nft.description || '',
      ownerAddress: nft.owner_address,
      createdAt: nft.created_at,
      imageUrl: nft.image_url || undefined,
      metadata: nft.metadata as Record<string, any> || {},
      enableZkVerification: nft.enable_zk_verification,
      hideOwnerAddress: nft.hide_owner_address,
      transactionHash: nft.transaction_hash
    }));
  }
  
  async getNFTsByOwner(ownerAddress: string): Promise<any[]> {
    const nftRecords = await db
      .select()
      .from(nfts)
      .where(eq(nfts.owner_address, ownerAddress));
      
    // Convert from database schema to application schema  
    return nftRecords.map(nft => ({
      id: nft.id.toString(),
      name: nft.name,
      description: nft.description || '',
      ownerAddress: nft.owner_address,
      createdAt: nft.created_at,
      imageUrl: nft.image_url || undefined,
      metadata: nft.metadata as Record<string, any> || {},
      enableZkVerification: nft.enable_zk_verification,
      hideOwnerAddress: nft.hide_owner_address,
      transactionHash: nft.transaction_hash
    }));
  }
  
  async getNFT(id: string): Promise<any | undefined> {
    const numId = parseInt(id, 10);
    const [nft] = await db
      .select()
      .from(nfts)
      .where(eq(nfts.id, numId));
      
    if (!nft) return undefined;
    
    // Convert from database schema to application schema
    return {
      id: nft.id.toString(),
      name: nft.name,
      description: nft.description || '',
      ownerAddress: nft.owner_address,
      createdAt: nft.created_at,
      imageUrl: nft.image_url || undefined,
      metadata: nft.metadata as Record<string, any> || {},
      enableZkVerification: nft.enable_zk_verification,
      hideOwnerAddress: nft.hide_owner_address,
      transactionHash: nft.transaction_hash
    };
  }
  
  async mintNFT(nftData: any): Promise<any> {
    // Convert from application schema to database schema
    const dbNft = {
      name: nftData.name,
      description: nftData.description || null,
      owner_address: nftData.ownerAddress,
      created_at: nftData.createdAt || new Date(),
      image_url: nftData.imageUrl || null,
      metadata: nftData.metadata || {},
      enable_zk_verification: nftData.enableZkVerification,
      hide_owner_address: nftData.hideOwnerAddress,
      transaction_hash: nftData.transactionHash
    };
    
    const [newNft] = await db
      .insert(nfts)
      .values(dbNft)
      .returning();
      
    // Convert back to application schema
    return {
      id: newNft.id.toString(),
      name: newNft.name,
      description: newNft.description || '',
      ownerAddress: newNft.owner_address,
      createdAt: newNft.created_at,
      imageUrl: newNft.image_url || undefined,
      metadata: newNft.metadata as Record<string, any> || {},
      enableZkVerification: newNft.enable_zk_verification,
      hideOwnerAddress: newNft.hide_owner_address,
      transactionHash: newNft.transaction_hash
    };
  }
  
  async transferNFT(id: string, fromAddress: string, toAddress: string): Promise<boolean> {
    const numId = parseInt(id, 10);
    const [nft] = await db
      .select()
      .from(nfts)
      .where(eq(nfts.id, numId));
    
    if (!nft || nft.owner_address !== fromAddress) return false;
    
    const result = await db
      .update(nfts)
      .set({ owner_address: toAddress, last_updated: new Date() })
      .where(eq(nfts.id, numId));
      
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  async getNetworkStats(): Promise<NetworkStats> {
    // Get current block height
    const blockHeight = await this.getCurrentBlockHeight();
    
    // Default values
    let difficulty = 1;
    let lastBlockTimestamp = new Date();
    
    // Get latest block for difficulty and timestamp
    if (blockHeight > 0) {
      const [latestBlock] = await db
        .select()
        .from(blocks)
        .orderBy(desc(blocks.height))
        .limit(1);
        
      if (latestBlock) {
        difficulty = latestBlock.difficulty;
        lastBlockTimestamp = latestBlock.timestamp;
      }
    }
    
    // Get count of miners (approximation of "peers")
    const [minersResult] = await db
      .select({ count: sql<number>`count(distinct ${mining_stats.address})` })
      .from(mining_stats)
      .where(eq(mining_stats.is_currently_mining, true));
    const peers = minersResult?.count || 0;
    
    // Get total supply from sum of all wallet balances
    const [supplyResult] = await db
      .select({ sum: sql<string>`sum(${wallets.balance})` })
      .from(wallets);
    const circulatingSupply = Number(supplyResult?.sum || "0");
    
    // Total supply is set to 6,009,420,000,000,000 μPVX per user's requirements
    const totalSupply = 6009420000000000;
    
    // Calculate hash rate based on mining stats
    const [hashRateResult] = await db
      .select({ sum: sql<string>`sum(${mining_stats.current_hash_rate})` })
      .from(mining_stats)
      .where(eq(mining_stats.is_currently_mining, true));
    const totalHashRate = Number(hashRateResult?.sum || "0");
    
    // Format hash rate with appropriate unit
    let hashRate = "0 H/s";
    if (totalHashRate > 0) {
      if (totalHashRate >= 1000000000000) {
        hashRate = `${(totalHashRate / 1000000000000).toFixed(1)} TH/s`;
      } else if (totalHashRate >= 1000000000) {
        hashRate = `${(totalHashRate / 1000000000).toFixed(1)} GH/s`;
      } else if (totalHashRate >= 1000000) {
        hashRate = `${(totalHashRate / 1000000).toFixed(1)} MH/s`;
      } else if (totalHashRate >= 1000) {
        hashRate = `${(totalHashRate / 1000).toFixed(1)} KH/s`;
      } else {
        hashRate = `${totalHashRate.toFixed(1)} H/s`;
      }
    }
    
    return {
      blockHeight,
      blockTime: "~15 sec",
      peers,
      hashRate,
      lastBlockTimestamp,
      difficulty,
      circulatingSupply,
      totalSupply
    };
  }
  
  // Drops and Thringlets methods
  async getSecretDrops(): Promise<any[]> {
    return [...this.secretDrops];
  }

  async getSecretDropByCode(code: string): Promise<any | undefined> {
    return this.secretDrops.find(drop => drop.code === code);
  }

  async createSecretDrop(drop: any): Promise<any> {
    const newDrop = {
      ...drop,
      id: `drop-${this.secretDrops.length + 1}`.padStart(7, '0')
    };
    this.secretDrops.push(newDrop);
    return newDrop;
  }

  async updateSecretDrop(drop: any): Promise<any> {
    const index = this.secretDrops.findIndex(d => d.id === drop.id);
    if (index === -1) throw new Error("Drop not found");
    
    this.secretDrops[index] = drop;
    return drop;
  }

  async getThringletsByOwner(ownerAddress: string): Promise<any[]> {
    return this.thringlets.filter(t => t.ownerAddress === ownerAddress);
  }

  async getThringlet(id: string): Promise<any | undefined> {
    return this.thringlets.find(t => t.id === id);
  }

  async createThringlet(thringlet: any): Promise<any> {
    const newThringlet = {
      ...thringlet,
      id: `thring-${this.thringlets.length + 1}`.padStart(7, '0')
    };
    this.thringlets.push(newThringlet);
    return newThringlet;
  }

  async updateThringlet(thringlet: any): Promise<any> {
    const index = this.thringlets.findIndex(t => t.id === thringlet.id);
    if (index === -1) throw new Error("Thringlet not found");
    
    this.thringlets[index] = thringlet;
    return thringlet;
  }
  
  // Veto Guardian methods implementation
  async getVetoGuardians(): Promise<VetoGuardian[]> {
    try {
      const guardians = await db
        .select()
        .from(veto_guardians)
        .orderBy(desc(veto_guardians.appointed_at));
      
      return guardians;
    } catch (error) {
      console.error("Error fetching veto guardians:", error);
      return this.vetoGuardians; // Fallback to in-memory data
    }
  }
  
  async getVetoGuardian(id: number): Promise<VetoGuardian | undefined> {
    try {
      const [guardian] = await db
        .select()
        .from(veto_guardians)
        .where(eq(veto_guardians.id, id));
      
      return guardian || undefined;
    } catch (error) {
      console.error(`Error fetching veto guardian id ${id}:`, error);
      return this.vetoGuardians.find(g => g.id === id);
    }
  }
  
  async getVetoGuardianByAddress(address: string): Promise<VetoGuardian | undefined> {
    try {
      const [guardian] = await db
        .select()
        .from(veto_guardians)
        .where(eq(veto_guardians.address, address));
      
      return guardian || undefined;
    } catch (error) {
      console.error(`Error fetching veto guardian for address ${address}:`, error);
      return this.vetoGuardians.find(g => g.address === address);
    }
  }
  
  async createVetoGuardian(guardian: InsertVetoGuardian): Promise<VetoGuardian> {
    try {
      const [newGuardian] = await db
        .insert(veto_guardians)
        .values({
          ...guardian,
          veto_count: 0,
          appointed_at: guardian.appointed_at || new Date()
        })
        .returning();
      
      return newGuardian;
    } catch (error) {
      console.error("Error creating veto guardian:", error);
      // Fallback to in-memory implementation
      const newGuardian: VetoGuardian = {
        id: this.vetoGuardians.length + 1,
        address: guardian.address,
        name: guardian.name,
        appointed_at: guardian.appointed_at || new Date(),
        active_until: guardian.active_until,
        is_active: guardian.is_active === undefined ? true : guardian.is_active,
        veto_count: 0,
        description: guardian.description || null
      };
      
      this.vetoGuardians.push(newGuardian);
      return newGuardian;
    }
  }
  
  async updateVetoGuardian(id: number, isActive: boolean): Promise<VetoGuardian | undefined> {
    try {
      const [updatedGuardian] = await db
        .update(veto_guardians)
        .set({ is_active: isActive })
        .where(eq(veto_guardians.id, id))
        .returning();
      
      return updatedGuardian || undefined;
    } catch (error) {
      console.error(`Error updating veto guardian id ${id}:`, error);
      // Fallback to in-memory implementation
      const index = this.vetoGuardians.findIndex(g => g.id === id);
      if (index === -1) return undefined;
      
      this.vetoGuardians[index].is_active = isActive;
      return this.vetoGuardians[index];
    }
  }
  
  async vetoProposal(guardianId: number, proposalId: number, reason: string): Promise<VetoAction | undefined> {
    try {
      // First check if the guardian exists and is active
      const guardian = await this.getVetoGuardian(guardianId);
      if (!guardian || !guardian.is_active) {
        return undefined;
      }
      
      // Check if the proposal exists
      const proposal = await this.getProposal(proposalId.toString());
      if (!proposal) {
        return undefined;
      }
      
      // Create a veto action
      const [vetoAction] = await db
        .insert(veto_actions)
        .values({
          guardian_id: guardianId,
          proposal_id: proposalId,
          reason,
          action_time: new Date()
        })
        .returning();
      
      // Update the proposal status to 'vetoed'
      await db
        .update(proposals)
        .set({ status: 'vetoed' })
        .where(eq(proposals.id, proposalId));
      
      // Increment the guardian's veto count
      await db
        .update(veto_guardians)
        .set({ 
          veto_count: sql`${veto_guardians.veto_count} + 1` 
        })
        .where(eq(veto_guardians.id, guardianId));
      
      return vetoAction;
    } catch (error) {
      console.error(`Error vetoing proposal id ${proposalId}:`, error);
      // Fallback to in-memory implementation
      const guardian = this.vetoGuardians.find(g => g.id === guardianId);
      if (!guardian || !guardian.is_active) return undefined;
      
      // Increment the guardian's veto count
      guardian.veto_count += 1;
      
      // Create a veto action
      const vetoAction: VetoAction = {
        id: this.vetoActions.length + 1,
        guardian_id: guardianId,
        proposal_id: proposalId,
        reason,
        action_time: new Date()
      };
      
      this.vetoActions.push(vetoAction);
      return vetoAction;
    }
  }

  // User Feedback methods implementation
  async getUserFeedback(limit: number = 50): Promise<UserFeedback[]> {
    try {
      const results = await db
        .select()
        .from(user_feedback)
        .orderBy(desc(user_feedback.created_at))
        .limit(limit);
      
      // Convert from database schema to application schema
      return results.map(feedback => ({
        id: feedback.id.toString(),
        userAddress: feedback.user_address,
        feedbackType: feedback.feedback_type,
        content: feedback.content,
        sentiment: feedback.sentiment,
        category: feedback.category || undefined,
        pageUrl: feedback.page_url || undefined,
        browserInfo: feedback.browser_info,
        isResolved: feedback.is_resolved,
        createdAt: feedback.created_at,
        resolvedAt: feedback.resolved_at || undefined,
        resolutionNote: feedback.resolution_note || undefined
      }));
    } catch (error) {
      console.error("Error fetching user feedback:", error);
      // Return cached in-memory data on error
      return this.userFeedback;
    }
  }
  
  async getUserFeedbackById(id: string): Promise<UserFeedback | undefined> {
    try {
      const numId = parseInt(id, 10);
      const [feedback] = await db
        .select()
        .from(user_feedback)
        .where(eq(user_feedback.id, numId));
      
      if (!feedback) return undefined;
      
      // Convert to application schema
      return {
        id: feedback.id.toString(),
        userAddress: feedback.user_address,
        feedbackType: feedback.feedback_type,
        content: feedback.content,
        sentiment: feedback.sentiment,
        category: feedback.category || undefined,
        pageUrl: feedback.page_url || undefined,
        browserInfo: feedback.browser_info,
        isResolved: feedback.is_resolved,
        createdAt: feedback.created_at,
        resolvedAt: feedback.resolved_at || undefined,
        resolutionNote: feedback.resolution_note || undefined
      };
    } catch (error) {
      console.error("Error fetching feedback by ID:", error);
      // Try finding in local cache
      return this.userFeedback.find(f => f.id === id);
    }
  }
  
  async getFeedbackByAddress(address: string, limit: number = 20): Promise<UserFeedback[]> {
    try {
      const results = await db
        .select()
        .from(user_feedback)
        .where(eq(user_feedback.user_address, address))
        .orderBy(desc(user_feedback.created_at))
        .limit(limit);
      
      // Convert from database schema to application schema
      return results.map(feedback => ({
        id: feedback.id.toString(),
        userAddress: feedback.user_address,
        feedbackType: feedback.feedback_type,
        content: feedback.content,
        sentiment: feedback.sentiment,
        category: feedback.category || undefined,
        pageUrl: feedback.page_url || undefined,
        browserInfo: feedback.browser_info,
        isResolved: feedback.is_resolved,
        createdAt: feedback.created_at,
        resolvedAt: feedback.resolved_at || undefined,
        resolutionNote: feedback.resolution_note || undefined
      }));
    } catch (error) {
      console.error("Error fetching feedback by address:", error);
      // Return filtered cached data on error
      return this.userFeedback.filter(f => f.userAddress === address);
    }
  }
  
  async createFeedback(feedbackData: InsertUserFeedback): Promise<UserFeedback> {
    try {
      // Map application schema to database schema
      const dbFeedback = {
        user_address: feedbackData.user_address,
        feedback_type: feedbackData.feedback_type,
        content: feedbackData.content,
        sentiment: feedbackData.sentiment,
        category: feedbackData.category,
        page_url: feedbackData.page_url,
        browser_info: feedbackData.browser_info,
        is_resolved: feedbackData.is_resolved || false,
        resolution_note: feedbackData.resolution_note
      };
      
      const [newFeedback] = await db
        .insert(user_feedback)
        .values(dbFeedback)
        .returning();
      
      // Convert to application schema
      const feedbackResult: UserFeedback = {
        id: newFeedback.id.toString(),
        userAddress: newFeedback.user_address,
        feedbackType: newFeedback.feedback_type,
        content: newFeedback.content,
        sentiment: newFeedback.sentiment,
        category: newFeedback.category || undefined,
        pageUrl: newFeedback.page_url || undefined,
        browserInfo: newFeedback.browser_info,
        isResolved: newFeedback.is_resolved,
        createdAt: newFeedback.created_at,
        resolvedAt: newFeedback.resolved_at || undefined,
        resolutionNote: newFeedback.resolution_note || undefined
      };
      
      // Store in cache for fallback
      this.userFeedback.push(feedbackResult);
      
      return feedbackResult;
    } catch (error) {
      console.error("Error creating feedback:", error);
      
      // Generate a unique ID for the in-memory fallback
      const fallbackId = `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      // Create an in-memory fallback with current timestamp
      const fallbackFeedback: UserFeedback = {
        id: fallbackId,
        userAddress: feedbackData.user_address,
        feedbackType: feedbackData.feedback_type,
        content: feedbackData.content,
        sentiment: feedbackData.sentiment,
        category: feedbackData.category || undefined,
        pageUrl: feedbackData.page_url || undefined,
        browserInfo: feedbackData.browser_info,
        isResolved: feedbackData.is_resolved || false,
        createdAt: new Date(),
        resolvedAt: undefined,
        resolutionNote: feedbackData.resolution_note || undefined
      };
      
      // Store in memory for fallback
      this.userFeedback.push(fallbackFeedback);
      
      return fallbackFeedback;
    }
  }
  
  async updateFeedbackStatus(id: string, isResolved: boolean, resolutionNote?: string): Promise<UserFeedback | undefined> {
    try {
      const numId = parseInt(id, 10);
      const [updatedFeedback] = await db
        .update(user_feedback)
        .set({ 
          is_resolved: isResolved,
          resolution_note: resolutionNote || null,
          resolved_at: isResolved ? new Date() : null
        })
        .where(eq(user_feedback.id, numId))
        .returning();
      
      if (!updatedFeedback) return undefined;
      
      // Convert to application schema
      const result: UserFeedback = {
        id: updatedFeedback.id.toString(),
        userAddress: updatedFeedback.user_address,
        feedbackType: updatedFeedback.feedback_type,
        content: updatedFeedback.content,
        sentiment: updatedFeedback.sentiment,
        category: updatedFeedback.category || undefined,
        pageUrl: updatedFeedback.page_url || undefined,
        browserInfo: updatedFeedback.browser_info,
        isResolved: updatedFeedback.is_resolved,
        createdAt: updatedFeedback.created_at,
        resolvedAt: updatedFeedback.resolved_at || undefined,
        resolutionNote: updatedFeedback.resolution_note || undefined
      };
      
      // Update in cache for fallback
      const index = this.userFeedback.findIndex(f => f.id === id);
      if (index !== -1) {
        this.userFeedback[index] = result;
      }
      
      return result;
    } catch (error) {
      console.error("Error updating feedback status:", error);
      
      // Try updating in local cache
      const index = this.userFeedback.findIndex(f => f.id === id);
      if (index !== -1) {
        this.userFeedback[index] = {
          ...this.userFeedback[index],
          isResolved,
          resolutionNote: resolutionNote || this.userFeedback[index].resolutionNote,
          resolvedAt: isResolved ? new Date() : undefined
        };
        return this.userFeedback[index];
      }
      
      return undefined;
    }
  }
  
  async getFeedbackStats(): Promise<{
    total: number;
    resolved: number;
    unresolved: number;
    byType: Record<string, number>;
    bySentiment: Record<string, number>;
  }> {
    try {
      const [countResult] = await db
        .select({ 
          total: sql<number>`count(*)`,
          resolved: sql<number>`sum(case when ${user_feedback.is_resolved} = true then 1 else 0 end)` 
        })
        .from(user_feedback);
      
      const typeResults = await db
        .select({
          type: user_feedback.feedback_type,
          count: sql<number>`count(*)`
        })
        .from(user_feedback)
        .groupBy(user_feedback.feedback_type);
      
      const sentimentResults = await db
        .select({
          sentiment: user_feedback.sentiment,
          count: sql<number>`count(*)`
        })
        .from(user_feedback)
        .groupBy(user_feedback.sentiment);
      
      // Format type counts
      const byType: Record<string, number> = {};
      typeResults.forEach(row => {
        byType[row.type] = Number(row.count);
      });
      
      // Format sentiment counts
      const bySentiment: Record<string, number> = {};
      sentimentResults.forEach(row => {
        bySentiment[row.sentiment] = Number(row.count);
      });
      
      return {
        total: Number(countResult.total) || 0,
        resolved: Number(countResult.resolved) || 0,
        unresolved: (Number(countResult.total) || 0) - (Number(countResult.resolved) || 0),
        byType,
        bySentiment
      };
    } catch (error) {
      console.error("Error getting feedback stats:", error);
      
      // Generate stats from local cache as fallback
      const total = this.userFeedback.length;
      const resolved = this.userFeedback.filter(f => f.isResolved).length;
      
      // Count by type
      const byType: Record<string, number> = {};
      this.userFeedback.forEach(f => {
        byType[f.feedbackType] = (byType[f.feedbackType] || 0) + 1;
      });
      
      // Count by sentiment
      const bySentiment: Record<string, number> = {};
      this.userFeedback.forEach(f => {
        bySentiment[f.sentiment] = (bySentiment[f.sentiment] || 0) + 1;
      });
      
      return {
        total,
        resolved,
        unresolved: total - resolved,
        byType,
        bySentiment
      };
    }
  }
}

// Initialize db connection
const dbUrl = process.env.DATABASE_URL || '';
const pool = new Pool({ connectionString: dbUrl });
export const db = drizzle(pool, { schema });

export const storage = new DatabaseStorage();