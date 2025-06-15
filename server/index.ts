import express, { Request, Response, NextFunction } from "express";
import { json, urlencoded } from "express";
import cors from 'cors';
import dotenv from 'dotenv';
import { registerRoutes } from "./routes";
import * as blockchainService from "./services/blockchain-service";
import { setupVite, serveStatic } from "./vite";
import { dbInit } from "./database/dbInit";
import { closeDatabase, checkDatabaseConnection } from "./database";

import path from 'path'; // Import path module

// --- Load .env variables ---
const envPath = path.resolve(process.cwd(), '.env');
console.log(`[DOTENV] Attempting to load .env file from: ${envPath}`);
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
  console.error('[DOTENV] Error loading .env file:', dotenvResult.error);
} else {
  console.log('[DOTENV] .env file loaded successfully.');
  if (dotenvResult.parsed) {
    console.log('[DOTENV] Parsed variables:', Object.keys(dotenvResult.parsed));
  }
}

console.log("[BACKEND LIFECYCLE] Stage 1: .env loaded.");
console.log("[BACKEND LIFECYCLE] process.env.DATABASE_URL after dotenv:", process.env.DATABASE_URL);
console.log("[BACKEND LIFECYCLE] process.env.PORT after dotenv:", process.env.PORT);
console.log("[BACKEND LIFECYCLE] process.env.JWT_SECRET after dotenv:", process.env.JWT_SECRET ? "SET" : "NOT SET");


// --- App Initialization ---
const app = express();
const PORT_FROM_ENV = process.env.PORT;
const PORT = PORT_FROM_ENV ? parseInt(PORT_FROM_ENV, 10) : 5000; // Default to 5000 if not set
if (isNaN(PORT)) {
    console.error(`[BACKEND CRITICAL ERROR] Invalid PORT defined in .env or environment: "${PORT_FROM_ENV}". Defaulting to 5000.`);
}
console.log(`[BACKEND LIFECYCLE] Stage 2: App initialized. Attempting to use PORT: ${PORT}`);

// --- Middleware ---
// Trust proxies - needed for rate limiting to work correctly with X-Forwarded-For headers
app.set('trust proxy', 1);
app.use(cors({ origin: '*' })); // Allow all for dev
app.use(json());
app.use(urlencoded({ extended: true }));
console.log("[BACKEND LIFECYCLE] Stage 3: Core middleware (trust proxy, cors, json, urlencoded) added.");

// --- Basic Test Route ---
app.get('/api/ping', (req: Request, res: Response) => {
  console.log("[BACKEND REQUEST] GET /api/ping");
  res.status(200).json({ 
    status: "ok", 
    message: "PixelVault Wallet Backend is Live", 
    timestamp: Date.now() 
  });
});
console.log("[BACKEND LIFECYCLE] Stage 4: /api/ping route added.");

async function startServer() {
  try {
    console.log("[BACKEND LIFECYCLE] Stage 5: Starting server initialization process...");
    
    // Check database connection
    console.log("[BACKEND LIFECYCLE] Stage 5a: Checking database connection...");
    const isDatabaseConnected = await checkDatabaseConnection();
    
    if (isDatabaseConnected) {
      console.log("[BACKEND LIFECYCLE] Stage 5b: Database connection successful");
      
      // Initialize the database and migrate memory data if needed
      await dbInit.initDatabaseWithMigration();
      
      // Seed default data if needed
      await dbInit.seedDefaultData();
    } else {
      console.warn("[BACKEND WARNING] Database connection failed - falling back to in-memory storage");
    }
    
    // Initialize the blockchain
    console.log("[BACKEND LIFECYCLE] Stage 6: Initializing PVX blockchain...");
    await blockchainService.initializeBlockchain();
    console.log("[BACKEND LIFECYCLE] Stage 6a: Connected to PVX blockchain successfully");
    
    // Register API routes
    console.log("[BACKEND LIFECYCLE] Stage 7: Mounting feature API routes...");
    try {
      const server = await registerRoutes(app);
      console.log("[BACKEND LIFECYCLE] Stage 7a: Feature routes mounted successfully.");
      
      // --- GENERIC ERROR HANDLING MIDDLEWARE (Catches errors from routes) ---
      app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        console.error('❌ [BACKEND GLOBAL ERROR HANDLER]', err.stack || err.message);
        const statusCode = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
        res.status(statusCode).json({
            error: 'Internal Server Error',
            message: err.message // In dev, you might send err.stack, but not in prod
        });
      });
      console.log("[BACKEND LIFECYCLE] Stage 7b: Error handling middleware added.");
      
      // --- 404 NOT FOUND HANDLING (Catches requests to undefined API routes) ---
      app.use('/api', (req: Request, res: Response) => {
        console.warn(`[BACKEND WARNING] 404 Not Found: ${req.method} ${req.originalUrl}`);
        res.status(404).json({ error: 'Not Found', message: `API endpoint not found: ${req.originalUrl}` });
      });
      console.log("[BACKEND LIFECYCLE] Stage 7c: API 404 handling middleware added.");
    
      // Setup Vite in development mode
      if (process.env.NODE_ENV === "development") {
        console.log("[BACKEND LIFECYCLE] Stage 8: Setting up Vite for development...");
        await setupVite(app, server);
      } else {
        console.log("[BACKEND LIFECYCLE] Stage 8: Setting up static serving for production...");
        serveStatic(app);
      }
      
      // Start the server
      console.log(`[BACKEND LIFECYCLE] Stage 8a: Attempting to start server on port ${PORT}...`);
      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.syscall !== 'listen') {
          throw error;
        }
        // Handle specific listen errors with friendly messages
        switch (error.code) {
          case 'EACCES':
            console.error(`❌ [BACKEND CRITICAL ERROR] Port ${PORT} requires elevated privileges.`);
            process.exit(1);
            break;
          case 'EADDRINUSE':
            console.error(`❌ [BACKEND CRITICAL ERROR] Port ${PORT} is already in use.`);
            process.exit(1);
            break;
          default:
            console.error(`❌ [BACKEND CRITICAL ERROR] Server listen error:`, error);
            throw error;
        }
      });

      server.listen(PORT, () => {
        console.log(`✅ [BACKEND ONLINE] Server successfully listening on port ${PORT}`);
        console.log(`   Test Ping: http://localhost:${PORT}/api/ping`);
        console.log(`   Wallet Create (POST): http://localhost:${PORT}/api/wallet/create`);
      });
      console.log("[BACKEND LIFECYCLE] Stage 8b: Server.listen() called.");
      
      // Setup graceful shutdown
      process.on('SIGINT', async () => {
        console.log('[BACKEND LIFECYCLE] Shutting down server...');
        server.close();
        
        // Close the database connection
        await closeDatabase();
        
        process.exit(0);
      });
    } catch (routeError: any) {
      console.error("❌ [BACKEND CRITICAL ERROR] Failed to mount routes:", routeError.message);
      process.exit(1); // Exit if routes can't be mounted
    }
  } catch (error: any) {
    console.error("❌ [BACKEND CRITICAL ERROR] Failed to start server:", error.message);
    process.exit(1);
  }
}

// Start the server
console.log("[BACKEND LIFECYCLE] Stage 9: Calling startServer function...");
startServer().catch(error => {
  console.error("❌ [BACKEND CRITICAL ERROR] Unhandled exception during server startup:", error);
  process.exit(1);
});