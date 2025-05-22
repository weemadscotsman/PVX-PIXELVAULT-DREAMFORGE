import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

// Badge Routes
router.get("/badges", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const filterActive = req.query.active !== 'false'; // Default to true
    const category = req.query.category as string;
    
    let badges;
    if (category) {
      badges = await storage.getBadgesByCategory(category, limit);
    } else {
      badges = await storage.getBadges(limit, filterActive);
    }
    
    res.json(badges);
  } catch (error) {
    console.error("Error fetching badges:", error);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

router.get("/badges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid badge ID" });
    }
    
    const badge = await storage.getBadgeById(id);
    if (!badge) {
      return res.status(404).json({ error: "Badge not found" });
    }
    
    res.json(badge);
  } catch (error) {
    console.error(`Error fetching badge with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch badge" });
  }
});

router.get("/badges/category/:category", async (req, res) => {
  try {
    const category = req.params.category;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    
    const badges = await storage.getBadgesByCategory(category, limit);
    res.json(badges);
  } catch (error) {
    console.error(`Error fetching badges for category ${req.params.category}:`, error);
    res.status(500).json({ error: "Failed to fetch badges by category" });
  }
});

router.post("/badges", async (req, res) => {
  try {
    const { name, description, image_url, category, rarity, requirements_json, is_active } = req.body;
    
    if (!name || !description || !image_url || !category || !rarity) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["name", "description", "image_url", "category", "rarity"]
      });
    }
    
    const badgeData = {
      name,
      description,
      image_url,
      category,
      rarity,
      requirements_json: requirements_json || null,
      is_active: is_active !== undefined ? is_active : true
    };
    
    const newBadge = await storage.createBadge(badgeData);
    res.status(201).json(newBadge);
  } catch (error) {
    console.error("Error creating badge:", error);
    res.status(500).json({ error: "Failed to create badge" });
  }
});

router.patch("/badges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid badge ID" });
    }
    
    const { name, description, image_url, category, rarity, requirements_json, is_active } = req.body;
    
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "No fields provided for update" });
    }
    
    const badgeData: any = {};
    if (name !== undefined) badgeData.name = name;
    if (description !== undefined) badgeData.description = description;
    if (image_url !== undefined) badgeData.image_url = image_url;
    if (category !== undefined) badgeData.category = category;
    if (rarity !== undefined) badgeData.rarity = rarity;
    if (requirements_json !== undefined) badgeData.requirements_json = requirements_json;
    if (is_active !== undefined) badgeData.is_active = is_active;
    
    const updatedBadge = await storage.updateBadge(id, badgeData);
    
    if (!updatedBadge) {
      return res.status(404).json({ error: "Badge not found" });
    }
    
    res.json(updatedBadge);
  } catch (error) {
    console.error(`Error updating badge with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update badge" });
  }
});

// User Badge Routes
router.get("/users/:userId/badges", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    
    const userBadges = await storage.getUserBadges(userId);
    res.json(userBadges);
  } catch (error) {
    console.error(`Error fetching badges for user ${req.params.userId}:`, error);
    res.status(500).json({ error: "Failed to fetch user badges" });
  }
});

router.get("/users/:userId/badges/featured", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    
    const featuredBadges = await storage.getFeatureUserBadges(userId);
    res.json(featuredBadges);
  } catch (error) {
    console.error(`Error fetching featured badges for user ${req.params.userId}:`, error);
    res.status(500).json({ error: "Failed to fetch featured badges" });
  }
});

router.post("/users/:userId/badges", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    
    const { badge_id, awarded_reason, is_featured, is_hidden } = req.body;
    
    if (!badge_id) {
      return res.status(400).json({ error: "Badge ID is required" });
    }
    
    const badgeData = {
      user_id: userId,
      badge_id,
      awarded_reason,
      is_featured: is_featured || false,
      is_hidden: is_hidden || false
    };
    
    const userBadge = await storage.awardBadgeToUser(badgeData);
    res.status(201).json(userBadge);
  } catch (error) {
    console.error(`Error awarding badge to user ${req.params.userId}:`, error);
    res.status(500).json({ error: "Failed to award badge to user" });
  }
});

router.patch("/user-badges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user badge ID" });
    }
    
    const { is_featured, is_hidden } = req.body;
    
    if (is_featured === undefined && is_hidden === undefined) {
      return res.status(400).json({ error: "No fields provided for update" });
    }
    
    const updates: any = {};
    if (is_featured !== undefined) updates.is_featured = is_featured;
    if (is_hidden !== undefined) updates.is_hidden = is_hidden;
    
    const updatedUserBadge = await storage.updateUserBadge(id, updates);
    
    if (!updatedUserBadge) {
      return res.status(404).json({ error: "User badge not found" });
    }
    
    res.json(updatedUserBadge);
  } catch (error) {
    console.error(`Error updating user badge with ID ${req.params.id}:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update user badge" });
  }
});

// Badge Progress Routes
router.get("/users/:userId/badge-progress/:badgeId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const badgeId = parseInt(req.params.badgeId, 10);
    
    if (isNaN(userId) || isNaN(badgeId)) {
      return res.status(400).json({ error: "Invalid user ID or badge ID" });
    }
    
    const progress = await storage.getBadgeProgress(userId, badgeId);
    
    if (!progress) {
      return res.status(404).json({ error: "Badge progress not found" });
    }
    
    res.json(progress);
  } catch (error) {
    console.error(`Error fetching badge progress for user ${req.params.userId}, badge ${req.params.badgeId}:`, error);
    res.status(500).json({ error: "Failed to fetch badge progress" });
  }
});

router.post("/users/:userId/check-badges", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    
    const awardedBadges = await storage.checkAndAwardBadges(userId);
    res.json({
      userId,
      awardedBadges,
      count: awardedBadges.length
    });
  } catch (error) {
    console.error(`Error checking and awarding badges for user ${req.params.userId}:`, error);
    res.status(500).json({ error: "Failed to check and award badges" });
  }
});

export default router;