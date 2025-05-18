import { promises as fs } from 'fs';
import path from 'path';
import logger from './logger';

/**
 * Recursively traverses the given directory and applies a function to each file.
 * @param directory - The base directory to scan.
 * @param processingFunction - Function to run on each file.
 */
export default async function recursivelyProcessFiles(directory: string, processingFunction: (file: string) => Promise<void>): Promise<void> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        // Recurse into subdirectories
        await recursivelyProcessFiles(fullPath, processingFunction);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        logger.info({message: `Reading file: ${fullPath}`});
        try {
          const fileContent = await fs.readFile(fullPath, 'utf8');
          await processingFunction(fileContent);
          logger.info({message: `Processed file: ${fullPath}`})
        } catch (err) {
          logger.error(`Error processing file: ${fullPath}`, err);
        }
      }
    }
  } catch (err) {
    logger.error(`Error reading directory: ${directory}`, err);
  }
}