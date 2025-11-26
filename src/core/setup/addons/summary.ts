/**
 * LOADING SUMMARY
 * ===============
 * Generates combined loading summary for commands and addons.
 * 
 * WHY THIS EXISTS:
 * - Shows all loaded modules in one summary
 * - Groups by success/skipped/failed
 * - Provides timing information
 * - Debug details when DEBUG=true
 * 
 * HOW IT WORKS:
 * - storeCommandResults(): Cache command loading results
 * - storeAddonResults(): Cache addon loading results
 * - logCombinedSummary(): Output combined summary
 * 
 * OUTPUT EXAMPLE:
 * ✓ Successfully loaded 3 command(s) from 2 module(s) and 4 addon(s) in 150ms
 * ⚠️ 1 module(s) skipped due to conflicts
 */

import { logger } from '../../utils/logger.js';
import { isDebug } from '../../config/environment.js';
import { CombinedLoadResults, LoadResult } from './types.js';

// Store results for combined summary
let loadResults: CombinedLoadResults = {
  commands: [],
  addons: [],
  commandTime: 0,
  addonTime: 0
};

/**
 * Store command loading results
 */
export function storeCommandResults(results: LoadResult[], time: number): void {
  loadResults.commands = results;
  loadResults.commandTime = time;
}

/**
 * Store addon loading results
 */
export function storeAddonResults(results: LoadResult[], time: number): void {
  loadResults.addons = results;
  loadResults.addonTime = time;
}

/**
 * Log combined summary of all loaded modules
 */
export function logCombinedSummary(): void {
  const { commands, addons, commandTime, addonTime } = loadResults;
  
  // If nothing was loaded, don't show summary
  if (commands.length === 0 && addons.length === 0) {
    return;
  }

  const totalTime = commandTime + addonTime;
  
  // Separate results by status
  const successfulCommands = commands.filter(r => r.success);
  const successfulAddons = addons.filter(r => r.success);
  const skippedCommands = commands.filter(r => r.skipped);
  const skippedAddons = addons.filter(r => r.skipped);
  const failedCommands = commands.filter(r => !r.success && !r.skipped);
  const failedAddons = addons.filter(r => !r.success && !r.skipped);

  // Calculate totals
  const totalCommands = successfulCommands.reduce((sum, r) => sum + (r.commandCount || 0), 0);
  const totalInteractions = 
    successfulCommands.reduce((sum, r) => sum + r.interactionCount, 0) +
    successfulAddons.reduce((sum, r) => sum + r.interactionCount, 0);

  // Success summary
  const successParts: string[] = [];
  if (successfulCommands.length > 0) {
    successParts.push(`${totalCommands} command(s) from ${successfulCommands.length} module(s)`);
  }
  if (successfulAddons.length > 0) {
    successParts.push(`${successfulAddons.length} addon(s)`);
  }

  if (successParts.length > 0) {
    const msg = `Successfully loaded ${successParts.join(' and ')} in ${totalTime}ms`;
    logger.success(msg + (totalInteractions > 0 ? ` (${totalInteractions} interaction handler(s))` : ''));

    // Debug details
    if (isDebug) {
      if (successfulCommands.length > 0) {
        logger.debug('  Commands:');
        successfulCommands.forEach(result => {
          const details = result.interactionCount > 0 
            ? ` (${result.commandCount} cmd, ${result.interactionCount} handlers)`
            : ` (${result.commandCount} cmd)`;
          logger.debug(`    ✓ ${result.name}: ${result.time}ms${details}`);
          if (result.messages && result.messages.length > 0) {
            result.messages.forEach(msg => logger.debug(`      - ${msg}`));
          }
        });
      }
      
      if (successfulAddons.length > 0) {
        logger.debug('  Addons:');
        successfulAddons.forEach(result => {
          const details = result.interactionCount > 0 ? ` (${result.interactionCount} handlers)` : '';
          logger.debug(`    ✓ ${result.name}: ${result.time}ms${details}`);
        });
      }
    }
  }

  // Skipped summary
  const totalSkipped = skippedCommands.length + skippedAddons.length;
  if (totalSkipped > 0) {
    logger.warn(`⚠️ ${totalSkipped} module(s) skipped due to conflicts:`);
    [...skippedCommands, ...skippedAddons].forEach(result => {
      logger.warn(`  ⊘ ${result.name}: ${result.error}`);
    });
  }

  // Failed summary
  const totalFailed = failedCommands.length + failedAddons.length;
  if (totalFailed > 0) {
    logger.error(`❌ ${totalFailed} module(s) failed to load:`);
    [...failedCommands, ...failedAddons].forEach(result => {
      logger.error(`  ✗ ${result.name}: ${result.error}`);
    });
  }

  // Reset for next load cycle
  loadResults = {
    commands: [],
    addons: [],
    commandTime: 0,
    addonTime: 0
  };
}