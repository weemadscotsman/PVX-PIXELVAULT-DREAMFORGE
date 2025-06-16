const assert = require('assert');
const crypto = require('crypto');
const { generateKeyPair, generateWalletAddress, signData } = require('../utils/crypto');
const { base64SpkiToPem, pemToBase64 } = require('../utils/formatters');

// Mocked DAO/Storage (since we are not running a full server or DB)
// These mocks need to be more sophisticated for thorough testing in a real setup.
const mockWalletStorage = new Map();
const mockTransactionStorage = [];

const mockWalletDao = {
  getWalletByAddress: async (address) => {
    console.log(`[MockWalletDAO] getWalletByAddress called for: ${address}`);
    return mockWalletStorage.get(address);
  },
  createWallet: async (walletData) => {
    console.log(`[MockWalletDAO] createWallet called for: ${walletData.address}`);
    if (mockWalletStorage.has(walletData.address)) {
      // Simulate conflict for already existing wallet if necessary for a test
      // For this simplified test, allow overwrite or assume it's handled by controller logic
    }
    mockWalletStorage.set(walletData.address, { ...walletData, balance: String(walletData.balance) });
    return walletData;
  },
   updateWalletBalance: async (address, newBalance) => {
    console.log(`[MockWalletDAO] updateWalletBalance for ${address} to ${newBalance}`);
    const wallet = mockWalletStorage.get(address);
    if (wallet) {
      wallet.balance = String(newBalance);
      mockWalletStorage.set(address, wallet);
    }
    return wallet;
  }
};

const mockMemBlockchainStorage = {
  getWalletByAddress: async (address) => mockWalletStorage.get(address),
  updateWallet: async (wallet) => {
    if (mockWalletStorage.has(wallet.address)) {
      mockWalletStorage.set(wallet.address, wallet);
    }
  },
  createTransaction: async (tx) => {
    mockTransactionStorage.push(tx);
  },
  // Add other methods if txController directly uses them
};

// Mock transactionDao
const mockTransactionDao = {
    createTransaction: async (tx) => {
        mockTransactionStorage.push(tx);
        return tx;
    }
};


// --- Import Controller Functions (adjust path if necessary) ---
// This is tricky as controllers are Express handlers. We'll test their core logic.
// For a real integration test, use Supertest or similar to hit actual HTTP endpoints.
// Here, we'll simulate the request by directly calling the controller functions
// with mock req/res objects, focusing on the internal logic path.

const { createWallet } = require('../controllers/walletController');
const { sendTransaction } = require('../controllers/txController');

// Helper for mock response
function getMockRes() {
  let status = 200;
  let jsonResponse = null;
  return {
    status: (s) => { status = s; return { json: (d) => { jsonResponse = d; } }; },
    json: (d) => { jsonResponse = d; },
    cookie: () => {}, // Mock cookie function
    _getStatus: () => status,
    _getJSON: () => jsonResponse,
  };
}

describe('Transaction Signature Pipeline Integration Test (Controller Logic)', () => {
  let testKeys;
  let testAddress;
  let testPublicKeyPem;
  let testPublicKeyBase64Spki;

  before(async () => {
    testKeys = generateKeyPair(); // { privateKey (PEM), publicKey (PEM) }
    testPublicKeyPem = testKeys.publicKey;
    testAddress = generateWalletAddress(testPublicKeyPem);
    testPublicKeyBase64Spki = pemToBase64(testPublicKeyPem); // Simulate client format

    // Clear mock storage for clean test run
    mockWalletStorage.clear();
    mockTransactionStorage.length = 0;

    // Simulate wallet creation on server (directly calling controller logic)
    const mockCreateReq = {
      body: {
        publicKey: testPublicKeyBase64Spki, // Client sends base64 SPKI
        // passphrase might be needed if controller logic still uses it for salt/hash
      }
    };
    const mockCreateRes = getMockRes();
    // Temporarily replace DAOs/storage used by walletController if they are not the same mocks
    // For this test, assume walletController uses the same mockWalletDao & mockMemBlockchainStorage
    // or that its internal calls will eventually hit these mocks.
    // This part is highly dependent on how walletController is structured.
    // We'll assume walletDao.createWallet is the main persistence.

    // Manually add to mock storage to simulate prior wallet creation for tx test
    await mockWalletDao.createWallet({
        address: testAddress,
        publicKey: testPublicKeyPem, // Stored as PEM
        balance: "1000",
        createdAt: new Date(),
        lastUpdated: new Date(),
        passphraseSalt: "test-salt", // Dummy values
        passphraseHash: "test-hash"
    });
     console.log(`Test wallet created for address ${testAddress} with public key ${testPublicKeyPem.substring(0,40)}...`);
  });

  it('should successfully verify a valid signed transaction', async () => {
    const transactionData = {
      from: testAddress,
      to: 'PVX_ReceiverTestAddr000000000002',
      amount: 100, // Numeric
      nonce: Date.now(),
      timestamp: Date.now(),
      memo: 'Test transaction valid',
    };

    // Server-side canonical string creation (mimicking what's in txController)
    const payloadString = `${transactionData.from}|${transactionData.to}|${transactionData.amount}|${transactionData.nonce}|${transactionData.timestamp}`;
    const signature = signData(payloadString, testKeys.privateKey);

    const mockReq = {
      method: 'POST',
      originalUrl: '/api/tx/send',
      body: {
        transactionData,
        signature,
        senderPublicKey: testPublicKeyBase64Spki, // Client sends base64 SPKI
      },
    };
    const mockRes = getMockRes();

    // Temporarily inject mocks if controller doesn't use them by default
    const originalWalletDao = require('../controllers/txController').walletDao; // Path might differ
    const originalTxDao = require('../controllers/txController').transactionDao;
    const originalMemStorage = require('../controllers/txController').memBlockchainStorage;

    require('../controllers/txController').walletDao = mockWalletDao;
    require('../controllers/txController').transactionDao = mockTransactionDao;
    require('../controllers/txController').memBlockchainStorage = mockMemBlockchainStorage;

    await sendTransaction(mockReq, mockRes);

    // Restore original DAOs
    require('../controllers/txController').walletDao = originalWalletDao;
    require('../controllers/txController').transactionDao = originalTxDao;
    require('../controllers/txController').memBlockchainStorage = originalMemStorage;


    assert.strictEqual(mockRes._getStatus(), 201, `Expected status 201, got ${mockRes._getStatus()}`);
    const jsonResponse = mockRes._getJSON();
    assert.ok(jsonResponse.tx_hash, 'Response should contain a transaction hash');
    assert.strictEqual(jsonResponse.status, 'success', 'Transaction status should be success');
    assert.strictEqual(mockTransactionStorage.length, 1, 'Transaction should be stored');
    assert.strictEqual(mockTransactionStorage[0].signature, signature, 'Stored transaction should have the correct signature');
    assert.strictEqual(mockTransactionStorage[0].from, testAddress, 'Stored transaction from address mismatch');

    const senderWallet = await mockWalletDao.getWalletByAddress(testAddress);
    assert.strictEqual(senderWallet.balance, "900", "Sender balance should be debited by 100"); // 1000 - 100
  });

  it('should reject a transaction with an invalid signature (tampered payload)', async () => {
    const transactionData = {
      from: testAddress,
      to: 'PVX_ReceiverTestAddr000000000003',
      amount: 50, nonce: Date.now(), timestamp: Date.now(), memo: 'Test tampered'
    };
    const originalPayloadString = `${transactionData.from}|${transactionData.to}|${transactionData.amount}|${transactionData.nonce}|${transactionData.timestamp}`;
    const signature = signData(originalPayloadString, testKeys.privateKey);

    // Tamper the transactionData *after* signing
    const tamperedTransactionData = { ...transactionData, amount: 5 };

    const mockReq = {
      method: 'POST', originalUrl: '/api/tx/send',
      body: {
        transactionData: tamperedTransactionData, // Send tampered data
        signature,
        senderPublicKey: testPublicKeyBase64Spki,
      },
    };
    const mockRes = getMockRes();

    const originalWalletDao = require('../controllers/txController').walletDao;
    const originalTxDao = require('../controllers/txController').transactionDao;
    const originalMemStorage = require('../controllers/txController').memBlockchainStorage;
    require('../controllers/txController').walletDao = mockWalletDao;
    require('../controllers/txController').transactionDao = mockTransactionDao;
    require('../controllers/txController').memBlockchainStorage = mockMemBlockchainStorage;

    await sendTransaction(mockReq, mockRes);

    require('../controllers/txController').walletDao = originalWalletDao;
    require('../controllers/txController').transactionDao = originalTxDao;
    require('../controllers/txController').memBlockchainStorage = originalMemStorage;

    assert.strictEqual(mockRes._getStatus(), 401, `Expected status 401 for tampered payload, got ${mockRes._getStatus()}`);
    assert.ok(mockRes._getJSON().error.includes('Invalid transaction signature'), 'Error message should indicate invalid signature');
  });

  it('should reject a transaction with public key mismatch', async () => {
    const otherKeys = generateKeyPair(); // Different key pair
    // const otherPublicKeyBase64Spki = pemToBase64(otherKeys.publicKey); // Not needed as we send the wrong one

    const transactionData = {
      from: testAddress, // Belongs to testKeys.publicKey
      to: 'PVX_ReceiverTestAddr000000000004',
      amount: 20, nonce: Date.now(), timestamp: Date.now(), memo: 'Test PK mismatch'
    };
    const payloadString = `${transactionData.from}|${transactionData.to}|${transactionData.amount}|${transactionData.nonce}|${transactionData.timestamp}`;
    const signature = signData(payloadString, testKeys.privateKey); // Signed with original private key

    const mockReq = {
      method: 'POST', originalUrl: '/api/tx/send',
      body: {
        transactionData,
        signature,
        senderPublicKey: pemToBase64(otherKeys.publicKey), // Send WRONG public key (base64 SPKI)
      },
    };
    const mockRes = getMockRes();

    const originalWalletDao = require('../controllers/txController').walletDao;
    const originalTxDao = require('../controllers/txController').transactionDao;
    const originalMemStorage = require('../controllers/txController').memBlockchainStorage;
    require('../controllers/txController').walletDao = mockWalletDao;
    require('../controllers/txController').transactionDao = mockTransactionDao;
    require('../controllers/txController').memBlockchainStorage = mockMemBlockchainStorage;

    await sendTransaction(mockReq, mockRes);

    require('../controllers/txController').walletDao = originalWalletDao;
    require('../controllers/txController').transactionDao = originalTxDao;
    require('../controllers/txController').memBlockchainStorage = originalMemStorage;

    assert.strictEqual(mockRes._getStatus(), 401, `Expected status 401 for PK mismatch, got ${mockRes._getStatus()}`);
    assert.ok(mockRes._getJSON().error.includes('Public key mismatch'), 'Error message should indicate PK mismatch');
  });

  // Add more tests: wrong private key for signature, insufficient balance after verification, etc.
});

// To run: mocha server/test/transactionPipeline.integration.test.js
// Ensure server is NOT running separately, as this test calls controller logic directly.
// This is a simplified integration test. Full E2E tests would use an HTTP client against a running server.
// The mocking of DAOs needs to be robust for real testing.
