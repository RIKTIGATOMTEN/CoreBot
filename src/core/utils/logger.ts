import chalk from "chalk"; // Import chalk for colored console output
import dotenv from "dotenv"; // Import dotenv to manage environment variables
import { ENV_PATH } from "./paths.js"; // Import the path to the .env file
// Load environment variables from .env file
dotenv.config({ path: ENV_PATH });
// Determine if debug mode is enabled
const isDebug: boolean = process.env.DEBUG === "true";
// Function to get current timestamp in HH:MM:SS format
const getTimestamp = (): string => new Date().toLocaleTimeString();
// Logger interface definition
export interface Logger {
  info: (msg: string, ...args: any[]) => void; // Log for informational messages
  warn: (msg: string, ...args: any[]) => void; // Log for warning messages
  error: (msg: string, ...args: any[]) => void; // Log for error messages
  debug: (msg: string, ...args: any[]) => void; // Log for debug messages
  success: (msg: string, ...args: any[]) => void; // Log for successful operations
  log: (msg: string, ...args: any[]) => void; // General log method
}

const clogger: Logger = {
  // Log with [info] prefix
  info: (msg: string, ...args: any[]): void => {
    console.log(chalk.white(`${getTimestamp()}:[info] ${msg}`), ...args);
  },
  // Log with [warn] prefix
  warn: (msg: string, ...args: any[]): void => {
    console.warn(chalk.yellow(`${getTimestamp()}:[warn] ${msg}`), ...args);
  },
  // Log with [error] prefix
  error: (msg: string, ...args: any[]): void => {
    console.error(chalk.red(`${getTimestamp()}:[error] ${msg}`), ...args);
  },
  // Log with [debug] prefix
  debug: (msg: string, ...args: any[]): void => {
    if (isDebug) {
      console.log(chalk.cyan(`${getTimestamp()}:[debug] ${msg}`), ...args);
    }
  },
  // Log with [success] prefix
  success: (msg: string, ...args: any[]): void => {
    console.log(chalk.green(`${getTimestamp()}:[success] ${msg}`), ...args);
  },
  // Log with [log] prefix
  log: (msg: string, ...args: any[]): void => {
    console.log(chalk.white(`${getTimestamp()}:[log] ${msg}`), ...args);
  },
};
//Export the logger as default for export usage
export default clogger;