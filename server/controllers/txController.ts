import { Request, Response } from 'express';
import crypto from 'crypto';
import { memBlockchainStorage } from '../mem-blockchain';
import { transactionDao } from '../database/transactionDao';
import { walletDao } from '../database/walletDao';
import * as cryptoUtils from '../utils/crypto';
import * as passphraseUtils from '../utils/passphrase';
import { TransactionType, Transaction } from '../types';
import { checkTransactionBadges } from './badgeController';
import { broadcastTransaction } from '../utils/websocket';

/**
 * Send transaction
 * POST /api/tx/send
 */
export const sendTransaction = async (req: Request, res: Response) => {
  try {
    const { from, to, amount, passphrase, memo } = req.body;
    
    if (!from || !to || !amount || !passphrase) {
      return res.status(400).json({ 
        error: 'From address, to address, amount, and passphrase are required' 
      });
    }
    
    // Verify sender wallet exists
    const wallet = await memBlockchainStorage.getWalletByAddress(from);
    if (!wallet) {
      return res.status(404).json({ error: 'Sender wallet not found' });
    }
    
    // Use centralized passphrase verification utility
    const isPassphraseValid = passphraseUtils.verifyPassphrase(
      passphrase,
      wallet.passphraseSalt,
      wallet.passphraseHash
    );
    
    // Log verification outcome
    console.log('Transaction send passphrase verification:', {
      address: from,
      valid: isPassphraseValid
    });
    
    // For test wallets, allow bypass in development
    if (!isPassphraseValid) {
      if (process.env.NODE_ENV !== 'production' && passphraseUtils.isKnownTestWallet(from)) {
        console.log('DEV MODE: Bypassing passphrase check for known wallet address in transaction:', from);
      } else {
        return res.status(401).json({ error: 'Invalid passphrase' });
      }
    }
    
    // Check balance
    if (BigInt(wallet.balance) < BigInt(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Create transaction
    const timestamp = Date.now();
    const txHash = crypto.createHash('sha256')
      .update(from + to + amount + timestamp.toString())
      .digest('hex');
    
    const transaction: Transaction = {
      hash: txHash,
      type: 'TRANSFER',
      from,
      to,
      amount,
      timestamp,
      nonce: Math.floor(Math.random() * 100000),
      signature: cryptoUtils.generateRandomHash(),
      status: 'pending'
    };
    
    // Update sender wallet balance
    const senderBalance = BigInt(wallet.balance) - BigInt(amount);
    wallet.balance = senderBalance.toString();
    await memBlockchainStorage.updateWallet(wallet);
    
    // Add to or create receiver wallet
    const receiverWallet = await memBlockchainStorage.getWalletByAddress(to);
    if (receiverWallet) {
      const receiverBalance = BigInt(receiverWallet.balance) + BigInt(amount);
      receiverWallet.balance = receiverBalance.toString();
      await memBlockchainStorage.updateWallet(receiverWallet);
    } else {
      // Create receiver wallet if it doesn't exist
      await memBlockchainStorage.createWallet({
        address: to,
        publicKey: cryptoUtils.generateRandomHash(),
        balance: amount,
        createdAt: new Date(),
        lastUpdated: new Date(), // Changed from lastSynced to match database schema
        passphraseSalt: '',
        passphraseHash: ''
      });
    }
    
    // Store transaction
    await memBlockchainStorage.createTransaction(transaction);
    
    // Broadcast transaction via WebSocket for real-time updates
    try {
      broadcastTransaction(transaction);
    } catch (err) {
      console.error('Error broadcasting transaction via WebSocket:', err);
      // Continue even if WebSocket broadcast fails
    }
    
    // Check for transaction-related achievements
    try {
      // Get transaction count for this sender
      const senderTxs = await memBlockchainStorage.getTransactionsByAddress(from);
      // Check and award badges
      await checkTransactionBadges(from, amount, senderTxs.length);
    } catch (err) {
      console.error('Error checking transaction badges:', err);
      // Continue even if badge check fails
    }
    
    res.status(201).json({ 
      tx_hash: txHash, 
      status: 'success' 
    });
  } catch (error) {
    console.error('Error sending transaction:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send transaction'
    });
  }
};

/**
 * Get transaction history for wallet
 * GET /api/tx/history/:address
 */
export const getTransactionHistory = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;
    
    // Check if wallet exists
    const wallet = await walletDao.getWalletByAddress(address);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Get transactions from database for address
    const transactions = await transactionDao.getTransactionsByAddress(address, limit, offset);
    
    // Format for response with consistent property names
    const formattedTxs = transactions.map(tx => ({
      tx_type: tx.type,
      amount: tx.amount,
      to: tx.to,
      from: tx.from,
      timestamp: tx.timestamp,
      hash: tx.hash,
      nonce: tx.nonce,
      status: tx.status,
      fee: tx.fee || 0,
      block_height: tx.blockHeight
    }));
    
    res.json(formattedTxs);
  } catch (error) {
    console.error('Error getting transaction history:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get transaction history'
    });
  }
};

/**
 * Get transaction details
 * GET /api/tx/:hash
 */
export const getTransactionDetails = async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    
    // Get transaction by hash from the database
    const transaction = await transactionDao.getTransactionByHash(hash);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({
      hash: transaction.hash,
      type: transaction.type,
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      timestamp: transaction.timestamp,
      nonce: transaction.nonce,
      signature: transaction.signature,
      status: transaction.status,
      block_height: transaction.blockHeight,
      fee: transaction.fee || 0,
      metadata: transaction.metadata
    });
  } catch (error) {
    console.error('Error getting transaction details:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get transaction details'
    });
  }
};

/**
 * Get recent transactions
 * GET /api/tx/recent
 */
export const getRecentTransactions = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10;
    
    // Get recent transactions from database
    const transactions = await transactionDao.getRecentTransactions(limit);
    
    // Format for response
    const formattedTxs = transactions.map(tx => ({
      tx_type: tx.type,
      amount: tx.amount,
      to: tx.to,
      from: tx.from,
      timestamp: tx.timestamp,
      hash: tx.hash,
      nonce: tx.nonce,
      status: tx.status,
      fee: tx.fee || 0,
      block_height: tx.blockHeight
    }));
    
    res.json(formattedTxs);
  } catch (error) {
    console.error('Error getting recent transactions:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get recent transactions'
    });
  }
};