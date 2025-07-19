/**
 * Comprehensive AI Personality Matchup Testing System
 * 
 * This test runs 10-game battles between all AI personality combinations
 * to analyze performance and identify optimal matchups.
 */

import { AIDifficulty, AIPersonalityType } from '../../src/core/ai/types';
import { GameState, GameAction } from '../../src/core/game/GameState';
import { GameEngine, ActionResult } from '../../src/core/game/GameEngine';
import { Player } from '../../src/core/game/Player';
import { GameMap } from '../../src/core/game/Map';
import { PlayerSide, UnitType, TurnPhase, ActionType } from '../../src/core/game/types';
import { createTestUnits } from '../../src/testing/UnitTestHelper';
import { Hex } from '../../src/core/hex';
import { GameVisualizationLogger } from '../../src/core/logging/GameVisualizationLogger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Battle result for a single game
 */
interface BattleResult {
  winner: PlayerSide;
  loser: PlayerSide;
  turnCount: number;
  assaultPower: number;
  defenderPower: number;
  combatActions: number;
  specialActions: number;
  objectiveActions: number;
  visualizationLog?: string;
  errors: string[];
}

/**
 * Matchup results for a series of games
 */
interface MatchupResults {
  attackerPersonality: AIPersonalityType;
  defenderPersonality: AIPersonalityType;
  attackerWins: number;
  defenderWins: number;
  totalGames: number;
  winRate: number; // From attacker perspective
  avgTurnCount: number;
  avgAttackerPower: number;
  avgDefenderPower: number;
  avgCombatActions: number;
  avgSpecialActions: number;
  avgObjectiveActions: number;
  battles: BattleResult[];
  errors: string[];
}

/**
 * Complete matchup analysis results
 */
interface MatchupAnalysis {
  timestamp: string;
  totalBattles: number;
  matchups: MatchupResults[];
  personalityRankings: {
    attackerRankings: Array<{personality: AIPersonalityType, winRate: number, avgPower: number}>;
    defenderRankings: Array<{personality: AIPersonalityType, winRate: number, avgPower: number}>;
    overallRankings: Array<{personality: AIPersonalityType, combinedWinRate: number, avgPower: number}>;
  };
  bestMatchups: Array<{
    attacker: AIPersonalityType;
    defender: AIPersonalityType;
    winRate: number;
    description: string;
  }>;
  balancedMatchups: Array<{
    attacker: AIPersonalityType;
    defender: AIPersonalityType;
    winRate: number;
    description: string;
  }>;
  discoveredBugs: string[];
}

/**
 * AI Personality Matchup Testing System
 */
export class PersonalityMatchupTester {
  private readonly personalities: AIPersonalityType[] = [
    AIPersonalityType.BERSERKER,
    AIPersonalityType.STRATEGIST,
    AIPersonalityType.CONSERVATIVE,
    AIPersonalityType.BALANCED,
    AIPersonalityType.ROOKIE,
    AIPersonalityType.VETERAN,
    AIPersonalityType.SPECIALIST,
    AIPersonalityType.ADAPTIVE
  ];

  private readonly gamesPerMatchup = 10;
  private readonly maxTurnsPerGame = 20;
  private allErrors: string[] = [];

  /**
   * Run comprehensive personality matchup testing
   */
  public async runPersonalityMatchups(): Promise<MatchupAnalysis> {
    console.log('🤖 AI Personality Matchup Testing System');
    console.log('===========================================');
    console.log(`Running ${this.gamesPerMatchup} games for each of ${this.personalities.length}x${this.personalities.length} matchups`);
    console.log(`Total battles: ${this.personalities.length * this.personalities.length * this.gamesPerMatchup}\n`);

    const results: MatchupResults[] = [];
    let totalBattles = 0;
    let completedMatchups = 0;
    const totalMatchups = this.personalities.length * this.personalities.length;

    // Run all matchups
    for (const attackerPersonality of this.personalities) {
      for (const defenderPersonality of this.personalities) {
        console.log(`\n🎯 Testing ${attackerPersonality.toUpperCase()} vs ${defenderPersonality.toUpperCase()}`);
        console.log('─'.repeat(60));
        
        const matchupResult = await this.runMatchup(attackerPersonality, defenderPersonality);
        results.push(matchupResult);
        
        totalBattles += matchupResult.totalGames;
        completedMatchups++;
        
        // Progress update
        const progress = (completedMatchups / totalMatchups * 100).toFixed(1);
        console.log(`✅ Completed ${completedMatchups}/${totalMatchups} matchups (${progress}%)`);
        console.log(`   Result: ${matchupResult.attackerWins}-${matchupResult.defenderWins} (${matchupResult.winRate.toFixed(1)}% attacker win rate)`);
        
        // Collect errors
        this.allErrors.push(...matchupResult.errors);
      }
    }

    // Analyze results
    const analysis = this.analyzeResults(results, totalBattles);
    
    // Save results to file
    await this.saveResults(analysis);
    
    console.log('\n📊 MATCHUP ANALYSIS COMPLETE');
    console.log('=============================');
    console.log(`Total battles: ${totalBattles}`);
    console.log(`Errors discovered: ${this.allErrors.length}`);
    console.log(`Results saved to: tests/ai/results/personality-matchup-results.json`);
    
    return analysis;
  }

  /**
   * Run a single matchup between two personalities
   */
  protected async runMatchup(attackerPersonality: AIPersonalityType, defenderPersonality: AIPersonalityType): Promise<MatchupResults> {
    const battles: BattleResult[] = [];
    const errors: string[] = [];
    
    let attackerWins = 0;
    let defenderWins = 0;
    let totalTurns = 0;
    let totalAttackerPower = 0;
    let totalDefenderPower = 0;
    let totalCombatActions = 0;
    let totalSpecialActions = 0;
    let totalObjectiveActions = 0;

    // Run multiple games for this matchup
    for (let game = 1; game <= this.gamesPerMatchup; game++) {
      try {
        console.log(`  Game ${game}/${this.gamesPerMatchup}...`);
        
        const battleResult = await this.runSingleBattle(attackerPersonality, defenderPersonality);
        battles.push(battleResult);
        
        // Track wins
        if (battleResult.winner === PlayerSide.Assault) {
          attackerWins++;
        } else {
          defenderWins++;
        }
        
        // Accumulate stats
        totalTurns += battleResult.turnCount;
        totalAttackerPower += battleResult.assaultPower;
        totalDefenderPower += battleResult.defenderPower;
        totalCombatActions += battleResult.combatActions;
        totalSpecialActions += battleResult.specialActions;
        totalObjectiveActions += battleResult.objectiveActions;
        
        // Collect errors
        errors.push(...battleResult.errors);
        
      } catch (error) {
        const errorMsg = `Game ${game} failed: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.log(`    ❌ ${errorMsg}`);
      }
    }

    const totalGames = battles.length;
    const winRate = totalGames > 0 ? (attackerWins / totalGames * 100) : 0;

    return {
      attackerPersonality,
      defenderPersonality,
      attackerWins,
      defenderWins,
      totalGames,
      winRate,
      avgTurnCount: totalGames > 0 ? totalTurns / totalGames : 0,
      avgAttackerPower: totalGames > 0 ? totalAttackerPower / totalGames : 0,
      avgDefenderPower: totalGames > 0 ? totalDefenderPower / totalGames : 0,
      avgCombatActions: totalGames > 0 ? totalCombatActions / totalGames : 0,
      avgSpecialActions: totalGames > 0 ? totalSpecialActions / totalGames : 0,
      avgObjectiveActions: totalGames > 0 ? totalObjectiveActions / totalGames : 0,
      battles,
      errors
    };
  }

  /**
   * Run a single battle between two AI personalities
   */
  private async runSingleBattle(attackerPersonality: AIPersonalityType, defenderPersonality: AIPersonalityType): Promise<BattleResult> {
    const errors: string[] = [];
    let combatActions = 0;
    let specialActions = 0;
    let objectiveActions = 0;

    try {
      // Create game setup
      const map = new GameMap(10, 10);
      const gameState = new GameState('personality-matchup', map, this.maxTurnsPerGame);
      
      // Create players
      const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
      const defenderPlayer = new Player('defense-ai', PlayerSide.Defender);
      
      gameState.addPlayer(assaultPlayer);
      gameState.addPlayer(defenderPlayer);
      gameState.setActivePlayerBySide(PlayerSide.Assault);
      
      // Create balanced unit setup
      const assaultUnits = createTestUnits([
        { id: 'assault_1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) },
        { id: 'assault_2', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 2) },
        { id: 'assault_3', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(1, 3) },
        { id: 'assault_4', type: UnitType.MARSOC, side: PlayerSide.Assault, position: new Hex(1, 4) },
        { id: 'uss_wasp', type: UnitType.USS_WASP, side: PlayerSide.Assault, position: new Hex(0, 5) }
      ]);
      
      const defenderUnits = createTestUnits([
        { id: 'defender_1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(8, 1) },
        { id: 'defender_2', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(8, 2) },
        { id: 'defender_3', type: UnitType.TECHNICAL, side: PlayerSide.Defender, position: new Hex(8, 3) },
        { id: 'defender_4', type: UnitType.ATGM_TEAM, side: PlayerSide.Defender, position: new Hex(8, 4) },
        { id: 'artillery', type: UnitType.ARTILLERY, side: PlayerSide.Defender, position: new Hex(9, 5) }
      ]);
      
      // Add units to players
      assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
      defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));
      
      // Initialize game engine with visualization logging
      const gameEngine = new GameEngine(gameState);
      const gameId = `personality-${attackerPersonality}-vs-${defenderPersonality}-${Date.now()}`;
      const vizLogger = gameEngine.enableVisualizationLogging(gameId);
      
      // Add AI controllers with personalities
      gameEngine.addAIController(assaultPlayer.id, attackerPersonality);
      gameEngine.addAIController(defenderPlayer.id, defenderPersonality);
      
      // Run battle simulation
      let turnCount = 0;
      let winner: PlayerSide = PlayerSide.Defender; // Default winner
      
      while (turnCount < this.maxTurnsPerGame) {
        turnCount++;
        
        // Set phase to ACTION so AI can make decisions
        gameState.phase = TurnPhase.ACTION;
        
        // Reset player states for new turn
        assaultPlayer.commandPoints = 20;
        defenderPlayer.commandPoints = 20;
        
        // Switch turns between players
        const currentPlayer = gameState.getActivePlayer();
        if (!currentPlayer) break;
        
        try {
          // AI decision making and action execution
          const aiActions = gameEngine.updateAI();
          
          // Log AI action generation for first turn only
          if (turnCount === 1) {
            console.log(`    Turn ${turnCount}: AI generated ${aiActions.length} actions for ${currentPlayer.side}`);
          }
          
          // Track action types
          for (const action of aiActions) {
            if (action.type === ActionType.ATTACK) combatActions++;
            else if (action.type === ActionType.SPECIAL_ABILITY) specialActions++;
            else if (action.type === ActionType.SECURE_OBJECTIVE) objectiveActions++;
          }
          
          // Execute actions through game engine
          const actionResults = this.executeActions(aiActions, gameEngine);
          
          // Check for action failures
          const failedActions = actionResults.filter(r => !r.success);
          if (failedActions.length > 0) {
            errors.push(`Turn ${turnCount}: ${failedActions.length} actions failed`);
          }
          
        } catch (aiError) {
          errors.push(`Turn ${turnCount} AI Error: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
        }
        
        // Check victory conditions
        const assaultUnitsAlive = Array.from(assaultPlayer.units.values()).filter(u => u.state.currentHP > 0).length;
        const defenderUnitsAlive = Array.from(defenderPlayer.units.values()).filter(u => u.state.currentHP > 0).length;
        
        if (assaultUnitsAlive === 0) {
          winner = PlayerSide.Defender;
          break;
        } else if (defenderUnitsAlive === 0) {
          winner = PlayerSide.Assault;
          break;
        }
        
        // Switch active player
        if (currentPlayer.side === PlayerSide.Assault) {
          gameState.setActivePlayerBySide(PlayerSide.Defender);
        } else {
          gameState.setActivePlayerBySide(PlayerSide.Assault);
        }
      }
      
      // Determine winner if max turns reached
      if (turnCount >= this.maxTurnsPerGame) {
        const assaultUnitsAlive = Array.from(assaultPlayer.units.values()).filter(u => u.state.currentHP > 0).length;
        const defenderUnitsAlive = Array.from(defenderPlayer.units.values()).filter(u => u.state.currentHP > 0).length;
        
        winner = assaultUnitsAlive >= defenderUnitsAlive ? PlayerSide.Assault : PlayerSide.Defender;
      }
      
      // Calculate final powers
      const assaultPower = this.calculateCombatPower(Array.from(assaultPlayer.units.values()));
      const defenderPower = this.calculateCombatPower(Array.from(defenderPlayer.units.values()));
      
      // Save visualization log
      const fullLog = vizLogger.exportVisualizationLog();
      const logFileName = `personality-${attackerPersonality}-vs-${defenderPersonality}-${Date.now()}.json`;
      const logPath = `./tests/ai/logs/personality-matchups/${logFileName}`;
      
      // Ensure logs directory exists
      const logDir = './tests/ai/logs/personality-matchups';
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      fs.writeFileSync(logPath, JSON.stringify(fullLog, null, 2));
      
      return {
        winner: winner!,
        loser: winner === PlayerSide.Assault ? PlayerSide.Defender : PlayerSide.Assault,
        turnCount,
        assaultPower,
        defenderPower,
        combatActions,
        specialActions,
        objectiveActions,
        visualizationLog: logPath,
        errors
      };
      
    } catch (error) {
      const errorMsg = `Battle failed: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      
      // Return a default result
      return {
        winner: PlayerSide.Defender,
        loser: PlayerSide.Assault,
        turnCount: 0,
        assaultPower: 0,
        defenderPower: 0,
        combatActions: 0,
        specialActions: 0,
        objectiveActions: 0,
        visualizationLog: undefined,
        errors
      };
    }
  }

  /**
   * Execute actions through game engine
   */
  private executeActions(actions: GameAction[], gameEngine: GameEngine): ActionResult[] {
    const results: ActionResult[] = [];
    
    for (const action of actions) {
      try {
        const result = gameEngine.executeAction(action);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          message: `Action execution failed: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
    
    return results;
  }

  /**
   * Calculate combat power for a list of units
   */
  private calculateCombatPower(units: any[]): number {
    return units.reduce((power, unit) => {
      if (unit.state.currentHP > 0) {
        return power + (unit.stats.atk * unit.state.currentHP / unit.stats.hp);
      }
      return power;
    }, 0);
  }

  /**
   * Analyze matchup results and generate insights
   */
  private analyzeResults(matchups: MatchupResults[], totalBattles: number): MatchupAnalysis {
    // Calculate personality rankings
    const attackerStats = new Map<AIPersonalityType, {wins: number, games: number, power: number}>();
    const defenderStats = new Map<AIPersonalityType, {wins: number, games: number, power: number}>();
    
    for (const matchup of matchups) {
      // Attacker stats
      const attackerKey = matchup.attackerPersonality;
      const attackerData = attackerStats.get(attackerKey) || {wins: 0, games: 0, power: 0};
      attackerData.wins += matchup.attackerWins;
      attackerData.games += matchup.totalGames;
      attackerData.power += matchup.avgAttackerPower * matchup.totalGames;
      attackerStats.set(attackerKey, attackerData);
      
      // Defender stats
      const defenderKey = matchup.defenderPersonality;
      const defenderData = defenderStats.get(defenderKey) || {wins: 0, games: 0, power: 0};
      defenderData.wins += matchup.defenderWins;
      defenderData.games += matchup.totalGames;
      defenderData.power += matchup.avgDefenderPower * matchup.totalGames;
      defenderStats.set(defenderKey, defenderData);
    }
    
    // Generate rankings
    const attackerRankings = Array.from(attackerStats.entries())
      .map(([personality, stats]) => ({
        personality,
        winRate: stats.games > 0 ? (stats.wins / stats.games * 100) : 0,
        avgPower: stats.games > 0 ? stats.power / stats.games : 0
      }))
      .sort((a, b) => b.winRate - a.winRate);
    
    const defenderRankings = Array.from(defenderStats.entries())
      .map(([personality, stats]) => ({
        personality,
        winRate: stats.games > 0 ? (stats.wins / stats.games * 100) : 0,
        avgPower: stats.games > 0 ? stats.power / stats.games : 0
      }))
      .sort((a, b) => b.winRate - a.winRate);
    
    // Calculate overall rankings (combined win rate)
    const overallStats = new Map<AIPersonalityType, {wins: number, games: number, power: number}>();
    
    for (const [personality, stats] of attackerStats) {
      const defenderData = defenderStats.get(personality) || {wins: 0, games: 0, power: 0};
      overallStats.set(personality, {
        wins: stats.wins + defenderData.wins,
        games: stats.games + defenderData.games,
        power: stats.power + defenderData.power
      });
    }
    
    const overallRankings = Array.from(overallStats.entries())
      .map(([personality, stats]) => ({
        personality,
        combinedWinRate: stats.games > 0 ? (stats.wins / stats.games * 100) : 0,
        avgPower: stats.games > 0 ? stats.power / stats.games : 0
      }))
      .sort((a, b) => b.combinedWinRate - a.combinedWinRate);
    
    // Find best matchups (>70% win rate)
    const bestMatchups = matchups
      .filter(m => m.winRate > 70)
      .map(m => ({
        attacker: m.attackerPersonality,
        defender: m.defenderPersonality,
        winRate: m.winRate,
        description: `${m.attackerPersonality} dominates ${m.defenderPersonality} (${m.winRate.toFixed(1)}%)`
      }))
      .sort((a, b) => b.winRate - a.winRate);
    
    // Find balanced matchups (40-60% win rate)
    const balancedMatchups = matchups
      .filter(m => m.winRate >= 40 && m.winRate <= 60)
      .map(m => ({
        attacker: m.attackerPersonality,
        defender: m.defenderPersonality,
        winRate: m.winRate,
        description: `${m.attackerPersonality} vs ${m.defenderPersonality} (${m.winRate.toFixed(1)}%)`
      }))
      .sort((a, b) => Math.abs(50 - a.winRate) - Math.abs(50 - b.winRate));
    
    // Collect discovered bugs
    const discoveredBugs = [...new Set(this.allErrors)];
    
    return {
      timestamp: new Date().toISOString(),
      totalBattles,
      matchups,
      personalityRankings: {
        attackerRankings,
        defenderRankings,
        overallRankings
      },
      bestMatchups,
      balancedMatchups,
      discoveredBugs
    };
  }

  /**
   * Save results to file
   */
  private async saveResults(analysis: MatchupAnalysis): Promise<void> {
    const resultsDir = path.join(__dirname, 'results');
    const resultsFile = path.join(resultsDir, 'personality-matchup-results.json');
    
    // Create results directory if it doesn't exist
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Save detailed results
    fs.writeFileSync(resultsFile, JSON.stringify(analysis, null, 2));
    
    // Generate summary report
    const summaryFile = path.join(resultsDir, 'personality-matchup-summary.txt');
    const summary = this.generateSummaryReport(analysis);
    fs.writeFileSync(summaryFile, summary);
  }

  /**
   * Generate human-readable summary report
   */
  private generateSummaryReport(analysis: MatchupAnalysis): string {
    const report = [];
    
    report.push('AI PERSONALITY MATCHUP ANALYSIS REPORT');
    report.push('=====================================');
    report.push(`Generated: ${new Date(analysis.timestamp).toLocaleString()}`);
    report.push(`Total Battles: ${analysis.totalBattles}`);
    report.push(`Bugs Discovered: ${analysis.discoveredBugs.length}`);
    report.push('');
    
    // Overall Rankings
    report.push('OVERALL PERSONALITY RANKINGS');
    report.push('============================');
    analysis.personalityRankings.overallRankings.forEach((rank, i) => {
      report.push(`${i + 1}. ${rank.personality.toUpperCase()}: ${rank.combinedWinRate.toFixed(1)}% win rate (${rank.avgPower.toFixed(2)} avg power)`);
    });
    report.push('');
    
    // Best Attacking Personalities
    report.push('BEST ATTACKING PERSONALITIES');
    report.push('============================');
    analysis.personalityRankings.attackerRankings.slice(0, 5).forEach((rank, i) => {
      report.push(`${i + 1}. ${rank.personality.toUpperCase()}: ${rank.winRate.toFixed(1)}% attack win rate`);
    });
    report.push('');
    
    // Best Defending Personalities
    report.push('BEST DEFENDING PERSONALITIES');
    report.push('============================');
    analysis.personalityRankings.defenderRankings.slice(0, 5).forEach((rank, i) => {
      report.push(`${i + 1}. ${rank.personality.toUpperCase()}: ${rank.winRate.toFixed(1)}% defense win rate`);
    });
    report.push('');
    
    // Most Dominant Matchups
    report.push('MOST DOMINANT MATCHUPS');
    report.push('=====================');
    analysis.bestMatchups.slice(0, 10).forEach((matchup, i) => {
      report.push(`${i + 1}. ${matchup.description}`);
    });
    report.push('');
    
    // Most Balanced Matchups
    report.push('MOST BALANCED MATCHUPS');
    report.push('=====================');
    analysis.balancedMatchups.slice(0, 10).forEach((matchup, i) => {
      report.push(`${i + 1}. ${matchup.description}`);
    });
    report.push('');
    
    // Bugs Discovered
    if (analysis.discoveredBugs.length > 0) {
      report.push('BUGS DISCOVERED DURING TESTING');
      report.push('===============================');
      analysis.discoveredBugs.forEach((bug, i) => {
        report.push(`${i + 1}. ${bug}`);
      });
      report.push('');
    }
    
    return report.join('\n');
  }
}

// Export for use in other files
export default PersonalityMatchupTester;