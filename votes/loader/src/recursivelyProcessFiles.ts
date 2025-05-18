import { promises as fs } from 'fs';
import path from 'path';
import winston from 'winston';

const logger = winston.createLogger({level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'file-processor'},
  transports: [
    new winston.transports.File({filename: 'error.log', level: 'error'}),
    new winston.transports.File({filename: 'combined.log'})
  ],
})

if (process.env.NODE_ENV !== 'prod') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

/**
 * Recursively traverses the given directory and inserts any JSON files into MongoDB.
 * @param directory - The base directory to scan.
 * @param processingFunction - Function to run on each file.
 */
export default async function recursivelyProcessFiles(directory: string, processingFunction: (file: string) => {}): Promise<void> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        // Recurse into subdirectories
        await recursivelyProcessFiles(fullPath, processingFunction);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        logger.info({message: `Processing file: ${fullPath}`});
        try {
          const fileContent = await fs.readFile(fullPath, 'utf8');
          processingFunction(fileContent);
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