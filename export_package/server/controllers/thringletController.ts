import { Request, Response } from 'express';
import crypto from 'crypto';
import { ThringletEmotionState } from '@shared/types';
import { thringletStorage, Thringlet } from '../storage/thringlet-storage';
import { checkThringletBadges } from '../controllers/badgeController';

/**
 * Process input to thringlet emotion engine
 * POST /api/thringlet/input
 */
export const processInput = async (req: Request, res: Response) => {
  try {
    const { thringletId, input, ownerAddress } = req.body;
    
    if (!thringletId || !input) {
      return res.status(400).json({ error: 'Thringlet ID and input are required' });
    }
    
    // Get thringlet
    const thringlet = await thringletStorage.getThringlet(thringletId);
    if (!thringlet) {
      return res.status(404).json({ error: 'Thringlet not found' });
    }
    
    // Verify ownership if owner address provided
    if (ownerAddress && thringlet.owner !== ownerAddress) {
      return res.status(403).json({ error: 'You do not own this thringlet' });
    }
    
    // Process input (simplified emotion engine logic)
    let newState = thringlet.emotionalState;
    const inputLower = input.toLowerCase();
    
    if (inputLower.includes('happy') || inputLower.includes('joy') || inputLower.includes('excited')) {
      newState = ThringletEmotionState.HAPPY;
    } else if (inputLower.includes('sad') || inputLower.includes('unhappy') || inputLower.includes('depressed')) {
      newState = ThringletEmotionState.SAD;
    } else if (inputLower.includes('angry') || inputLower.includes('mad') || inputLower.includes('furious')) {
      newState = ThringletEmotionState.ANGRY;
    } else if (inputLower.includes('tired') || inputLower.includes('sleepy') || inputLower.includes('exhausted')) {
      newState = ThringletEmotionState.TIRED;
    } else if (inputLower.includes('hungry') || inputLower.includes('food') || inputLower.includes('eat')) {
      newState = ThringletEmotionState.HUNGRY;
    } else if (inputLower.includes('excited') || inputLower.includes('thrilled')) {
      newState = ThringletEmotionState.EXCITED;
    } else {
      // Random state change with low probability
      if (Math.random() < 0.2) {
        const states = Object.values(ThringletEmotionState);
        newState = states[Math.floor(Math.random() * states.length)];
      }
    }
    
    // Update thringlet state
    const updatedThringlet = {
      ...thringlet,
      emotionalState: newState,
      lastInteraction: Date.now(),
      experience: thringlet.experience + 10,
    };
    
    // Add to emotion history
    if (!updatedThringlet.stateHistory) {
      updatedThringlet.stateHistory = [];
    }
    
    updatedThringlet.stateHistory.push({
      state: newState,
      timestamp: Date.now(),
      trigger: input
    });
    
    // Limit history size
    if (updatedThringlet.stateHistory.length > 50) {
      updatedThringlet.stateHistory = updatedThringlet.stateHistory.slice(-50);
    }
    
    // Level up if enough experience
    if (updatedThringlet.experience >= updatedThringlet.level * 100) {
      updatedThringlet.level += 1;
      
      // Add new ability at certain levels
      if (updatedThringlet.level % 5 === 0) {
        const newAbilities = [
          'teleport',
          'invisibility',
          'mind_reading',
          'healing',
          'time_freeze',
          'energy_burst',
          'shapeshifting'
        ];
        
        // Add a random ability if not already present
        let newAbility: string;
        do {
          newAbility = newAbilities[Math.floor(Math.random() * newAbilities.length)];
        } while (updatedThringlet.abilities.includes(newAbility));
        
        updatedThringlet.abilities.push(newAbility);
      }
    }
    
    // Save updated thringlet
    await thringletStorage.updateThringlet(thringletId, updatedThringlet);

    // Check for Thringlet-related badges if an owner address is provided
    if (ownerAddress) {
      try {
        // Award badges based on thringlet level, interaction count, and state changes
        await checkThringletBadges(
          ownerAddress, 
          updatedThringlet.level, 
          updatedThringlet.stateHistory?.length || 0
        );
      } catch (err) {
        console.error('Error checking thringlet badges:', err);
        // Continue even if badge check fails
      }
    }
    
    res.json({
      id: thringletId,
      emotionalState: updatedThringlet.emotionalState,
      level: updatedThringlet.level,
      experience: updatedThringlet.experience,
      lastInteraction: updatedThringlet.lastInteraction
    });
  } catch (error) {
    console.error('Error processing thringlet input:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process thringlet input'
    });
  }
};

/**
 * Get current thringlet status
 * GET /api/thringlet/status/:id
 */
export const getStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get thringlet
    const thringlet = await thringletStorage.getThringlet(id);
    if (!thringlet) {
      return res.status(404).json({ error: 'Thringlet not found' });
    }
    
    // Calculate time since last interaction
    const now = Date.now();
    const timeSinceLastInteraction = now - thringlet.lastInteraction;
    const hoursSinceLastInteraction = timeSinceLastInteraction / (60 * 60 * 1000);
    
    // Thringlet gets hungry or tired if not interacted with for a while
    let currentState = thringlet.emotionalState;
    if (hoursSinceLastInteraction > 24) {
      if (Math.random() < 0.5) {
        currentState = ThringletEmotionState.HUNGRY;
      } else {
        currentState = ThringletEmotionState.TIRED;
      }
      
      // Update thringlet state
      await thringletStorage.updateThringlet(id, { ...thringlet, emotionalState: currentState });
    }
    
    res.json({
      id: thringlet.id,
      name: thringlet.name,
      emotionalState: currentState,
      level: thringlet.level,
      experience: thringlet.experience,
      abilities: thringlet.abilities,
      visual: thringlet.visual,
      lastInteraction: thringlet.lastInteraction
    });
  } catch (error) {
    console.error('Error getting thringlet status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get thringlet status'
    });
  }
};

/**
 * Get thringlet emotion history
 * GET /api/thringlet/emotions/:id
 */
export const getEmotionHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get thringlet
    const thringlet = await thringletStorage.getThringlet(id);
    if (!thringlet) {
      return res.status(404).json({ error: 'Thringlet not found' });
    }
    
    // Get limit from query
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get emotion history
    const history = thringlet.stateHistory || [];
    
    // Return limited history
    res.json({
      id: thringlet.id,
      history: history.slice(-limit).map((entry: { state: ThringletEmotionState; timestamp: number; trigger: string }) => ({
        state: entry.state,
        timestamp: entry.timestamp,
        trigger: entry.trigger
      }))
    });
  } catch (error) {
    console.error('Error getting thringlet emotion history:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get thringlet emotion history'
    });
  }
};

/**
 * Create new thringlet
 * POST /api/thringlet/create
 */
export const createThringlet = async (req: Request, res: Response) => {
  try {
    const { name, ownerAddress } = req.body;
    
    if (!name || !ownerAddress) {
      return res.status(400).json({ error: 'Name and owner address are required' });
    }
    
    // Generate unique ID
    const id = crypto.randomBytes(16).toString('hex');
    
    // Generate random visual properties
    const colors = ['blue', 'green', 'purple', 'pink', 'teal', 'orange', 'red'];
    const baseColor = colors[Math.floor(Math.random() * colors.length)];
    const eyeColor = colors[Math.floor(Math.random() * colors.length)];
    const appendages = Math.floor(Math.random() * 6) + 2; // 2-7 appendages
    
    const specialFeatures: string[] = [];
    const possibleFeatures = [
      'glowing_eyes', 'horn', 'wings', 'scales', 'spikes', 
      'multiple_eyes', 'tentacles', 'smoke', 'crystal_growths'
    ];
    
    // Add 1-3 random special features
    const featureCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < featureCount; i++) {
      const feature = possibleFeatures[Math.floor(Math.random() * possibleFeatures.length)];
      if (!specialFeatures.includes(feature)) {
        specialFeatures.push(feature);
      }
    }
    
    // Create thringlet
    const thringlet: Thringlet = {
      id,
      name,
      owner: ownerAddress,
      createdAt: Date.now(),
      lastInteraction: Date.now(),
      emotionalState: ThringletEmotionState.NEUTRAL,
      level: 1,
      experience: 0,
      abilities: ['basic_movement'],
      visual: {
        baseColor,
        eyeColor,
        appendages,
        specialFeatures
      },
      stateHistory: [{
        state: ThringletEmotionState.NEUTRAL,
        timestamp: Date.now(),
        trigger: 'creation'
      }]
    };
    
    // Save thringlet
    await thringletStorage.createThringlet(thringlet);
    
    // Check for a first Thringlet creation badge
    try {
      // Get count of thringlets owned by this address to check if this is their first
      const ownedThringlets = await thringletStorage.getThringletsByOwner(ownerAddress);
      await checkThringletBadges(ownerAddress, 1, 0, ownedThringlets.length);
    } catch (err) {
      console.error('Error checking thringlet creation badges:', err);
      // Continue even if badge check fails
    }
    
    res.status(201).json({
      id,
      name,
      owner: ownerAddress,
      emotionalState: ThringletEmotionState.NEUTRAL,
      visual: thringlet.visual
    });
  } catch (error) {
    console.error('Error creating thringlet:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create thringlet'
    });
  }
};

/**
 * Get all thringlets
 * GET /api/thringlet/all
 */
export const getAllThringlets = async (req: Request, res: Response) => {
  try {
    // Get all thringlets
    let allThringlets = await thringletStorage.getAllThringlets();
    
    // Filter by owner if provided
    const { owner } = req.query;
    if (owner && typeof owner === 'string') {
      allThringlets = allThringlets.filter(thringlet => thringlet.owner === owner);
    }
    
    // Format response
    const thringletsList = allThringlets.map(thringlet => ({
      id: thringlet.id,
      name: thringlet.name,
      owner: thringlet.owner,
      emotionalState: thringlet.emotionalState,
      level: thringlet.level,
      experience: thringlet.experience,
      lastInteraction: thringlet.lastInteraction,
      visual: thringlet.visual
    }));
    
    res.json(thringletsList);
  } catch (error) {
    console.error('Error getting all thringlets:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get thringlets'
    });
  }
};