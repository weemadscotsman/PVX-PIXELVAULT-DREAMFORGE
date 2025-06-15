/**
 * Badge service for managing user badges
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility - equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Badge interface
interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  tier: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHICAL';
  category: 'ACHIEVEMENT' | 'PARTICIPATION' | 'SKILL' | 'LOYALTY' | 'SPECIAL';
  requirements?: string[];
  dateAdded: number;
}

// UserBadge interface
interface UserBadge {
  userId: string;
  badgeId: string;
  obtained: boolean;
  dateObtained?: number;
  progress?: number; // For badges with progress (0-100)
}

// Badge data store
const BADGE_DATA_FILE = path.join(__dirname, '../../data/badges.json');
const USER_BADGE_DATA_FILE = path.join(__dirname, '../../data/user_badges.json');

// Available badges
const availableBadges: Badge[] = [
  {
    id: 'genesis_supporter',
    name: 'Genesis Supporter',
    description: 'One of the first to join the PVX blockchain ecosystem',
    imageUrl: '/assets/badges/genesis_supporter.png',
    tier: 'RARE',
    category: 'PARTICIPATION',
    dateAdded: 1641034800000 // Jan 1, 2022
  },
  {
    id: 'blockchain_basics',
    name: 'Blockchain Scholar',
    description: 'Completed the Blockchain Fundamentals learning module',
    imageUrl: '/assets/badges/blockchain_scholar.png',
    tier: 'COMMON',
    category: 'SKILL',
    dateAdded: 1641034800000
  },
  {
    id: 'crypto_security',
    name: 'Security Sentinel',
    description: 'Completed the Cryptographic Security learning module',
    imageUrl: '/assets/badges/security_sentinel.png',
    tier: 'UNCOMMON',
    category: 'SKILL',
    dateAdded: 1641034800000
  },
  {
    id: 'defi_explorer',
    name: 'DeFi Explorer',
    description: 'Completed the DeFi Fundamentals learning module',
    imageUrl: '/assets/badges/defi_explorer.png',
    tier: 'RARE',
    category: 'SKILL',
    dateAdded: 1641034800000
  },
  {
    id: 'first_transaction',
    name: 'First Transaction',
    description: 'Sent your first PVX transaction',
    imageUrl: '/assets/badges/first_transaction.png',
    tier: 'COMMON',
    category: 'ACHIEVEMENT',
    dateAdded: 1641034800000
  },
  {
    id: 'master_miner',
    name: 'Master Miner',
    description: 'Mined at least 100 blocks on the PVX network',
    imageUrl: '/assets/badges/master_miner.png',
    tier: 'EPIC',
    category: 'ACHIEVEMENT',
    requirements: ['Mine 100 blocks'],
    dateAdded: 1641034800000
  },
  {
    id: 'staking_pioneer',
    name: 'Staking Pioneer',
    description: 'Staked PVX for at least 30 days continuously',
    imageUrl: '/assets/badges/staking_pioneer.png',
    tier: 'UNCOMMON',
    category: 'LOYALTY',
    requirements: ['Stake for 30 consecutive days'],
    dateAdded: 1641034800000
  },
  {
    id: 'governance_voter',
    name: 'Governance Voter',
    description: 'Participated in at least 5 governance proposals',
    imageUrl: '/assets/badges/governance_voter.png',
    tier: 'RARE',
    category: 'PARTICIPATION',
    requirements: ['Vote on 5 governance proposals'],
    dateAdded: 1641034800000
  },
  {
    id: 'thringlet_keeper',
    name: 'Thringlet Keeper',
    description: 'Successfully bonded with a Thringlet for over 7 days',
    imageUrl: '/assets/badges/thringlet_keeper.png',
    tier: 'LEGENDARY',
    category: 'SPECIAL',
    dateAdded: 1641034800000
  }
];

// User badges
let userBadges: UserBadge[] = [];

// Ensure data directory exists
function ensureDataDirExists() {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Initialize badge service
function initialize() {
  console.log('[BadgeService] Initializing...');
  ensureDataDirExists();
  
  // Load available badges
  try {
    if (fs.existsSync(BADGE_DATA_FILE)) {
      const badgeData = fs.readFileSync(BADGE_DATA_FILE, 'utf8');
      const loadedBadges = JSON.parse(badgeData);
      // Basic validation or merge strategy if needed
      availableBadges.splice(0, availableBadges.length, ...loadedBadges); // Replace current with loaded
      console.log(`[BadgeService] Loaded ${loadedBadges.length} badges from ${BADGE_DATA_FILE}`);
    } else {
      console.log(`[BadgeService] ${BADGE_DATA_FILE} not found. Saving initial ${availableBadges.length} badges.`);
      fs.writeFileSync(BADGE_DATA_FILE, JSON.stringify(availableBadges, null, 2));
    }
  } catch (error) {
    console.error('[BadgeService] Error initializing available badges data:', error.message);
  }
  
  // Load user badges
  try {
    if (fs.existsSync(USER_BADGE_DATA_FILE)) {
      const userBadgeData = fs.readFileSync(USER_BADGE_DATA_FILE, 'utf8');
      userBadges = JSON.parse(userBadgeData);
      console.log(`[BadgeService] Loaded ${userBadges.length} user badge entries from ${USER_BADGE_DATA_FILE}`);
    } else {
      console.log(`[BadgeService] ${USER_BADGE_DATA_FILE} not found. Initializing with empty user badges and creating file.`);
      fs.writeFileSync(USER_BADGE_DATA_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('[BadgeService] Error initializing user badges data:', error.message);
  }
  console.log('[BadgeService] Initialization complete.');
}

// Save user badges to file
function saveUserBadges() {
  console.log(`[BadgeService] Attempting to save ${userBadges.length} user badge entries to ${USER_BADGE_DATA_FILE}`);
  try {
    fs.writeFileSync(USER_BADGE_DATA_FILE, JSON.stringify(userBadges, null, 2));
    console.log(`[BadgeService] User badges saved successfully.`);
  } catch (error) {
    console.error('[BadgeService] Error saving user badge data:', error.message);
  }
}

// Get all available badges
export function getAllBadges(): Badge[] {
  console.log(`[BadgeService] getAllBadges called. Returning ${availableBadges.length} badges.`);
  return availableBadges;
}

// Get badge by ID
export function getBadgeById(badgeId: string): Badge | undefined {
  console.log(`[BadgeService] getBadgeById called for ID: ${badgeId}`);
  const badge = availableBadges.find(b => b.id === badgeId);
  if (badge) {
    console.log(`[BadgeService] Badge found for ID ${badgeId}: ${badge.name}`);
  } else {
    console.log(`[BadgeService] Badge with ID ${badgeId} not found.`);
  }
  return badge;
}

// Get badges for a user
export function getUserBadges(userId: string): UserBadge[] {
  console.log(`[BadgeService] getUserBadges called for UserID: ${userId}`);
  const badges = userBadges.filter(userBadge => userBadge.userId === userId);
  console.log(`[BadgeService] Found ${badges.length} badges for UserID: ${userId}.`);
  return badges;
}

// Check if user has a specific badge
export function checkUserHasBadge(userId: string, badgeId: string): boolean {
  console.log(`[BadgeService] checkUserHasBadge called for UserID: ${userId}, BadgeID: ${badgeId}`);
  const userBadge = userBadges.find(ub => ub.userId === userId && ub.badgeId === badgeId);
  const hasBadge = userBadge ? userBadge.obtained : false;
  console.log(`[BadgeService] User ${userId} ${hasBadge ? 'has' : 'does not have'} badge ${badgeId}.`);
  return hasBadge;
}

// Update badge status for a user
// Note: This service uses a simple in-memory array and file persistence.
// For a production system, a database (via DAO) would be more appropriate.
export async function updateBadgeStatus(
  userId: string,
  badgeId: string,
  obtained: boolean,
  progress?: number
): Promise<UserBadge> {
  // Check if badge exists
  const badge = getBadgeById(badgeId);
  if (!badge) {
    throw new Error(`Badge with ID ${badgeId} not found`);
  }
  
  // Find existing user badge or create new one
  let userBadge = userBadges.find(
    ub => ub.userId === userId && ub.badgeId === badgeId
  );
  
  if (userBadge) {
    // Update existing
    userBadge.obtained = obtained;
    if (obtained && !userBadge.dateObtained) {
      userBadge.dateObtained = Date.now();
    }
    if (progress !== undefined) {
      userBadge.progress = progress;
    }
  } else {
    // Create new
    userBadge = {
      userId,
      badgeId,
      obtained,
      dateObtained: obtained ? Date.now() : undefined,
      progress
    };
    userBadges.push(userBadge);
  }
  
  // Save to file
  saveUserBadges();
  
  return userBadge;
}

// Update badge progress for a user
export async function updateBadgeProgress(
  userId: string,
  badgeId: string,
  progress: number
): Promise<UserBadge> {
  // Find existing user badge or create new one
  let userBadge = userBadges.find(
    ub => ub.userId === userId && ub.badgeId === badgeId
  );
  
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  
  if (userBadge) {
    // Update existing
    userBadge.progress = normalizedProgress;
    
    // Auto-award badge if progress is 100%
    if (normalizedProgress >= 100 && !userBadge.obtained) {
      userBadge.obtained = true;
      userBadge.dateObtained = Date.now();
    }
  } else {
    // Create new
    userBadge = {
      userId,
      badgeId,
      obtained: normalizedProgress >= 100,
      dateObtained: normalizedProgress >= 100 ? Date.now() : undefined,
      progress: normalizedProgress
    };
    userBadges.push(userBadge);
  }
  
  // Save to file
  saveUserBadges();
  
  return userBadge;
}

// Add a new badge to the system
export function addNewBadge(badge: Omit<Badge, 'dateAdded'>): Badge {
  const newBadge: Badge = {
    ...badge,
    dateAdded: Date.now()
  };
  
  availableBadges.push(newBadge);
  
  // Save to file
  try {
    fs.writeFileSync(BADGE_DATA_FILE, JSON.stringify(availableBadges, null, 2));
  } catch (error) {
    console.error('Error saving badge data:', error);
  }
  
  return newBadge;
}

// Initialize on import
initialize();