import chalk from 'chalk';

const getTimestamp = (): string => new Date().toLocaleTimeString();

export const logger = {
  info: (msg: string, ...args: any[]): void =>
      console.log(chalk.white(`${getTimestamp()}:[TICKET] ${msg}`), ...args),

  error: (msg: string, ...args: any[]): void =>
      console.error(chalk.red(`${getTimestamp()}:[ERROR] ${msg}`), ...args),

  warn: (msg: string, ...args: any[]): void =>
      console.warn(
          chalk.yellow(`${getTimestamp()}:[WARNING] ${msg}`),
          ...args
      ),

  debug: (msg: string, ...args: any[]): void => {
    if (process.env.DEBUG === 'true') {
      console.log(chalk.cyan(`${getTimestamp()}:[DEBUG] ${msg}`), ...args);
    }
  },
};

export { getTimestamp };