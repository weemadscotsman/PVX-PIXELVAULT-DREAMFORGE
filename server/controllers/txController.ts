import { Request, Response } from 'express';
import crypto from 'crypto';
import { memBlockchainStorage } from '../mem-blockchain';
// Define CanonicalPayload and createPayloadString locally for txController
interface CanonicalPayload {
  from: string;
  to: string;
  amount: number;
  nonce: number;
  timestamp: number;
}

function createPayloadString(payload: CanonicalPayload): string {
  // Ensure the order and types match client-side serialization for signature verification
  return `${payload.from}|${payload.to}|${payload.amount}|${payload.nonce}|${payload.timestamp}`;
}
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
  console.log(`[TxController] sendTransaction (signed): Request received ${req.method} ${req.originalUrl}`);
  try {
import { base64SpkiToPem } from '../utils/formatters'; // Ensure this is at the top with other imports

export const sendTransaction = async (req: Request, res: Response) => {
  console.log(`[TxController] sendTransaction (signed): Request received ${req.method} ${req.originalUrl}`);
  try {
    const { transactionData, signature, senderPublicKey: clientSuppliedBase64Spki } = req.body; // Renamed for clarity
    console.log(`[TxController] sendTransaction (signed): From=${transactionData?.from}, To=${transactionData?.to}, Amount=${transactionData?.amount}, Signature=${signature ? signature.substring(0,10)+'...' : 'N/A'}, ClientPK(base64SPKI)=${clientSuppliedBase64Spki ? clientSuppliedBase64Spki.substring(0,30)+'...' : 'N/A'}`);

    if (!transactionData || !signature || !clientSuppliedBase64Spki || !transactionData.from) {
      console.warn(`[TxController] sendTransaction (signed): Missing required fields for signed transaction.`);
      return res.status(400).json({ error: 'Transaction data, signature, and sender public key are required.' });
    }

    const { from, to, amount, timestamp, nonce, memo } = transactionData;

    if (!from || !to || amount === undefined || !timestamp || nonce === undefined) {
      console.warn(`[TxController] sendTransaction (signed): Missing fields in transactionData. From: ${from}, To: ${to}, Amount: ${amount}, Timestamp: ${timestamp}, Nonce: ${nonce}`);
      return res.status(400).json({ error: 'TransactionData must include from, to, amount, timestamp, and nonce.' });
    }
    
    console.log(`[TxController] sendTransaction (signed): Fetching sender wallet ${from}.`);
    let senderWallet;
    try {
      senderWallet = await walletDao.getWalletByAddress(from); // Prioritize DB
      if (senderWallet) {
        console.log(`[TxController] sendTransaction (signed): Sender wallet ${from} found in DB.`);
      }
    } catch (dbError) {
      console.warn(`[TxController] sendTransaction (signed): Error fetching wallet ${from} from walletDao: ${dbError.message}. Trying memBlockchainStorage.`);
    }

    if (!senderWallet) {
      senderWallet = await memBlockchainStorage.getWalletByAddress(from); // Fallback to memory
      if (senderWallet) {
        console.log(`[TxController] sendTransaction (signed): Sender wallet ${from} found in memBlockchainStorage.`);
      }
    }

    if (!senderWallet) {
      console.warn(`[TxController] sendTransaction (signed): Sender wallet ${from} not found in DB or memory.`);
      return res.status(404).json({ error: 'Sender wallet not found.' });
    }
    console.log(`[TxController] sendTransaction (signed): Sender wallet ${from} found. Stored PK: ${senderWallet.publicKey ? senderWallet.publicKey.substring(0,30)+'...' : 'N/A'}`);

    if (!senderWallet.publicKey) {
        console.error(`[TxController] sendTransaction (signed): Stored wallet for ${from} has no public key.`);
        return res.status(400).json({ error: 'Sender public key not found on server.' });
    }

    // Convert client-supplied base64 SPKI public key to PEM format
    const pemSenderPublicKey = base64SpkiToPem(clientSuppliedBase64Spki);
    console.log(`[TxController] sendTransaction (signed): Converted client PK to PEM for verification: ${pemSenderPublicKey.substring(0,60)}...`);

    // Compare the PEM-formatted public key from request with the PEM-formatted stored public key
    if (senderWallet.publicKey !== pemSenderPublicKey) {
      console.error(`[TxController] sendTransaction (signed): Public key mismatch for sender ${from}. Request PK (PEM): ${pemSenderPublicKey.substring(0,60)+'...'}, Stored PK (PEM): ${senderWallet.publicKey.substring(0,60)+'...'.substring(0,30)}`);
      return res.status(401).json({ error: 'Public key mismatch. Transaction unauthorized.' });
    }
    console.log(`[TxController] sendTransaction (signed): Sender public key (PEM) matches stored public key for address ${from}.`);

    // Create the canonical payload string using the server-side function
    // Ensure the fields sent to createPayloadString match the CanonicalPayload interface (numeric amount, nonce, timestamp)
    const payloadForSigning: CanonicalPayload = {
        from: transactionData.from,
        to: transactionData.to,
        amount: Number(transactionData.amount),
        nonce: Number(transactionData.nonce),
        timestamp: Number(transactionData.timestamp),
    };
    const payloadString = createPayloadString(payloadForSigning);
    console.log(`[TxController] sendTransaction (signed): Verifying signature for server-side canonical payload: ${payloadString}`);

    const isSignatureValid = cryptoUtils.verifySignature(payloadString, signature, pemSenderPublicKey);

    if (!isSignatureValid) {
      console.warn(`[TxController] sendTransaction (signed): Invalid transaction signature for wallet ${from} using server-side canonical string.`);
      return res.status(401).json({ error: 'Invalid transaction signature.' });
    }
    console.log(`[TxController] sendTransaction (signed): Signature verified successfully for wallet ${from}. Checking balance.`);

    if (BigInt(senderWallet.balance) < BigInt(amount)) {
      console.warn(`[TxController] sendTransaction (signed): Insufficient balance for wallet ${from}. Balance: ${senderWallet.balance}, Amount: ${amount}`);
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    console.log(`[TxController] sendTransaction (signed): Balance sufficient for ${from}. Processing transaction.`);

    const txHash = crypto.createHash('sha256').update(payloadString).digest('hex'); // Hash of the canonical payload string
    
    const newTransaction: Transaction = {
      hash: txHash,
      type: 'TRANSFER', // Or derive from transactionData if it includes type
      from,
      to,
      amount: Number(amount),
      timestamp: Number(timestamp),
      nonce: Number(nonce),
      signature: signature, // Store the client's signature
      status: 'pending',
      metadata: { memo: memo || "" }
    };
    
    // Update sender wallet balance
    const senderBalance = BigInt(senderWallet.balance) - BigInt(amount);
    senderWallet.balance = senderBalance.toString();
    await memBlockchainStorage.updateWallet(senderWallet); // Update in memory for immediate effect
    // Consider updating via walletDao if DB is primary source of truth and available
    try { await walletDao.updateWalletBalance(from, senderWallet.balance); } catch(e){ console.warn(`[TxController] Failed to update sender balance in DB for ${from}: ${e.message}`)}

    console.log(`[TxController] sendTransaction (signed): Sender ${from} balance updated.`);

    // Update receiver wallet balance (or create if non-existent)
    let receiverWallet = await memBlockchainStorage.getWalletByAddress(to);
    if (receiverWallet) {
      const receiverBalance = BigInt(receiverWallet.balance) + BigInt(amount);
      receiverWallet.balance = receiverBalance.toString();
      await memBlockchainStorage.updateWallet(receiverWallet);
      try { await walletDao.updateWalletBalance(to, receiverWallet.balance); } catch(e){ console.warn(`[TxController] Failed to update receiver balance in DB for ${to}: ${e.message}`)}
      console.log(`[TxController] sendTransaction (signed): Receiver ${to} balance updated.`);
    } else {
      console.log(`[TxController] sendTransaction (signed): Receiver wallet ${to} not found, creating.`);
      const newReceiverWallet = {
        address: to,
        // IMPORTANT: Receiver's public key isn't known here. This is a simplification.
        // In a real system, an account (address) must exist with a known public key
        // or transactions to new addresses might be unspendable or require a different flow.
        publicKey: 'receiver_pk_placeholder_' + to,
        balance: amount.toString(),
        createdAt: new Date(),
        lastUpdated: new Date(),
      };
      await memBlockchainStorage.createWallet(newReceiverWallet);
      try { await walletDao.createWallet(newReceiverWallet); } catch(e){ console.warn(`[TxController] Failed to create receiver wallet in DB for ${to}: ${e.message}`)}
      console.log(`[TxController] sendTransaction (signed): Receiver wallet ${to} created.`);
    }
    
    await memBlockchainStorage.createTransaction(newTransaction);
    console.log(`[TxController] sendTransaction (signed): Transaction ${txHash} (type: ${newTransaction.type}) stored in memBlockchainStorage.`);
    try { await transactionDao.createTransaction(newTransaction); } catch(e){ console.warn(`[TxController] Failed to save transaction ${txHash} to DB: ${e.message}`)}
    
    try {
      broadcastTransaction(newTransaction);
      console.log(`[TxController] sendTransaction (signed): Transaction ${txHash} broadcasted via WebSocket.`);
    } catch (err) {
      console.error('[TxController] sendTransaction (signed): Error broadcasting transaction via WebSocket:', err.message);
    }
    
    try {
      console.log(`[TxController] sendTransaction (signed): Checking transaction badges for sender ${from}.`);
      const senderTxs = await memBlockchainStorage.getTransactionsByAddress(from); // Or from DB for accuracy
      await checkTransactionBadges(from, newTransaction.type as TransactionType, senderTxs.length);
      console.log(`[TxController] sendTransaction (signed): Transaction badges checked for ${from}.`);
    } catch (err) {
      console.error('[TxController] sendTransaction (signed): Error checking transaction badges:', err.message);
    }
    
    console.log(`[TxController] sendTransaction (signed): Sending 201 Created response for transaction ${txHash}.`);
    res.status(201).json({ tx_hash: txHash, status: 'success', transaction: newTransaction });
  } catch (error) {
    console.error(`[TxController] sendTransaction (signed): Error processing signed transaction from ${req.body?.transactionData?.from}:`, error.message, error.stack);
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