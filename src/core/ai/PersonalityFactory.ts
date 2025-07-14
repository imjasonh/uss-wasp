/**
 * Factory for creating AI personalities with different behavioral patterns
 */

import {
  AIPersonality,
  AIPersonalityType,
  AIDifficulty,
  TacticalPriority,
} from './types';

/**
 * Factory class for creating AI personalities
 */
export class PersonalityFactory {
  /**
   * Create a personality by type
   */
  public static createPersonality(type: AIPersonalityType): AIPersonality {
    switch (type) {
      case AIPersonalityType.BERSERKER:
        return this.createBerserker();
      case AIPersonalityType.STRATEGIST:
        return this.createStrategist();
      case AIPersonalityType.CONSERVATIVE:
        return this.createConservative();
      case AIPersonalityType.BALANCED:
        return this.createBalanced();
      case AIPersonalityType.ROOKIE:
        return this.createRookie();
      case AIPersonalityType.VETERAN:
        return this.createVeteran();
      case AIPersonalityType.SPECIALIST:
        return this.createSpecialist();
      case AIPersonalityType.ADAPTIVE:
        return this.createAdaptive();
      default:
        return this.createBalanced();
    }
  }

  /**
   * Create a custom personality with specific traits
   */
  public static createCustomPersonality(
    name: string,
    aggression: number,
    forwardLooking: number,
    mistakes: number,
    difficulty: AIDifficulty = AIDifficulty.VETERAN
  ): AIPersonality {
    // Validate trait ranges
    const validatedAggression = Math.max(0, Math.min(5, aggression));
    const validatedForwardLooking = Math.max(0, Math.min(5, forwardLooking));
    const validatedMistakes = Math.max(0, Math.min(5, mistakes));

    return this.buildPersonality({
      name,
      aggression: validatedAggression,
      forwardLooking: validatedForwardLooking,
      mistakes: validatedMistakes,
      difficulty,
    });
  }

  /**
   * Get all available personality types
   */
  public static getAllPersonalityTypes(): AIPersonalityType[] {
    return Object.values(AIPersonalityType);
  }

  /**
   * Get personality description for UI display
   */
  public static getPersonalityDescription(type: AIPersonalityType): string {
    const descriptions = {
      [AIPersonalityType.BERSERKER]: 'Highly aggressive, rushes into combat with little planning',
      [AIPersonalityType.STRATEGIST]: 'Methodical planner, considers long-term consequences',
      [AIPersonalityType.CONSERVATIVE]: 'Defensive-minded, prioritizes unit preservation',
      [AIPersonalityType.BALANCED]: 'Well-rounded approach to all tactical situations',
      [AIPersonalityType.ROOKIE]: 'Inexperienced, makes frequent tactical errors',
      [AIPersonalityType.VETERAN]: 'Experienced and precise, rarely makes mistakes',
      [AIPersonalityType.SPECIALIST]: 'Focuses on specific unit types and abilities',
      [AIPersonalityType.ADAPTIVE]: 'Changes tactics based on battlefield conditions',
    };
    return descriptions[type];
  }

  /**
   * Build a personality from trait parameters
   */
  private static buildPersonality(params: {
    name: string;
    aggression: number;
    forwardLooking: number;
    mistakes: number;
    difficulty: AIDifficulty;
  }): AIPersonality {
    const { name, aggression, forwardLooking, mistakes, difficulty } = params;

    // Calculate base AI configuration values from personality traits
    const mistakeFrequency = Math.max(0.05, (5 - mistakes) * 0.15); // Higher mistakes = higher frequency
    const tacticalComplexity = Math.min(0.95, forwardLooking * 0.19); // Higher forward-looking = more complex plans
    const coordinationLevel = Math.min(0.95, (mistakes + forwardLooking) * 0.095); // Better with experience and planning
    const resourceOptimization = Math.min(0.95, mistakes * 0.18); // Better with fewer mistakes
    const patternRecognition = Math.min(0.95, forwardLooking * 0.15); // Better with forward-looking
    const reactionTime = Math.max(1, 3 - Math.floor(mistakes * 0.4)); // Faster reaction with fewer mistakes

    // Calculate behavioral modifiers
    const riskTolerance = Math.min(0.95, aggression * 0.19); // Higher aggression = more risk
    const adaptability = Math.min(0.95, (forwardLooking + mistakes) * 0.095); // Planning and experience help adaptation
    const specialization = Math.min(0.95, (5 - aggression) * 0.15); // Less aggressive = more specialized

    return {
      name,
      aggression,
      forwardLooking,
      mistakes,
      difficulty,
      
      // Base AI configuration
      reactionTime,
      coordinationLevel,
      patternRecognition,
      resourceOptimization,
      tacticalComplexity,
      mistakeFrequency,
      cheatingLevel: 0, // Fair play for all personalities
      
      // Behavioral modifiers
      riskTolerance,
      adaptability,
      specialization,
      
      // Priority weights calculated from personality traits
      priorityWeights: this.calculatePriorityWeights(aggression, forwardLooking, mistakes),
    };
  }

  /**
   * Calculate tactical priority weights based on personality traits
   */
  private static calculatePriorityWeights(
    aggression: number,
    forwardLooking: number,
    mistakes: number
  ): Record<TacticalPriority, number> {
    const experience = mistakes; // Higher mistakes value = more experience (0-5 scale)
    const caution = 5 - aggression; // Inverse of aggression
    const planning = forwardLooking;

    return {
      // Combat priorities - heavily influenced by aggression
      [TacticalPriority.INFLICT_CASUALTIES]: 3 + (aggression * 2) + (experience * 0.5),
      [TacticalPriority.PRESERVE_FORCE]: 2 + (caution * 1.5) + (planning * 0.5),
      
      // Territorial priorities - balanced approach
      [TacticalPriority.DENY_TERRAIN]: 4 + (caution * 1) + (planning * 1),
      [TacticalPriority.DEFEND_OBJECTIVES]: 5 + (caution * 1.5) + (planning * 1),
      [TacticalPriority.SECURE_OBJECTIVES]: 4 + (aggression * 1) + (planning * 1.5),
      
      // Intelligence and support - forward-looking influence
      [TacticalPriority.GATHER_INTELLIGENCE]: 2 + (planning * 1.5) + (experience * 0.5),
      [TacticalPriority.MANAGE_LOGISTICS]: 3 + (planning * 1.5) + (experience * 1),
      
      // Special operations - experience and planning dependent
      [TacticalPriority.WASP_OPERATIONS]: 4 + (experience * 1) + (planning * 1),
      [TacticalPriority.HIDDEN_OPERATIONS]: 3 + (experience * 1.5) + (caution * 0.5),
      [TacticalPriority.USE_SPECIAL_ABILITIES]: 3 + (experience * 1) + (aggression * 0.5),
    };
  }

  /**
   * Create predefined personality: Berserker
   */
  private static createBerserker(): AIPersonality {
    return this.buildPersonality({
      name: 'Berserker',
      aggression: 5,
      forwardLooking: 1,
      mistakes: 2,
      difficulty: AIDifficulty.VETERAN,
    });
  }

  /**
   * Create predefined personality: Strategist
   */
  private static createStrategist(): AIPersonality {
    return this.buildPersonality({
      name: 'Strategist',
      aggression: 2,
      forwardLooking: 5,
      mistakes: 4,
      difficulty: AIDifficulty.ELITE,
    });
  }

  /**
   * Create predefined personality: Conservative
   */
  private static createConservative(): AIPersonality {
    return this.buildPersonality({
      name: 'Conservative',
      aggression: 1,
      forwardLooking: 3,
      mistakes: 3,
      difficulty: AIDifficulty.VETERAN,
    });
  }

  /**
   * Create predefined personality: Balanced
   */
  private static createBalanced(): AIPersonality {
    return this.buildPersonality({
      name: 'Balanced',
      aggression: 3,
      forwardLooking: 3,
      mistakes: 3,
      difficulty: AIDifficulty.VETERAN,
    });
  }

  /**
   * Create predefined personality: Rookie
   */
  private static createRookie(): AIPersonality {
    return this.buildPersonality({
      name: 'Rookie',
      aggression: 3,
      forwardLooking: 1,
      mistakes: 1,
      difficulty: AIDifficulty.NOVICE,
    });
  }

  /**
   * Create predefined personality: Veteran
   */
  private static createVeteran(): AIPersonality {
    return this.buildPersonality({
      name: 'Veteran',
      aggression: 2,
      forwardLooking: 4,
      mistakes: 4,
      difficulty: AIDifficulty.ELITE,
    });
  }

  /**
   * Create predefined personality: Specialist
   */
  private static createSpecialist(): AIPersonality {
    return this.buildPersonality({
      name: 'Specialist',
      aggression: 2,
      forwardLooking: 4,
      mistakes: 4,
      difficulty: AIDifficulty.ELITE,
    });
  }

  /**
   * Create predefined personality: Adaptive
   */
  private static createAdaptive(): AIPersonality {
    return this.buildPersonality({
      name: 'Adaptive',
      aggression: 3,
      forwardLooking: 4,
      mistakes: 3,
      difficulty: AIDifficulty.ADAPTIVE,
    });
  }
}