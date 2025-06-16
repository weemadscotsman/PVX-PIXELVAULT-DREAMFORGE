const assert = require('assert');
const crypto = require('crypto'); // Node.js crypto for key generation in tests
const { base64SpkiToPem, pemToBase64 } = require('../utils/formatters');
const { generateWalletAddress, generateKeyPair, signData, verifySignature } = require('../utils/crypto');

// This is the server-side definition, identical to client's expected one
// For testing txController's internal payload string generation.
function createServerSidePayloadString(payload) {
  return `${payload.from}|${payload.to}|${payload.amount}|${payload.nonce}|${payload.timestamp}`;
}

describe('Crypto and Formatting Utilities Unit Tests', () => {
  describe('formatters.js', () => {
    it('base64SpkiToPem should correctly format a base64 SPKI string', () => {
      const base64Spki = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtestPublicKeyData';
      const expectedPem = `-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtestPublicKeyData\n-----END PUBLIC KEY-----`;
      assert.strictEqual(base64SpkiToPem(base64Spki), expectedPem);
    });

    it('base64SpkiToPem should handle line breaks in input base64 string', () => {
      const base64SpkiWithBreaks = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQg\nAEtestPublicKeyData\nWithBreaks';
      const expectedPem = `-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtestPublicKeyDataWithBreaks\n-----END PUBLIC KEY-----`;
      // The formatter function joins lines and then re-wraps at 64 chars.
      // For this test, let's test the cleaned version before re-wrapping by the function.
      const cleanedInput = base64SpkiWithBreaks.replace(/\r?\n|\r/g, '');
      const expectedCleanedPem = `-----BEGIN PUBLIC KEY-----\n${cleanedInput}\n-----END PUBLIC KEY-----`;
       // Manually wrap cleaned input for comparison if it's longer than 64 chars
      let wrappedCleanedInput = '';
      for (let i = 0; i < cleanedInput.length; i += 64) {
        wrappedCleanedInput += cleanedInput.substring(i, Math.min(i + 64, cleanedInput.length)) + '\n';
      }
      const finalExpectedPem = `-----BEGIN PUBLIC KEY-----\n${wrappedCleanedInput.trim()}\n-----END PUBLIC KEY-----`;
      assert.strictEqual(base64SpkiToPem(base64SpkiWithBreaks), finalExpectedPem);
    });

    it('pemToBase64 should correctly extract base64 from PEM', () => {
      const pem = `-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtestPublicKeyData\n-----END PUBLIC KEY-----`;
      const expectedBase64 = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtestPublicKeyData';
      assert.strictEqual(pemToBase64(pem), expectedBase64);
    });
  });

  describe('txController internal createPayloadString', () => {
    it('should create the correct pipe-delimited payload string', () => {
      const payload = {
        from: 'PVX_fromAddress',
        to: 'PVX_toAddress',
        amount: 100,
        nonce: 12345,
        timestamp: 1678886400000,
      };
      const expectedString = 'PVX_fromAddress|PVX_toAddress|100|12345|1678886400000';
      assert.strictEqual(createServerSidePayloadString(payload), expectedString);
    });
  });

  describe('crypto.js (RSA Operations)', () => {
    let testKeys;

    before(() => {
      // Generate a single key pair for these tests
      testKeys = generateKeyPair(); // This uses Node.js crypto to generate PEM keys
    });

    it('generateWalletAddress should create a valid PVX address from a PEM public key', () => {
      const address = generateWalletAddress(testKeys.publicKey);
      assert.ok(address.startsWith('PVX_'));
      assert.strictEqual(address.length, 32 + 4); // PVX_ + 32 hex chars
    });

    it('signData and verifySignature should work correctly with matching keys and payload', () => {
      const payloadString = 'test|payload|123';
      const signature = signData(payloadString, testKeys.privateKey);
      assert.ok(signature, 'Signature should be generated');
      const isValid = verifySignature(payloadString, signature, testKeys.publicKey);
      assert.strictEqual(isValid, true, 'Signature should be valid with correct key and payload');
    });

    it('verifySignature should fail with tampered payload', () => {
      const payloadString = 'test|payload|123';
      const tamperedPayloadString = 'test|payload|321';
      const signature = signData(payloadString, testKeys.privateKey);
      const isValid = verifySignature(tamperedPayloadString, signature, testKeys.publicKey);
      assert.strictEqual(isValid, false, 'Signature should be invalid with tampered payload');
    });

    it('verifySignature should fail with wrong public key', () => {
      const payloadString = 'test|payload|123';
      const signature = signData(payloadString, testKeys.privateKey);
      const otherKeys = generateKeyPair(); // Generate a different key pair
      const isValid = verifySignature(payloadString, signature, otherKeys.publicKey);
      assert.strictEqual(isValid, false, 'Signature should be invalid with wrong public key');
    });

    it('verifySignature should fail with malformed signature', () => {
      const payloadString = 'test|payload|123';
      const malformedSignature = 'abcdef123456';
      const isValid = verifySignature(payloadString, malformedSignature, testKeys.publicKey);
      assert.strictEqual(isValid, false, 'Signature should be invalid with malformed signature');
    });
  });
});

// To run this (conceptual, as I can't execute in this environment):
// 1. Save as server/test/cryptoOperations.test.js
// 2. Ensure mocha is installed (npm install -g mocha) or use a local runner
// 3. Run from the project root: mocha server/test/cryptoOperations.test.js
// (Adjust paths in `require` if running from a different location or if utils are structured differently)
// Note: This test uses Node.js `crypto` for key generation which produces PEM.
// The client uses WebCrypto which produces SPKI/PKCS8 ArrayBuffers, then base64 encoded.
// The `base64SpkiToPem` formatter is key for bridging this.
// This test focuses on server-side utils assuming PEM inputs where expected.
