/**
 * Balance Testing Framework
 * 
 * This module runs comprehensive balance tests to evaluate game mechanics,
 * unit effectiveness, and overall gameplay balance.
 */

import { runSimulation, SimulationConfig, SimulationSummary } from '../../src/simulation/run-simulation';
import { AIDifficulty } from '../../src/core/ai/types';

interface BalanceTestConfig {
  readonly name: string;
  readonly description: string;
  readonly simulationConfig: SimulationConfig;
  readonly expectedBalance?: {
    readonly minAssaultWinRate: number;
    readonly maxAssaultWinRate: number;
    readonly maxAverageTurns: number;
    readonly minAverageTurns: number;
  };
}

interface BalanceTestResult {
  readonly config: BalanceTestConfig;
  readonly summary: SimulationSummary;
  readonly passed: boolean;
  readonly issues: string[];
}

/**
 * Define balance test scenarios
 */
const BALANCE_TESTS: BalanceTestConfig[] = [
  {
    name: 'Standard Balance Test',
    description: 'Basic balance test with veteran AI on both sides',
    simulationConfig: {
      gameCount: 20,
      maxTurns: 15,
      aiDifficulty: AIDifficulty.VETERAN,
      logLevel: 'minimal',
      timeoutMs: 30000,
    },
    expectedBalance: {
      minAssaultWinRate: 0.3,
      maxAssaultWinRate: 0.7,
      minAverageTurns: 5,
      maxAverageTurns: 12,
    },
  },
  {
    name: 'Novice AI Balance',
    description: 'Balance test with novice AI to check basic mechanics',
    simulationConfig: {
      gameCount: 15,
      maxTurns: 20,
      aiDifficulty: 'novice',
      logLevel: 'minimal',
      timeoutMs: 45000,
    },
    expectedBalance: {
      minAssaultWinRate: 0.2,
      maxAssaultWinRate: 0.8,
      minAverageTurns: 4,
      maxAverageTurns: 16,
    },
  },
  {
    name: 'Elite AI Balance',
    description: 'Balance test with elite AI for high-level play',
    simulationConfig: {
      gameCount: 25,
      maxTurns: 12,
      aiDifficulty: AIDifficulty.ELITE,
      logLevel: 'minimal',
      timeoutMs: 25000,
    },
    expectedBalance: {
      minAssaultWinRate: 0.35,
      maxAssaultWinRate: 0.65,
      minAverageTurns: 6,
      maxAverageTurns: 10,
    },
  },
  {
    name: 'Quick Game Balance',
    description: 'Test for games that resolve quickly',
    simulationConfig: {
      gameCount: 30,
      maxTurns: 8,
      aiDifficulty: AIDifficulty.VETERAN,
      logLevel: 'minimal',
      timeoutMs: 15000,
    },
    expectedBalance: {
      minAssaultWinRate: 0.25,
      maxAssaultWinRate: 0.75,
      minAverageTurns: 3,
      maxAverageTurns: 7,
    },
  },
  {
    name: 'Extended Game Balance',
    description: 'Test for longer games to check endgame balance',
    simulationConfig: {
      gameCount: 10,
      maxTurns: 25,
      aiDifficulty: AIDifficulty.VETERAN,
      logLevel: 'minimal',
      timeoutMs: 60000,
    },
    expectedBalance: {
      minAssaultWinRate: 0.2,
      maxAssaultWinRate: 0.8,
      minAverageTurns: 8,
      maxAverageTurns: 20,
    },
  },
];

/**
 * Run a single balance test
 */
async function runBalanceTest(config: BalanceTestConfig): Promise<BalanceTestResult> {
  console.log(`\n🧪 Running: ${config.name}`);
  console.log(`📝 ${config.description}`);
  
  const summary = await runSimulation(config.simulationConfig);
  const issues: string[] = [];
  
  // Check balance criteria if defined
  if (config.expectedBalance) {
    const assaultWinRate = summary.assaultWins / summary.totalGames;
    const { minAssaultWinRate, maxAssaultWinRate, minAverageTurns, maxAverageTurns } = config.expectedBalance;
    
    if (assaultWinRate < minAssaultWinRate) {
      issues.push(`Assault win rate too low: ${(assaultWinRate * 100).toFixed(1)}% < ${(minAssaultWinRate * 100).toFixed(1)}%`);
    }
    
    if (assaultWinRate > maxAssaultWinRate) {
      issues.push(`Assault win rate too high: ${(assaultWinRate * 100).toFixed(1)}% > ${(maxAssaultWinRate * 100).toFixed(1)}%`);
    }
    
    if (summary.averageTurns < minAverageTurns) {
      issues.push(`Games too short: ${summary.averageTurns.toFixed(1)} < ${minAverageTurns}`);
    }
    
    if (summary.averageTurns > maxAverageTurns) {
      issues.push(`Games too long: ${summary.averageTurns.toFixed(1)} > ${maxAverageTurns}`);
    }
  }
  
  // Check for concerning patterns
  if (summary.draws > summary.totalGames * 0.3) {
    issues.push(`Too many draws: ${summary.draws}/${summary.totalGames} (${(summary.draws / summary.totalGames * 100).toFixed(1)}%)`);
  }
  
  if (summary.averageDuration > 30000) {
    issues.push(`Games taking too long: ${(summary.averageDuration / 1000).toFixed(1)}s average`);
  }
  
  const passed = issues.length === 0;
  
  // Print results
  console.log(`✅ Assault Wins: ${summary.assaultWins}/${summary.totalGames} (${(summary.assaultWins / summary.totalGames * 100).toFixed(1)}%)`);
  console.log(`✅ Defender Wins: ${summary.defenderWins}/${summary.totalGames} (${(summary.defenderWins / summary.totalGames * 100).toFixed(1)}%)`);
  console.log(`✅ Average Turns: ${summary.averageTurns.toFixed(1)}`);
  console.log(`✅ Average Duration: ${(summary.averageDuration / 1000).toFixed(1)}s`);
  
  if (passed) {
    console.log(`✅ ${config.name}: PASSED`);
  } else {
    console.log(`❌ ${config.name}: FAILED`);
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  return {
    config,
    summary,
    passed,
    issues,
  };
}

/**
 * Run all balance tests
 */
async function runAllBalanceTests(): Promise<BalanceTestResult[]> {
  console.log('🎯 USS WASP BALANCE TESTING SUITE');
  console.log('=' .repeat(50));
  
  const results: BalanceTestResult[] = [];
  
  for (const testConfig of BALANCE_TESTS) {
    try {
      const result = await runBalanceTest(testConfig);
      results.push(result);
    } catch (error) {
      console.error(`❌ Test ${testConfig.name} failed with error:`, error);
      results.push({
        config: testConfig,
        summary: {
          totalGames: 0,
          assaultWins: 0,
          defenderWins: 0,
          draws: 0,
          averageTurns: 0,
          averageAssaultScore: 0,
          averageDefenderScore: 0,
          averageDuration: 0,
          results: [],
        },
        passed: false,
        issues: [`Test execution failed: ${error}`],
      });
    }
  }
  
  return results;
}

/**
 * Print overall balance summary
 */
function printOverallSummary(results: BalanceTestResult[]): void {
  console.log('\n📊 OVERALL BALANCE SUMMARY');
  console.log('=' .repeat(50));
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log(`Tests Passed: ${passedTests}/${totalTests} (${(passedTests / totalTests * 100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All balance tests passed! Game appears well-balanced.');
  } else {
    console.log('⚠️  Some balance issues detected:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`\n❌ ${result.config.name}:`);
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    });
  }
  
  // Calculate overall statistics
  const allSummaries = results.map(r => r.summary).filter(s => s.totalGames > 0);
  if (allSummaries.length > 0) {
    const totalGames = allSummaries.reduce((sum, s) => sum + s.totalGames, 0);
    const totalAssaultWins = allSummaries.reduce((sum, s) => sum + s.assaultWins, 0);
    const totalDefenderWins = allSummaries.reduce((sum, s) => sum + s.defenderWins, 0);
    const totalDraws = allSummaries.reduce((sum, s) => sum + s.draws, 0);
    
    console.log('\n📈 AGGREGATE STATISTICS');
    console.log(`Total Games: ${totalGames}`);
    console.log(`Overall Assault Win Rate: ${(totalAssaultWins / totalGames * 100).toFixed(1)}%`);
    console.log(`Overall Defender Win Rate: ${(totalDefenderWins / totalGames * 100).toFixed(1)}%`);
    console.log(`Overall Draw Rate: ${(totalDraws / totalGames * 100).toFixed(1)}%`);
    
    // Balance assessment
    const overallAssaultWinRate = totalAssaultWins / totalGames;
    if (overallAssaultWinRate >= 0.45 && overallAssaultWinRate <= 0.55) {
      console.log('⚖️  Overall balance appears EXCELLENT (45-55% assault wins)');
    } else if (overallAssaultWinRate >= 0.35 && overallAssaultWinRate <= 0.65) {
      console.log('⚖️  Overall balance appears GOOD (35-65% assault wins)');
    } else if (overallAssaultWinRate >= 0.25 && overallAssaultWinRate <= 0.75) {
      console.log('⚖️  Overall balance appears ACCEPTABLE (25-75% assault wins)');
    } else {
      console.log('⚖️  Overall balance appears POOR - needs adjustment');
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const results = await runAllBalanceTests();
    printOverallSummary(results);
    
    // Exit with appropriate code
    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Balance testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { runBalanceTest, runAllBalanceTests, BalanceTestConfig, BalanceTestResult };