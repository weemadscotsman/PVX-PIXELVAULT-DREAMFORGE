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
  console.log(`[TxController] sendTransaction: Request received ${req.method} ${req.originalUrl}`);
  try {
    const { from, to, amount, passphrase, memo } = req.body; // Passphrase itself won't be logged for security
    console.log(`[TxController] sendTransaction: Body - from=${from}, to=${to}, amount=${amount}, memo=${memo ? 'present' : 'not present'}`);
    
    if (!from || !to || !amount || !passphrase) {
      console.warn(`[TxController] sendTransaction: Missing required fields. From: ${from}, To: ${to}, Amount: ${amount}, Passphrase: ${passphrase ? 'present' : 'missing'}`);
      return res.status(400).json({ error: 'From address, to address, amount, and passphrase are required' });
    }
    
    console.log(`[TxController] sendTransaction: Verifying sender wallet ${from} in memBlockchainStorage.`);
    const wallet = await memBlockchainStorage.getWalletByAddress(from); // Assumes memBlockchainStorage logs if needed
    if (!wallet) {
      console.warn(`[TxController] sendTransaction: Sender wallet ${from} not found.`);
      return res.status(404).json({ error: 'Sender wallet not found' });
    }
    
    console.log(`[TxController] sendTransaction: Verifying passphrase for wallet ${from}.`);
    const isPassphraseValid = passphraseUtils.verifyPassphrase(
      passphrase,
      wallet.passphraseSalt,
      wallet.passphraseHash
    );
    
    // Log verification outcome (already done in service/utils)
    // console.log('Transaction send passphrase verification:', { address: from, valid: isPassphraseValid });
    
    if (!isPassphraseValid) {
      if (process.env.NODE_ENV !== 'production' && passphraseUtils.isKnownTestWallet(from)) {
        console.log(`[TxController] sendTransaction: DEV MODE - Bypassing passphrase check for known test wallet ${from}.`);
      } else {
        console.warn(`[TxController] sendTransaction: Invalid passphrase for wallet ${from}.`);
        return res.status(401).json({ error: 'Invalid passphrase' });
      }
    }
    
    console.log(`[TxController] sendTransaction: Passphrase verified for ${from}. Checking balance.`);
    if (BigInt(wallet.balance) < BigInt(amount)) {
      console.warn(`[TxController] sendTransaction: Insufficient balance for wallet ${from}. Balance: ${wallet.balance}, Amount: ${amount}`);
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    console.log(`[TxController] sendTransaction: Balance sufficient for ${from}. Creating transaction.`);
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
    
    await memBlockchainStorage.createTransaction(transaction); // Assumes memBlockchainStorage logs
    console.log(`[TxController] sendTransaction: Transaction ${txHash} (type: ${transaction.type}) created and stored in memBlockchainStorage.`);
    
    try {
      broadcastTransaction(transaction);
      console.log(`[TxController] sendTransaction: Transaction ${txHash} broadcasted via WebSocket.`);
    } catch (err) {
      console.error('[TxController] sendTransaction: Error broadcasting transaction via WebSocket:', err.message);
    }
    
    try {
      console.log(`[TxController] sendTransaction: Checking transaction badges for sender ${from}.`);
      const senderTxs = await memBlockchainStorage.getTransactionsByAddress(from);
      await checkTransactionBadges(from, transaction.type as TransactionType, senderTxs.length); // Pass correct type
      console.log(`[TxController] sendTransaction: Transaction badges checked for ${from}.`);
    } catch (err) {
      console.error('[TxController] sendTransaction: Error checking transaction badges:', err.message);
    }
    
    console.log(`[TxController] sendTransaction: Sending 201 Created response for transaction ${txHash}.`);
    res.status(201).json({ tx_hash: txHash, status: 'success' });
  } catch (error) {
    console.error(`[TxController] sendTransaction: Error processing send transaction from ${req.body.from} to ${req.body.to}:`, error.message);
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
  const { address } = req.params;
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;
  console.log(`[TxController] getTransactionHistory: Request received ${req.method} ${req.originalUrl} for Address: ${address}, Limit: ${limit}, Offset: ${offset}`);
  try {
    console.log(`[TxController] getTransactionHistory: Checking if wallet ${address} exists via walletDao.`);
    const wallet = await walletDao.getWalletByAddress(address); // Assumes walletDao logs
    if (!wallet) {
      console.warn(`[TxController] getTransactionHistory: Wallet ${address} not found.`);
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    console.log(`[TxController] getTransactionHistory: Fetching transactions for ${address} from transactionDao.`);
    const transactions = await transactionDao.getTransactionsByAddress(address, limit, offset); // Assumes transactionDao logs
    console.log(`[TxController] getTransactionHistory: Found ${transactions.length} transactions for ${address}.`);
    
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
    
    console.log(`[TxController] getTransactionHistory: Sending 200 OK response with ${formattedTxs.length} transactions for ${address}.`);
    res.json(formattedTxs);
  } catch (error) {
    console.error(`[TxController] getTransactionHistory: Error getting transaction history for ${address}:`, error.message);
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
  const { hash } = req.params;
  console.log(`[TxController] getTransactionDetails: Request received ${req.method} ${req.originalUrl} for TxHash: ${hash}`);
  try {
    console.log(`[TxController] getTransactionDetails: Fetching transaction ${hash} from transactionDao.`);
    const transaction = await transactionDao.getTransactionByHash(hash); // Assumes transactionDao logs
    
    if (!transaction) {
      console.warn(`[TxController] getTransactionDetails: Transaction ${hash} not found.`);
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const responsePayload = { /* ... attributes ... */
      hash: transaction.hash, type: transaction.type, from: transaction.from, to: transaction.to,
      amount: transaction.amount, timestamp: transaction.timestamp, nonce: transaction.nonce,
      signature: transaction.signature, status: transaction.status, block_height: transaction.blockHeight,
      fee: transaction.fee || 0, metadata: transaction.metadata
    };
    console.log(`[TxController] getTransactionDetails: Transaction ${hash} found. Sending 200 OK response.`);
    res.json(responsePayload);
  } catch (error) {
    console.error(`[TxController] getTransactionDetails: Error getting details for transaction ${hash}:`, error.message);
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
  const limit = Number(req.query.limit) || 10;
  console.log(`[TxController] getRecentTransactions: Request received ${req.method} ${req.originalUrl} with Limit: ${limit}`);
  try {
    console.log(`[TxController] getRecentTransactions: Fetching ${limit} recent transactions from transactionDao.`);
    const transactions = await transactionDao.getRecentTransactions(limit); // Assumes transactionDao logs
    console.log(`[TxController] getRecentTransactions: Found ${transactions.length} recent transactions.`);
    
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
    
    console.log(`[TxController] getRecentTransactions: Sending 200 OK response with ${formattedTxs.length} transactions.`);
    res.json(formattedTxs);
  } catch (error) {
    console.error(`[TxController] getRecentTransactions: Error getting recent transactions:`, error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get recent transactions'
    });
  }
};