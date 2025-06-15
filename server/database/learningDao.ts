import { eq, and } from 'drizzle-orm';
import { db } from './index';
import { learningModules, learningQuestions, userLearningProgress } from './schema';
import { LearningModule, LearningQuestion, UserLearningProgress } from '@shared/types';

/**
 * Data access object for learning modules, questions, and user progress
 */
export class LearningDao {
  /**
   * Create a new learning module
   * @param module Learning module to create
   * @returns Created learning module
   */
  async createLearningModule(module: LearningModule): Promise<LearningModule> {
    console.log(`[LearningDAO] createLearningModule called for module ID: ${module.id}, Title: ${module.title}`);
    try {
      const dbModule = {
        id: module.id,
        title: module.title,
        description: module.description,
        difficulty: module.difficulty,
        type: module.type,
        xpReward: module.xpReward,
        tokenReward: module.tokenReward,
        badgeId: module.badgeId,
        completionCriteria: module.completionCriteria
      };

      await db.insert(learningModules).values(dbModule);
      console.log(`[LearningDAO] Learning module ${module.id} - "${module.title}" created successfully.`);
      return module;
    } catch (error) {
      console.error(`[LearningDAO] Error creating learning module ${module.id}:`, error.message);
      throw new Error(`Failed to create learning module ${module.id}: ${error.message}`);
    }
  }

  /**
   * Get learning module by ID
   * @param id Learning module ID
   * @returns Learning module or undefined if not found
   */
  async getLearningModuleById(id: string): Promise<LearningModule | undefined> {
    console.log(`[LearningDAO] getLearningModuleById called for ID: ${id}`);
    try {
      const result = await db.select().from(learningModules).where(eq(learningModules.id, id)).limit(1);
      
      if (result.length === 0) {
        console.log(`[LearningDAO] Learning module with ID ${id} not found.`);
        return undefined;
      }
      
      console.log(`[LearningDAO] Learning module with ID ${id} found: ${result[0].title}`);
      const dbModule = result[0];
      const dbModule = result[0];
      const questions = await this.getQuestionsByModuleId(dbModule.id); // This will also log
      return {
        id: dbModule.id,
        title: dbModule.title,
        description: dbModule.description,
        difficulty: dbModule.difficulty,
        type: dbModule.type,
        xpReward: dbModule.xpReward,
        tokenReward: dbModule.tokenReward,
        badgeId: dbModule.badgeId ?? undefined,
        completionCriteria: dbModule.completionCriteria,
        questions
      };
    } catch (error) {
      console.error(`[LearningDAO] Error getting learning module by ID ${id}:`, error.message);
      throw new Error(`Failed to get learning module for ID ${id}: ${error.message}`);
    }
  }

  /**
   * Get all learning modules
   * @returns Array of learning modules
   */
  async getAllLearningModules(): Promise<LearningModule[]> {
    console.log(`[LearningDAO] getAllLearningModules called.`);
    try {
      const result = await db.select().from(learningModules);
      console.log(`[LearningDAO] Found ${result.length} learning modules in DB.`);
      const modules: LearningModule[] = [];
      for (const dbModule of result) {
        const questions = await this.getQuestionsByModuleId(dbModule.id); // This will also log
        modules.push({
          id: dbModule.id,
          title: dbModule.title,
          description: dbModule.description,
          difficulty: dbModule.difficulty,
          type: dbModule.type,
          xpReward: dbModule.xpReward,
          tokenReward: dbModule.tokenReward,
          badgeId: dbModule.badgeId ?? undefined,
          completionCriteria: dbModule.completionCriteria,
          questions
        });
      }
      console.log(`[LearningDAO] Successfully fetched and processed ${modules.length} learning modules with their questions.`);
      return modules;
    } catch (error) {
      console.error(`[LearningDAO] Error getting all learning modules:`, error.message);
      throw new Error(`Failed to get all learning modules: ${error.message}`);
    }
  }

  /**
   * Create a new learning question
   * @param question Learning question to create
   * @returns Created learning question
   */
  async createLearningQuestion(question: LearningQuestion): Promise<LearningQuestion> {
    console.log(`[LearningDAO] createLearningQuestion called for question ID: ${question.id}, Module ID: ${question.moduleId}`);
    try {
      const dbQuestion = {
        id: question.id,
        moduleId: question.moduleId,
        text: question.text,
        options: question.options,
        correctOption: question.correctOption,
        explanation: question.explanation
      };

      await db.insert(learningQuestions).values(dbQuestion);
      console.log(`[LearningDAO] Learning question ${question.id} for module ${question.moduleId} created successfully.`);
      return question;
    } catch (error) {
      console.error(`[LearningDAO] Error creating learning question ${question.id}:`, error.message);
      throw new Error(`Failed to create learning question ${question.id}: ${error.message}`);
    }
  }

  /**
   * Get learning questions by module ID
   * @param moduleId Learning module ID
   * @returns Array of learning questions
   */
  async getQuestionsByModuleId(moduleId: string): Promise<LearningQuestion[]> {
    console.log(`[LearningDAO] getQuestionsByModuleId called for Module ID: ${moduleId}`);
    try {
      const result = await db.select().from(learningQuestions).where(eq(learningQuestions.moduleId, moduleId));
      console.log(`[LearningDAO] Found ${result.length} questions for Module ID: ${moduleId}.`);
      return result.map(dbQuestion => ({
        id: dbQuestion.id,
        moduleId: dbQuestion.moduleId,
        text: dbQuestion.text,
        options: dbQuestion.options,
        correctOption: dbQuestion.correctOption,
        explanation: dbQuestion.explanation
      }));
    } catch (error) {
      console.error(`[LearningDAO] Error getting questions for Module ID ${moduleId}:`, error.message);
      throw new Error(`Failed to get learning questions for Module ID ${moduleId}: ${error.message}`);
    }
  }

  /**
   * Create or update user learning progress
   * @param progress User learning progress to create or update
   * @returns Created or updated user learning progress
   */
  async createOrUpdateUserProgress(progress: UserLearningProgress): Promise<UserLearningProgress> {
    console.log(`[LearningDAO] createOrUpdateUserProgress called for UserID: ${progress.userId}, ModuleID: ${progress.moduleId}`);
    try {
      const existingProgress = await this.getUserProgressByModuleId(progress.userId, progress.moduleId); // Already logs
      
      const dbProgress = {
        userId: progress.userId,
        moduleId: progress.moduleId,
        completed: progress.completed,
        score: progress.score,
        attemptsCount: progress.attemptsCount,
        lastAttemptDate: BigInt(progress.lastAttemptDate),
        rewardsClaimed: progress.rewardsClaimed
      };

      if (!existingProgress) {
        console.log(`[LearningDAO] No existing progress for UserID: ${progress.userId}, ModuleID: ${progress.moduleId}. Creating...`);
        await db.insert(userLearningProgress).values(dbProgress);
        console.log(`[LearningDAO] User progress for UserID: ${progress.userId}, ModuleID: ${progress.moduleId} created successfully.`);
      } else {
        console.log(`[LearningDAO] Existing progress found for UserID: ${progress.userId}, ModuleID: ${progress.moduleId}. Updating...`);
        await db.update(userLearningProgress).set(dbProgress)
          .where(and(eq(userLearningProgress.userId, progress.userId), eq(userLearningProgress.moduleId, progress.moduleId)));
        console.log(`[LearningDAO] User progress for UserID: ${progress.userId}, ModuleID: ${progress.moduleId} updated successfully.`);
      }
      
      return progress;
    } catch (error) {
      console.error(`[LearningDAO] Error creating/updating user progress for UserID: ${progress.userId}, ModuleID: ${progress.moduleId}:`, error.message);
      throw new Error(`Failed to create/update user progress for UserID: ${progress.userId}, ModuleID: ${progress.moduleId}: ${error.message}`);
    }
  }

  /**
   * Get user learning progress by module ID
   * @param userId User ID
   * @param moduleId Learning module ID
   * @returns User learning progress or undefined if not found
   */
  async getUserProgressByModuleId(userId: string, moduleId: string): Promise<UserLearningProgress | undefined> {
    console.log(`[LearningDAO] getUserProgressByModuleId called for UserID: ${userId}, ModuleID: ${moduleId}`);
    try {
      const result = await db.select().from(userLearningProgress)
        .where(and(eq(userLearningProgress.userId, userId), eq(userLearningProgress.moduleId, moduleId)))
        .limit(1);
      
      if (result.length === 0) {
        console.log(`[LearningDAO] User progress not found for UserID: ${userId}, ModuleID: ${moduleId}.`);
        return undefined;
      }
      
      console.log(`[LearningDAO] User progress found for UserID: ${userId}, ModuleID: ${moduleId}.`);
      const dbProgress = result[0];
      const dbProgress = result[0];
      return {
        userId: dbProgress.userId,
        moduleId: dbProgress.moduleId,
        completed: dbProgress.completed,
        score: dbProgress.score,
        attemptsCount: dbProgress.attemptsCount,
        lastAttemptDate: Number(dbProgress.lastAttemptDate),
        rewardsClaimed: dbProgress.rewardsClaimed
      };
    } catch (error) {
      console.error(`[LearningDAO] Error getting user progress for UserID: ${userId}, ModuleID: ${moduleId}:`, error.message);
      throw new Error(`Failed to get user progress for UserID: ${userId}, ModuleID: ${moduleId}: ${error.message}`);
    }
  }

  /**
   * Get all user learning progress
   * @param userId User ID
   * @returns Array of user learning progress
   */
  async getAllUserProgress(userId: string): Promise<UserLearningProgress[]> {
    console.log(`[LearningDAO] getAllUserProgress called for UserID: ${userId}`);
    try {
      const result = await db.select().from(userLearningProgress).where(eq(userLearningProgress.userId, userId));
      console.log(`[LearningDAO] Found ${result.length} progress entries for UserID: ${userId}.`);
      return result.map(dbProgress => ({
        userId: dbProgress.userId,
        moduleId: dbProgress.moduleId,
        completed: dbProgress.completed,
        score: dbProgress.score,
        attemptsCount: dbProgress.attemptsCount,
        lastAttemptDate: Number(dbProgress.lastAttemptDate),
        rewardsClaimed: dbProgress.rewardsClaimed
      }));
    } catch (error) {
      console.error(`[LearningDAO] Error getting all user progress for UserID: ${userId}:`, error.message);
      throw new Error(`Failed to get all user progress for UserID: ${userId}: ${error.message}`);
    }
  }

  /**
   * Get completed modules for a user
   * @param userId User ID
   * @returns Array of user learning progress for completed modules
   */
  async getCompletedModules(userId: string): Promise<UserLearningProgress[]> {
    console.log(`[LearningDAO] getCompletedModules called for UserID: ${userId}`);
    try {
      const result = await db.select().from(userLearningProgress)
        .where(and(eq(userLearningProgress.userId, userId), eq(userLearningProgress.completed, true)));
      console.log(`[LearningDAO] Found ${result.length} completed modules for UserID: ${userId}.`);
      return result.map(dbProgress => ({
        userId: dbProgress.userId,
        moduleId: dbProgress.moduleId,
        completed: dbProgress.completed,
        score: dbProgress.score,
        attemptsCount: dbProgress.attemptsCount,
        lastAttemptDate: Number(dbProgress.lastAttemptDate),
        rewardsClaimed: dbProgress.rewardsClaimed
      }));
    } catch (error) {
      console.error(`[LearningDAO] Error getting completed modules for UserID: ${userId}:`, error.message);
      throw new Error(`Failed to get completed modules for UserID: ${userId}: ${error.message}`);
    }
  }

  /**
   * Mark learning module rewards as claimed
   * @param userId User ID
   * @param moduleId Learning module ID
   * @returns Updated user learning progress
   */
  async markRewardsAsClaimed(userId: string, moduleId: string): Promise<UserLearningProgress | undefined> {
    console.log(`[LearningDAO] markRewardsAsClaimed called for UserID: ${userId}, ModuleID: ${moduleId}`);
    try {
      const progress = await this.getUserProgressByModuleId(userId, moduleId); // Already logs
      if (!progress) {
        console.log(`[LearningDAO] No progress found for UserID: ${userId}, ModuleID: ${moduleId}. Cannot mark rewards as claimed.`);
        return undefined;
      }
      if (!progress.completed) {
        console.log(`[LearningDAO] Module ${moduleId} not completed by UserID: ${userId}. Cannot mark rewards as claimed.`);
        return undefined;
      }
      if (progress.rewardsClaimed) {
        console.log(`[LearningDAO] Rewards for module ${moduleId} already claimed by UserID: ${userId}.`);
        // Optionally return current progress or throw specific "already claimed" error
        return progress;
      }
      
      progress.rewardsClaimed = true;
      console.log(`[LearningDAO] Marking rewards as claimed for UserID: ${userId}, ModuleID: ${moduleId}.`);
      return await this.createOrUpdateUserProgress(progress); // Already logs
    } catch (error) {
      console.error(`[LearningDAO] Error marking rewards as claimed for UserID: ${userId}, ModuleID: ${moduleId}:`, error.message);
      throw new Error(`Failed to mark rewards as claimed for UserID: ${userId}, ModuleID: ${moduleId}: ${error.message}`);
    }
  }

  /**
   * Record a learning module attempt
   * @param userId User ID
   * @param moduleId Learning module ID
   * @param score Score achieved
   * @param completed Whether the module was completed
   * @returns Updated user learning progress
   */
  async recordModuleAttempt(
    userId: string,
    moduleId: string,
    score: number,
    completed: boolean
  ): Promise<UserLearningProgress> {
    try {
      // Get existing progress or create new
      let progress = await this.getUserProgressByModuleId(userId, moduleId);
      if (!progress) {
        progress = {
          userId,
          moduleId,
          completed: false,
          score: 0,
          attemptsCount: 0,
          lastAttemptDate: 0,
          rewardsClaimed: false
        };
      }
      
      // Update progress
      progress.score = Math.max(progress.score, score);
      progress.attemptsCount++;
      progress.lastAttemptDate = Date.now();
      
      // Update completed flag
      if (completed && !progress.completed) {
        progress.completed = true;
      }
      
      // Save progress
      return await this.createOrUpdateUserProgress(progress);
    } catch (error) {
      console.error('Error recording module attempt:', error);
      throw new Error('Failed to record module attempt');
    }
  }
}

// Create a singleton instance
export const learningDao = new LearningDao();