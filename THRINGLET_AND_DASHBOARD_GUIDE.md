# PVX BLOCKCHAIN SYSTEM - COMPREHENSIVE GUIDE

## Table of Contents
1. [System Overview](#system-overview)
2. [Dashboard Navigation](#dashboard-navigation)
3. [Thringlet System](#thringlet-system)
4. [Terminal Commands](#terminal-commands)
5. [Learning Center](#learning-center)
6. [Transaction System](#transaction-system)
7. [Technical Integration](#technical-integration)

---

## System Overview

The PVX Blockchain System is a privacy-first zkSNARK-secured blockchain wallet with advanced cyberpunk-inspired user experience. It features real-time transaction visualization, Thringlet emotional AI companions, and interactive learning modules that gamify blockchain education.

### Key Components:
- **Wallet & Dashboard**: View balances, transactions, and system status
- **Interactive Blockchain Learning**: Mini-games teaching blockchain concepts
- **Thringlet System**: AI companions with emotion engines
- **Advanced Drop Terminal**: Access exclusive content and rewards
- **Transaction Flow Visualizer**: Real-time cyberpunk-style animations
- **Veto Guardian System**: Enhanced security for governance proposals

---

## Dashboard Navigation

The PVX Dashboard is divided into six main sections:

1. **Introduction** (PAGE_1): System welcome and status
2. **Manifesto** (PAGE_2): Core principles and philosophy
3. **Wallet Dashboard** (PAGE_3): Primary interface for blockchain operations
4. **Dropzone** (PAGE_4): Access to exclusive drops and rewards
5. **DAO Terminal** (PAGE_5): Governance system and voting interface
6. **Thringlet Chamber** (PAGE_6): Thringlet management and interaction

### Dashboard Controls

- **Main Navigation**: Use the fixed panel in the bottom right to navigate between pages
- **Sidebar**: Access wallet functions, mining operations, and settings
- **Terminal Interface**: Interact with the system using command-line syntax
- **Transaction Panel**: View recent transactions and activity
- **Status Indicators**: System health, connection status, and security metrics

---

## Thringlet System

Thringlets are emotion-driven AI companions that evolve based on your interactions with the PVX system. Each Thringlet has a unique personality defined by its attributes and emotional state.

### Thringlet Attributes

- **Intellect**: Analytical capability and logic processing
- **Resilience**: Ability to withstand emotional fluctuations
- **Empathy**: Sensitivity to user interactions
- **Chaos**: Unpredictability and creativity

### Emotional States

Thringlets have four primary emotional dimensions:
- **Joy**: Positive excitement state
- **Fear**: Caution and protection state
- **Trust**: Reliability and confidence state
- **Surprise**: Adaptability and curiosity state

The **dominant emotion** determines a Thringlet's behavior, appearance, and abilities.

### Thringlet Types

- **Logical**: High intellect, excels at analytics and prediction
- **Guardian**: High resilience, provides enhanced security functions
- **Empath**: High empathy, offers improved social and governance abilities
- **Chaotic**: High chaos, creates unexpected opportunities and rewards
- **Balanced**: No strongly dominant attribute, versatile functionality

### Thringlet Lifecycle

1. **Acquisition**: Obtained through secret drops or system rewards
2. **Bonding**: Establishing initial connection with your wallet
3. **Evolution**: Growing through interaction and emotional development
4. **Ability Unlocking**: Gaining special abilities based on emotional states
5. **Maturity**: Reaching maximum level with full ability set

---

## Terminal Commands

### Advanced Drop Terminal Commands

| Command | Syntax | Description |
|---------|--------|-------------|
| help | `help` | Display available commands |
| list | `list [drops\|thringlets]` | List available secret drops or your thringlets |
| access | `access [level] [auth-code]` | Upgrade access level with authorization code |
| claim | `claim [drop-code]` | Claim a secret drop with its code |
| bond | `bond [thringlet-id]` | Bond with a thringlet to create emotional link |
| interact | `interact [thringlet-id] [interaction-type]` | Interact with a thringlet |
| show | `show [thringlet-id]` | Show detailed info about a thringlet |
| scan | `scan [drop-code\|address]` | Security scan of drop code or address |
| status | `status` | Show current access level and wallet status |
| clear | `clear` | Clear terminal history |
| reconnect | `reconnect` | Reconnect to PVX SecureDrop™ network |
| exit | `exit` | Close the terminal |

### Thringlet Interaction Types

| Interaction | Effect |
|-------------|--------|
| stimulate | Increases joy and surprise, may increase fear |
| calm | Decreases fear, increases trust |
| challenge | Increases surprise, affects fear/joy based on resilience |
| reward | Increases joy and trust, decreases fear |

### Secret Code Formats

- **Drop Codes**: Format `PVX-DROP-XXXX-XXXX-XXXX`
- **Auth Codes**: Format `AUTH-X-XXXXXXXX` (where X is the level)
- **Security Keys**: Format `SECKEY-XXXX-XXXX-XXXX-XXXX`

---

## Learning Center

The Learning Center features interactive mini-games that teach blockchain concepts through hands-on experiences:

### Available Games

1. **Hashlord** (Mining Simulation)
   - Teaches Proof-of-Work concepts
   - Difficulty levels: 1-5
   - Rewards: μPVX tokens based on performance

2. **Gas Escape** (Transaction Fee Simulator) - *Coming Soon*
   - Teaches gas fee optimization 
   - Avoid fee spikes to process transactions efficiently

3. **Staking Wars** (Validator Simulation) - *Coming Soon*
   - Teaches Proof-of-Stake governance principles
   - Compete with other validators for consensus rights

4. **Packet Panic** (Network Simulation) - *Coming Soon*
   - Teaches blockchain network operation
   - Route transactions through congested nodes

5. **The Rug Game** (Security Simulator) - *Coming Soon*
   - Teaches wallet security best practices
   - Identify malicious smart contracts and risks

### Learning Rewards

Completing games and challenges earns:
- μPVX tokens
- Special Thringlet abilities
- Increased access levels for drop terminal
- Unique visual effects for transactions

---

## Transaction System

The PVX transaction system features real-time visual representations of blockchain operations with cyberpunk-style animations.

### Transaction States

| State | Description | Visual Effect |
|-------|-------------|---------------|
| pending | Transaction initialization | Pulsing circle animation |
| processing | Transaction details being processed | Data particle system |
| encrypting | zkSNARK encryption sequence | Matrix code rain effect |
| broadcasting | Network propagation | Expanding ripple waves |
| success | Successful completion | Green confirmation glow |
| failed | Transaction failure | Red error pulse |
| validated | Block confirmation | Green checkmark with particles |

### Transaction Types

- **Transfer**: Standard PVX transfers between addresses
- **Mining Reward**: Rewards from mining operation
- **Staking Reward**: Rewards from staking activity
- **NFT Mint**: Creation of new non-fungible tokens
- **NFT Transfer**: Transfer of NFT ownership
- **Stake/Unstake**: Staking position management
- **Governance**: Proposal creation and voting actions

### Transaction Security

- All transactions are secured using zkSNARK technology
- 6-decimal precision with no rounding loss (μPVX = 0.000001 PVX)
- Terminal-style status updates with matrix-inspired visual cues
- Veto guardian protection for governance transactions

---

## Technical Integration

### API Endpoints

The PVX system exposes these API endpoints for integration:

#### Wallet Operations
- `GET /api/wallet/:address` - Get wallet info
- `GET /api/wallet/:address/balance` - Get wallet balance
- `POST /api/wallet/transfer` - Create transaction

#### Thringlet System
- `GET /api/thringlets/owner/:address` - Get thringlets by owner
- `GET /api/thringlets/:id` - Get thringlet details
- `POST /api/thringlets/bond` - Bond with thringlet
- `POST /api/thringlets/interact` - Interact with thringlet

#### Secret Drops
- `GET /api/drops/secret` - Get available secret drops
- `POST /api/drops/claim` - Claim a secret drop
- `POST /api/verify-auth-code` - Verify authorization code

#### Learning System
- `GET /api/learning/games` - Get available learning games
- `POST /api/learning/complete` - Submit game completion

#### Security
- `POST /api/security/scan` - Scan address or drop for security

### WebSocket Events

The system uses WebSockets for real-time updates on:
- Transaction status changes
- Thringlet emotional state updates
- Mining rewards and notifications
- Security alerts and system messages

### Integration Code Example

```typescript
// Connect to PVX websocket
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;
const socket = new WebSocket(wsUrl);

// Listen for events
socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'transaction':
      // Handle transaction update
      break;
    case 'thringlet':
      // Handle thringlet update
      break;
    case 'security':
      // Handle security alert
      break;
  }
});

// Fetch thringlets example
async function getThringlets(address) {
  const response = await fetch(`/api/thringlets/owner/${address}`);
  return await response.json();
}

// Interact with thringlet example
async function interactWithThringlet(thringletId, interaction) {
  const response = await fetch('/api/thringlets/interact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      thringletId,
      interaction,
      address: walletAddress
    }),
  });
  return await response.json();
}
```

---

## Command Reference Quick Card

```
┌─── PVX COMMAND REFERENCE ───────────────────────┐
│                                                 │
│  TERMINAL COMMANDS:                             │
│  help                    Show available commands│
│  list [drops|thringlets] List available items   │
│  access [level] [code]   Upgrade access level   │
│  claim [drop-code]       Claim a secret drop    │
│  bond [thringlet-id]     Bond with a thringlet  │
│  interact [id] [type]    Interact with thringlet│
│  show [thringlet-id]     Show thringlet details │
│  scan [code|address]     Security scan          │
│  status                  Show current status    │
│  clear                   Clear terminal history │
│  reconnect               Reconnect to network   │
│  exit                    Close the terminal     │
│                                                 │
│  INTERACTION TYPES:                             │
│  stimulate               Boost joy/surprise     │
│  calm                    Reduce fear            │
│  challenge               Test capabilities      │
│  reward                  Increase trust         │
│                                                 │
└─────────────────────────────────────────────────┘
```