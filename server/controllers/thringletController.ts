import { Request, Response } from 'express';
import crypto from 'crypto';
import { 
  type ThringletEmotionState, 
  ThringletPersonalityTrait, 
  BlockchainAffinity 
} from '@shared/types';
import { thringletStorage, Thringlet } from '../storage/thringlet-storage';
import { checkThringletBadges } from '../controllers/badgeController';
import { personalityService } from '../services/personality-service';

/**
 * Process input to thringlet emotion engine
 * POST /api/thringlet/input
 */
export const processInput = async (req: Request, res: Response) => {
  console.log(`[ThringletController] processInput: Request received ${req.method} ${req.originalUrl}`);
  try {
    const { thringletId, input, ownerAddress } = req.body;
    console.log(`[ThringletController] processInput: Body - thringletId=${thringletId}, input="${input}", ownerAddress=${ownerAddress}`);
    
    if (!thringletId || !input) {
      console.warn(`[ThringletController] processInput: Thringlet ID and input are required. thringletId: ${thringletId}, input: ${input}`);
      return res.status(400).json({ error: 'Thringlet ID and input are required' });
    }
    
    console.log(`[ThringletController] processInput: Fetching Thringlet ${thringletId} from storage.`);
    const thringlet = await thringletStorage.getThringlet(thringletId); // Assuming storage logs internally
    if (!thringlet) {
      console.warn(`[ThringletController] processInput: Thringlet ${thringletId} not found.`);
      return res.status(404).json({ error: 'Thringlet not found' });
    }
    
    if (ownerAddress && thringlet.owner !== ownerAddress) {
      console.warn(`[ThringletController] processInput: Owner mismatch for Thringlet ${thringletId}. Expected: ${thringlet.owner}, Actual: ${ownerAddress}`);
      return res.status(403).json({ error: 'You do not own this thringlet' });
    }
    
    console.log(`[ThringletController] processInput: Processing input "${input}" for Thringlet ${thringletId}. Current emotion: ${thringlet.emotionState}`);
    let newState = thringlet.emotionState;
    const inputLower = input.toLowerCase();
    
    if (inputLower.includes('happy') || inputLower.includes('joy') || inputLower.includes('excited')) {
      newState = 'happy' as ThringletEmotionState;
    } else if (inputLower.includes('sad') || inputLower.includes('unhappy') || inputLower.includes('depressed')) {
      newState = 'sad' as ThringletEmotionState;
    } else if (inputLower.includes('angry') || inputLower.includes('mad') || inputLower.includes('furious')) {
      newState = 'angry' as ThringletEmotionState;
    } else if (inputLower.includes('tired') || inputLower.includes('sleepy') || inputLower.includes('exhausted')) {
      newState = 'neutral' as ThringletEmotionState; // No 'tired' in our type, using neutral instead
    } else if (inputLower.includes('hungry') || inputLower.includes('food') || inputLower.includes('eat')) {
      newState = 'neutral' as ThringletEmotionState; // No 'hungry' in our type, using neutral instead
    } else if (inputLower.includes('excited') || inputLower.includes('thrilled')) {
      newState = 'excited' as ThringletEmotionState;
    } else {
      // Random state change with low probability
      if (Math.random() < 0.2) {
        const states: ThringletEmotionState[] = ['happy', 'sad', 'excited', 'neutral', 'angry', 'curious'];
        newState = states[Math.floor(Math.random() * states.length)];
      }
    }
    
    // Update thringlet state
    const updatedThringlet = {
      ...thringlet,
      emotionState: newState,
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
    
    await thringletStorage.updateThringlet(thringletId, updatedThringlet); // Assuming storage logs internally
    console.log(`[ThringletController] processInput: Thringlet ${thringletId} state updated. New emotion: ${updatedThringlet.emotionState}, Level: ${updatedThringlet.level}`);

    if (ownerAddress) {
      console.log(`[ThringletController] processInput: Checking Thringlet badges for owner ${ownerAddress}.`);
      try {
        const userThringlets = await thringletStorage.getThringletsByOwner(ownerAddress);
        const thringletCount = userThringlets?.length || 0; // Default to 0 if null/undefined
        console.log(`[ThringletController] processInput: User ${ownerAddress} owns ${thringletCount} Thringlets. Current Thringlet level: ${updatedThringlet.level}`);
        await checkThringletBadges(ownerAddress, updatedThringlet.level, 0, thringletCount); // checkThringletBadges logs internally
      } catch (err) {
        console.error('[ThringletController] processInput: Error checking Thringlet badges:', err.message);
      }
    }
    
    const responsePayload = {
      id: thringletId,
      emotionState: updatedThringlet.emotionState,
      level: updatedThringlet.level,
      experience: updatedThringlet.experience,
      lastInteraction: updatedThringlet.lastInteraction
    };
    console.log(`[ThringletController] processInput: Sending 200 OK response for Thringlet ${thringletId}.`, responsePayload);
    res.json(responsePayload);
  } catch (error) {
    console.error(`[ThringletController] processInput: Error processing input for Thringlet ${thringletId}:`, error.message);
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
  const { id } = req.params;
  console.log(`[ThringletController] getStatus: Request received ${req.method} ${req.originalUrl} for ThringletID: ${id}`);
  try {
    console.log(`[ThringletController] getStatus: Fetching Thringlet ${id} from storage.`);
    const thringlet = await thringletStorage.getThringlet(id); // Assuming storage logs
    if (!thringlet) {
      console.warn(`[ThringletController] getStatus: Thringlet ${id} not found.`);
      return res.status(404).json({ error: 'Thringlet not found' });
    }
    
    console.log(`[ThringletController] getStatus: Thringlet ${id} found. Last interaction: ${new Date(thringlet.lastInteraction).toISOString()}`);
    const now = Date.now();
    const timeSinceLastInteraction = now - thringlet.lastInteraction;
    const hoursSinceLastInteraction = timeSinceLastInteraction / (60 * 60 * 1000);
    
    let currentState = thringlet.emotionState;
    if (hoursSinceLastInteraction > 24) { // Example: 24 hours
      console.log(`[ThringletController] getStatus: Thringlet ${id} has not been interacted with for ${hoursSinceLastInteraction.toFixed(1)} hours. Updating emotion.`);
      // Simplified emotion decay logic
      currentState = (Math.random() < 0.5) ? 'neutral' : 'sad';
      await thringletStorage.updateThringlet(id, { ...thringlet, emotionState: currentState }); // Assuming storage logs
      console.log(`[ThringletController] getStatus: Thringlet ${id} emotion state updated to ${currentState} due to inactivity.`);
    }
    
    const responsePayload = {
      id: thringlet.id, name: thringlet.name, emotionState: currentState,
      level: thringlet.level, experience: thringlet.experience, abilities: thringlet.abilities,
      visual: thringlet.visual, lastInteraction: thringlet.lastInteraction
    };
    console.log(`[ThringletController] getStatus: Sending 200 OK response for Thringlet ${id}.`, responsePayload);
    res.json(responsePayload);
  } catch (error) {
    console.error(`[ThringletController] getStatus: Error getting status for Thringlet ${id}:`, error.message);
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
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  console.log(`[ThringletController] getEmotionHistory: Request received ${req.method} ${req.originalUrl} for ThringletID: ${id}, Limit: ${limit}`);
  try {
    console.log(`[ThringletController] getEmotionHistory: Fetching Thringlet ${id} from storage.`);
    const thringlet = await thringletStorage.getThringlet(id); // Assuming storage logs
    if (!thringlet) {
      console.warn(`[ThringletController] getEmotionHistory: Thringlet ${id} not found.`);
      return res.status(404).json({ error: 'Thringlet not found' });
    }
    
    const history = thringlet.stateHistory || [];
    const limitedHistory = history.slice(-limit).map(entry => ({
      state: entry.state,
      timestamp: entry.timestamp,
      trigger: entry.trigger // Ensure 'trigger' is part of the type if it exists
    }));
    
    console.log(`[ThringletController] getEmotionHistory: Sending ${limitedHistory.length} history entries for Thringlet ${id}.`);
    res.json({ id: thringlet.id, history: limitedHistory });
  } catch (error) {
    console.error(`[ThringletController] getEmotionHistory: Error getting emotion history for Thringlet ${id}:`, error.message);
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
  console.log(`[ThringletController] createThringlet: Request received ${req.method} ${req.originalUrl}`);
  try {
    const { name, ownerAddress } = req.body;
    console.log(`[ThringletController] createThringlet: Body - name="${name}", ownerAddress=${ownerAddress}`);
    
    if (!name || !ownerAddress) {
      console.warn(`[ThringletController] createThringlet: Name and owner address are required. Name: ${name}, Owner: ${ownerAddress}`);
      return res.status(400).json({ error: 'Name and owner address are required' });
    }
    
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
    
    // Generate personality traits
    const personality = personalityService.generateInitialPersonality();
    
    // Create thringlet with personality traits
    const thringlet: Thringlet = {
      id,
      name,
      owner: ownerAddress,
      createdAt: Date.now(),
      lastInteraction: Date.now(),
      emotionState: 'neutral' as ThringletEmotionState,
      level: 1,
      experience: 0,
      abilities: ['basic_movement'],
      // Personality system
      personalityTraits: personality.personalityTraits,
      dominantTrait: personality.dominantTrait,
      blockchainAffinities: personality.blockchainAffinities,
      dominantAffinity: personality.dominantAffinity,
      traitIntensity: personality.traitIntensity,
      // Blockchain activity influences
      miningInfluence: personality.miningInfluence,
      stakingInfluence: personality.stakingInfluence,
      tradingInfluence: personality.tradingInfluence,
      governanceInfluence: personality.governanceInfluence,
      // Visual appearance
      visual: {
        baseColor,
        eyeColor,
        appendages,
        specialFeatures
      },
      stateHistory: [{
        state: 'neutral' as ThringletEmotionState,
        timestamp: Date.now(),
        trigger: 'creation'
      }]
    };
    
    await thringletStorage.createThringlet(thringlet); // Assuming storage logs
    console.log(`[ThringletController] createThringlet: Thringlet ${id} created successfully for owner ${ownerAddress}.`);
    
    try {
      console.log(`[ThringletController] createThringlet: Checking Thringlet creation badges for owner ${ownerAddress}.`);
      const ownedThringlets = await thringletStorage.getThringletsByOwner(ownerAddress);
      await checkThringletBadges(ownerAddress, 1, 0, ownedThringlets?.length || 1); // checkThringletBadges logs
    } catch (err) {
      console.error('[ThringletController] createThringlet: Error checking Thringlet creation badges:', err.message);
    }
    
    const responsePayload = {
      id, name, owner: ownerAddress,
      emotionState: 'neutral' as ThringletEmotionState, // Initial state
      visual: thringlet.visual
    };
    console.log(`[ThringletController] createThringlet: Sending 201 Created response for Thringlet ${id}.`, responsePayload);
    res.status(201).json(responsePayload);
  } catch (error) {
    console.error(`[ThringletController] createThringlet: Error creating Thringlet:`, error.message);
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
  const { owner } = req.query;
  console.log(`[ThringletController] getAllThringlets: Request received ${req.method} ${req.originalUrl}. Owner filter: ${owner || 'None'}`);
  try {
    let allThringlets = await thringletStorage.getAllThringlets(); // Assuming storage logs
    console.log(`[ThringletController] getAllThringlets: Fetched ${allThringlets.length} total Thringlets.`);
    
    if (owner && typeof owner === 'string') {
      allThringlets = allThringlets.filter(thringlet => thringlet.owner === owner);
      console.log(`[ThringletController] getAllThringlets: Filtered to ${allThringlets.length} Thringlets for owner ${owner}.`);
    }
    
    const thringletsList = allThringlets.map(thringlet => ({ /* ... attributes ... */
      id: thringlet.id, name: thringlet.name, owner: thringlet.owner, emotionState: thringlet.emotionState,
      level: thringlet.level, experience: thringlet.experience, lastInteraction: thringlet.lastInteraction,
      visual: thringlet.visual
    }));
    
    console.log(`[ThringletController] getAllThringlets: Sending 200 OK response with ${thringletsList.length} Thringlets.`);
    res.json(thringletsList);
  } catch (error) {
    console.error(`[ThringletController] getAllThringlets: Error getting all Thringlets:`, error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get thringlets'
    });
  }
};

/**
 * Get thringlet personality traits
 * GET /api/thringlet/personality/:id
 */
export const getThringletPersonality = async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`[ThringletController] getThringletPersonality: Request received ${req.method} ${req.originalUrl} for ThringletID: ${id}`);
  try {
    console.log(`[ThringletController] getThringletPersonality: Fetching Thringlet ${id} from storage.`);
    const thringlet = await thringletStorage.getThringlet(id); // Assuming storage logs
    if (!thringlet) {
      console.warn(`[ThringletController] getThringletPersonality: Thringlet ${id} not found.`);
      return res.status(404).json({ error: 'Thringlet not found' });
    }
    
    const personalityData = { /* ... attributes ... */
      id: thringlet.id, personalityTraits: thringlet.personalityTraits, dominantTrait: thringlet.dominantTrait,
      blockchainAffinities: thringlet.blockchainAffinities, dominantAffinity: thringlet.dominantAffinity,
      traitIntensity: thringlet.traitIntensity, miningInfluence: thringlet.miningInfluence,
      stakingInfluence: thringlet.stakingInfluence, tradingInfluence: thringlet.tradingInfluence,
      governanceInfluence: thringlet.governanceInfluence
    };
    console.log(`[ThringletController] getThringletPersonality: Sending 200 OK response for Thringlet ${id}.`, personalityData);
    res.json(personalityData);
  } catch (error) {
    console.error(`[ThringletController] getThringletPersonality: Error getting personality for Thringlet ${id}:`, error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get thringlet personality'
    });
  }
};

/**
 * Update thringlet personality based on blockchain activity
 * POST /api/thringlet/update-personality
 */
export const updatePersonalityFromActivity = async (req: Request, res: Response) => {
  const { thringletId } = req.body;
  console.log(`[ThringletController] updatePersonalityFromActivity: Request received ${req.method} ${req.originalUrl} for ThringletID: ${thringletId}`);
  try {
    if (!thringletId) {
      console.warn(`[ThringletController] updatePersonalityFromActivity: Thringlet ID is required.`);
      return res.status(400).json({ error: 'Thringlet ID is required' });
    }
    
    console.log(`[ThringletController] updatePersonalityFromActivity: Fetching Thringlet ${thringletId}.`);
    const thringlet = await thringletStorage.getThringlet(thringletId); // Assuming storage logs
    if (!thringlet) {
      console.warn(`[ThringletController] updatePersonalityFromActivity: Thringlet ${thringletId} not found.`);
      return res.status(404).json({ error: 'Thringlet not found' });
    }
    
    console.log(`[ThringletController] updatePersonalityFromActivity: Calling personalityService.updatePersonalityFromBlockchainActivity for Thringlet ${thringletId}.`);
    const updates = await personalityService.updatePersonalityFromBlockchainActivity(thringlet); // Assuming service logs
    
    if (Object.keys(updates).length === 0) {
      console.log(`[ThringletController] updatePersonalityFromActivity: No personality changes detected for Thringlet ${thringletId}.`);
      return res.json({ id: thringletId, message: 'No personality changes detected', updated: false });
    }
    
    console.log(`[ThringletController] updatePersonalityFromActivity: Applying updates for Thringlet ${thringletId}. Changes:`, updates);
    await thringletStorage.updateThringlet(thringletId, updates); // Assuming storage logs
    
    const responsePayload = {
      id: thringletId, message: 'Personality updated based on blockchain activity', updated: true,
      changes: { /* ... as before ... */
        dominantTrait: updates.dominantTrait !== thringlet.dominantTrait,
        emotionState: updates.emotionState !== thringlet.emotionState,
        experience: updates.experience !== thringlet.experience }
    };
    console.log(`[ThringletController] updatePersonalityFromActivity: Sending 200 OK response for Thringlet ${thringletId}.`, responsePayload);
    res.json(responsePayload);
  } catch (error) {
    console.error(`[ThringletController] updatePersonalityFromActivity: Error updating personality for Thringlet ${thringletId}:`, error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update thringlet personality'
    });
  }
};

/**
 * Get personalized response from thringlet based on personality
 * POST /api/thringlet/personality-response
 */
// This function seems to generate generic personality, not related to a specific thringlet by ID from request.
export const getGenericPersonality = async (req: Request, res: Response) => {
  console.log(`[ThringletController] getGenericPersonality: Request received ${req.method} ${req.originalUrl}`);
  try {
    const traits = [
      { trait: 'ADAPTIVE', value: Math.floor(Math.random() * 100) },
      { trait: 'ANALYTICAL', value: Math.floor(Math.random() * 100) },
      { trait: 'BOLD', value: Math.floor(Math.random() * 100) },
      { trait: 'CAUTIOUS', value: Math.floor(Math.random() * 100) },
      { trait: 'CREATIVE', value: Math.floor(Math.random() * 100) },
      { trait: 'CURIOUS', value: Math.floor(Math.random() * 100) },
      { trait: 'EFFICIENT', value: Math.floor(Math.random() * 100) }
    ];
    
    // Find the dominant trait
    const dominantTrait = traits.reduce((max, trait) => 
      trait.value > max.value ? trait : max, traits[0]);
    
    // Generate blockchain affinities
    const blockchainAffinities = [
      { type: 'MINING', value: Math.floor(Math.random() * 100) },
      { type: 'STAKING', value: Math.floor(Math.random() * 100) },
      { type: 'TRADING', value: Math.floor(Math.random() * 100) },
      { type: 'GOVERNANCE', value: Math.floor(Math.random() * 100) }
    ];
    
    // Find the dominant affinity
    const dominantAffinity = blockchainAffinities.reduce((max, affinity) => 
      affinity.value > max.value ? affinity : max, blockchainAffinities[0]);
    
    const personalityData = { /* ... as before ... */
      personalityTraits: traits, dominantTrait: dominantTrait.trait, blockchainAffinities: blockchainAffinities,
      dominantAffinity: dominantAffinity.type, traitIntensity: Math.floor(Math.random() * 100),
      miningInfluence: Math.floor(Math.random() * 10), stakingInfluence: Math.floor(Math.random() * 10),
      tradingInfluence: Math.floor(Math.random() * 10), governanceInfluence: Math.floor(Math.random() * 10)
    };
    console.log(`[ThringletController] getGenericPersonality: Sending 200 OK response with generated personality.`);
    res.json(personalityData);
  } catch (error) {
    console.error(`[ThringletController] getGenericPersonality: Error generating generic personality:`, error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate generic personality'
    });
  }
};

export const getPersonalizedResponse = async (req: Request, res: Response) => {
  const { thringletId, input } = req.body;
  console.log(`[ThringletController] getPersonalizedResponse: Request received ${req.method} ${req.originalUrl} for ThringletID: ${thringletId}, Input: "${input}"`);
  try {
    if (!thringletId || !input) {
      console.warn(`[ThringletController] getPersonalizedResponse: Thringlet ID and input are required. ThringletID: ${thringletId}, Input: ${input}`);
      return res.status(400).json({ error: 'Thringlet ID and input are required' });
    }
    
    console.log(`[ThringletController] getPersonalizedResponse: Fetching Thringlet ${thringletId}.`);
    const thringlet = await thringletStorage.getThringlet(thringletId); // Assuming storage logs
    if (!thringlet) {
      console.warn(`[ThringletController] getPersonalizedResponse: Thringlet ${thringletId} not found.`);
      return res.status(404).json({ error: 'Thringlet not found' });
    }
    
    console.log(`[ThringletController] getPersonalizedResponse: Calling personalityService.getPersonalizedResponse for Thringlet ${thringletId}.`);
    const response = personalityService.getPersonalizedResponse(thringlet, input); // Assuming service logs
    
    const responsePayload = {
      id: thringletId, input, response,
      personality: { dominantTrait: thringlet.dominantTrait, dominantAffinity: thringlet.dominantAffinity }
    };
    console.log(`[ThringletController] getPersonalizedResponse: Sending 200 OK response for Thringlet ${thringletId}. Response: "${response}"`);
    res.json(responsePayload);
  } catch (error) {
    console.error(`[ThringletController] getPersonalizedResponse: Error for Thringlet ${thringletId}, Input "${input}":`, error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get personalized response'
    });
  }
};