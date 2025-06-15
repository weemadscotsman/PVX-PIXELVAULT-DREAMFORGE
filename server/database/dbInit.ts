import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';  // Use the correct schema that matches our database
import { createId, formatCurrency } from '@shared/utils';
import { memBlockchainStorage } from '../mem-blockchain';

/**
 * Create all tables in the database if they don't exist
 */
async function createTablesIfNotExist(client: postgres.Sql<{}>) {
  console.log('[DB Init] Starting createTablesIfNotExist...');

  // Create blocks table
  await client`
    CREATE TABLE IF NOT EXISTS blocks (
      height INTEGER PRIMARY KEY,
      hash VARCHAR(64) NOT NULL UNIQUE,
      previous_hash VARCHAR(64) NOT NULL,
      timestamp BIGINT NOT NULL,
      nonce BIGINT NOT NULL,
      difficulty INTEGER NOT NULL,
      miner VARCHAR(100) NOT NULL,
      merkle_root VARCHAR(64) NOT NULL,
      total_transactions INTEGER NOT NULL,
      size INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // Create transactions table
  await client`
    CREATE TABLE IF NOT EXISTS transactions (
      hash VARCHAR(64) PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      from_address VARCHAR(100) NOT NULL,
      to_address VARCHAR(100) NOT NULL,
      amount BIGINT NOT NULL,
      timestamp BIGINT NOT NULL,
      nonce BIGINT NOT NULL,
      signature TEXT NOT NULL,
      status VARCHAR(20) NOT NULL,
      block_height INTEGER,
      fee BIGINT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // Create wallets table
  await client`
    CREATE TABLE IF NOT EXISTS wallets (
      address VARCHAR(100) PRIMARY KEY,
      public_key TEXT NOT NULL,
      balance VARCHAR(100) NOT NULL,
      created_at TIMESTAMP NOT NULL,
      last_updated TIMESTAMP NOT NULL,
      passphrase_salt VARCHAR(100),
      passphrase_hash VARCHAR(100)
    )
  `;

  // Create miner_stats table
  await client`
    CREATE TABLE IF NOT EXISTS miner_stats (
      address VARCHAR(100) PRIMARY KEY,
      blocks_mined INTEGER NOT NULL,
      total_rewards VARCHAR(100) NOT NULL,
      last_block_mined BIGINT NOT NULL,
      is_currently_mining BOOLEAN NOT NULL,
      hardware VARCHAR(10) NOT NULL,
      joined_at TIMESTAMP NOT NULL,
      current_hash_rate INTEGER NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // Create staking_pools table
  await client`
    CREATE TABLE IF NOT EXISTS staking_pools (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      apr INTEGER NOT NULL,
      min_stake_amount INTEGER NOT NULL,
      lockup_period INTEGER NOT NULL,
      total_staked VARCHAR(100) NOT NULL,
      active_stakers INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // Create stake_records table
  await client`
    CREATE TABLE IF NOT EXISTS stake_records (
      id VARCHAR(100) PRIMARY KEY,
      wallet_address VARCHAR(100) NOT NULL,
      pool_id VARCHAR(100) NOT NULL,
      amount VARCHAR(100) NOT NULL,
      start_time BIGINT NOT NULL,
      end_time BIGINT,
      is_active BOOLEAN NOT NULL,
      rewards VARCHAR(100) NOT NULL,
      last_reward_claim BIGINT NOT NULL,
      auto_compound BOOLEAN NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // Create badges table
  await client`
    CREATE TABLE IF NOT EXISTS badges (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      image_url VARCHAR(255) NOT NULL,
      tier VARCHAR(20) NOT NULL,
      category VARCHAR(20) NOT NULL,
      requirements JSONB,
      date_added BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // Create user_badges table
  await client`
    CREATE TABLE IF NOT EXISTS user_badges (
      user_id VARCHAR(100) NOT NULL,
      badge_id VARCHAR(100) NOT NULL,
      obtained BOOLEAN NOT NULL,
      date_obtained BIGINT,
      progress INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
      PRIMARY KEY (user_id, badge_id)
    )
  `;

  // Create thringlets table
  await client`
    CREATE TABLE IF NOT EXISTS thringlets (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      owner_address VARCHAR(100) NOT NULL,
      emotion_state VARCHAR(20) NOT NULL,
      personality_traits JSONB NOT NULL,
      blockchain_affinities JSONB NOT NULL,
      level INTEGER NOT NULL,
      experience INTEGER NOT NULL,
      backstory TEXT NOT NULL,
      abilities JSONB NOT NULL,
      last_interaction BIGINT NOT NULL,
      stats JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // Create governance_proposals table
  await client`
    CREATE TABLE IF NOT EXISTS governance_proposals (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      proposer VARCHAR(100) NOT NULL,
      created_at BIGINT NOT NULL,
      end_time BIGINT NOT NULL,
      status VARCHAR(20) NOT NULL,
      votes_for BIGINT NOT NULL,
      votes_against BIGINT NOT NULL,
      votes_abstain BIGINT NOT NULL,
      minimum_voting_power INTEGER NOT NULL,
      category VARCHAR(20) NOT NULL,
      parameter_changes JSONB,
      execution_transaction_hash VARCHAR(64),
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // Create governance_votes table
  await client`
    CREATE TABLE IF NOT EXISTS governance_votes (
      proposal_id VARCHAR(100) NOT NULL,
      voter_address VARCHAR(100) NOT NULL,
      vote_type VARCHAR(10) NOT NULL,
      voting_power BIGINT NOT NULL,
      timestamp BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      PRIMARY KEY (proposal_id, voter_address)
    )
  `;

  // Create drops table
  await client`
    CREATE TABLE IF NOT EXISTS drops (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      type VARCHAR(20) NOT NULL,
      rarity VARCHAR(20) NOT NULL,
      image_url VARCHAR(255) NOT NULL,
      token_amount INTEGER,
      created_at TIMESTAMP NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      claim_limit INTEGER NOT NULL,
      min_wallet_age INTEGER NOT NULL,
      min_staking_amount INTEGER NOT NULL,
      min_mining_blocks INTEGER NOT NULL,
      security_score INTEGER NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // Create drop_claims table
  await client`
    CREATE TABLE IF NOT EXISTS drop_claims (
      drop_id VARCHAR(100) NOT NULL,
      wallet_address VARCHAR(100) NOT NULL,
      claimed_at TIMESTAMP DEFAULT NOW() NOT NULL,
      transaction_hash VARCHAR(64),
      PRIMARY KEY (drop_id, wallet_address)
    )
  `;

  // Create learning_modules table
  await client`
    CREATE TABLE IF NOT EXISTS learning_modules (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      difficulty VARCHAR(20) NOT NULL,
      type VARCHAR(20) NOT NULL,
      xp_reward INTEGER NOT NULL,
      token_reward INTEGER NOT NULL,
      badge_id VARCHAR(100),
      completion_criteria JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // Create learning_questions table
  await client`
    CREATE TABLE IF NOT EXISTS learning_questions (
      id VARCHAR(100) PRIMARY KEY,
      module_id VARCHAR(100) NOT NULL,
      text TEXT NOT NULL,
      options JSONB NOT NULL,
      correct_option INTEGER NOT NULL,
      explanation TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // Create user_learning_progress table
  await client`
    CREATE TABLE IF NOT EXISTS user_learning_progress (
      user_id VARCHAR(100) NOT NULL,
      module_id VARCHAR(100) NOT NULL,
      completed BOOLEAN NOT NULL,
      score INTEGER NOT NULL,
      attempts_count INTEGER NOT NULL,
      last_attempt_date BIGINT NOT NULL,
      rewards_claimed BOOLEAN NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
      PRIMARY KEY (user_id, module_id)
    )
  `;

  // Create sessions table for authentication
  await client`
    CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    )
  `;
  
  await client`CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire)`;

  console.log('[DB Init] Finished createTablesIfNotExist. All tables checked/created.');
}

/**
 * Initialize the database with required data
 */
export async function initializeDatabase() {
  console.log('[DB Init] Starting initializeDatabase...');
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    // Create client instance
    const client = postgres(process.env.DATABASE_URL);
    
    // First, create all tables if they don't exist
    await createTablesIfNotExist(client);
    
    // Create drizzle instance with the client
    const db = drizzle(client, { schema });
    
    // Check if staking pools are already initialized
    console.log('[DB Init] Checking/initializing default staking pools...');
    try {
      const existingPools = await db.select().from(schema.stakingPools);
      
      if (existingPools.length === 0) {
      const poolsToInsert = [
        {
          id: createId(),
          name: 'Secure Vault',
          description: 'Low risk, steady returns with a short lockup period.',
          apr: 5,
          minStakeAmount: 100,
          lockupPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          totalStaked: '0',
          activeStakers: 0
        },
        {
          id: createId(),
          name: 'Balanced Node',
          description: 'Balanced risk and reward with a moderate lockup period.',
          apr: 12,
          minStakeAmount: 500,
          lockupPeriod: 2592000, // 30 days in seconds (instead of milliseconds to avoid integer overflow)
          totalStaked: '0',
          activeStakers: 0
        },
        {
          id: createId(),
          name: 'Quantum Yield',
          description: 'Higher potential returns for a longer commitment.',
          apr: 25,
          minStakeAmount: 1000,
          lockupPeriod: 7776000, // 90 days in seconds (instead of milliseconds to avoid integer overflow)
          totalStaked: '0',
          activeStakers: 0
        },
        {
          id: createId(),
          name: 'Genesis Core',
          description: 'Maximum returns for early network supporters with the longest lockup.',
          apr: 42,
          minStakeAmount: 5000,
          lockupPeriod: 15552000, // 180 days in seconds (instead of milliseconds to avoid integer overflow)
          totalStaked: '0',
          activeStakers: 0
        }
      ];
      console.log(`[DB Init] No existing staking pools found. Initializing ${poolsToInsert.length} default staking pools...`);
      await db.insert(schema.stakingPools).values(poolsToInsert);
      console.log(`[DB Init] ${poolsToInsert.length} default staking pools initialized successfully.`);
      } else {
        console.log(`[DB Init] Found ${existingPools.length} existing staking pools. Skipping initialization.`);
      }
    } catch (err) {
      console.error('[DB Init] Error initializing staking pools:', err);
    }
    
    // Check if badges are already initialized
    console.log('[DB Init] Checking/initializing badges...');
    try {
      const existingBadges = await db.select().from(schema.badges);
      
      if (existingBadges.length === 0) {
      const badgesToInsert = [
        {
          id: createId(),
          name: 'Secure Vault',
          description: 'Low risk, steady returns with a short lockup period.',
          apr: 5,
          minStakeAmount: 100,
          lockupPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          totalStaked: '0',
          activeStakers: 0
        },
        {
          id: createId(),
          name: 'Balanced Node',
          description: 'Balanced risk and reward with a moderate lockup period.',
          apr: 12,
          minStakeAmount: 500,
          lockupPeriod: 2592000, // 30 days in seconds (instead of milliseconds to avoid integer overflow)
          totalStaked: '0',
          activeStakers: 0
        },
        {
          id: createId(),
          name: 'Quantum Yield',
          description: 'Higher potential returns for a longer commitment.',
          apr: 25,
          minStakeAmount: 1000,
          lockupPeriod: 7776000, // 90 days in seconds (instead of milliseconds to avoid integer overflow)
          totalStaked: '0',
          activeStakers: 0
        },
        {
          id: createId(),
          name: 'Genesis Core',
          description: 'Maximum returns for early network supporters with the longest lockup.',
          apr: 42,
          minStakeAmount: 5000,
          lockupPeriod: 15552000, // 180 days in seconds (instead of milliseconds to avoid integer overflow)
          totalStaked: '0',
          activeStakers: 0
        }
      ];
      console.log(`[DB Init] No existing badges found. Initializing ${badgesToInsert.length} default badges...`);
      await db.insert(schema.badges).values(badgesToInsert);
      console.log(`[DB Init] ${badgesToInsert.length} default badges initialized successfully.`);
      } else {
        console.log(`[DB Init] Found ${existingBadges.length} existing badges. Skipping initialization.`);
      }
    } catch (err) {
      console.error('[DB Init] Error initializing badges:', err);
    }

    // Check if learning modules are already initialized
    console.log('[DB Init] Checking/initializing learning modules...');
    try {
      const existingModules = await db.select().from(schema.learningModules);
      
      if (existingModules.length === 0) {
      const learningModulesToInsert = [
        {
          id: createId(),
          name: 'Blockchain Pioneer',
          description: 'Awarded to early chain explorers who mined at least one block.',
          imageUrl: '/assets/badges/pioneer.svg',
          tier: 'bronze',
          category: 'mining',
          requirements: { blocksRequired: 1 },
          dateAdded: Date.now()
        },
        {
          id: createId(),
          name: 'Mining Veteran',
          description: 'Awarded to dedicated miners who have mined at least 100 blocks.',
          imageUrl: '/assets/badges/veteran.svg',
          tier: 'silver',
          category: 'mining',
          requirements: { blocksRequired: 100 },
          dateAdded: Date.now()
        },
        {
          id: createId(),
          name: 'Staking Enthusiast',
          description: 'Awarded to users who stake at least 1000 μPVX.',
          imageUrl: '/assets/badges/staker.svg',
          tier: 'bronze',
          category: 'staking',
          requirements: { amountRequired: 1000 },
          dateAdded: Date.now()
        },
        {
          id: createId(),
          name: 'Governance Participant',
          description: 'Awarded to users who have participated in at least one proposal vote.',
          imageUrl: '/assets/badges/governance.svg',
          tier: 'bronze',
          category: 'governance',
          requirements: { votesRequired: 1 },
          dateAdded: Date.now()
        },
        {
          id: createId(),
          name: 'Thringlet Master',
          description: 'Awarded to users who have interacted with their Thringlet more than 50 times.',
          imageUrl: '/assets/badges/thringlet.svg',
          tier: 'gold',
          category: 'thringlet',
          requirements: { interactionsRequired: 50 },
          dateAdded: Date.now()
        }
      ];
      console.log(`[DB Init] No existing learning modules found. Initializing ${learningModulesToInsert.length} default learning module(s)...`);
      const moduleId = learningModulesToInsert[0].id; // Assuming first module is the one with questions
      await db.insert(schema.learningModules).values(learningModulesToInsert);
      
      const questionsToInsert = [
        {
          id: createId(),
          moduleId: moduleId,
          text: 'What is a blockchain?', // Using 'text' as per the actual column name
          options: ['A type of cryptocurrency', 'A distributed ledger technology', 'A programming language', 'A cloud storage solution'],
          correctOption: 1,
          explanation: 'A blockchain is a distributed ledger technology that maintains a continuously growing list of records called blocks that are linked and secured using cryptography.'
        },
        {
          id: createId(),
          moduleId: moduleId,
          text: 'What is the purpose of mining in a blockchain?', // Using 'text' as per the actual column name
          options: ['To create new cryptocurrencies', 'To validate and add transactions to the blockchain', 'To hack into user accounts', 'To encrypt messages'],
          correctOption: 1,
          explanation: 'Mining is the process by which new transactions are verified and added to the blockchain. Miners solve complex puzzles to validate transactions and secure the network.'
        },
        {
          id: createId(),
          moduleId: moduleId,
          text: 'What is a private key in blockchain?', // Using 'text' as per the actual column name
          options: ['A password to access your email', 'A secret code used to sign transactions and prove ownership', 'A public identifier shared with others', 'The blockchain network ID'],
          correctOption: 1,
          explanation: 'A private key is a secret, alphanumeric password that allows users to sign transactions and access their cryptocurrency. It should never be shared with others.'
        }
      ];
      console.log(`[DB Init] Initializing ${questionsToInsert.length} questions for module ID ${moduleId}...`);
      await db.insert(schema.learningQuestions).values(questionsToInsert);
      console.log(`[DB Init] ${learningModulesToInsert.length} learning module(s) and ${questionsToInsert.length} questions initialized successfully.`);
      } else {
        console.log(`[DB Init] Found ${existingModules.length} existing learning modules. Skipping initialization.`);
      }
    } catch (err) {
      console.error('[DB Init] Error initializing learning modules:', err);
    }
    
    // Check if we need to migrate data from in-memory storage
    console.log('[DB Init] Checking for in-memory data migration to database...');
    try {
      const walletCountResult = await db.select({ count: sql<number>`count(*)` }).from(schema.wallets);
      const walletCount = walletCountResult[0].count;
      
      if (walletCount === 0 && memBlockchainStorage) {
      console.log('[DB Init] No wallets in DB, attempting to migrate data from in-memory storage...');
      
      let migratedWalletsCount = 0;
      let migratedMinerStatsCount = 0;
      let migratedBlocksCount = 0;
      let migratedTransactionsCount = 0;
      let migratedStakeRecordsCount = 0;

      try {
        // Migrate wallets
        const wallets = Array.from(memBlockchainStorage.wallets.values());
        if (wallets.length > 0) {
          console.log(`[DB Init] Migrating ${wallets.length} wallets from memory...`);
          for (const wallet of wallets) {
            try {
              await db.insert(schema.wallets).values({
                address: wallet.address,
                publicKey: wallet.publicKey || 'default_public_key',
                balance: wallet.balance,
                createdAt: wallet.createdAt,
                lastUpdated: wallet.lastUpdated || new Date(), // Use lastUpdated instead of lastSynced
                passphraseSalt: wallet.passphraseSalt,
                passphraseHash: wallet.passphraseHash
              }).onConflictDoNothing(); // Use onConflictDoNothing or update based on your logic
              migratedWalletsCount++;
            } catch (error) {
              console.error(`[DB Init] Error migrating wallet ${wallet.address}:`, error);
            }
          }
          console.log(`[DB Init] Finished migrating ${migratedWalletsCount} wallets.`);
        } else {
          console.log('[DB Init] No wallets in memory to migrate.');
        }
        
        // Migrate mining stats
        const minerStats = await memBlockchainStorage.getAllActiveMiners();
        if (minerStats.length > 0) {
          console.log(`[DB Init] Migrating ${minerStats.length} miner stats from memory...`);
          for (const stats of minerStats) {
            try {
              let hashRate = stats.currentHashRate; // Ensure hashRate is correctly parsed as number
              if (typeof hashRate === 'string') {
                if (hashRate.includes('MH/s')) {
                  hashRate = parseInt(parseFloat(hashRate.replace('MH/s', '').trim()) * 1000000);
                } else if (hashRate.includes('H/s')) {
                  hashRate = parseInt(hashRate.replace('H/s', '').trim());
                } else {
                  hashRate = parseInt(hashRate) || 0;
                }
              } else if (typeof hashRate !== 'number') {
                hashRate = 0;
              }
              await db.insert(schema.minerStats).values({
                address: stats.address,
                blocksMined: stats.blocksMined,
                totalRewards: stats.totalRewards,
                lastBlockMined: stats.lastBlockMined,
                isCurrentlyMining: stats.isCurrentlyMining,
                hardware: stats.hardware,
                joinedAt: stats.joinedAt,
                currentHashRate: hashRate
              }).onConflictDoNothing(); // Assuming address is primary key and you want to skip if exists
              migratedMinerStatsCount++;
            } catch (error) {
              console.error(`[DB Init] Error migrating miner stats for ${stats.address}:`, error);
            }
          }
          console.log(`[DB Init] Finished migrating ${migratedMinerStatsCount} miner stats.`);
        } else {
          console.log('[DB Init] No miner stats in memory to migrate.');
        }
        
        // Migrate blocks - last 100 for performance reasons
        const blocks = await memBlockchainStorage.getRecentBlocks(100); // Configurable limit
        if (blocks.length > 0) {
          console.log(`[DB Init] Migrating last ${blocks.length} blocks from memory...`);
          for (const block of blocks) {
            await db.insert(schema.blocks).values({
              height: block.height,
              hash: block.hash,
              previousHash: block.previousHash,
              timestamp: block.timestamp,
              nonce: block.nonce,
              difficulty: block.difficulty,
              miner: block.miner,
              merkleRoot: block.merkleRoot,
              totalTransactions: block.totalTransactions,
              size: block.size
            }).onConflictDoNothing(); // Assuming height is primary key and you want to skip if exists
            migratedBlocksCount++;
          }
          console.log(`[DB Init] Finished migrating ${migratedBlocksCount} blocks.`);
        } else {
          console.log('[DB Init] No blocks in memory to migrate.');
        }
        
        // Migrate transactions - last 200 for performance reasons
        const transactions = await memBlockchainStorage.getRecentTransactions(200); // Configurable limit
        if (transactions.length > 0) {
          console.log(`[DB Init] Migrating last ${transactions.length} transactions from memory...`);
          for (const tx of transactions) {
            await db.insert(schema.transactions).values({
              hash: tx.hash,
              type: tx.type,
              fromAddress: tx.from,
              toAddress: tx.to,
              amount: tx.amount,
              timestamp: tx.timestamp,
              nonce: tx.nonce,
              signature: tx.signature,
              status: tx.status,
              blockHeight: tx.blockHeight,
              fee: tx.fee ? tx.fee : 0,
              metadata: tx.metadata
            }).onConflictDoNothing(); // Assuming hash is primary key
            migratedTransactionsCount++;
          }
          console.log(`[DB Init] Finished migrating ${migratedTransactionsCount} transactions.`);
        } else {
          console.log('[DB Init] No transactions in memory to migrate.');
        }
        
        // Migrate staking records
        const stakePoolsFromMem = await memBlockchainStorage.getStakingPools(); // Renamed to avoid conflict
        if (stakePoolsFromMem.length > 0) {
          console.log(`[DB Init] Migrating staking records from memory for ${stakePoolsFromMem.length} pools...`);
          for (const pool of stakePoolsFromMem) { // Use the renamed variable
            const stakeRecords = await memBlockchainStorage.getActiveStakesByPoolId(pool.id);
            if (stakeRecords.length > 0) {
              for (const stake of stakeRecords) {
                await db.insert(schema.stakeRecords).values({
                id: stake.id,
                walletAddress: stake.walletAddress,
                poolId: stake.poolId,
                amount: stake.amount,
                startTime: stake.startTime,
                endTime: stake.endTime,
                isActive: stake.isActive,
                rewards: stake.rewards,
                lastRewardClaim: stake.lastRewardClaim,
                  autoCompound: stake.autoCompound
                }).onConflictDoNothing(); // Assuming id is primary key
                migratedStakeRecordsCount++;
              }
              console.log(`[DB Init] Migrated ${migratedStakeRecordsCount} stake records for pool ${pool.id}.`);
              migratedStakeRecordsCount = 0; // Reset for next pool
            }
          }
        } else {
          console.log('[DB Init] No staking pools in memory to migrate records from.');
        }
        console.log('[DB Init] In-memory data migration process completed.');
      } catch (err) {
        console.error('[DB Init] Error during in-memory data migration:', err);
      }
      } else {
        console.log(`[DB Init] Found ${walletCount} wallets in DB. Skipping in-memory data migration.`);
      }
    } catch (err) {
      console.error('[DB Init] Error during wallet count check or migration decision:', err);
    }
    
    // Close connection
    await client.end();
    console.log('[DB Init] Database connection closed after initialization.');
    
    console.log('[DB Init] initializeDatabase completed successfully.');
    return true;
  } catch (error) {
    console.error('[DB Init] Critical error during initializeDatabase:', error);
    return false;
  }
}

// Export both as default and named
export default initializeDatabase;

// Export the dbInit object that server/index.ts is expecting
export const dbInit = {
  initDatabaseWithMigration: initializeDatabase, // This already includes seeding logic
  seedDefaultData: async () => {
    // This function might be redundant if initDatabaseWithMigration handles all seeding.
    // For clarity, it can be kept if there's a desire to separate initial schema/migration from pure data seeding.
    // However, the current initializeDatabase seems to do both.
    console.log('[DB Init] seedDefaultData called. Current implementation seeds data during initDatabaseWithMigration.');
    return true;
  }
};