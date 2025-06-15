import { storage } from '../storage';

// Define the interface for Thringlet emotion processing
interface EmotionalState {
  joy: number;
  fear: number;
  trust: number;
  surprise: number;
  dominant: string;
}

interface ThringletAttributes {
  intellect: number;
  resilience: number;
  empathy: number;
  chaos: number;
}

interface Thringlet {
  id: string;
  name: string;
  type: string;
  level: number;
  attributes: ThringletAttributes;
  abilities: string[];
  ownerAddress: string;
  bondingDate: Date;
  emotionalState: EmotionalState;
}

type InteractionType = 'stimulate' | 'calm' | 'challenge' | 'reward';

class ThringletService {
  
  // Process interaction with a thringlet and update its emotional state
  async processInteraction(
    thringletId: string, 
    ownerAddress: string, 
    interactionType: InteractionType
  ): Promise<{ 
    emotionalState: EmotionalState, 
    ability?: { name: string, description: string } 
  }> {
    console.log(`[ThringletService] processInteraction called for ThringletID: ${thringletId}, Owner: ${ownerAddress}, Interaction: ${interactionType}`);
    
    const thringlet = await storage.getThringlet(thringletId);
    
    if (!thringlet) {
      console.error(`[ThringletService] Thringlet ${thringletId} not found during interaction.`);
      throw new Error('Thringlet not found');
    }
    
    if (thringlet.ownerAddress !== ownerAddress) {
      console.error(`[ThringletService] Owner mismatch for Thringlet ${thringletId}. Expected: ${thringlet.ownerAddress}, Got: ${ownerAddress}`);
      throw new Error('You are not the owner of this thringlet');
    }
    
    console.log(`[ThringletService] Thringlet ${thringletId} found. Current state:`, thringlet.emotionalState);
    const currentEmotionalState = thringlet.emotionalState;
    
    // Calculate emotional changes based on interaction type and thringlet attributes
    const newEmotionalState = this.calculateEmotionalResponse(
      currentEmotionalState,
      thringlet.attributes,
      interactionType
    );
    
    let newAbility: { name: string, description: string } | undefined;
    
    if (this.shouldUnlockAbility(thringlet, newEmotionalState)) {
      newAbility = this.generateAbility(thringlet, newEmotionalState);
      console.log(`[ThringletService] Thringlet ${thringletId} unlocked new ability: ${newAbility.name}`);
      const updatedAbilities = [...thringlet.abilities, newAbility.name];
      
      await storage.updateThringlet({ ...thringlet, emotionalState: newEmotionalState, abilities: updatedAbilities });
      console.log(`[ThringletService] Thringlet ${thringletId} updated with new emotional state and ability.`);
    } else {
      await storage.updateThringlet({ ...thringlet, emotionalState: newEmotionalState });
      console.log(`[ThringletService] Thringlet ${thringletId} updated with new emotional state.`);
    }
    
    console.log(`[ThringletService] Interaction processed for ${thringletId}. New state:`, newEmotionalState, newAbility ? `New ability: ${newAbility.name}` : '');
    return { emotionalState: newEmotionalState, ability: newAbility };
  }
  
  // Calculate the new emotional state based on interaction and attributes
  private calculateEmotionalResponse(
    currentState: EmotionalState,
    attributes: ThringletAttributes,
    interactionType: InteractionType
  ): EmotionalState {
    console.log(`[ThringletService] calculateEmotionalResponse for interaction: ${interactionType}, current state:`, currentState, "attributes:", attributes);
    const newState: EmotionalState = JSON.parse(JSON.stringify(currentState)); // Deep copy
    
    switch (interactionType) {
      case 'stimulate':
        // Stimulation increases joy and surprise, but may increase fear based on resilience
        newState.joy += 10 + Math.floor(attributes.intellect / 2);
        newState.surprise += 15 + Math.floor(attributes.chaos / 2);
        newState.fear += Math.max(0, 5 - Math.floor(attributes.resilience / 2));
        break;
        
      case 'calm':
        // Calming decreases fear and increases trust
        newState.fear = Math.max(0, newState.fear - (10 + Math.floor(attributes.resilience / 2)));
        newState.trust += 15 + Math.floor(attributes.empathy / 2);
        newState.joy += 5;
        break;
        
      case 'challenge':
        // Challenge increases surprise and might increase fear or joy depending on attributes
        newState.surprise += 20 + Math.floor(attributes.chaos / 2);
        
        if (attributes.resilience > attributes.fear) {
          // High resilience means challenges are enjoyed
          newState.joy += 10 + Math.floor(attributes.resilience / 2);
          newState.fear = Math.max(0, newState.fear - 5);
        } else {
          // Low resilience means challenges cause fear
          newState.fear += 10 + Math.floor((10 - attributes.resilience) / 2);
          newState.joy = Math.max(0, newState.joy - 5);
        }
        break;
        
      case 'reward':
        // Reward increases joy and trust
        newState.joy += 20 + Math.floor(attributes.empathy / 2);
        newState.trust += 15 + Math.floor(attributes.empathy / 2);
        newState.fear = Math.max(0, newState.fear - 10);
        break;
    }
    
    // Ensure emotion values stay within 0-100 range
    newState.joy = Math.min(100, Math.max(0, newState.joy));
    newState.fear = Math.min(100, Math.max(0, newState.fear));
    newState.trust = Math.min(100, Math.max(0, newState.trust));
    newState.surprise = Math.min(100, Math.max(0, newState.surprise));
    
    // Determine dominant emotion
    const emotions = [
      { name: 'joy', value: newState.joy },
      { name: 'fear', value: newState.fear },
      { name: 'trust', value: newState.trust },
      { name: 'surprise', value: newState.surprise }
    ];
    
    // Sort emotions by value in descending order
    emotions.sort((a, b) => b.value - a.value);
    
    // Set the dominant emotion
    newState.dominant = emotions[0].name;
    console.log(`[ThringletService] Calculated new emotional state:`, newState);
    return newState;
  }
  
  // Determine if a new ability should be unlocked
  private shouldUnlockAbility(thringlet: Thringlet, newEmotionalState: EmotionalState): boolean {
    const maxAbilities = Math.min(10, thringlet.level * 2); // Example: Max 10 abilities, 2 per level
    console.log(`[ThringletService] shouldUnlockAbility check for Thringlet ${thringlet.id}. Current abilities: ${thringlet.abilities.length}, Max allowed: ${maxAbilities}`);

    if (thringlet.abilities.length >= maxAbilities) {
      console.log(`[ThringletService] Thringlet ${thringlet.id} already has max abilities for its level.`);
      return false;
    }
    
    const thresholds = [70, 80, 90, 95]; // Thresholds at which abilities unlock
    
    for (const threshold of thresholds) {
      if (
        (newEmotionalState.joy >= threshold ||
         newEmotionalState.fear >= threshold ||
         newEmotionalState.trust >= threshold ||
         newEmotionalState.surprise >= threshold) &&
        // Make sure we don't trigger too often
        Math.random() < 0.3 // 30% chance when conditions are met (configurable)
      ) {
        console.log(`[ThringletService] Thringlet ${thringlet.id} met threshold for new ability. Threshold: ${threshold}, Emotion values:`, newEmotionalState);
        return true;
      }
    }
    console.log(`[ThringletService] Thringlet ${thringlet.id} did not meet conditions for unlocking a new ability.`);
    return false;
  }
  
  // Generate a new ability based on thringlet's state
  private generateAbility(thringlet: Thringlet, emotionalState: EmotionalState): { name: string, description: string } {
    const dominantEmotion = emotionalState.dominant;
    console.log(`[ThringletService] generateAbility for Thringlet ${thringlet.id} based on dominant emotion: ${dominantEmotion}`);
    const abilityPools = {
      joy: [
        { name: 'Energize', description: 'Boosts transaction speed by 15% for 24 hours' },
        { name: 'Uplift', description: 'Increases staking rewards by 5% for a week' },
        { name: 'Radiate', description: 'Provides a special visual effect for your wallet address' }
      ],
      fear: [
        { name: 'Guardian Shield', description: 'Warns about suspicious transactions automatically' },
        { name: 'Phantom Trace', description: 'Obscures your transaction history temporarily' },
        { name: 'Paranoid Check', description: 'Triple verifies all incoming transfers' }
      ],
      trust: [
        { name: 'Bond Aura', description: 'Increases governance voting power by 10%' },
        { name: 'Secure Link', description: 'Provides enhanced encryption for your transactions' },
        { name: 'Verification Field', description: 'Generates trust certificates for your proposals' }
      ],
      surprise: [
        { name: 'Chaos Flux', description: 'Random reward boosters appear on transactions' },
        { name: 'Pattern Break', description: 'Occasionally hides a transaction from public view' },
        { name: 'Glitch Gift', description: 'Randomly transforms certain μPVX digits for visual effect' }
      ]
    };
    
    // Get ability pool for the dominant emotion
    const pool = abilityPools[dominantEmotion as keyof typeof abilityPools];
    
    // Select a random ability from the pool
    const randomIndex = Math.floor(Math.random() * pool.length);
    const newAbility = pool[randomIndex];
    console.log(`[ThringletService] Generated new ability for Thringlet ${thringlet.id}: ${newAbility.name} - "${newAbility.description}"`);
    return newAbility;
  }
  
  // Bond a thringlet to an owner
  async bondThringlet(thringletId: string, ownerAddress: string): Promise<Thringlet> {
    console.log(`[ThringletService] bondThringlet called for ThringletID: ${thringletId} to Owner: ${ownerAddress}`);
    const thringlet = await storage.getThringlet(thringletId);
    
    if (!thringlet) {
      console.error(`[ThringletService] Thringlet ${thringletId} not found for bonding.`);
      throw new Error('Thringlet not found');
    }
    
    if (thringlet.ownerAddress && thringlet.ownerAddress !== ownerAddress) {
      console.error(`[ThringletService] Thringlet ${thringletId} is already bonded to another address: ${thringlet.ownerAddress}.`);
      throw new Error('This thringlet is already bonded to another address');
    }
    if (thringlet.ownerAddress === ownerAddress) {
       console.log(`[ThringletService] Thringlet ${thringletId} is already bonded to this owner: ${ownerAddress}. No action needed or re-bonding logic here.`);
       // Potentially return thringlet directly or re-apply bonding date if that's the logic
    }
    
    console.log(`[ThringletService] Bonding Thringlet ${thringletId} to ${ownerAddress}.`);
    const updatedThringlet = {
      ...thringlet,
      ownerAddress,
      bondingDate: new Date(),
      // Initialize emotional state if not already set
      emotionalState: thringlet.emotionalState || {
        joy: 50,
        fear: 10,
        trust: 30,
        surprise: 20,
        dominant: 'joy'
      }
    };
    
    // Save the updated thringlet
    const bondedThringlet = await storage.updateThringlet(updatedThringlet);
    console.log(`[ThringletService] Thringlet ${thringletId} successfully bonded to ${ownerAddress}.`);
    return bondedThringlet;
  }
  
  // Create a random thringlet
  createRandomThringlet(name: string = ''): Omit<Thringlet, 'id'> {
    console.log(`[ThringletService] createRandomThringlet called. Requested name: "${name}"`);
    const attributes: ThringletAttributes = {
      intellect: Math.floor(Math.random() * 51) + 25,
      resilience: Math.floor(Math.random() * 51) + 25,
      empathy: Math.floor(Math.random() * 51) + 25,
      chaos: Math.floor(Math.random() * 51) + 25
    };
    console.log(`[ThringletService] Generated attributes:`, attributes);
    
    let type = 'Balanced';
    let highestAttr = 0;
    
    for (const [attr, value] of Object.entries(attributes)) {
      if (value > highestAttr) {
        highestAttr = value;
        
        switch (attr) {
          case 'intellect': type = 'Logical'; break;
          case 'resilience': type = 'Guardian'; break;
          case 'empathy': type = 'Empath'; break;
          case 'chaos': type = 'Chaotic'; break;
        }
      }
    }
    
    // Generate a name if not provided
    const generatedName = name || this.generateThringletName(type); // generateThringletName also logs
    console.log(`[ThringletService] Determined Thringlet type: ${type}, Generated name: "${generatedName}"`);
    
    const emotionalState: EmotionalState = {
      joy: Math.floor(Math.random() * 31) + 40, // 40-70
      fear: Math.floor(Math.random() * 21) + 10, // 10-30
      trust: Math.floor(Math.random() * 31) + 30, // 30-60
      surprise: Math.floor(Math.random() * 21) + 20, // 20-40
      dominant: 'joy' // Default dominant emotion, will be calculated
    };
    
    // Calculate dominant emotion
    const emotions = [
      { name: 'joy', value: emotionalState.joy }, { name: 'fear', value: emotionalState.fear },
      { name: 'trust', value: emotionalState.trust }, { name: 'surprise', value: emotionalState.surprise }
    ];
    emotions.sort((a, b) => b.value - a.value);
    emotionalState.dominant = emotions[0].name;
    console.log(`[ThringletService] Initial emotional state:`, emotionalState);

    const thringletData = {
      name: generatedName, type,
      level: 1,
      attributes,
      abilities: [],
      ownerAddress: '',
      bondingDate: new Date(),
      emotionalState
    };
  }
  
  // Generate a thringlet name based on type
  private generateThringletName(type: string): string {
    const prefixes = {
      Logical: ['Byte', 'Data', 'Logic', 'Calc', 'Sage', 'Mind', 'Coder'],
      Guardian: ['Shield', 'Bulwark', 'Aegis', 'Guard', 'Sentry', 'Ward', 'Protector'],
      Empath: ['Heart', 'Soul', 'Pulse', 'Echo', 'Mirror', 'Bond', 'Link'],
      Chaotic: ['Glitch', 'Storm', 'Flux', 'Shift', 'Surge', 'Spark', 'Rift'],
      Balanced: ['Prism', 'Balance', 'Harmony', 'Poise', 'Zen', 'Equus', 'Core']
    };
    
    const suffixes = ['X', 'Zero', 'One', 'Null', 'Prime', 'Node', 'Matrix', 'Wave', 'Script', 'Bit'];
    
    const typeKey = type as keyof typeof prefixes;
    const prefix = prefixes[typeKey][Math.floor(Math.random() * prefixes[typeKey].length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}-${suffix}`;
  }
}

export const thringletService = new ThringletService();