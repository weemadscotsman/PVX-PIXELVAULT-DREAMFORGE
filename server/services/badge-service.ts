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
  imageUrl?: string; // Made optional
  type: string; // Changed from category, general string
  rarity: string; // Changed from tier, general string
  requirement?: string; // Changed from requirements string[], now optional string
  dateAdded?: number; // Made optional
  secret?: boolean; // Added optional secret field
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
    rarity: 'RARE', // Was tier
    type: 'PARTICIPATION', // Was category
    dateAdded: 1641034800000 // Jan 1, 2022
  },
  {
    id: 'blockchain_basics',
    name: 'Blockchain Scholar',
    description: 'Completed the Blockchain Fundamentals learning module',
    imageUrl: '/assets/badges/blockchain_scholar.png',
    rarity: 'COMMON', // Was tier
    type: 'SKILL', // Was category
    dateAdded: 1641034800000
  },
  {
    id: 'crypto_security',
    name: 'Security Sentinel',
    description: 'Completed the Cryptographic Security learning module',
    imageUrl: '/assets/badges/security_sentinel.png',
    rarity: 'UNCOMMON', // Was tier
    type: 'SKILL', // Was category
    dateAdded: 1641034800000
  },
  {
    id: 'defi_explorer',
    name: 'DeFi Explorer',
    description: 'Completed the DeFi Fundamentals learning module',
    imageUrl: '/assets/badges/defi_explorer.png',
    rarity: 'RARE', // Was tier
    type: 'SKILL', // Was category
    dateAdded: 1641034800000
  },
  {
    id: 'first_transaction',
    name: 'First Transaction',
    description: 'Sent your first PVX transaction',
    imageUrl: '/assets/badges/first_transaction.png',
    rarity: 'COMMON', // Was tier
    type: 'ACHIEVEMENT', // Was category
    dateAdded: 1641034800000
  },
  {
    id: 'master_miner',
    name: 'Master Miner',
    description: 'Mined at least 100 blocks on the PVX network',
    imageUrl: '/assets/badges/master_miner.png',
    rarity: 'EPIC', // Was tier
    type: 'ACHIEVEMENT', // Was category
    requirement: 'Mine 100 blocks', // Was requirements (array)
    dateAdded: 1641034800000
  },
  {
    id: 'staking_pioneer',
    name: 'Staking Pioneer',
    description: 'Staked PVX for at least 30 days continuously',
    imageUrl: '/assets/badges/staking_pioneer.png',
    rarity: 'UNCOMMON', // Was tier
    type: 'LOYALTY', // Was category
    requirement: 'Stake for 30 consecutive days', // Was requirements (array)
    dateAdded: 1641034800000
  },
  {
    id: 'governance_voter',
    name: 'Governance Voter',
    description: 'Participated in at least 5 governance proposals',
    imageUrl: '/assets/badges/governance_voter.png',
    rarity: 'RARE', // Was tier
    type: 'PARTICIPATION', // Was category
    requirement: 'Vote on 5 governance proposals', // Was requirements (array)
    dateAdded: 1641034800000
  },
  {
    id: 'thringlet_keeper',
    name: 'Thringlet Keeper',
    description: 'Successfully bonded with a Thringlet for over 7 days',
    imageUrl: '/assets/badges/thringlet_keeper.png',
    rarity: 'LEGENDARY', // Was tier
    type: 'SPECIAL', // Was category
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
  ensureDataDirExists();
  
  // Load badges if file exists
  try {
    if (fs.existsSync(BADGE_DATA_FILE)) {
      const badgeData = fs.readFileSync(BADGE_DATA_FILE, 'utf8');
      availableBadges.push(...JSON.parse(badgeData));
    } else {
      // Save initial badges
      fs.writeFileSync(BADGE_DATA_FILE, JSON.stringify(availableBadges, null, 2));
    }
  } catch (error) {
    console.error('Error initializing badge data:', error);
  }
  
  // Load user badges if file exists
  try {
    if (fs.existsSync(USER_BADGE_DATA_FILE)) {
      const userBadgeData = fs.readFileSync(USER_BADGE_DATA_FILE, 'utf8');
      userBadges = JSON.parse(userBadgeData);
    } else {
      // Create empty user badges file
      fs.writeFileSync(USER_BADGE_DATA_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Error initializing user badge data:', error);
  }
}

// Save user badges to file
function saveUserBadges() {
  try {
    fs.writeFileSync(USER_BADGE_DATA_FILE, JSON.stringify(userBadges, null, 2));
  } catch (error) {
    console.error('Error saving user badge data:', error);
  }
}

// Get all available badges
export function getAllBadges(): Badge[] {
  return availableBadges;
}

// Get badge by ID
export function getBadgeById(badgeId: string): Badge | undefined {
  return availableBadges.find(badge => badge.id === badgeId);
}

// Get badges for a user
export function getUserBadges(userId: string): UserBadge[] {
  return userBadges.filter(userBadge => userBadge.userId === userId);
}

// Check if user has a specific badge
export function checkUserHasBadge(userId: string, badgeId: string): boolean {
  const userBadge = userBadges.find(
    ub => ub.userId === userId && ub.badgeId === badgeId
  );
  return userBadge ? userBadge.obtained : false;
}

// Update badge status for a user
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