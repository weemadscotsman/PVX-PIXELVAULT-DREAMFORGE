import { eq, and, or } from 'drizzle-orm';
import { db } from './index';
import { badges, userBadges } from './schema';
import { Badge, UserBadge } from '@shared/types';

/**
 * Data access object for badges
 */
export class BadgeDao {
  /**
   * Create a new badge
   * @param badge Badge to create
   * @returns Created badge
   */
  async createBadge(badge: Badge): Promise<Badge> {
    console.log(`[BadgeDAO] createBadge called for badge ID: ${badge.id}, Name: ${badge.name}`);
    try {
      const dbBadge = {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        imageUrl: badge.imageUrl,
        tier: badge.tier,
        category: badge.category,
        requirements: badge.requirements,
        dateAdded: BigInt(badge.dateAdded)
      };

      await db.insert(badges).values(dbBadge);
      console.log(`[BadgeDAO] Badge ${badge.id} - ${badge.name} created successfully.`);
      return badge;
    } catch (error) {
      console.error(`[BadgeDAO] Error creating badge ${badge.id}:`, error.message);
      throw new Error(`Failed to create badge ${badge.id}: ${error.message}`);
    }
  }

  /**
   * Get badge by ID
   * @param id Badge ID
   * @returns Badge or undefined if not found
   */
  async getBadgeById(id: string): Promise<Badge | undefined> {
    console.log(`[BadgeDAO] getBadgeById called for ID: ${id}`);
    try {
      const result = await db.select().from(badges).where(eq(badges.id, id)).limit(1);
      
      if (result.length === 0) {
        console.log(`[BadgeDAO] Badge with ID ${id} not found.`);
        return undefined;
      }
      
      console.log(`[BadgeDAO] Badge with ID ${id} found: ${result[0].name}`);
      const dbBadge = result[0];
      const dbBadge = result[0];
      return {
        id: dbBadge.id,
        name: dbBadge.name,
        description: dbBadge.description,
        imageUrl: dbBadge.imageUrl,
        tier: dbBadge.tier,
        category: dbBadge.category,
        requirements: dbBadge.requirements,
        dateAdded: Number(dbBadge.dateAdded)
      };
    } catch (error) {
      console.error(`[BadgeDAO] Error getting badge by ID ${id}:`, error.message);
      throw new Error(`Failed to get badge for ID ${id}: ${error.message}`);
    }
  }

  /**
   * Get all badges
   * @returns Array of badges
   */
  async getAllBadges(): Promise<Badge[]> {
    console.log(`[BadgeDAO] getAllBadges called.`);
    try {
      const result = await db.select().from(badges);
      console.log(`[BadgeDAO] Found ${result.length} badges.`);
      return result.map(dbBadge => ({
        id: dbBadge.id,
        name: dbBadge.name,
        description: dbBadge.description,
        imageUrl: dbBadge.imageUrl,
        tier: dbBadge.tier,
        category: dbBadge.category,
        requirements: dbBadge.requirements,
        dateAdded: Number(dbBadge.dateAdded)
      }));
    } catch (error) {
      console.error(`[BadgeDAO] Error getting all badges:`, error.message);
      throw new Error(`Failed to get all badges: ${error.message}`);
    }
  }

  /**
   * Get badges by category
   * @param category Badge category
   * @returns Array of badges
   */
  async getBadgesByCategory(category: string): Promise<Badge[]> {
    console.log(`[BadgeDAO] getBadgesByCategory called for category: ${category}`);
    try {
      const result = await db.select().from(badges).where(eq(badges.category, category));
      console.log(`[BadgeDAO] Found ${result.length} badges in category ${category}.`);
      return result.map(dbBadge => ({
        id: dbBadge.id,
        name: dbBadge.name,
        description: dbBadge.description,
        imageUrl: dbBadge.imageUrl,
        tier: dbBadge.tier,
        category: dbBadge.category,
        requirements: dbBadge.requirements,
        dateAdded: Number(dbBadge.dateAdded)
      }));
    } catch (error) {
      console.error(`[BadgeDAO] Error getting badges by category ${category}:`, error.message);
      throw new Error(`Failed to get badges for category ${category}: ${error.message}`);
    }
  }

  /**
   * Update a badge
   * @param badge Badge to update
   * @returns Updated badge
   */
  async updateBadge(badge: Badge): Promise<Badge> {
    console.log(`[BadgeDAO] updateBadge called for badge ID: ${badge.id}, Name: ${badge.name}`);
    try {
      const existingBadge = await this.getBadgeById(badge.id); // getBadgeById already logs
      if (!existingBadge) {
        console.log(`[BadgeDAO] Badge ${badge.id} not found for update, attempting to create instead.`);
        return this.createBadge(badge); // createBadge already logs
      }
      
      console.log(`[BadgeDAO] Updating badge ${badge.id} - ${badge.name} in DB.`);
      const dbBadge = {
        name: badge.name,
        description: badge.description,
        imageUrl: badge.imageUrl,
        tier: badge.tier,
        category: badge.category,
        requirements: badge.requirements
      };

      await db.update(badges).set(dbBadge).where(eq(badges.id, badge.id));
      console.log(`[BadgeDAO] Badge ${badge.id} - ${badge.name} updated successfully.`);
      return badge;
    } catch (error) {
      console.error(`[BadgeDAO] Error updating badge ${badge.id}:`, error.message);
      throw new Error(`Failed to update badge ${badge.id}: ${error.message}`);
    }
  }

  /**
   * Delete a badge
   * @param id Badge ID
   * @returns Success status
   */
  async deleteBadge(id: string): Promise<boolean> {
    console.log(`[BadgeDAO] deleteBadge called for ID: ${id}`);
    try {
      const result = await db.delete(badges).where(eq(badges.id, id)).returning();
      if (result && result.length > 0) {
        console.log(`[BadgeDAO] Badge ${id} deleted successfully.`);
        return true;
      } else {
        console.log(`[BadgeDAO] Badge ${id} not found for deletion or delete had no effect.`);
        return false;
      }
    } catch (error) {
      console.error(`[BadgeDAO] Error deleting badge ${id}:`, error.message);
      throw new Error(`Failed to delete badge ${id}: ${error.message}`);
    }
  }

  /**
   * Get user badge
   * @param userId User ID
   * @param badgeId Badge ID
   * @returns User badge or undefined if not found
   */
  async getUserBadge(userId: string, badgeId: string): Promise<UserBadge | undefined> {
    console.log(`[BadgeDAO] getUserBadge called for UserID: ${userId}, BadgeID: ${badgeId}`);
    try {
      const result = await db.select().from(userBadges)
        .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
        .limit(1);
      
      if (result.length === 0) {
        console.log(`[BadgeDAO] UserBadge not found for UserID: ${userId}, BadgeID: ${badgeId}.`);
        return undefined;
      }
      
      console.log(`[BadgeDAO] UserBadge found for UserID: ${userId}, BadgeID: ${badgeId}.`);
      const dbUserBadge = result[0];
      const dbUserBadge = result[0];
      return {
        userId: dbUserBadge.userId,
        badgeId: dbUserBadge.badgeId,
        obtained: dbUserBadge.obtained,
        dateObtained: dbUserBadge.dateObtained ? Number(dbUserBadge.dateObtained) : undefined,
        progress: dbUserBadge.progress ?? 0
      };
    } catch (error) {
      console.error(`[BadgeDAO] Error getting user badge for UserID: ${userId}, BadgeID: ${badgeId}:`, error.message);
      throw new Error(`Failed to get user badge for UserID: ${userId}, BadgeID: ${badgeId}: ${error.message}`);
    }
  }

  /**
   * Get all badges for a user
   * @param userId User ID
   * @returns Array of user badges
   */
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    console.log(`[BadgeDAO] getUserBadges called for UserID: ${userId}`);
    try {
      const result = await db.select().from(userBadges).where(eq(userBadges.userId, userId));
      console.log(`[BadgeDAO] Found ${result.length} badges for UserID: ${userId}.`);
      return result.map(dbUserBadge => ({
        userId: dbUserBadge.userId,
        badgeId: dbUserBadge.badgeId,
        obtained: dbUserBadge.obtained,
        dateObtained: dbUserBadge.dateObtained ? Number(dbUserBadge.dateObtained) : undefined,
        progress: dbUserBadge.progress ?? 0
      }));
    } catch (error) {
      console.error(`[BadgeDAO] Error getting user badges for UserID: ${userId}:`, error.message);
      throw new Error(`Failed to get user badges for UserID: ${userId}: ${error.message}`);
    }
  }

  /**
   * Create or update user badge
   * @param userBadge User badge to create or update
   * @returns Created or updated user badge
   */
  async createOrUpdateUserBadge(userBadge: UserBadge): Promise<UserBadge> {
    console.log(`[BadgeDAO] createOrUpdateUserBadge called for UserID: ${userBadge.userId}, BadgeID: ${userBadge.badgeId}`);
    try {
      const existingUserBadge = await this.getUserBadge(userBadge.userId, userBadge.badgeId); // Already logs
      
      const dbUserBadge = {
        userId: userBadge.userId,
        badgeId: userBadge.badgeId,
        obtained: userBadge.obtained,
        dateObtained: userBadge.dateObtained ? BigInt(userBadge.dateObtained) : null,
        progress: userBadge.progress
      };

      if (!existingUserBadge) {
        console.log(`[BadgeDAO] UserBadge for UserID: ${userBadge.userId}, BadgeID: ${userBadge.badgeId} does not exist. Creating...`);
        await db.insert(userBadges).values(dbUserBadge);
        console.log(`[BadgeDAO] UserBadge for UserID: ${userBadge.userId}, BadgeID: ${userBadge.badgeId} created successfully.`);
      } else {
        console.log(`[BadgeDAO] UserBadge for UserID: ${userBadge.userId}, BadgeID: ${userBadge.badgeId} exists. Updating...`);
        await db.update(userBadges).set(dbUserBadge)
          .where(and(eq(userBadges.userId, userBadge.userId), eq(userBadges.badgeId, userBadge.badgeId)));
        console.log(`[BadgeDAO] UserBadge for UserID: ${userBadge.userId}, BadgeID: ${userBadge.badgeId} updated successfully.`);
      }
      
      return userBadge;
    } catch (error) {
      console.error(`[BadgeDAO] Error creating or updating user badge for UserID: ${userBadge.userId}, BadgeID: ${userBadge.badgeId}:`, error.message);
      throw new Error(`Failed to create or update user badge for UserID: ${userBadge.userId}, BadgeID: ${userBadge.badgeId}: ${error.message}`);
    }
  }

  /**
   * Get obtained badges for a user
   * @param userId User ID
   * @returns Array of user badges that have been obtained
   */
  async getObtainedBadges(userId: string): Promise<UserBadge[]> {
    console.log(`[BadgeDAO] getObtainedBadges called for UserID: ${userId}`);
    try {
      const result = await db.select().from(userBadges)
        .where(and(eq(userBadges.userId, userId), eq(userBadges.obtained, true)));
      console.log(`[BadgeDAO] Found ${result.length} obtained badges for UserID: ${userId}.`);
      return result.map(dbUserBadge => ({
        userId: dbUserBadge.userId,
        badgeId: dbUserBadge.badgeId,
        obtained: dbUserBadge.obtained,
        dateObtained: dbUserBadge.dateObtained ? Number(dbUserBadge.dateObtained) : undefined,
        progress: dbUserBadge.progress ?? 0
      }));
    } catch (error) {
      console.error(`[BadgeDAO] Error getting obtained badges for UserID: ${userId}:`, error.message);
      throw new Error(`Failed to get obtained badges for UserID: ${userId}: ${error.message}`);
    }
  }

  /**
   * Check if a user has a specific badge
   * @param userId User ID
   * @param badgeId Badge ID
   * @returns True if the user has obtained the badge, false otherwise
   */
  async hasUserObtainedBadge(userId: string, badgeId: string): Promise<boolean> {
    console.log(`[BadgeDAO] hasUserObtainedBadge called for UserID: ${userId}, BadgeID: ${badgeId}`);
    try {
      const userBadge = await this.getUserBadge(userId, badgeId); // Already logs
      const hasBadge = userBadge?.obtained ?? false;
      console.log(`[BadgeDAO] User ${userId} ${hasBadge ? 'has' : 'has not'} obtained badge ${badgeId}.`);
      return hasBadge;
    } catch (error) {
      console.error(`[BadgeDAO] Error checking if user ${userId} has badge ${badgeId}:`, error.message);
      // If getUserBadge throws, this will catch it.
      // Depending on desired behavior, might re-throw or return false.
      // For now, re-throwing to indicate a deeper issue than just "doesn't have badge".
      throw new Error(`Failed to check if user ${userId} has badge ${badgeId}: ${error.message}`);
    }
  }

  /**
   * Update user badge progress
   * @param userId User ID
   * @param badgeId Badge ID
   * @param progress New progress value
   * @returns Updated user badge
   */
  async updateBadgeProgress(userId: string, badgeId: string, progress: number): Promise<UserBadge> {
    console.log(`[BadgeDAO] updateBadgeProgress called for UserID: ${userId}, BadgeID: ${badgeId}, Progress: ${progress}`);
    try {
      let userBadge = await this.getUserBadge(userId, badgeId); // Already logs
      if (!userBadge) {
        console.log(`[BadgeDAO] No existing UserBadge for UserID: ${userId}, BadgeID: ${badgeId}. Creating new one.`);
        userBadge = { userId, badgeId, obtained: false, progress: 0 };
      }
      
      userBadge.progress = progress;
      console.log(`[BadgeDAO] UserBadge for UserID: ${userId}, BadgeID: ${badgeId} progress updated to ${progress}.`);
      
      if (progress >= 100 && !userBadge.obtained) {
        userBadge.obtained = true;
        userBadge.dateObtained = Date.now();
        console.log(`[BadgeDAO] UserBadge for UserID: ${userId}, BadgeID: ${badgeId} requirements met. Marking as obtained.`);
      }
      
      return await this.createOrUpdateUserBadge(userBadge); // Already logs
    } catch (error) {
      console.error(`[BadgeDAO] Error updating badge progress for UserID: ${userId}, BadgeID: ${badgeId}:`, error.message);
      throw new Error(`Failed to update badge progress for UserID: ${userId}, BadgeID: ${badgeId}: ${error.message}`);
    }
  }

  /**
   * Award a badge to a user
   * @param userId User ID
   * @param badgeId Badge ID
   * @returns Updated user badge
   */
  async awardBadge(userId: string, badgeId: string): Promise<UserBadge> {
    console.log(`[BadgeDAO] awardBadge called for UserID: ${userId}, BadgeID: ${badgeId}`);
    try {
      let userBadge = await this.getUserBadge(userId, badgeId); // Already logs
      if (!userBadge) {
        console.log(`[BadgeDAO] No existing UserBadge for UserID: ${userId}, BadgeID: ${badgeId} to award. Creating new one.`);
        userBadge = { userId, badgeId, obtained: false, progress: 0 };
      }

      if (userBadge.obtained) {
        console.log(`[BadgeDAO] UserID: ${userId} already has badge ${badgeId}. Updating dateObtained if necessary.`);
      }
      
      userBadge.obtained = true;
      userBadge.dateObtained = userBadge.dateObtained || Date.now(); // Keep original date if already obtained
      userBadge.progress = Math.max(userBadge.progress || 0, 100); // Ensure progress is at least 100
      
      console.log(`[BadgeDAO] Awarding badge ${badgeId} to UserID: ${userId}.`);
      return await this.createOrUpdateUserBadge(userBadge); // Already logs
    } catch (error) {
      console.error(`[BadgeDAO] Error awarding badge ${badgeId} to UserID: ${userId}:`, error.message);
      throw new Error(`Failed to award badge ${badgeId} to UserID: ${userId}: ${error.message}`);
    }
  }
}

// Create a singleton instance
export const badgeDao = new BadgeDao();