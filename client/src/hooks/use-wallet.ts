import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

interface Wallet {
  address: string;
  publicKey: string;
  balance: string;
  createdAt: string;
  lastSynced: string;
}

interface WalletKeys {
  publicKey: string;
  privateKey: string;
}

interface CreateWalletRequest {
  passphrase: string;
}

interface ImportWalletRequest {
  privateKey: string;
  passphrase: string;
}

interface ExportWalletRequest {
  address: string;
  passphrase: string;
}

interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: string;
  passphrase: string;
  note?: string;
}

export function useWallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get active wallet from localStorage
  const storedWallet = localStorage.getItem('activeWallet');
  
  const [activeWallet, setActiveWallet] = useState<string | null>(storedWallet);

  // Set active wallet
  const setActiveWalletAddress = (address: string | null) => {
    setActiveWallet(address);
    if (address) {
      localStorage.setItem('activeWallet', address);
    } else {
      localStorage.removeItem('activeWallet');
    }
  };

import {
  generateRsaKeyPair,
  exportRsaPrivateKey,
  exportRsaPublicKey,
  generateSalt,
  generateIv,
  deriveKeyFromPassphrase,
  encryptData,
  arrayBufferToHex,
  arrayBufferToBase64,
  // For sendTransaction:
  hexToArrayBuffer,
  // base64ToArrayBuffer, // publicKey is already base64, not needed for decryption path here
  decryptData,
  importRsaPrivateKey,
  signData,
  serializeTransactionPayload,
  // TextEncoder is a global browser API, no specific import needed from cryptoClient.ts
} from "@/lib/cryptoClient"; // Adjust path as needed

// ... (keep existing interfaces Wallet, WalletKeys, etc.)

// Updated CreateWalletRequest if passphrase is still primary input for key derivation
interface CreateWalletRequest {
  passphrase: string;
  // Potentially other fields like a user-chosen alias for the wallet
}

// Interface for what's stored in localStorage for a wallet
export interface StoredWalletKeys {
  encryptedPrivateKeyHex: string;
  publicKeyBase64: string;
  saltHex: string;
  ivHex: string;
  // Optional: address, if derived client-side before server confirmation
  address?: string;
}


// Create a new wallet
const createWalletMutation = useMutation({
  mutationFn: async (data: CreateWalletRequest) => {
    console.log('[useWallet] createWalletMutation started.');
    const { passphrase } = data;

    // 1. Generate RSA key pair
    const keyPair = await generateRsaKeyPair();
    const privateKeyPkcs8 = await exportRsaPrivateKey(keyPair.privateKey);
    const publicKeySpki = await exportRsaPublicKey(keyPair.publicKey);
    const publicKeyBase64 = arrayBufferToBase64(publicKeySpki);

    // 2. Derive AES key from passphrase, encrypt private key
    const salt = generateSalt();
    const iv = generateIv();
    const aesKey = await deriveKeyFromPassphrase(passphrase, salt);
    const encryptedPrivateKey = await encryptData(aesKey, privateKeyPkcs8, iv);

    const storedWalletData: StoredWalletKeys = {
      encryptedPrivateKeyHex: arrayBufferToHex(encryptedPrivateKey),
      publicKeyBase64: publicKeyBase64,
      saltHex: arrayBufferToHex(salt),
      ivHex: arrayBufferToHex(iv),
    };

    console.log('[useWallet] Keys generated and private key encrypted. Public key (base64):', publicKeyBase64.substring(0, 30) + "...");

    // 3. Send public key to server to create wallet entry
    // Server should derive address from public key, or accept a client-hinted one
    // For now, assuming server takes publicKey and returns wallet info including address
    const serverPayload = {
      publicKey: publicKeyBase64,
      // If server still uses passphrase to derive address/salt/hash for its own consistency:
      // passphrase: passphrase, // This is less ideal if moving to client-side crypto fully
    };

    console.log('[useWallet] Sending public key to server for wallet creation...');
    const res = await apiRequest('POST', '/api/wallet/create', serverPayload);
    if (!res.ok) {
      const errorData = await res.json();
      console.error('[useWallet] Server error creating wallet:', errorData);
      throw new Error(errorData.error || 'Failed to create wallet on server');
    }
    const walletFromServer = await res.json() as Wallet; // Assuming server returns Wallet structure
    console.log('[useWallet] Wallet created on server:', walletFromServer);

    // 4. Store encrypted keys and public key in local storage, keyed by the official address
    const finalStoredData: StoredWalletKeys = { ...storedWalletData, address: walletFromServer.address };
    localStorage.setItem(`wallet_${walletFromServer.address}`, JSON.stringify(finalStoredData));
    console.log(`[useWallet] Encrypted wallet data stored locally for address: ${walletFromServer.address}`);

    return walletFromServer; // Return the wallet data from server (which includes the address)
  },
  onSuccess: (walletFromServer) => { // data here is walletFromServer
    toast({
      title: "Wallet created",
      description: `New wallet created with address ${walletFromServer.address}`,
    });
    setActiveWalletAddress(walletFromServer.address);
    queryClient.invalidateQueries({ queryKey: ['/api/wallet/all'] });
    // Also invalidate the specific wallet query
    queryClient.invalidateQueries({ queryKey: ['/api/wallet', walletFromServer.address]});
  },
    onError: (error: Error) => {
      toast({
        title: "Failed to create wallet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import existing wallet - using the exact endpoint from blueprint
  const importWalletMutation = useMutation({
    mutationFn: async (data: ImportWalletRequest) => {
      console.log("Importing wallet with privateKey length:", data.privateKey.length);
      
      try {
        const res = await apiRequest('POST', '/api/wallet/import', data);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to import wallet');
        }
        const result = await res.json();
        console.log("Wallet import successful:", result.address);
        return result as Wallet;
      } catch (error) {
        console.error("Exception during wallet import:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Wallet imported",
        description: `Wallet imported successfully with address ${data.address}`,
      });
      setActiveWalletAddress(data.address);
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/all'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to import wallet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export wallet keys - using the exact endpoint from blueprint
  const exportWalletKeysMutation = useMutation({
    mutationFn: async (data: ExportWalletRequest) => {
      const { address, passphrase } = data;
      console.log(`Exporting wallet keys for address: ${address}`);
      
      try {
        const res = await apiRequest('POST', `/api/wallet/${address}/export`, { passphrase });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to export wallet keys');
        }
        const result = await res.json();
        console.log("Wallet keys exported successfully");
        return result as WalletKeys;
      } catch (error) {
        console.error("Exception during wallet key export:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Keys exported",
        description: "Your wallet keys have been exported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to export keys",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get wallet by address - using the exact endpoint from blueprint
  const getWallet = (address?: string) => {
    const walletAddress = address || activeWallet;
    
    return useQuery({
      queryKey: ['/api/wallet', walletAddress],
      queryFn: async () => {
        try {
          const res = await apiRequest('GET', `/api/wallet/${walletAddress}`, undefined, {
            retryCount: 5 // Increase retries for critical wallet data
          });
          return await res.json() as Wallet;
        } catch (error) {
          console.error(`Error fetching wallet ${walletAddress}:`, error);
          
          // Check if we have cached wallet data we can use temporarily
          const cachedData = queryClient.getQueryData(['/api/wallet', walletAddress]) as Wallet;
          if (cachedData) {
            console.log("Using cached wallet data while connection is restored");
            return cachedData;
          }
          
          throw error;
        }
      },
      enabled: !!walletAddress, // Only run query if address is provided
      refetchInterval: 5000, // Refetch every 5 seconds
      retry: 3, // Retry failed requests 3 times
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff with a max of 10 seconds
    });
  };

  // Get all wallets - using the exact endpoint from blueprint
  const getAllWallets = () => {
    return useQuery({
      queryKey: ['/api/wallet/all'],
      queryFn: async () => {
        const res = await apiRequest('GET', '/api/wallet/all');
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch wallets');
        }
        return await res.json() as Wallet[];
      },
      refetchInterval: 15000, // Refetch every 15 seconds
    });
  };

  // Get transactions for active wallet - using the exact endpoint from blueprint
  const getWalletTransactions = (address?: string) => {
    const walletAddress = address || activeWallet;
    
    return useQuery({
      queryKey: ['/api/wallet/history', walletAddress],
      queryFn: async () => {
        const res = await apiRequest('GET', `/api/wallet/history/${walletAddress}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Failed to fetch transactions for address ${walletAddress}`);
        }
        return await res.json();
      },
      enabled: !!walletAddress, // Only run query if address is provided
      refetchInterval: 10000, // Refetch every 10 seconds
    });
  };

// Interface for the new send transaction mutation, requiring passphrase for decryption
interface SignAndSendTransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: string;
  passphrase: string; // To decrypt the private key
  note?: string;
  nonce?: number; // Optional, can be generated if not provided
}

// Send transaction - MODIFIED FOR CLIENT-SIDE SIGNING
const sendTransactionMutation = useMutation({
  mutationFn: async (data: SignAndSendTransactionRequest) => {
    console.log('[useWallet] sendTransactionMutation started for:', data.fromAddress);
    const { fromAddress, toAddress, amount, passphrase, note } = data;

    // 1. Retrieve stored encrypted key, salt, iv, and public key
    const storedDataString = localStorage.getItem(`wallet_${fromAddress}`);
    if (!storedDataString) {
      console.error(`[useWallet] No stored wallet data found for address: ${fromAddress}`);
      throw new Error(`No wallet data found for address ${fromAddress}. Cannot sign transaction.`);
    }
    const storedKeys: StoredWalletKeys = JSON.parse(storedDataString);
    console.log('[useWallet] Retrieved stored wallet data for signing.');

    // 2. Convert hex/base64 back to ArrayBuffers/Uint8Arrays
    const salt = hexToArrayBuffer(storedKeys.saltHex);
    const iv = hexToArrayBuffer(storedKeys.ivHex);
    const encryptedPrivateKey = hexToArrayBuffer(storedKeys.encryptedPrivateKeyHex);
    // publicKeyBase64 is already in the correct format for sending if needed by API

    // 3. Re-derive AES key and decrypt private key
    console.log('[useWallet] Deriving AES key and decrypting private key...');
    const aesKey = await deriveKeyFromPassphrase(passphrase, new Uint8Array(salt)); // Ensure salt is Uint8Array
    const privateKeyPkcs8 = await decryptData(aesKey, encryptedPrivateKey, new Uint8Array(iv)); // Ensure iv is Uint8Array
    const rsaPrivateKey = await importRsaPrivateKey(privateKeyPkcs8);
    console.log('[useWallet] Private key decrypted and imported.');

    // 4. Construct transaction payload according to CanonicalPayload for signing
    // The `memo` field is not part of the signed payload string as per user spec.
    // It will be sent as part of the larger `transactionData` object to the server.
    const payloadForSigning: import('@/lib/cryptoClient').CanonicalPayload = {
      from: fromAddress,
      to: toAddress,
      amount: Number(amount), // Ensure amount is number for CanonicalPayload
      timestamp: Date.now(),
      nonce: data.nonce || Date.now(), // Simple nonce for now, ensure it's a number
    };
    const serializedPayload = serializeTransactionPayload(payloadForSigning);
    const payloadBuffer = new TextEncoder().encode(serializedPayload);
    console.log('[useWallet] Transaction payload serialized:', serializedPayload);

    // 5. Sign the data
    const signatureBuffer = await signData(rsaPrivateKey, payloadBuffer);
    const signatureHex = arrayBufferToHex(signatureBuffer);
    console.log('[useWallet] Payload signed. Signature (hex):', signatureHex.substring(0,30)+"...");

    // 6. Prepare data for server - this includes the 'memo' if present,
    //    even though it's not part of the signed string itself.
    const transactionDataForServer = {
      ...payloadForSigning, // from, to, amount, nonce, timestamp
      memo: note || "",     // Add memo here
    };

    const serverPayload = {
      transactionData: transactionDataForServer,
      signature: signatureHex,
      publicKey: storedKeys.publicKeyBase64,
    };

    // TODO: Clear decrypted privateKey (rsaPrivateKey, privateKeyPkcs8) from memory.
    // This is tricky in JS. Overwriting or setting to null is the best effort.
    // privateKeyPkcs8 = null; rsaPrivateKey = null; (will be garbage collected)

    console.log('[useWallet] Sending signed transaction to server...');
    // Assuming endpoint is updated to /api/tx/sendSigned or similar,
    // or /api/tx/send is modified to handle this new payload.
    // For now, using /api/tx/send and assuming server is adapted.
    const res = await apiRequest('POST', '/api/tx/send', serverPayload);
    if (!res.ok) {
      const errorData = await res.json();
      console.error('[useWallet] Server error sending signed transaction:', errorData);
      throw new Error(errorData.error || 'Failed to send signed transaction');
    }
    const responseData = await res.json();
    console.log('[useWallet] Signed transaction sent successfully. Server response:', responseData);
    return responseData;
  },
  onSuccess: (responseData) => { // data here is responseData
    toast({
      title: "Transaction sent",
      description: `Transaction ${responseData.tx_hash || ''} submitted successfully. Status: ${responseData.status}`,
      });
      // Update query keys to match new API paths
      if (activeWallet) {
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/history', activeWallet] });
        queryClient.invalidateQueries({ queryKey: ['/api/wallet', activeWallet] });
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance', activeWallet] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get active wallet data - using the exact endpoint from blueprint
  const walletQuery = useQuery({
    queryKey: ['/api/wallet', activeWallet],
    queryFn: async () => {
      if (!activeWallet) return null;
      
      console.log(`Fetching wallet data for ${activeWallet}`);
      try {
        // Use our enhanced apiRequest with exponential backoff and retries
        const res = await apiRequest('GET', `/api/wallet/${activeWallet}`, undefined, {
          retryCount: 5 // Higher number of retries for wallet data which is critical
        });
        
        return await res.json() as Wallet;
      } catch (error: any) {
        console.error("Error fetching wallet data:", error);
        
        // Special handling for specific error codes
        if (error.message && error.message.includes('404')) {
          console.log('Wallet not found in backend, clearing from localStorage');
          localStorage.removeItem('activeWallet');
          setActiveWallet(null);
          return null;
        }
        
        // Check if we have a cached version to use in case of temporary server issues
        const cachedData = queryClient.getQueryData(['/api/wallet', activeWallet]) as Wallet;
        if (cachedData) {
          console.log("Using cached wallet data due to connection error");
          // Mark data as stale so it will be refreshed as soon as connection is restored
          queryClient.invalidateQueries({ queryKey: ['/api/wallet', activeWallet] });
          return {
            ...cachedData,
            _fromCache: true
          };
        }
        
        // If the request still fails after retries but it's just a temporary connection issue
        // return a minimal wallet object to prevent UI crashes
        if (error.message && (
          error.message.includes('502') || 
          error.message.includes('503') || 
          error.message.includes('Failed to fetch')
        )) {
          console.log("Using minimal wallet object during server connection issues");
          return {
            address: activeWallet,
            publicKey: '',
            balance: '0',
            createdAt: new Date().toISOString(),
            lastSynced: new Date().toISOString(),
            _connectionError: true
          } as Wallet;
        }
        
        // For other errors, rethrow
        throw error;
      }
    },
    enabled: !!activeWallet,
    refetchInterval: 5000,
    retry: 3, // Retry failed requests 3 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff with a max of 30 seconds
  });

  // Function to refresh the wallet balance
  const refreshWalletBalance = async () => {
    if (activeWallet) {
      try {
        console.log("Manually refreshing wallet balance for:", activeWallet);
        await queryClient.invalidateQueries({ queryKey: ['/api/wallet', activeWallet] });
        await queryClient.invalidateQueries({ queryKey: ['/api/wallet/history', activeWallet] });
        await queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance', activeWallet] });
      } catch (error) {
        console.error("Error refreshing wallet balance:", error);
      }
    }
  };

  // Function to load wallet from localStorage and refresh data
  const loadWalletFromStorage = () => {
    const storedAddress = localStorage.getItem('activeWallet');
    if (storedAddress && storedAddress !== activeWallet) {
      console.log("Loading wallet from storage:", storedAddress);
      setActiveWallet(storedAddress);
      // Trigger balance refresh
      setTimeout(() => {
        refreshWalletBalance();
      }, 100);
    } else if (activeWallet) {
      // If wallet is already active, just refresh the balance
      refreshWalletBalance();
    }
  };
  
  return {
    // State
    activeWallet,
    setActiveWalletAddress,
    
    // Wallet data
    wallet: walletQuery.data,
    isLoadingWallet: walletQuery.isLoading,
    
    // Queries
    getWallet,
    getAllWallets,
    getWalletTransactions,
    
    // Mutations
    createWalletMutation,
    importWalletMutation,
    exportWalletKeysMutation,
    sendTransactionMutation,
    
    // Utility functions
    refreshWalletBalance,
    loadWalletFromStorage
  };
}