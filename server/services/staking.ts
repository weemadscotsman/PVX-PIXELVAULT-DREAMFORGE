import { IStorage } from "../storage";
import { Stake, Proposal, VoteOption, TransactionType, StakingStats } from "@shared/types";
import { calculateVotingPower } from "../utils/crypto";

export class StakingService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Create a new stake
   */
  async createStake(address: string, amount: number, duration: number): Promise<Stake> {
    console.log(`[StakingService] createStake called for address: ${address}, amount: ${amount}, duration: ${duration} days.`);
    // Check if wallet has sufficient balance
    const balance = await this.storage.getWalletBalance(address);
    console.log(`[StakingService] Wallet ${address} balance: ${balance}. Staking amount: ${amount}.`);
    if (balance < amount) {
      console.error(`[StakingService] Insufficient balance for ${address} to stake ${amount}. Balance: ${balance}`);
      throw new Error("Insufficient balance for staking");
    }
    
    // Validate duration (must be at least 30 days)
    if (duration < 30) {
      console.error(`[StakingService] Invalid staking duration for ${address}: ${duration} days. Minimum is 30.`);
      throw new Error("Minimum staking duration is 30 days");
    }
    
    console.log(`[StakingService] Balance and duration validated for ${address}.`);
    // Calculate voting power based on amount and duration
    const votingPower = calculateVotingPower(amount, duration);
    
    // Create a new stake
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 24 * 60 * 60 * 1000);
    
    const stake: Omit<Stake, 'id'> = {
      address,
      amount,
      startTime,
      endTime,
      duration,
      votingPower,
      isActive: true
    };
    
    // Create a transaction for the stake
    const stakeTx = {
      type: TransactionType.STAKE,
      fromAddress: address,
      toAddress: "zk_PVX:staking_pool", // Consider making this a constant
      amount,
      timestamp: new Date(),
      note: `Staked ${amount} for ${duration} days`
    };
    console.log(`[StakingService] Creating STAKE transaction for ${address}:`, { type: stakeTx.type, amount: stakeTx.amount, note: stakeTx.note });
    await this.storage.createTransaction(stakeTx);
    
    // Update wallet balance
    const newBalance = balance - amount;
    console.log(`[StakingService] Updating wallet ${address} balance from ${balance} to ${newBalance}.`);
    await this.storage.updateWalletBalance(address, newBalance);
    
    const createdStake = await this.storage.createStake(stake);
    console.log(`[StakingService] Stake created successfully for ${address} with ID: ${createdStake.id}, Voting Power: ${votingPower}`);
    return createdStake;
  }

  /**
   * Get active stakes for an address
   */
  async getStakes(address: string): Promise<Stake[]> {
    console.log(`[StakingService] getStakes called for address: ${address}`);
    const stakes = await this.storage.getStakes(address);
    console.log(`[StakingService] Found ${stakes.length} stakes for address ${address}.`);
    return stakes;
  }

  /**
   * Get staking stats for an address
   */
  async getStakingStats(address: string): Promise<StakingStats> {
    console.log(`[StakingService] getStakingStats called for address: ${address}`);
    const stakes = await this.storage.getStakes(address); // getStakes already logs
    
    let totalStaked = 0;
    let totalVotingPower = 0;
    
    for (const stake of stakes) {
      if (stake.isActive) {
        totalStaked += stake.amount;
        totalVotingPower += stake.votingPower;
      }
    }
    
    const estimatedYield = "8.2"; // Placeholder, as noted in original code
    const stats: StakingStats = { totalStaked, votingPower: totalVotingPower, estimatedYield };
    console.log(`[StakingService] Calculated staking stats for ${address}:`, stats);
    return stats;
  }

  /**
   * Unstake tokens
   */
  async unstake(stakeId: string): Promise<boolean> {
    console.log(`[StakingService] unstake called for stakeId: ${stakeId}`);
    // Assuming storage.unstake handles logging of success/failure or throws error
    const result = await this.storage.unstake(stakeId);
    console.log(`[StakingService] Unstake operation for stakeId ${stakeId} result: ${result}`);
    return result;
  }

  /**
   * Get active governance proposals
   */
  async getProposals(): Promise<Proposal[]> {
    console.log(`[StakingService] getProposals called.`);
    try {
      const proposals = await this.storage.getProposals();
      console.log(`[StakingService] Found ${proposals.length} proposals from storage.`);
      return proposals;
    } catch (error) {
      console.error("[StakingService] Error getting proposals:", error.message);
      // Fallback logic as in original code
      const fallbackProposals = [{
        id: "1", title: "PVX Improvement Proposal #1", description: "Allocate 5% of treasury to security audits",
        creatorAddress: "0x58a42d5c19c6066dda35e274f7f08aaca541c1b0",
        createTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'active' as 'active', yesVotes: "6750000", noVotes: "2340000", abstainVotes: "890000",
        quorum: "8000000", voteCount: 126, ttl: 21
      }];
      console.warn(`[StakingService] Returning default fallback proposals due to error.`);
      return fallbackProposals;
    }
  }

  /**
   * Get user votes
   */
  async getVotes(address: string): Promise<{proposalId: string, option: VoteOption}[]> {
    console.log(`[StakingService] getVotes called for address: ${address}`);
    const votes = await this.storage.getVotes(address);
    console.log(`[StakingService] Found ${votes.length} votes for address ${address}.`);
    return votes;
  }

  /**
   * Vote on a governance proposal
   */
  async vote(address: string, proposalId: string, option: VoteOption): Promise<boolean> {
    console.log(`[StakingService] vote called by address: ${address} for proposalId: ${proposalId}, option: ${option}`);
    const proposal = await this.storage.getProposal(proposalId);
    if (!proposal) {
      console.error(`[StakingService] Vote failed: Proposal ${proposalId} not found.`);
      throw new Error("Proposal not found");
    }
    
    if (proposal.status !== "active" || new Date() > proposal.endTime) {
      console.error(`[StakingService] Vote failed: Proposal ${proposalId} is not active or has ended. Status: ${proposal.status}, EndTime: ${proposal.endTime}`);
      throw new Error("Proposal is no longer active");
    }
    
    const stats = await this.getStakingStats(address); // getStakingStats already logs
    if (stats.votingPower <= 0) {
      console.error(`[StakingService] Vote failed: Address ${address} has insufficient voting power (${stats.votingPower}).`);
      throw new Error("You need staked tokens to vote");
    }
    
    console.log(`[StakingService] All validations passed for vote by ${address} on proposal ${proposalId}. Recording vote...`);
    const voteResult = await this.storage.vote(address, proposalId, option);
    console.log(`[StakingService] Vote by ${address} on proposal ${proposalId} recorded with result: ${voteResult}`);
    return voteResult;
  }

  /**
   * Create a governance proposal
   */
  async createProposal(
    address: string, 
    title: string, 
    description: string, 
    ttl: number
  ): Promise<Proposal> {
    // Verify that the user has sufficient voting power to create a proposal
    const stats = await this.getStakingStats(address);
    
    // Require minimum 1,000 voting power
    if (stats.votingPower < 1000) {
      throw new Error("Minimum 1,000 voting power required to create proposals");
    }
    
    // Validate TTL (must be between 1 and 30 days)
    if (ttl < 1 || ttl > 30) {
      throw new Error("Proposal duration must be between 1 and 30 days");
    }
    
    // Create a new proposal
    const createTime = new Date();
    const endTime = new Date(createTime.getTime() + ttl * 24 * 60 * 60 * 1000);
    
    const proposal: Omit<Proposal, 'id'> = {
      title,
      description,
      creatorAddress: address,
      createTime,
      endTime,
      status: "active",
      yesVotes: 0,
      noVotes: 0,
      abstainVotes: 0,
      quorum: 1000, // Minimum votes needed to be valid
      voteCount: 0,
      ttl
    };
    
    // Create a transaction record for the proposal creation
    await this.storage.createTransaction({
      type: TransactionType.GOVERNANCE_PROPOSAL,
      fromAddress: address,
      toAddress: "zk_PVX:governance",
      amount: 0,
      timestamp: new Date(),
      note: `Created proposal: ${title}`
    });
    
    return this.storage.createProposal(proposal);
  }
}
