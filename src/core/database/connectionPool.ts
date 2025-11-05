import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import logger from "../utils/logger.js";
import { ENV_PATH } from "../utils/paths.js";

dotenv.config({ path: ENV_PATH });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  maxIdle: 10,              
  idleTimeout: 60000,       
  decimalNumbers: true,     
  namedPlaceholders: true,  
  multipleStatements: false
});

/**
 * Warm up the connection pool by establishing initial connections
 * This can reduce latency on first queries
 */
export async function warmupPool(connections: number = 2): Promise<void> {
  const promises: Promise<void>[] = [];
  
  for (let i = 0; i < connections; i++) {
    promises.push(
      pool.query('SELECT 1').then(() => {}).catch(err => {
        logger.warn(`Pool warmup connection ${i + 1} failed:`, err);
      })
    );
  }
  
  await Promise.all(promises);
}

export async function closePool(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database connection pool closed');
  } catch (error) {
    logger.error('Error closing database pool:', error);
    throw error;
  }
}

export { pool };