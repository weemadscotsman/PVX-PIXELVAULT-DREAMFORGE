import { Request, Response } from 'express';
import crypto from 'crypto';
import { memBlockchainStorage } from '../mem-blockchain';
import * as cryptoUtils from '../utils/crypto';
import * as passphraseUtils from '../utils/passphrase';
import { StakeRecord } from '../types';
import { checkStakingBadges } from '../controllers/badgeController';
import { 
  broadcastTransaction, 
  broadcastStakingUpdate, 
  broadcastWalletUpdate, 
  broadcastStatusUpdate 
} from '../utils/websocket';
import { walletDao } from '../database/walletDao';
import { db } from '../db';

/**
 * Start staking
 * POST /api/stake/start
 */
export const startStaking = async (req: Request, res: Response) => {
  console.log(`[StakeController] startStaking: Request received ${req.method} ${req.originalUrl}`);
  try {
    const { address, amount, poolId, passphrase } = req.body; // Passphrase not logged for security
    console.log(`[StakeController] startStaking: Body - address=${address}, amount=${amount}, poolId=${poolId}`);

    if (!address || !amount || !poolId || !passphrase) {
      console.warn(`[StakeController] startStaking: Missing required fields. Address: ${address}, Amount: ${amount}, PoolID: ${poolId}, Passphrase: ${passphrase ? 'present' : 'missing'}`);
      return res.status(400).json({ error: 'Address, amount, pool ID, and passphrase are required' });
    }
    
    console.log(`[StakeController] startStaking: Verifying wallet ${address}.`);
    const wallet = await memBlockchainStorage.getWalletByAddress(address); // Assumes memBlockchainStorage logs if needed
    if (!wallet) {
      console.warn(`[StakeController] startStaking: Wallet ${address} not found.`);
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    console.log(`[StakeController] startStaking: Verifying passphrase for wallet ${address}.`);
    const isPassphraseValid = passphraseUtils.verifyPassphrase(
      passphrase,
      wallet.passphraseSalt,
      wallet.passphraseHash
    );
    
    // Log verification outcome (already done by passphraseUtils or should be)
    // For now, adding a simple log here.
    console.log(`[StakeController] startStaking: Passphrase validation for ${address} result: ${isPassphraseValid}`);
    
    if (!isPassphraseValid) {
      if (process.env.NODE_ENV !== 'production' && passphraseUtils.isKnownTestWallet(address)) {
        console.log(`[StakeController] startStaking: DEV MODE - Bypassing passphrase check for known test wallet ${address}.`);
      } else {
        console.warn(`[StakeController] startStaking: Invalid passphrase for wallet ${address}.`);
        return res.status(401).json({ error: 'Invalid passphrase' });
      }
    }
    
    console.log(`[StakeController] startStaking: Passphrase verified for ${address}. Checking balance.`);
    if (BigInt(wallet.balance) < BigInt(amount)) {
      console.warn(`[StakeController] startStaking: Insufficient balance for wallet ${address}. Balance: ${wallet.balance}, Amount: ${amount}`);
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    console.log(`[StakeController] startStaking: Balance sufficient for ${address}.`);
    
    console.log(`[StakeController] Attempting to find staking pool with ID: '${poolId}'`);
    const pool = await memBlockchainStorage.getStakingPoolById(poolId);

    if (!pool) {
      console.error(`[StakeController] Staking pool with ID: '${poolId}' not found in memBlockchainStorage.`);
      const allPools = await memBlockchainStorage.getStakingPools();
      console.log(`[StakeController] Available pools in memBlockchainStorage:`, allPools.map(p => ({id: p.id, name: p.name})));
      return res.status(404).json({ error: 'Staking pool not found' });
    }
    console.log(`[StakeController] Successfully found staking pool: ${pool.name} (ID: ${pool.id})`);
    
    // Check minimum stake
    const minRequiredStake = pool.minStake || '10000';
    console.log(`[StakeController] startStaking: Pool ${poolId} min stake: ${minRequiredStake}. Requested amount: ${amount}`);
    if (BigInt(amount) < BigInt(minRequiredStake)) {
      console.warn(`[StakeController] startStaking: Amount ${amount} is less than minimum required stake ${minRequiredStake} for pool ${poolId}.`);
      return res.status(400).json({ error: `Minimum stake for this pool is ${minRequiredStake} μPVX` });
    }
    console.log(`[StakeController] startStaking: Minimum stake requirement met for ${address} in pool ${poolId}.`);
    
    console.log(`[StakeController] startStaking: Creating stake record for ${address} in pool ${poolId}.`);
    const stakeId = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    const stake: StakeRecord = {
      id: stakeId,
      walletAddress: address,
      poolId,
      amount,
      startTime: now,
      unlockTime: pool.lockupPeriod > 0 ? now + (pool.lockupPeriod * 24 * 60 * 60 * 1000) : 0,
      lastRewardTime: now,
      isActive: true
    };
    
    await memBlockchainStorage.createStakeRecord(stake); // Assumes this logs if necessary
    console.log(`[StakeController] startStaking: Stake record ${stakeId} created in memory.`);
    
    const newTotalStaked = BigInt(pool.totalStaked) + BigInt(amount);
    pool.totalStaked = newTotalStaked.toString();
    await memBlockchainStorage.updateStakingPool(pool); // Assumes this logs
    console.log(`[StakeController] startStaking: Pool ${poolId} total staked updated to ${pool.totalStaked}.`);
    
    const newBalance = BigInt(wallet.balance) - BigInt(amount);
    wallet.balance = newBalance.toString();
    await memBlockchainStorage.updateWallet(wallet); // Assumes this logs
    console.log(`[StakeController] startStaking: Wallet ${address} balance updated to ${wallet.balance}.`);
    
    const txHash = crypto.createHash('sha256')
      .update(address + amount + poolId + now.toString())
      .digest('hex');
    
    const transaction = {
      hash: txHash,
      type: 'STAKE_START' as const,
      from: address,
      to: `STAKE_POOL_${poolId}`,
      amount,
      timestamp: now,
      nonce: Math.floor(Math.random() * 100000),
      signature: cryptoUtils.generateRandomHash(),
      status: 'confirmed' as const
    };
    
    await memBlockchainStorage.createTransaction(transaction); // Assumes this logs
    console.log(`[StakeController] startStaking: STAKE_START transaction ${txHash} created in memory.`);
    
    try {
      const { transactionDao } = await import('../database/transactionDao'); // DAO interaction
      const dbTransaction = {
        hash: txHash,
        type: 'STAKE_START' as const,
        from: address,               // DAO will map this to fromAddress
        to: `STAKE_POOL_${poolId}`,  // DAO will map this to toAddress
        amount: parseInt(amount),
        timestamp: now,
        nonce: Math.floor(Math.random() * 100000),
        signature: cryptoUtils.generateRandomHash(),
        status: 'confirmed' as const,
        metadata: { 
          stakeId,
          poolId,
          poolName: pool.name,
          lockupPeriod: pool.lockupPeriod
        }
      };
      
      await transactionDao.createTransaction(dbTransaction); // Assumes transactionDao logs
      console.log(`[StakeController] startStaking: STAKE_START transaction [${txHash}] persisted to database for ${address}.`);
      
      broadcastTransaction(transaction);
      console.log(`[StakeController] startStaking: Broadcasted transaction ${txHash}.`);
      
      broadcastStakingUpdate({ 
        walletAddress: address,
        poolId,
        action: 'start',
        amount,
        timestamp: now
      });
      
      broadcastWalletUpdate({ address, balance: wallet.balance, action: 'stake_funds', amount });
      console.log(`[StakeController] startStaking: Broadcasted wallet update for ${address}.`);
      
      broadcastStatusUpdate({ totalStaked: pool.totalStaked, poolId, activePools: true });
      console.log(`[StakeController] startStaking: Broadcasted status update for pool ${poolId}.`);
    } catch (dbError) {
      console.error(`[StakeController] startStaking: Failed to persist STAKE_START transaction ${txHash} to database:`, dbError.message);
    }
    
    // Note: broadcastTransaction was called inside try block already, this one might be redundant if not for specific timing.
    // For safety, ensuring it's called:
    // broadcastTransaction(transaction);
    // console.log(`[StakeController] startStaking: Ensured broadcast of transaction ${txHash}.`);

    try {
      console.log(`[StakeController] startStaking: Checking staking badges for user ${address}.`);
      const existingStakes = await memBlockchainStorage.getStakesByAddress(address);
      await checkStakingBadges(address, amount, existingStakes.length + 1); // checkStakingBadges logs internally
    } catch (err) {
      console.error(`[StakeController] startStaking: Error checking staking badges for user ${address}:`, err.message);
    }
    
    const responsePayload = {
      stake_id: stakeId, tx_hash: txHash, pool: pool.name, amount, apy: pool.apy,
      unlock_time: stake.unlockTime > 0 ? new Date(stake.unlockTime).toISOString() : 'No lockup'
    };
    console.log(`[StakeController] startStaking: Sending 201 Created response for stake ${stakeId}.`, responsePayload);
    res.status(201).json(responsePayload);
  } catch (error) {
    console.error(`[StakeController] startStaking: Error processing request - Address: ${req.body.address}, Amount: ${req.body.amount}, PoolID: ${req.body.poolId}:`, error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start staking'
    });
  }
};

/**
 * Stop staking
 * POST /api/stake/stop
 */
export const stopStaking = async (req: Request, res: Response) => {
  console.log(`[StakeController] stopStaking: Request received ${req.method} ${req.originalUrl}`);
  try {
    const { stakeId, address, passphrase } = req.body; // Passphrase not logged
    console.log(`[StakeController] stopStaking: Body - stakeId=${stakeId}, address=${address}`);

    if (!stakeId || !address || !passphrase) {
      console.warn(`[StakeController] stopStaking: Missing required fields. StakeID: ${stakeId}, Address: ${address}, Passphrase: ${passphrase ? 'present' : 'missing'}`);
      return res.status(400).json({ error: 'Stake ID, address, and passphrase are required' });
    }
    
    console.log(`[StakeController] stopStaking: Verifying wallet ${address}.`);
    const wallet = await memBlockchainStorage.getWalletByAddress(address);
    if (!wallet) {
      console.warn(`[StakeController] stopStaking: Wallet ${address} not found.`);
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    console.log(`[StakeController] stopStaking: Verifying passphrase for wallet ${address}.`);
    const isPassphraseValid = passphraseUtils.verifyPassphrase(
      passphrase,
      wallet.passphraseSalt,
      wallet.passphraseHash
    );
    
    // Log verification outcome (already done by passphraseUtils or should be)
    console.log(`[StakeController] stopStaking: Passphrase validation for ${address} result: ${isPassphraseValid}`);
    
    if (!isPassphraseValid) {
      if (process.env.NODE_ENV !== 'production' && passphraseUtils.isKnownTestWallet(address)) {
        console.log(`[StakeController] stopStaking: DEV MODE - Bypassing passphrase check for known test wallet ${address}.`);
      } else {
        console.warn(`[StakeController] stopStaking: Invalid passphrase for wallet ${address}.`);
        return res.status(401).json({ error: 'Invalid passphrase' });
      }
    }
    
    console.log(`[StakeController] stopStaking: Fetching stake record ${stakeId}.`);
    const stake = await memBlockchainStorage.getStakeById(stakeId);
    if (!stake) {
      console.warn(`[StakeController] stopStaking: Stake record ${stakeId} not found.`);
      return res.status(404).json({ error: 'Stake not found' });
    }
    
    if (stake.walletAddress !== address) {
      console.warn(`[StakeController] stopStaking: Stake ${stakeId} does not belong to address ${address}. Actual owner: ${stake.walletAddress}`);
      return res.status(401).json({ error: 'Unauthorized: stake belongs to another wallet' });
    }
    
    const now = Date.now();
    if (stake.unlockTime > 0 && now < stake.unlockTime) {
      const unlockTimeISO = new Date(stake.unlockTime).toISOString();
      console.warn(`[StakeController] stopStaking: Stake ${stakeId} is still locked until ${unlockTimeISO}.`);
      return res.status(400).json({ error: `Stake is still locked until ${unlockTimeISO}` });
    }
    
    console.log(`[StakeController] stopStaking: Fetching staking pool ${stake.poolId} for stake ${stakeId}.`);
    const pool = await memBlockchainStorage.getStakingPoolById(stake.poolId);
    if (!pool) {
      console.error(`[StakeController] stopStaking: Staking pool ${stake.poolId} for stake ${stakeId} not found.`);
      return res.status(500).json({ error: 'Staking pool not found (critical error, pool referenced by stake is missing)' });
    }
    console.log(`[StakeController] stopStaking: Pool ${pool.name} found. Calculating rewards for stake ${stakeId}.`);
    
    const stakeDuration = now - stake.startTime;
    const daysStaked = stakeDuration / (24 * 60 * 60 * 1000);
    const apyDecimal = parseFloat(pool.apy) / 100;
    const reward = Math.floor(parseInt(stake.amount) * apyDecimal * (daysStaked / 365));
    
    const totalReturn = BigInt(stake.amount) + BigInt(reward);
    const newBalance = BigInt(wallet.balance) + totalReturn;
    wallet.balance = newBalance.toString();
    await memBlockchainStorage.updateWallet(wallet); // Assumes logs
    console.log(`[StakeController] stopStaking: Wallet ${address} balance updated to ${newBalance} after unstaking and rewards.`);
    
    const newTotalStaked = BigInt(pool.totalStaked) - BigInt(stake.amount);
    pool.totalStaked = newTotalStaked.toString();
    await memBlockchainStorage.updateStakingPool(pool); // Assumes logs
    console.log(`[StakeController] stopStaking: Pool ${pool.id} total staked updated to ${newTotalStaked}.`);
    
    stake.isActive = false;
    await memBlockchainStorage.updateStakeRecord(stake); // Assumes logs
    console.log(`[StakeController] stopStaking: Stake record ${stakeId} marked as inactive.`);
    
    const txHash = crypto.createHash('sha256')
      .update(address + stake.amount + stake.poolId + now.toString())
      .digest('hex');
    
    const transaction = {
      hash: txHash,
      type: 'STAKE_END' as const,
      from: `STAKE_POOL_${stake.poolId}`,
      to: address,
      amount: stake.amount,
      timestamp: now,
      nonce: Math.floor(Math.random() * 100000),
      signature: cryptoUtils.generateRandomHash(),
      status: 'confirmed' as const
    };
    
    await memBlockchainStorage.createTransaction(transaction); // Assumes logs
    console.log(`[StakeController] stopStaking: STAKE_END transaction ${txHash} created in memory.`);
    
    try {
      const { transactionDao } = await import('../database/transactionDao');
      const dbTransaction = {
        hash: txHash,
        type: 'STAKE_END' as const,
        from: `STAKE_POOL_${stake.poolId}`,  // DAO will map this to fromAddress
        to: address,                         // DAO will map this to toAddress
        amount: parseInt(stake.amount),
        timestamp: now,
        nonce: Math.floor(Math.random() * 100000),
        signature: cryptoUtils.generateRandomHash(),
        status: 'confirmed' as const,
        metadata: { 
          stakeId: stakeId,
          poolId: stake.poolId,
          stakeStartTime: stake.startTime,
          stakeDuration: now - stake.startTime
        }
      };
      
      await transactionDao.createTransaction(dbTransaction); // Assumes logs
      console.log(`[StakeController] stopStaking: STAKE_END transaction [${txHash}] persisted to database for ${address}.`);
    } catch (dbError) {
      console.error(`[StakeController] stopStaking: Failed to persist STAKE_END transaction ${txHash} to database:`, dbError.message);
    }
    
    broadcastTransaction(transaction);
    console.log(`[StakeController] stopStaking: Broadcasted STAKE_END transaction ${txHash}.`);
    
    if (reward > 0) {
      console.log(`[StakeController] stopStaking: Processing reward of ${reward} for stake ${stakeId}.`);
      const rewardTxHash = crypto.createHash('sha256').update(address + reward.toString() + stake.poolId + now.toString()).digest('hex');
      const rewardTransaction = { /* ... as before ... */
        hash: rewardTxHash, type: 'STAKING_REWARD' as const, from: `STAKE_POOL_${stake.poolId}`, to: address,
        amount: reward.toString(), timestamp: now + 1, nonce: Math.floor(Math.random() * 100000),
        signature: cryptoUtils.generateRandomHash(), status: 'confirmed' as const
      };
      
      await memBlockchainStorage.createTransaction(rewardTransaction); // Assumes logs
      console.log(`[StakeController] stopStaking: STAKING_REWARD transaction ${rewardTxHash} created in memory.`);
      
      try {
        const { transactionDao } = await import('../database/transactionDao');
        const dbRewardTransaction = {
          hash: rewardTxHash,
          type: 'STAKING_REWARD' as const,
          from: `STAKE_POOL_${stake.poolId}`,
          to: address,
          amount: parseInt(reward.toString()),
          timestamp: now + 1,
          nonce: Math.floor(Math.random() * 100000),
          signature: cryptoUtils.generateRandomHash(),
          status: 'confirmed' as const,
          metadata: { 
            stakeId: stakeId,
            poolId: stake.poolId,
            apyAtTime: pool.apy,
            stakeDuration: now - stake.startTime
          }
        };
        
        await transactionDao.createTransaction(dbRewardTransaction); // Assumes logs
        console.log(`[StakeController] stopStaking: STAKING_REWARD transaction [${rewardTxHash}] persisted to database for ${address}.`);
      } catch (dbError) {
        console.error(`[StakeController] stopStaking: Failed to persist STAKING_REWARD transaction ${rewardTxHash} to database:`, dbError.message);
      }
      
      broadcastTransaction(rewardTransaction);
      console.log(`[StakeController] stopStaking: Broadcasted STAKING_REWARD transaction ${rewardTxHash}.`);
    }
    
    const responsePayload = {
      tx_hash: txHash, unstaked_amount: stake.amount, reward: reward.toString(), total_returned: totalReturn.toString()
    };
    console.log(`[StakeController] stopStaking: Sending 200 OK response for stake ${stakeId}.`, responsePayload);
    res.status(200).json(responsePayload);
  } catch (error) {
    console.error(`[StakeController] stopStaking: Error processing request - StakeID: ${req.body.stakeId}, Address: ${req.body.address}:`, error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to stop staking'
    });
  }
};

/**
 * Claim staking rewards
 * POST /api/stake/claim
 */
export const claimRewards = async (req: Request, res: Response) => {
  console.log(`[StakeController] claimRewards: Request received ${req.method} ${req.originalUrl}`);
  try {
    const { stakeId, address, passphrase } = req.body; // Passphrase not logged
    console.log(`[StakeController] claimRewards: Body - stakeId=${stakeId}, address=${address}`);

    if (!stakeId || !address || !passphrase) {
      console.warn(`[StakeController] claimRewards: Missing required fields. StakeID: ${stakeId}, Address: ${address}, Passphrase: ${passphrase ? 'present': 'missing'}`);
      return res.status(400).json({ error: 'Stake ID, address, and passphrase are required' });
    }
    
    console.log(`[StakeController] claimRewards: Verifying wallet ${address}.`);
    const wallet = await memBlockchainStorage.getWalletByAddress(address);
    if (!wallet) {
      console.warn(`[StakeController] claimRewards: Wallet ${address} not found.`);
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    console.log(`[StakeController] claimRewards: Verifying passphrase for wallet ${address}.`);
    const isPassphraseValid = passphraseUtils.verifyPassphrase(
      passphrase,
      wallet.passphraseSalt,
      wallet.passphraseHash
    );
    
    // Log verification outcome (already done by passphraseUtils or should be)
    console.log(`[StakeController] claimRewards: Passphrase validation for ${address} result: ${isPassphraseValid}`);
    
    if (!isPassphraseValid) {
      if (process.env.NODE_ENV !== 'production' && passphraseUtils.isKnownTestWallet(address)) {
        console.log(`[StakeController] claimRewards: DEV MODE - Bypassing passphrase check for known test wallet ${address}.`);
      } else {
        console.warn(`[StakeController] claimRewards: Invalid passphrase for wallet ${address}.`);
        return res.status(401).json({ error: 'Invalid passphrase' });
      }
    }
    
    console.log(`[StakeController] claimRewards: Fetching stake record ${stakeId}.`);
    const stake = await memBlockchainStorage.getStakeById(stakeId);
    if (!stake) {
      console.warn(`[StakeController] claimRewards: Stake record ${stakeId} not found.`);
      return res.status(404).json({ error: 'Stake not found' });
    }
    
    if (stake.walletAddress !== address) {
      console.warn(`[StakeController] claimRewards: Stake ${stakeId} does not belong to address ${address}. Actual owner: ${stake.walletAddress}`);
      return res.status(401).json({ error: 'Unauthorized: stake belongs to another wallet' });
    }
    
    if (!stake.isActive) {
      console.warn(`[StakeController] claimRewards: Stake ${stakeId} is not active. Cannot claim rewards.`);
      return res.status(400).json({ error: 'Stake is not active' });
    }
    
    console.log(`[StakeController] claimRewards: Fetching staking pool ${stake.poolId} for stake ${stakeId}.`);
    const pool = await memBlockchainStorage.getStakingPoolById(stake.poolId);
    if (!pool) {
      console.error(`[StakeController] claimRewards: Staking pool ${stake.poolId} for stake ${stakeId} not found.`);
      return res.status(500).json({ error: 'Staking pool not found (critical error, pool referenced by stake is missing)' });
    }
    
    const now = Date.now();
    const timeSinceLastReward = now - (stake.lastRewardTime || stake.startTime); // Fallback to startTime if no lastRewardTime
    const daysSinceLastReward = timeSinceLastReward / (24 * 60 * 60 * 1000);
    const apy = parseFloat(pool.apy);
    if (isNaN(apy) || apy <=0) {
      console.warn(`[StakeController] claimRewards: Invalid APY for pool ${pool.id}: ${pool.apy}. Cannot calculate rewards.`);
      return res.status(500).json({ error: 'Invalid pool APY configuration.'})
    }
    const apyDecimal = apy / 100;
    const reward = Math.floor(parseInt(stake.amount) * apyDecimal * (daysSinceLastReward / 365));
    console.log(`[StakeController] claimRewards: Calculated reward for stake ${stakeId}: ${reward}. Days since last: ${daysSinceLastReward.toFixed(2)}`);

    if (reward <= 0) {
      console.log(`[StakeController] claimRewards: No rewards available to claim for stake ${stakeId}.`);
      return res.status(400).json({ error: 'No rewards available to claim yet' });
    }
    
    const newBalance = BigInt(wallet.balance) + BigInt(reward);
    wallet.balance = newBalance.toString();
    await memBlockchainStorage.updateWallet(wallet); // Assumes logs
    console.log(`[StakeController] claimRewards: Wallet ${address} balance updated to ${newBalance} after claiming rewards.`);
    
    stake.lastRewardTime = now;
    await memBlockchainStorage.updateStakeRecord(stake); // Assumes logs
    console.log(`[StakeController] claimRewards: Stake record ${stakeId} lastRewardTime updated to ${now}.`);
    
    const txHash = crypto.createHash('sha256')
      .update(address + reward.toString() + stake.poolId + now.toString())
      .digest('hex');
    
    // Transaction for the in-memory blockchain
    const memTransaction = {
      hash: txHash,
      type: 'STAKING_REWARD' as const,
      from: `STAKE_POOL_${stake.poolId}`,
      to: address,
      amount: reward.toString(),
      timestamp: now,
      nonce: Math.floor(Math.random() * 100000),
      signature: cryptoUtils.generateRandomHash(),
      status: 'confirmed' as const
    };
    
    await memBlockchainStorage.createTransaction(memTransaction); // Assumes logs
    console.log(`[StakeController] claimRewards: STAKING_REWARD transaction ${txHash} created in memory.`);
    
    try {
      const { transactionDao } = await import('../database/transactionDao');
      const dbTransaction = {
        hash: txHash,
        type: 'STAKING_REWARD' as const,
        from: `STAKE_POOL_${stake.poolId}`,
        to: address,
        amount: parseInt(reward.toString()),
        timestamp: now,
        nonce: Math.floor(Math.random() * 100000),
        signature: cryptoUtils.generateRandomHash(),
        status: 'confirmed' as const,
        metadata: { 
          stakeId,
          poolId: stake.poolId,
          apyAtTime: pool.apy,
          rewardPeriod: timeSinceLastReward
        }
      };
      
      await transactionDao.createTransaction(dbTransaction); // Assumes logs
      console.log(`[StakeController] claimRewards: STAKING_REWARD transaction [${txHash}] persisted to database for ${address}.`);
    } catch (dbError) {
      console.error(`[StakeController] claimRewards: Failed to persist STAKING_REWARD transaction ${txHash} to database:`, dbError.message);
    }
    
    broadcastTransaction(memTransaction);
    console.log(`[StakeController] claimRewards: Broadcasted STAKING_REWARD transaction ${txHash}.`);
    
    const responsePayload = { tx_hash: txHash, reward: reward.toString() };
    console.log(`[StakeController] claimRewards: Sending 200 OK response for stake ${stakeId}.`, responsePayload);
    res.status(200).json(responsePayload);
  } catch (error) {
    console.error(`[StakeController] claimRewards: Error processing request - StakeID: ${req.body.stakeId}, Address: ${req.body.address}:`, error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to claim staking rewards'
    });
  }
};

/**
 * Get available staking pools
 * GET /api/stake/pools
 */
export const getStakingPools = async (req: Request, res: Response) => {
  console.log(`[StakeController] getStakingPools: Request received ${req.method} ${req.originalUrl}`);
  try {
    const pools = await memBlockchainStorage.getStakingPools(); // Assumes this logs if complex, or is simple getter
    console.log(`[StakeController] getStakingPools: Found ${pools.length} staking pools in memBlockchainStorage.`);
    
    const formattedPools = pools.map(pool => ({
      id: pool.id,
      name: pool.name,
      apy: pool.apy,
      total_staked: pool.totalStaked,
      min_stake: pool.minStake,
      lockup_period: pool.lockupPeriod,
      description: pool.description || '',
      stats: {
        stakers_count: pool.stakersCount || 0,
        avg_stake_period: pool.avgStakePeriod || 0
      }
    }));
    
    console.log(`[StakeController] getStakingPools: Sending 200 OK response with ${formattedPools.length} pools.`);
    res.json(formattedPools);
  } catch (error) {
    console.error(`[StakeController] getStakingPools: Error getting staking pools:`, error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get staking pools'
    });
  }
};

/**
 * Get staking status for a wallet
 * GET /api/stake/status/:address
 */
export const getStakingStatus = async (req: Request, res: Response) => {
  const { address } = req.params;
  console.log(`[StakeController] getStakingStatus: Request received ${req.method} ${req.originalUrl} for Address: ${address}`);
  try {
    console.log(`[StakeController] getStakingStatus: Verifying wallet ${address}.`);
    const wallet = await memBlockchainStorage.getWalletByAddress(address);
    if (!wallet) {
      console.warn(`[StakeController] getStakingStatus: Wallet ${address} not found.`);
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    console.log(`[StakeController] getStakingStatus: Fetching active stakes for ${address}.`);
    const activeStakes = await memBlockchainStorage.getActiveStakesByAddress(address); // Assumes logs
    console.log(`[StakeController] getStakingStatus: Found ${activeStakes.length} active stakes for ${address}.`);
    
    const now = Date.now();
    const stakingDataPromises = activeStakes.map(async (stake) => {
      console.log(`[StakeController] getStakingStatus: Processing stake ${stake.id}, pool ${stake.poolId}.`);
      const pool = await memBlockchainStorage.getStakingPoolById(stake.poolId); // Assumes logs
      if (!pool) {
        console.warn(`[StakeController] getStakingStatus: Pool ${stake.poolId} for stake ${stake.id} not found. Skipping this stake in status.`);
        return null;
      }
      
      const timeSinceLastReward = now - (stake.lastRewardTime || stake.startTime);
      const daysSinceLastReward = timeSinceLastReward / (24 * 60 * 60 * 1000);
      const apy = parseFloat(pool.apy);
      let pendingReward = 0;
      if (!isNaN(apy) && apy > 0) {
        const apyDecimal = apy / 100;
        pendingReward = Math.floor(parseInt(stake.amount) * apyDecimal * (daysSinceLastReward / 365));
      } else {
        console.warn(`[StakeController] getStakingStatus: Invalid APY for pool ${pool.id}: ${pool.apy} while calculating status for stake ${stake.id}. Pending reward will be 0.`);
      }
      
      let timeToUnlock = 0; let isLocked = false;
      if (stake.unlockTime > 0 && now < stake.unlockTime) {
        timeToUnlock = stake.unlockTime - now; isLocked = true;
      }
      
      const stakeInfo = { /* ... as before ... */
        stake_id: stake.id, pool_id: stake.poolId, pool_name: pool.name, amount: stake.amount,
        start_time: new Date(stake.startTime).toISOString(), is_locked: isLocked,
        unlock_time: stake.unlockTime > 0 ? new Date(stake.unlockTime).toISOString() : null,
        time_to_unlock: isLocked ? timeToUnlock : 0, apy: pool.apy, pending_reward: pendingReward.toString()
      };
      console.log(`[StakeController] getStakingStatus: Processed stake ${stake.id}: `, stakeInfo);
      return stakeInfo;
    });
    
    const stakingData = (await Promise.all(stakingDataPromises)).filter(data => data !== null) as NonNullable<Awaited<ReturnType<typeof stakingDataPromises[0]>>[]>;
    
    const totalStaked = activeStakes.reduce((sum, stake) => sum + BigInt(stake.amount), BigInt(0));
    const totalPendingRewards = stakingData.reduce((sum, data) => sum + BigInt(data.pending_reward), BigInt(0));
    console.log(`[StakeController] getStakingStatus: Calculated totals for ${address} - TotalStaked: ${totalStaked}, TotalPendingRewards: ${totalPendingRewards}`);
    
    const responsePayload = {
      address, total_staked: totalStaked.toString(), total_pending_rewards: totalPendingRewards.toString(),
      active_stakes: stakingData, stake_count: stakingData.length
    };
    console.log(`[StakeController] getStakingStatus: Sending 200 OK response for ${address}.`, {stakesCount: stakingData.length, totalStaked: totalStaked.toString()});
    res.json(responsePayload);
  } catch (error) {
    console.error(`[StakeController] getStakingStatus: Error getting staking status for ${address}:`, error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get staking status'
    });
  }
};