import { Request, Response } from 'express';
import crypto from 'crypto';
import { memBlockchainStorage } from '../mem-blockchain';
import { broadcastTransaction } from '../utils/websocket';
import { PVX_GOVERNANCE_ADDRESS } from '../utils/constants';
import { generateRandomHash } from '../utils/crypto';

// Define TransactionType as string literals since the enum is not available
const TransactionType = {
  TRANSFER: 'TRANSFER',
  MINING_REWARD: 'MINING_REWARD',
  STAKING_REWARD: 'STAKING_REWARD',
  AIRDROP: 'AIRDROP',
  NFT_MINT: 'NFT_MINT',
  BADGE_AWARD: 'BADGE_AWARD',
  GOVERNANCE_VOTE: 'GOVERNANCE_VOTE',
  GOVERNANCE_PROPOSAL: 'GOVERNANCE_PROPOSAL'
};

// Proposal status enum
enum ProposalStatus {
  ACTIVE = 'active',
  PASSED = 'passed',
  REJECTED = 'rejected',
  EXECUTED = 'executed'
}

// Vote type enum
enum VoteType {
  FOR = 'for',
  AGAINST = 'against',
  ABSTAIN = 'abstain'
}

// Governance proposal interface
interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  createdAt: number;
  endTime: number;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  minimumVotingPower: number;
  category: 'PROTOCOL' | 'TREASURY' | 'PARAMETER' | 'SOCIAL';
  parameterChanges?: {
    paramName: string;
    currentValue: string;
    proposedValue: string;
  }[];
  voters: {
    address: string;
    voteType: VoteType;
    votingPower: number;
    timestamp: number;
  }[];
  executionTransactionHash?: string;
}

// In-memory storage for proposals
const governanceProposals: Proposal[] = [
  {
    id: 'gov_001',
    title: 'Increase Staking Rewards',
    description: 'Proposal to increase staking rewards by 5% for all pools to incentivize network participation.',
    proposer: 'PVX_4cf911a2bfc8c35d91d05346f0f2cd96',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    endTime: Date.now() + 4 * 24 * 60 * 60 * 1000, // 4 days from now
    status: ProposalStatus.ACTIVE,
    votesFor: 25000,
    votesAgainst: 10000,
    votesAbstain: 5000,
    minimumVotingPower: 1000,
    category: 'PARAMETER',
    parameterChanges: [
      {
        paramName: 'stakingRewardMultiplier',
        currentValue: '1.0',
        proposedValue: '1.05'
      }
    ],
    voters: [
      {
        address: 'PVX_9703f23ff29015d96de825c2309ef249',
        voteType: VoteType.FOR,
        votingPower: 15000,
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000
      },
      {
        address: 'PVX_f5ba480b7db6010eecb453eca8e67ff0',
        voteType: VoteType.FOR,
        votingPower: 10000,
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000
      },
      {
        address: 'PVX_1e1ee32c2770a6af3ca119759c539907',
        voteType: VoteType.AGAINST,
        votingPower: 10000,
        timestamp: Date.now() - 12 * 60 * 60 * 1000
      },
      {
        address: 'PVX_8d7f1d18e22434e2f3fcb90098c5c898',
        voteType: VoteType.ABSTAIN,
        votingPower: 5000,
        timestamp: Date.now() - 6 * 60 * 60 * 1000
      }
    ]
  },
  {
    id: 'gov_002',
    title: 'Community Development Fund',
    description: 'Create a community development fund with 1% of all transaction fees to support ecosystem growth and developer initiatives.',
    proposer: 'PVX_1e1ee32c2770a6af3ca119759c539907',
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    endTime: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days from now
    status: ProposalStatus.ACTIVE,
    votesFor: 35000,
    votesAgainst: 15000,
    votesAbstain: 2000,
    minimumVotingPower: 1000,
    category: 'TREASURY',
    voters: [
      {
        address: 'PVX_4cf911a2bfc8c35d91d05346f0f2cd96',
        voteType: VoteType.FOR,
        votingPower: 20000,
        timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000
      },
      {
        address: 'PVX_9703f23ff29015d96de825c2309ef249',
        voteType: VoteType.FOR,
        votingPower: 15000,
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000
      },
      {
        address: 'PVX_f5ba480b7db6010eecb453eca8e67ff0',
        voteType: VoteType.AGAINST,
        votingPower: 15000,
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000
      },
      {
        address: 'PVX_8d7f1d18e22434e2f3fcb90098c5c898',
        voteType: VoteType.ABSTAIN,
        votingPower: 2000,
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000
      }
    ]
  }
];

/**
 * Get all governance proposals
 */
export const getAllProposals = async (req: Request, res: Response): Promise<void> => {
  console.log(`[GovController] getAllProposals: Request received ${req.method} ${req.originalUrl}`);
  try {
    const sanitizedProposals = governanceProposals.map(({ voters, ...rest }) => ({
      ...rest,
      voterCount: voters.length
    }));
    console.log(`[GovController] getAllProposals: Returning ${sanitizedProposals.length} proposals (sanitized).`);
    res.status(200).json(sanitizedProposals);
  } catch (error) {
    console.error('[GovController] getAllProposals: Error getting governance proposals:', error.message);
    res.status(500).json({ error: 'Failed to fetch governance proposals' });
  }
};

/**
 * Get a specific proposal by ID
 */
export const getProposalById = async (req: Request, res: Response): Promise<void> => {
  const { proposalId } = req.params;
  console.log(`[GovController] getProposalById: Request received ${req.method} ${req.originalUrl} for ProposalID: ${proposalId}`);
  try {
    const proposal = governanceProposals.find(p => p.id === proposalId);
    
    if (!proposal) {
      console.warn(`[GovController] getProposalById: Proposal with ID ${proposalId} not found.`);
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }
    console.log(`[GovController] getProposalById: Proposal ${proposalId} found: "${proposal.title}". Sanitizing voter data.`);
    const sanitizedProposal = {
      ...proposal,
      voters: proposal.voters.map(({ address, ...rest }) => ({
        ...rest,
        // Only send first and last 4 characters of address
        address: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
      }))
    };
    
    console.log(`[GovController] getProposalById: Sending 200 OK response for proposal ${proposalId}.`);
    res.status(200).json(sanitizedProposal);
  } catch (error) {
    console.error(`[GovController] getProposalById: Error getting proposal by ID ${proposalId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
};

/**
 * Create a new governance proposal
 */
export const createProposal = async (req: Request, res: Response): Promise<void> => {
  console.log(`[GovController] createProposal: Request received ${req.method} ${req.originalUrl}`);
  try {
    const { title, description, category, proposerAddress, endTimeInDays, minimumVotingPower, parameterChanges } = req.body;
    console.log(`[GovController] createProposal: Body - title="${title}", category=${category}, proposer=${proposerAddress}, endTimeDays=${endTimeInDays}`);

    if (!title || !description || !category || !proposerAddress || !endTimeInDays) {
      console.warn(`[GovController] createProposal: Missing required fields. Title: ${title}, Category: ${category}, Proposer: ${proposerAddress}, EndTimeDays: ${endTimeInDays}`);
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    
    console.log(`[GovController] createProposal: Verifying proposer wallet ${proposerAddress}.`);
    const wallet = await memBlockchainStorage.getWalletByAddress(proposerAddress);
    if (!wallet) {
      console.warn(`[GovController] createProposal: Proposer wallet ${proposerAddress} not found.`);
      res.status(404).json({ error: 'Proposer wallet not found' });
      return;
    }
    
    console.log(`[GovController] createProposal: Checking voting power for ${proposerAddress}.`);
    const activeStakes = await memBlockchainStorage.getActiveStakesByAddress(proposerAddress);
    const totalStaked = activeStakes.reduce((sum, stake) => sum + parseFloat(stake.amount), 0);
    const minVotingPowerRequired = 10000; // Example value
    
    if (totalStaked < minVotingPowerRequired) {
      console.warn(`[GovController] createProposal: Insufficient voting power for ${proposerAddress}. Staked: ${totalStaked}, Required: ${minVotingPowerRequired}`);
      res.status(400).json({ error: `Insufficient voting power to create a proposal. Minimum ${minVotingPowerRequired} μPVX staked required.` });
      return;
    }
    console.log(`[GovController] createProposal: Voting power sufficient for ${proposerAddress}.`);
    
    const proposalId = `gov_${crypto.randomBytes(4).toString('hex')}`;
    const now = Date.now();
    
    // Create the new proposal
    const newProposal: Proposal = {
      id: proposalId,
      title,
      description,
      proposer: proposerAddress,
      createdAt: now,
      endTime: now + (endTimeInDays * 24 * 60 * 60 * 1000), // Convert days to milliseconds
      status: ProposalStatus.ACTIVE,
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0,
      minimumVotingPower: minimumVotingPower || 1000, // Default to 1000 μPVX if not specified
      category: category as any, // Cast to the correct type
      parameterChanges,
      voters: []
    };
    
    // Add the proposal to the list
    governanceProposals.push(newProposal);
    console.log(`[GovController] createProposal: New proposal ${proposalId} ("${title}") added to in-memory list.`);
    
    const txHash = crypto.createHash('sha256')
      .update(`proposal_create_${proposalId}_${proposerAddress}_${now}`)
      .digest('hex');
    
    const transaction = {
      hash: txHash,
      type: TransactionType.GOVERNANCE_PROPOSAL,
      from: proposerAddress,
      to: PVX_GOVERNANCE_ADDRESS,
      amount: 0, // No tokens transferred for proposal creation
      timestamp: now,
      nonce: Math.floor(Math.random() * 100000),
      signature: generateRandomHash(),
      status: 'confirmed',
      metadata: {
        action: 'create_proposal',
        proposalId,
        title
      }
    };
    
    await memBlockchainStorage.createTransaction(transaction); // Assumes logs
    console.log(`[GovController] createProposal: GOVERNANCE_PROPOSAL transaction ${txHash} created in memory for proposal ${proposalId}.`);
    
    try {
      broadcastTransaction(transaction);
      console.log(`[GovController] createProposal: Broadcasted GOVERNANCE_PROPOSAL transaction ${txHash}.`);
    } catch (err) {
      console.error('[GovController] createProposal: Error broadcasting proposal creation transaction:', err.message);
    }
    
    const responsePayload = { success: true, message: 'Governance proposal created successfully', proposal: newProposal, transactionHash: txHash };
    console.log(`[GovController] createProposal: Sending 201 Created response for proposal ${proposalId}.`, { id: newProposal.id, title: newProposal.title });
    res.status(201).json(responsePayload);
    
  } catch (error) {
    console.error(`[GovController] createProposal: Error creating proposal - Title: "${req.body.title}", Proposer: ${req.body.proposerAddress}:`, error.message);
    res.status(500).json({ error: 'Failed to create governance proposal' });
  }
};

/**
 * Vote on a governance proposal
 */
export const voteOnProposal = async (req: Request, res: Response): Promise<void> => {
  const { proposalId } = req.params;
  const { voterAddress, voteType } = req.body;
  console.log(`[GovController] voteOnProposal: Request received ${req.method} ${req.originalUrl} for ProposalID: ${proposalId}. Body - Voter: ${voterAddress}, VoteType: ${voteType}`);
  try {
    if (!proposalId || !voterAddress || !voteType) {
      console.warn(`[GovController] voteOnProposal: Missing required fields. ProposalID: ${proposalId}, Voter: ${voterAddress}, VoteType: ${voteType}`);
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    
    console.log(`[GovController] voteOnProposal: Finding proposal ${proposalId}.`);
    const proposal = governanceProposals.find(p => p.id === proposalId);
    if (!proposal) {
      console.warn(`[GovController] voteOnProposal: Proposal ${proposalId} not found.`);
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }
    
    if (proposal.status !== ProposalStatus.ACTIVE) {
      console.warn(`[GovController] voteOnProposal: Proposal ${proposalId} is not active. Status: ${proposal.status}`);
      res.status(400).json({ error: 'This proposal is no longer active' });
      return;
    }
    
    if (proposal.endTime < Date.now()) {
      console.warn(`[GovController] voteOnProposal: Voting period for proposal ${proposalId} has ended. EndTime: ${new Date(proposal.endTime).toISOString()}`);
      res.status(400).json({ error: 'Voting period for this proposal has ended' });
      return;
    }
    
    console.log(`[GovController] voteOnProposal: Verifying voter wallet ${voterAddress}.`);
    const wallet = await memBlockchainStorage.getWalletByAddress(voterAddress);
    if (!wallet) {
      console.warn(`[GovController] voteOnProposal: Voter wallet ${voterAddress} not found.`);
      res.status(404).json({ error: 'Voter wallet not found' });
      return;
    }
    
    const existingVote = proposal.voters.find(v => v.address === voterAddress);
    if (existingVote) {
      console.warn(`[GovController] voteOnProposal: Voter ${voterAddress} has already voted on proposal ${proposalId}.`);
      res.status(400).json({ error: 'You have already voted on this proposal' });
      return;
    }
    
    console.log(`[GovController] voteOnProposal: Calculating voting power for ${voterAddress}.`);
    const activeStakes = await memBlockchainStorage.getActiveStakesByAddress(voterAddress);
    const votingPower = activeStakes.reduce((sum, stake) => sum + parseFloat(stake.amount), 0);
    
    if (votingPower < proposal.minimumVotingPower) {
      console.warn(`[GovController] voteOnProposal: Insufficient voting power for ${voterAddress} on proposal ${proposalId}. Power: ${votingPower}, Required: ${proposal.minimumVotingPower}`);
      res.status(400).json({ error: `Insufficient voting power. Minimum ${proposal.minimumVotingPower} μPVX staked required.` });
      return;
    }
    console.log(`[GovController] voteOnProposal: Voter ${voterAddress} has sufficient voting power (${votingPower}). Recording vote.`);
    
    const now = Date.now();
    proposal.voters.push({
      address: voterAddress,
      voteType: voteType as VoteType,
      votingPower,
      timestamp: now
    });
    
    // Update vote counts
    switch (voteType as VoteType) { // Cast to ensure type safety
      case VoteType.FOR: proposal.votesFor += votingPower; break;
      case VoteType.AGAINST: proposal.votesAgainst += votingPower; break;
      case VoteType.ABSTAIN: proposal.votesAbstain += votingPower; break;
      default:
        console.warn(`[GovController] voteOnProposal: Invalid vote type "${voteType}" for proposal ${proposalId} by ${voterAddress}.`);
        res.status(400).json({ error: 'Invalid vote type' });
        return;
    }
    console.log(`[GovController] voteOnProposal: Vote counts for proposal ${proposalId} updated: For=${proposal.votesFor}, Against=${proposal.votesAgainst}, Abstain=${proposal.votesAbstain}`);
    
    const txHash = crypto.createHash('sha256')
      .update(`proposal_vote_${proposalId}_${voterAddress}_${now}`)
      .digest('hex');
    
    const transaction = {
      hash: txHash,
      type: TransactionType.GOVERNANCE_VOTE,
      from: voterAddress,
      to: PVX_GOVERNANCE_ADDRESS,
      amount: 0, // No tokens transferred for voting
      timestamp: now,
      nonce: Math.floor(Math.random() * 100000),
      signature: generateRandomHash(),
      status: 'confirmed',
      metadata: {
        action: 'vote',
        proposalId,
        voteType,
        votingPower
      }
    };
    
    await memBlockchainStorage.createTransaction(transaction); // Assumes logs
    console.log(`[GovController] voteOnProposal: GOVERNANCE_VOTE transaction ${txHash} created in memory for proposal ${proposalId}.`);
    
    try {
      broadcastTransaction(transaction);
      console.log(`[GovController] voteOnProposal: Broadcasted GOVERNANCE_VOTE transaction ${txHash}.`);
    } catch (err) {
      console.error('[GovController] voteOnProposal: Error broadcasting vote transaction:', err.message);
    }
    
    const responsePayload = { success: true, message: `Vote cast successfully: ${voteType}`, votingPower, transactionHash: txHash };
    console.log(`[GovController] voteOnProposal: Sending 200 OK response for vote on proposal ${proposalId} by ${voterAddress}.`, responsePayload);
    res.status(200).json(responsePayload);
    
  } catch (error) {
    console.error(`[GovController] voteOnProposal: Error processing vote for ProposalID: ${req.params.proposalId}, Voter: ${req.body.voterAddress}:`, error.message);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
};

/**
 * Execute a passed proposal
 */
export const executeProposal = async (req: Request, res: Response): Promise<void> => {
  const { proposalId } = req.params;
  const { executorAddress } = req.body;
  console.log(`[GovController] executeProposal: Request received ${req.method} ${req.originalUrl} for ProposalID: ${proposalId}. Executor: ${executorAddress}`);
  try {
    if (!proposalId || !executorAddress) {
      console.warn(`[GovController] executeProposal: Missing required fields. ProposalID: ${proposalId}, Executor: ${executorAddress}`);
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    
    console.log(`[GovController] executeProposal: Finding proposal ${proposalId}.`);
    const proposal = governanceProposals.find(p => p.id === proposalId);
    if (!proposal) {
      console.warn(`[GovController] executeProposal: Proposal ${proposalId} not found.`);
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }
    
    if (proposal.status !== ProposalStatus.ACTIVE) {
      console.warn(`[GovController] executeProposal: Proposal ${proposalId} is not active for execution. Status: ${proposal.status}`);
      res.status(400).json({ error: 'This proposal has already been processed or is not active' });
      return;
    }
    
    if (proposal.endTime > Date.now()) {
      console.warn(`[GovController] executeProposal: Voting period for proposal ${proposalId} has not ended. EndTime: ${new Date(proposal.endTime).toISOString()}`);
      res.status(400).json({ error: 'Voting period for this proposal has not ended yet' });
      return;
    }
    
    console.log(`[GovController] executeProposal: Verifying executor wallet ${executorAddress}.`);
    const wallet = await memBlockchainStorage.getWalletByAddress(executorAddress);
    if (!wallet) {
      console.warn(`[GovController] executeProposal: Executor wallet ${executorAddress} not found.`);
      res.status(404).json({ error: 'Executor wallet not found' });
      return;
    }
    
    console.log(`[GovController] executeProposal: Determining outcome for proposal ${proposalId}. Votes For: ${proposal.votesFor}, Votes Against: ${proposal.votesAgainst}`);
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const isPassed = totalVotes > 0 && proposal.votesFor > proposal.votesAgainst;
    
    proposal.status = isPassed ? ProposalStatus.PASSED : ProposalStatus.REJECTED;
    console.log(`[GovController] executeProposal: Proposal ${proposalId} outcome: ${proposal.status}.`);
    
    const now = Date.now();
    const txHash = crypto.createHash('sha256')
      .update(`proposal_execute_${proposalId}_${executorAddress}_${now}`)
      .digest('hex');
    
    const transaction = {
      hash: txHash,
      type: TransactionType.GOVERNANCE,
      from: executorAddress,
      to: PVX_GOVERNANCE_ADDRESS,
      amount: 0, // No tokens transferred for execution
      timestamp: now,
      nonce: Math.floor(Math.random() * 100000),
      signature: generateRandomHash(),
      status: 'confirmed',
      metadata: {
        action: 'execute_proposal',
        proposalId,
        result: isPassed ? 'passed' : 'rejected'
      }
    };
    
    await memBlockchainStorage.createTransaction(transaction); // Assumes logs
    console.log(`[GovController] executeProposal: GOVERNANCE transaction ${txHash} for proposal execution created in memory.`);
    
    proposal.executionTransactionHash = txHash;
    
    if (isPassed) {
      console.log(`[GovController] executeProposal: Proposal ${proposalId} passed. Implementing changes...`);
      await implementProposalChanges(proposal); // Logs internally
      proposal.status = ProposalStatus.EXECUTED; // Update status after implementation
      console.log(`[GovController] executeProposal: Proposal ${proposalId} status updated to EXECUTED.`);
    }
    
    try {
      broadcastTransaction(transaction);
      console.log(`[GovController] executeProposal: Broadcasted GOVERNANCE transaction ${txHash} for proposal execution.`);
    } catch (err) {
      console.error('[GovController] executeProposal: Error broadcasting proposal execution transaction:', err.message);
    }
    
    const responsePayload = {
      success: true, message: `Proposal ${isPassed ? 'passed' : 'rejected'} and ${isPassed ? 'executed' : 'recorded'} successfully`,
      result: isPassed ? 'passed' : 'rejected', transactionHash: txHash
    };
    console.log(`[GovController] executeProposal: Sending 200 OK for proposal ${proposalId}.`, responsePayload);
    res.status(200).json(responsePayload);
    
  } catch (error) {
    console.error(`[GovController] executeProposal: Error executing proposal ${req.params.proposalId}:`, error.message);
    res.status(500).json({ error: 'Failed to execute proposal' });
  }
};

/**
 * Implement changes from a passed proposal
 */
async function implementProposalChanges(proposal: Proposal): Promise<void> {
  console.log(`[GovControllerInternal] implementProposalChanges for proposal ID: ${proposal.id}, Title: "${proposal.title}"`);
  
  switch (proposal.category) {
    case 'PARAMETER':
      if (proposal.parameterChanges) {
        for (const change of proposal.parameterChanges) {
          console.log(`[GovControllerInternal] PARAM_CHANGE: Param: ${change.paramName}, Old: ${change.currentValue}, New: ${change.proposedValue}`);
          // Actual implementation logic would go here
        }
      } else {
        console.log(`[GovControllerInternal] PARAM_CHANGE: No parameter changes specified for proposal ${proposal.id}.`);
      }
      break;
    case 'TREASURY':
      console.log(`[GovControllerInternal] TREASURY_ACTION: For proposal "${proposal.title}". Details: ${proposal.description}`);
      // Actual treasury action logic
      break;
    case 'PROTOCOL':
      console.log(`[GovControllerInternal] PROTOCOL_CHANGE: For proposal "${proposal.title}". Details: ${proposal.description}`);
      // Actual protocol change logic
      break;
    case 'SOCIAL':
      console.log(`[GovControllerInternal] SOCIAL_DIRECTIVE: For proposal "${proposal.title}". No on-chain action typically needed.`);
      break;
    default:
      console.warn(`[GovControllerInternal] Unknown proposal category for ${proposal.id}: ${proposal.category}`);
  }
  console.log(`[GovControllerInternal] Finished 'implementing' changes for proposal ${proposal.id}.`);
}

/**
 * Get governance stats
 */
export const getGovernanceStats = async (req: Request, res: Response): Promise<void> => {
  console.log(`[GovController] getGovernanceStats: Request received ${req.method} ${req.originalUrl}`);
  try {
    const activeProposals = governanceProposals.filter(p => p.status === ProposalStatus.ACTIVE).length;
    const passedProposals = governanceProposals.filter(p => p.status === ProposalStatus.PASSED || p.status === ProposalStatus.EXECUTED).length;
    const rejectedProposals = governanceProposals.filter(p => p.status === ProposalStatus.REJECTED).length;
    
    const totalVotes = governanceProposals.reduce((sum, proposal) => sum + proposal.voters.length, 0);
    const totalVotingPower = governanceProposals.reduce((sum, proposal) => sum + proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain, 0);
    
    const stats = {
      activeProposals, passedProposals, rejectedProposals,
      totalProposals: governanceProposals.length, totalVotes, totalVotingPower
    };
    console.log(`[GovController] getGovernanceStats: Calculated stats - `, stats);
    res.status(200).json(stats);
  } catch (error) {
    console.error('[GovController] getGovernanceStats: Error getting governance stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch governance stats' });
  }
};

/**
 * Get user voting power
 */
export const getUserVotingPower = async (req: Request, res: Response): Promise<void> => {
  const { walletAddress } = req.params;
  console.log(`[GovController] getUserVotingPower: Request received ${req.method} ${req.originalUrl} for WalletAddress: ${walletAddress}`);
  try {
    console.log(`[GovController] getUserVotingPower: Verifying wallet ${walletAddress}.`);
    const wallet = await memBlockchainStorage.getWalletByAddress(walletAddress);
    if (!wallet) {
      console.warn(`[GovController] getUserVotingPower: Wallet ${walletAddress} not found.`);
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }
    
    console.log(`[GovController] getUserVotingPower: Calculating voting power for ${walletAddress}.`);
    const activeStakes = await memBlockchainStorage.getActiveStakesByAddress(walletAddress);
    const votingPower = activeStakes.reduce((sum, stake) => sum + parseFloat(stake.amount), 0);
    console.log(`[GovController] getUserVotingPower: Voting power for ${walletAddress} is ${votingPower}.`);
    
    const votingHistory = governanceProposals.reduce((history, proposal) => {
      const vote = proposal.voters.find(v => v.address === walletAddress);
      if (vote) {
        history.push({
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          voteType: vote.voteType,
          votingPower: vote.votingPower,
          timestamp: vote.timestamp
        });
      }
      return history;
    }, [] as any[]);
    
    res.status(200).json({
      address: walletAddress,
      currentVotingPower: votingPower,
      votingHistory
    });
  } catch (error) {
    console.error('Error getting user voting power:', error);
    res.status(500).json({ error: 'Failed to fetch user voting power' });
  }
};