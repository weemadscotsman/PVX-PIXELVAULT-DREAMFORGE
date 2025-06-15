/**
 * WebSocket Configuration
 * Centralizes all WebSocket-related configuration settings
 */

// Determine protocol based on current connection
const isSecure = window.location.protocol === 'https:';
const wsProtocol = isSecure ? 'wss' : 'ws';
const hostname = window.location.hostname;

let finalWsUrl: string;

if (import.meta.env.VITE_WS_URL) {
  // 1. Prioritize VITE_WS_URL if it's defined and valid.
  finalWsUrl = import.meta.env.VITE_WS_URL;
  console.log(`[WS Config] Using VITE_WS_URL: ${finalWsUrl}`);
} else {
  let port = '';
  // 3. In a development environment (detectable via import.meta.env.DEV),
  //    if window.location.port is not suitable (e.g. it's the Vite client port),
  //    use a common default backend port like 5000.
  //    The server is configured to use process.env.PORT or default to 5000.
  if (import.meta.env.DEV) {
    // VITE_BACKEND_PORT can be set in .env if the backend server runs on a different port during dev
    port = import.meta.env.VITE_BACKEND_PORT || '5000';
    console.log(`[WS Config] Development environment: Using backend port: ${port} (from VITE_BACKEND_PORT or default 5000)`);
  } else {
    // 2. If not in DEV (i.e., production), try to use window.location.port when it's available.
    //    If window.location.port is empty (e.g. for standard ports 80/443),
    //    it results in an empty string, so no port is added to the URL, which is correct.
    if (window.location.port) {
      port = window.location.port;
      console.log(`[WS Config] Production environment: Using window.location.port: ${port}`);
    } else {
      console.log(`[WS Config] Production environment: window.location.port is empty, using default port for protocol (e.g. 80/443). No port will be added to URL.`);
      // port remains '', so it won't be added to the URL construction below.
    }
  }
  // Construct the URL. The path /ws is based on server configuration.
  finalWsUrl = `${wsProtocol}://${hostname}${port ? `:${port}` : ''}/ws`;
}

export const WS_URL = finalWsUrl;
// Log the final URL that will be used.
console.log(`[WS Config] Final WebSocket URL determined: ${WS_URL}`);


// WebSocket reconnection settings
export const WS_RECONNECT_INTERVAL = 3000; // 3 seconds
export const WS_MAX_RECONNECT_ATTEMPTS = 5;

// WebSocket message types
export enum WsMessageType {
  BLOCK = 'block',
  TRANSACTION = 'transaction',
  STATUS_UPDATE = 'status_update',
  MINING_UPDATE = 'mining_update',
  STAKING_UPDATE = 'staking_update',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong'
}

/**
 * Create WebSocket connection with auto-reconnect capability
 * @returns WebSocket instance
 */
export const createWebSocketConnection = (): WebSocket => {
  let ws: WebSocket;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    try {
      console.log(`[WebSocket] Attempting to connect to: ${WS_URL}`);
      ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connection established');
        // Reset reconnect attempt counter on successful connection
        reconnectAttempts = 0;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };
      
      ws.onclose = (event) => {
        if (!event.wasClean && reconnectAttempts < WS_MAX_RECONNECT_ATTEMPTS) {
          console.log(`[WebSocket] Connection closed. Attempting to reconnect (${reconnectAttempts + 1}/${WS_MAX_RECONNECT_ATTEMPTS})...`);
          reconnectTimer = setTimeout(() => {
            reconnectAttempts++;
            connect();
          }, WS_RECONNECT_INTERVAL);
        } else if (reconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
          console.error(`[WebSocket] Reconnection failed after ${WS_MAX_RECONNECT_ATTEMPTS} attempts to ${WS_URL}`);
        } else if (event.wasClean) {
          console.log(`[WebSocket] Connection closed cleanly to ${WS_URL}`);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
    } catch (error) {
      console.error(`[WebSocket] Failed to create connection to ${WS_URL}:`, error);
      if (reconnectAttempts < WS_MAX_RECONNECT_ATTEMPTS) {
        console.log(`[WebSocket] Retrying connection due to error (${reconnectAttempts + 1}/${WS_MAX_RECONNECT_ATTEMPTS})...`);
        reconnectTimer = setTimeout(() => {
          reconnectAttempts++;
          connect();
        }, WS_RECONNECT_INTERVAL);
      }
    }
    
    return ws;
  };
  
  return connect();
};

/**
 * Parse WebSocket message
 * @param event WebSocket message event
 * @returns Parsed message data or null if parsing fails
 */
export const parseWsMessage = (event: MessageEvent): any | null => {
  try {
    return JSON.parse(event.data);
  } catch (error) {
    console.error('[WebSocket] Failed to parse message:', error);
    return null;
  }
};

/**
 * Send message through WebSocket
 * @param ws WebSocket instance
 * @param type Message type
 * @param data Message data
 * @returns True if message was sent successfully, false otherwise
 */
export const sendWsMessage = (ws: WebSocket, type: WsMessageType, data: any): boolean => {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type, data }));
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      return false;
    }
  } else {
    console.warn(`[WebSocket] Cannot send message, connection not open. State: ${ws.readyState}`);
    return false;
  }
};

/**
 * Check if WebSocket is connected
 * @param ws WebSocket instance
 * @returns True if WebSocket is connected, false otherwise
 */
export const isWsConnected = (ws: WebSocket): boolean => {
  return ws.readyState === WebSocket.OPEN;
};