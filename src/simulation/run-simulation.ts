/**
 * USS Wasp Game Simulation Runner
 * 
 * This module runs automated game simulations to test rules balance,
 * AI effectiveness, and gather gameplay statistics.
 */

import { GameEngine } from '../core/game/GameEngine';
import { GameState, Player } from '../core/game';
import { AIController } from '../core/ai/AIController';
import { PlayerSide, TurnPhase } from '../core/game/types';
import { createDemoMap } from '../core/game/DemoMap';
import { AIDifficulty } from '../core/ai/types';

interface SimulationConfig {
  readonly gameCount: number;
  readonly maxTurns: number;
  readonly aiDifficulty: AIDifficulty;
  readonly logLevel: 'minimal' | 'detailed' | 'verbose';
  readonly timeoutMs: number;
}

interface SimulationResult {
  readonly gameId: string;
  readonly winner: PlayerSide | null;
  readonly turns: number;
  readonly reason: string;
  readonly assaultScore: number;
  readonly defenderScore: number;
  readonly duration: number;
}

interface SimulationSummary {
  readonly totalGames: number;
  readonly assaultWins: number;
  readonly defenderWins: number;
  readonly draws: number;
  readonly averageTurns: number;
  readonly averageAssaultScore: number;
  readonly averageDefenderScore: number;
  readonly averageDuration: number;
  readonly results: SimulationResult[];
}

const DEFAULT_CONFIG: SimulationConfig = {
  gameCount: 10,
  maxTurns: 20,
  aiDifficulty: AIDifficulty.VETERAN,
  logLevel: 'detailed',
  timeoutMs: 30000, // 30 seconds per game
};

/**
 * Run a single game simulation
 */
async function runSingleGame(
  gameId: string,
  config: SimulationConfig
): Promise<SimulationResult> {
  const startTime = Date.now();
  
  // Create game state
  const map = createDemoMap();
  const gameState = new GameState(gameId, map);
  
  // Create players
  const assaultPlayer = new Player('assault', PlayerSide.Assault);
  const defenderPlayer = new Player('defender', PlayerSide.Defender);
  gameState.addPlayer(assaultPlayer);
  gameState.addPlayer(defenderPlayer);
  
  // Initialize AI controllers
  const assaultAI = new AIController(PlayerSide.Assault, config.aiDifficulty);
  const defenderAI = new AIController(PlayerSide.Defender, config.aiDifficulty);
  
  // Create game engine
  const gameEngine = new GameEngine(gameState);
  
  if (config.logLevel === 'verbose') {
    console.log(`🎮 Starting game ${gameId} with ${config.aiDifficulty} AI`);
  }
  
  let turns = 0;
  let winner: PlayerSide | null = null;
  let reason = '';
  
  // Game loop
  while (turns < config.maxTurns && !gameState.isGameOver) {
    turns++;
    
    // Process turn phases
    for (const phase of Object.values(TurnPhase)) {
      if (gameState.isGameOver) break;
      
      gameState.phase = phase;
      
      // Get current player AI
      const currentPlayer = gameState.getActivePlayer();
      if (!currentPlayer) continue;
      
      const ai = currentPlayer.side === PlayerSide.Assault ? assaultAI : defenderAI;
      
      // Generate AI actions for this phase
      const actions = ai.update(gameState);
      
      // Execute AI actions
      for (const action of actions) {
        const result = gameEngine.executeAction(action);
        
        if (config.logLevel === 'verbose') {
          console.log(`Turn ${turns} ${phase}: ${result.message}`);
        }
        
        if (gameState.isGameOver) break;
      }
    }
    
    // Check for timeout
    if (Date.now() - startTime > config.timeoutMs) {
      reason = 'Timeout';
      break;
    }
    
    // Advance turn (this will cycle through phases and increment turn)
    gameState.nextPhase();
  }
  
  // Determine winner and reason
  if (gameState.isGameOver && gameState.winner) {
    const winnerPlayer = gameState.getPlayer(gameState.winner);
    winner = winnerPlayer?.side || null;
    reason = 'Victory conditions met';
  } else if (turns >= config.maxTurns) {
    reason = 'Turn limit reached';
    // Determine winner by score
    const assaultScore = calculatePlayerScore(assaultPlayer);
    const defenderScore = calculatePlayerScore(defenderPlayer);
    winner = assaultScore > defenderScore ? PlayerSide.Assault : 
             defenderScore > assaultScore ? PlayerSide.Defender : null;
  } else {
    reason = reason || 'Game ended unexpectedly';
  }
  
  const duration = Date.now() - startTime;
  
  return {
    gameId,
    winner,
    turns,
    reason,
    assaultScore: calculatePlayerScore(assaultPlayer),
    defenderScore: calculatePlayerScore(defenderPlayer),
    duration,
  };
}

/**
 * Calculate player score for comparison
 */
function calculatePlayerScore(player: Player): number {
  const livingUnits = player.getLivingUnits();
  const unitScore = livingUnits.length * 10;
  const cpScore = player.commandPoints * 5;
  return unitScore + cpScore;
}

/**
 * Run multiple game simulations
 */
async function runSimulation(config: SimulationConfig = DEFAULT_CONFIG): Promise<SimulationSummary> {
  console.log(`🚀 Starting ${config.gameCount} game simulation series`);
  console.log(`AI Difficulty: ${config.aiDifficulty}`);
  console.log(`Max Turns: ${config.maxTurns}`);
  console.log(`Log Level: ${config.logLevel}`);
  console.log('');
  
  const results: SimulationResult[] = [];
  
  for (let i = 0; i < config.gameCount; i++) {
    const gameId = `sim-${i + 1}`;
    
    try {
      const result = await runSingleGame(gameId, config);
      results.push(result);
      
      const winnerText = result.winner === PlayerSide.Assault ? 'Assault' :
                        result.winner === PlayerSide.Defender ? 'Defender' : 'Draw';
      
      if (config.logLevel !== 'minimal') {
        console.log(`Game ${i + 1}: ${winnerText} (${result.turns} turns, ${result.reason})`);
      }
      
    } catch (error) {
      console.error(`❌ Game ${gameId} failed:`, error);
      // Continue with other games
    }
  }
  
  // Calculate summary statistics
  const assaultWins = results.filter(r => r.winner === PlayerSide.Assault).length;
  const defenderWins = results.filter(r => r.winner === PlayerSide.Defender).length;
  const draws = results.filter(r => r.winner === null).length;
  
  const averageTurns = results.reduce((sum, r) => sum + r.turns, 0) / results.length;
  const averageAssaultScore = results.reduce((sum, r) => sum + r.assaultScore, 0) / results.length;
  const averageDefenderScore = results.reduce((sum, r) => sum + r.defenderScore, 0) / results.length;
  const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  return {
    totalGames: results.length,
    assaultWins,
    defenderWins,
    draws,
    averageTurns,
    averageAssaultScore,
    averageDefenderScore,
    averageDuration,
    results,
  };
}

/**
 * Print simulation summary
 */
function printSummary(summary: SimulationSummary): void {
  console.log('');
  console.log('📊 SIMULATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Games: ${summary.totalGames}`);
  console.log(`Assault Wins: ${summary.assaultWins} (${(summary.assaultWins / summary.totalGames * 100).toFixed(1)}%)`);
  console.log(`Defender Wins: ${summary.defenderWins} (${(summary.defenderWins / summary.totalGames * 100).toFixed(1)}%)`);
  console.log(`Draws: ${summary.draws} (${(summary.draws / summary.totalGames * 100).toFixed(1)}%)`);
  console.log(`Average Turns: ${summary.averageTurns.toFixed(1)}`);
  console.log(`Average Assault Score: ${summary.averageAssaultScore.toFixed(1)}`);
  console.log(`Average Defender Score: ${summary.averageDefenderScore.toFixed(1)}`);
  console.log(`Average Duration: ${(summary.averageDuration / 1000).toFixed(1)}s`);
  console.log('');
  
  // Balance analysis
  const balanceRatio = summary.assaultWins / (summary.defenderWins || 1);
  if (balanceRatio > 1.5) {
    console.log('⚖️ BALANCE: Assault appears to have advantage');
  } else if (balanceRatio < 0.67) {
    console.log('⚖️ BALANCE: Defender appears to have advantage');
  } else {
    console.log('⚖️ BALANCE: Game appears well-balanced');
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const config: SimulationConfig = {
    ...DEFAULT_CONFIG,
    gameCount: parseInt(args[0]) || DEFAULT_CONFIG.gameCount,
    aiDifficulty: (args[1] as any) || DEFAULT_CONFIG.aiDifficulty,
    logLevel: (args[2] as any) || DEFAULT_CONFIG.logLevel,
  };
  
  try {
    const summary = await runSimulation(config);
    printSummary(summary);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Simulation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { runSimulation, SimulationConfig, SimulationResult, SimulationSummary };