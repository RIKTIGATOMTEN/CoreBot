/**
 * GLOBAL CACHE SYSTEM
 * ===================
 * Provides namespaced cache management for all addons.
 * Each addon gets its own cache file to prevent collisions.
 * 
 * WHY THIS EXISTS:
 * - Addons need persistent caching between restarts
 * - Binary caching for performance-critical data
 * - JSON caching for simpler use cases
 * - Namespaced to prevent addon conflicts
 * 
 * HOW IT WORKS:
 * - Each cache gets its own file in cache/ directory
 * - CacheManager: Custom binary encoding (fast)
 * - JSONCacheManager: JSON encoding (simple)
 * - Files are automatically created/managed
 * 
 * USAGE IN ADDONS:
 * import { CacheManager, JSONCacheManager } from '#core';
 * 
 * // Binary cache (performance-critical)
 * const myCache = new CacheManager('addon-name', encoder, decoder);
 * 
 * // JSON cache (simpler)
 * const myCache = new JSONCacheManager('addon-name');
 * await myCache.save({ key: 'value' });
 * const data = await myCache.load();
 */

// core/handlers/cache/main.ts
import fs from 'fs/promises';
import path from 'path';
import {logger} from '../../utils/logger.js';
import {CACHE_BASE_DIR} from '../../utils/paths.js';

/**
 * Generic cache manager with custom binary encoding/decoding
 * Use this for performance-critical data
 */
export class CacheManager<T extends Record<string, any>> {
  private namespace: string;
  private cacheFile: string;
  private encoder: (data: T) => Buffer;
  private decoder: (buffer: Buffer) => T;

  constructor(
    namespace: string,
    encoder: (data: T) => Buffer,
    decoder: (buffer: Buffer) => T,
    options?: { includeCreator?: boolean } // NEW
  ) {
    // Validate and sanitize namespace
    if (!namespace || typeof namespace !== 'string') {
      throw new Error('CacheManager: namespace must be a non-empty string');
    }
    
    // Replace invalid characters with underscores
    const sanitized = namespace
      .trim()
      .replace(/[\/\\:*?"<>|]/g, '_'); // Replace invalid chars
    
    if (sanitized === '') {
      throw new Error('CacheManager: namespace cannot be empty after sanitization');
    }

    this.namespace = sanitized;
    this.cacheFile = path.join(CACHE_BASE_DIR, `${this.namespace}.cache`);
    this.encoder = encoder;
    this.decoder = decoder;
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.access(CACHE_BASE_DIR);
    } catch {
      await fs.mkdir(CACHE_BASE_DIR, {recursive: true});
      logger.debug(`Created cache directory: ${CACHE_BASE_DIR}`);
    }
  }

  async load(): Promise<T | null> {
    try {
      const startTime = performance.now();
      await this.ensureCacheDir();

      const buffer = await fs.readFile(this.cacheFile);
      const data = this.decoder(buffer);

      const elapsed = (performance.now() - startTime).toFixed(3);
      logger.debug(`[${this.namespace}] Loaded cache in ${elapsed}ms`);

      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.debug(`[${this.namespace}] No cache file found`);
        return null;
      }
      logger.warn(`[${this.namespace}] Error loading cache:`, error);
      return null;
    }
  }

  async save(data: T): Promise<void> {
    try {
      const startTime = performance.now();
      await this.ensureCacheDir();

      const buffer = this.encoder(data);
      await fs.writeFile(this.cacheFile, buffer);

      const elapsed = (performance.now() - startTime).toFixed(3);
      logger.debug(`[${this.namespace}] Saved cache in ${elapsed}ms`);
    } catch (error) {
      logger.error(`[${this.namespace}] Error saving cache:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.unlink(this.cacheFile);
      logger.info(`[${this.namespace}] Cleared cache`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn(`[${this.namespace}] Error clearing cache:`, error);
      }
    }
  }

  async update(updater: (current: T | null) => T): Promise<void> {
    const current = await this.load();
    const updated = updater(current);
    await this.save(updated);
  }
}

/**
 * JSON-based cache manager for simpler use cases
 * Use this when binary encoding isn't needed
 */
export class JSONCacheManager<T extends Record<string, any>> {
  private namespace: string;
  private cacheFile: string;

  constructor(namespace: string) {
    // Validate namespace
    if (!namespace || typeof namespace !== 'string') {
      throw new Error('JSONCacheManager: namespace must be a non-empty string');
    }
    if (namespace.trim() === '') {
      throw new Error('JSONCacheManager: namespace cannot be empty or whitespace');
    }
    if (/[\/\\:*?"<>|]/.test(namespace)) {
      throw new Error(`JSONCacheManager: namespace "${namespace}" contains invalid characters`);
    }

    this.namespace = namespace.trim();
    this.cacheFile = path.join(CACHE_BASE_DIR, `${this.namespace}.json`);
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.access(CACHE_BASE_DIR);
    } catch {
      await fs.mkdir(CACHE_BASE_DIR, {recursive: true});
      logger.debug(`Created cache directory: ${CACHE_BASE_DIR}`);
    }
  }

  async load(): Promise<T | null> {
    try {
      const startTime = performance.now();
      await this.ensureCacheDir();

      const data = await fs.readFile(this.cacheFile, 'utf-8');
      const parsed = JSON.parse(data);

      const elapsed = (performance.now() - startTime).toFixed(3);
      logger.debug(`[${this.namespace}] Loaded JSON cache in ${elapsed}ms`);

      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.debug(`[${this.namespace}] No JSON cache file found`);
        return null;
      }
      logger.warn(`[${this.namespace}] Error loading JSON cache:`, error);
      return null;
    }
  }

  async save(data: T): Promise<void> {
    try {
      const startTime = performance.now();
      await this.ensureCacheDir();

      await fs.writeFile(this.cacheFile, JSON.stringify(data, null, 2));

      const elapsed = (performance.now() - startTime).toFixed(3);
      logger.debug(`[${this.namespace}] Saved JSON cache in ${elapsed}ms`);
    } catch (error) {
      logger.error(`[${this.namespace}] Error saving JSON cache:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.unlink(this.cacheFile);
      logger.info(`[${this.namespace}] Cleared JSON cache`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn(`[${this.namespace}] Error clearing JSON cache:`, error);
      }
    }
  }

  async update(updater: (current: T | null) => T): Promise<void> {
    const current = await this.load();
    const updated = updater(current);
    await this.save(updated);
  }
}

/**
 * Utility function to list all cache files
 */
export async function listAllCaches(): Promise<string[]> {
  try {
    const files = await fs.readdir(CACHE_BASE_DIR);
    return files.filter(f => f.endsWith('.cache') || f.endsWith('.json'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    logger.warn('Error listing cache files:', error);
    return [];
  }
}

/**
 * Utility function to clear all caches (useful for maintenance)
 */
export async function clearAllCaches(): Promise<void> {
  try {
    const files = await listAllCaches();
    await Promise.all(
      files.map(file => fs.unlink(path.join(CACHE_BASE_DIR, file)))
    );
    logger.info(`Cleared ${files.length} cache files`);
  } catch (error) {
    logger.error('Error clearing all caches:', error);
  }
}