import { eq, desc, lte, gte, and } from 'drizzle-orm';
import { db } from './index';
import { blocks } from './schema';
import { Block } from '@shared/types';

/**
 * Data access object for blocks
 */
export class BlockDao {
  /**
   * Create a new block
   * @param block Block to create
   * @returns Created block
   */
  async createBlock(block: Block): Promise<Block> {
    console.log(`[BlockDAO] createBlock called for height: ${block.height}, hash: ${block.hash}`);
    try {
      const dbBlock = {
        height: block.height,
        hash: block.hash,
        previousHash: block.previousHash,
        timestamp: BigInt(block.timestamp),
        nonce: BigInt(block.nonce),
        difficulty: block.difficulty,
        miner: block.miner,
        merkleRoot: block.merkleRoot,
        totalTransactions: block.totalTransactions,
        size: block.size,
      };

      await db.insert(blocks).values(dbBlock);
      console.log(`[BlockDAO] Block ${block.height} created successfully.`);
      return block;
    } catch (error) {
      console.error(`[BlockDAO] Error creating block ${block.height}:`, error.message);
      throw new Error(`Failed to create block ${block.height}: ${error.message}`);
    }
  }

  /**
   * Get block by height
   * @param height Block height
   * @returns Block or null if not found
   */
  async getBlockByHeight(height: number): Promise<Block | null> {
    console.log(`[BlockDAO] getBlockByHeight called for height: ${height}`);
    try {
      const result = await db.select().from(blocks).where(eq(blocks.height, height)).limit(1);
      
      if (result.length === 0) {
        console.log(`[BlockDAO] Block with height ${height} not found.`);
        return null;
      }
      
      console.log(`[BlockDAO] Block with height ${height} found.`);
      const dbBlock = result[0];
      const dbBlock = result[0];
      return {
        height: dbBlock.height,
        hash: dbBlock.hash,
        previousHash: dbBlock.previousHash,
        timestamp: Number(dbBlock.timestamp),
        nonce: Number(dbBlock.nonce),
        difficulty: dbBlock.difficulty,
        miner: dbBlock.miner,
        merkleRoot: dbBlock.merkleRoot,
        totalTransactions: dbBlock.totalTransactions,
        size: dbBlock.size,
        transactions: [] // Transactions need to be loaded separately
      };
    } catch (error) {
      console.error(`[BlockDAO] Error getting block by height ${height}:`, error.message);
      throw new Error(`Failed to get block by height ${height}: ${error.message}`);
    }
  }

  /**
   * Get block by hash
   * @param hash Block hash
   * @returns Block or null if not found
   */
  async getBlockByHash(hash: string): Promise<Block | null> {
    console.log(`[BlockDAO] getBlockByHash called for hash: ${hash}`);
    try {
      const result = await db.select().from(blocks).where(eq(blocks.hash, hash)).limit(1);
      
      if (result.length === 0) {
        console.log(`[BlockDAO] Block with hash ${hash} not found.`);
        return null;
      }
      
      console.log(`[BlockDAO] Block with hash ${hash} found.`);
      const dbBlock = result[0];
      const dbBlock = result[0];
      return {
        height: dbBlock.height,
        hash: dbBlock.hash,
        previousHash: dbBlock.previousHash,
        timestamp: Number(dbBlock.timestamp),
        nonce: Number(dbBlock.nonce),
        difficulty: dbBlock.difficulty,
        miner: dbBlock.miner,
        merkleRoot: dbBlock.merkleRoot,
        totalTransactions: dbBlock.totalTransactions,
        size: dbBlock.size,
        transactions: [] // Transactions need to be loaded separately
      };
    } catch (error) {
      console.error(`[BlockDAO] Error getting block by hash ${hash}:`, error.message);
      throw new Error(`Failed to get block by hash ${hash}: ${error.message}`);
    }
  }

  /**
   * Get latest block
   * @returns Latest block or null if no blocks exist
   */
  async getLatestBlock(): Promise<Block | null> {
    console.log(`[BlockDAO] getLatestBlock called.`);
    try {
      const result = await db.select().from(blocks).orderBy(desc(blocks.height)).limit(1);
      
      if (result.length === 0) {
        console.log(`[BlockDAO] No blocks found in the database.`);
        return null;
      }
      
      console.log(`[BlockDAO] Latest block found with height: ${result[0].height}.`);
      const dbBlock = result[0];
      const dbBlock = result[0];
      return {
        height: dbBlock.height,
        hash: dbBlock.hash,
        previousHash: dbBlock.previousHash,
        timestamp: Number(dbBlock.timestamp),
        nonce: Number(dbBlock.nonce),
        difficulty: dbBlock.difficulty,
        miner: dbBlock.miner,
        merkleRoot: dbBlock.merkleRoot,
        totalTransactions: dbBlock.totalTransactions,
        size: dbBlock.size,
        transactions: [] // Transactions need to be loaded separately
      };
    } catch (error) {
      console.error(`[BlockDAO] Error getting latest block:`, error.message);
      throw new Error(`Failed to get latest block: ${error.message}`);
    }
  }

  /**
   * Get recent blocks
   * @param limit Maximum number of blocks to return
   * @returns Array of blocks
   */
  async getRecentBlocks(limit: number = 10): Promise<Block[]> {
    console.log(`[BlockDAO] getRecentBlocks called with limit: ${limit}`);
    try {
      const result = await db.select().from(blocks).orderBy(desc(blocks.height)).limit(limit);
      console.log(`[BlockDAO] Found ${result.length} recent blocks.`);
      return result.map(dbBlock => ({
        height: dbBlock.height,
        hash: dbBlock.hash,
        previousHash: dbBlock.previousHash,
        timestamp: Number(dbBlock.timestamp),
        nonce: Number(dbBlock.nonce),
        difficulty: dbBlock.difficulty,
        miner: dbBlock.miner,
        merkleRoot: dbBlock.merkleRoot,
        totalTransactions: dbBlock.totalTransactions,
        size: dbBlock.size,
        transactions: [] // Transactions need to be loaded separately
      }));
    } catch (error) {
      console.error(`[BlockDAO] Error getting recent blocks:`, error.message);
      throw new Error(`Failed to get recent blocks: ${error.message}`);
    }
  }

  /**
   * Get blocks in height range
   * @param startHeight Start height (inclusive)
   * @param endHeight End height (inclusive)
   * @returns Array of blocks
   */
  async getBlocksByHeightRange(startHeight: number, endHeight: number): Promise<Block[]> {
    console.log(`[BlockDAO] getBlocksByHeightRange called for range: ${startHeight}-${endHeight}`);
    try {
      const result = await db.select().from(blocks)
        .where(
          and(
            gte(blocks.height, startHeight),
            lte(blocks.height, endHeight)
          )
        )
        .orderBy(desc(blocks.height));
      console.log(`[BlockDAO] Found ${result.length} blocks in height range ${startHeight}-${endHeight}.`);
      return result.map(dbBlock => ({
        height: dbBlock.height,
        hash: dbBlock.hash,
        previousHash: dbBlock.previousHash,
        timestamp: Number(dbBlock.timestamp),
        nonce: Number(dbBlock.nonce),
        difficulty: dbBlock.difficulty,
        miner: dbBlock.miner,
        merkleRoot: dbBlock.merkleRoot,
        totalTransactions: dbBlock.totalTransactions,
        size: dbBlock.size,
        transactions: [] // Transactions need to be loaded separately
      }));
    } catch (error) {
      console.error(`[BlockDAO] Error getting blocks by height range ${startHeight}-${endHeight}:`, error.message);
      throw new Error(`Failed to get blocks in range ${startHeight}-${endHeight}: ${error.message}`);
    }
  }

  /**
   * Get blocks by miner
   * @param minerAddress Miner address
   * @param limit Maximum number of blocks to return
   * @returns Array of blocks
   */
  async getBlocksByMiner(minerAddress: string, limit: number = 10): Promise<Block[]> {
    console.log(`[BlockDAO] getBlocksByMiner called for miner: ${minerAddress}, limit: ${limit}`);
    try {
      const result = await db.select().from(blocks)
        .where(eq(blocks.miner, minerAddress))
        .orderBy(desc(blocks.height))
        .limit(limit);
      console.log(`[BlockDAO] Found ${result.length} blocks by miner ${minerAddress}.`);
      return result.map(dbBlock => ({
        height: dbBlock.height,
        hash: dbBlock.hash,
        previousHash: dbBlock.previousHash,
        timestamp: Number(dbBlock.timestamp),
        nonce: Number(dbBlock.nonce),
        difficulty: dbBlock.difficulty,
        miner: dbBlock.miner,
        merkleRoot: dbBlock.merkleRoot,
        totalTransactions: dbBlock.totalTransactions,
        size: dbBlock.size,
        transactions: [] // Transactions need to be loaded separately
      }));
    } catch (error) {
      console.error(`[BlockDAO] Error getting blocks by miner ${minerAddress}:`, error.message);
      throw new Error(`Failed to get blocks by miner ${minerAddress}: ${error.message}`);
    }
  }

  /**
   * Get total block count
   * @returns Total number of blocks
   */
  async getTotalBlockCount(): Promise<number> {
    console.log(`[BlockDAO] getTotalBlockCount called.`);
    try {
      const result = await db.select({ count: db.fn.count(blocks.height) }).from(blocks);
      const count = Number(result[0]?.count || 0);
      console.log(`[BlockDAO] Total block count: ${count}.`);
      return count;
    } catch (error) {
      console.error(`[BlockDAO] Error getting total block count:`, error.message);
      throw new Error(`Failed to get total block count: ${error.message}`);
    }
  }
}

// Create a singleton instance
export const blockDao = new BlockDao();