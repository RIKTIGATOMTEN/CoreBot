/**
 * STARTUP BANNER
 * ==============
 * Displays ASCII art banner when bot successfully starts.
 * 
 * WHY THIS EXISTS:
 * - Visual confirmation that bot initialized correctly
 * - Branding and personality for the bot
 * - Shows GitHub link for the project
 * 
 * WHEN IT RUNS:
 * - Called after all addons are loaded
 * - Only shown on successful startup
 */

import chalk from "chalk";

const logBanner = async (): Promise<void> => {
  const asciiArt = `
${chalk.cyan("  ______  ____  __  __  ______  ______ _   __")}
${chalk.cyan(" /_  __/ / __ \\/  |/  //_  __/ / ____// | / /")}
${chalk.cyan("  / /   / / / / /|_/ /  / /   / __/  /  |/ / ")}
${chalk.cyan(" / /   / /_/ / /  / /  / /   / /___ / /|  /  ")}
${chalk.cyan("/_/    \\____/_/  /_/  /_/   /_____//_/ |_/   ")}

${chalk.white("RiktigaTomten\'s Core")}
${chalk.white("───────────────────────────────────────────────────────────")}
${chalk.green("Core successfully initialized")}`;

  console.log(asciiArt);
  console.log(chalk.white("───────────────────────────────────────────────────────────"));
  console.log(chalk.cyan("🔗 Check me out on GitHub: https://github.com/RiktigaTomten"));
  console.log(chalk.white("───────────────────────────────────────────────────────────"));
};

export default logBanner;