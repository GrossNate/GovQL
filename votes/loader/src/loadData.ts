import mongoose from 'mongoose';
import recursivelyProcessFiles from './recursivelyProcessFiles';
import logger from './logger';

// Define interface for our document (empty since we allow any JSON structure)
interface JsonDocDocument extends mongoose.Document {}

// Create a flexible schema (strict mode disabled) to accept any JSON data
const JsonDocSchema = new mongoose.Schema({}, { strict: false });
const Vote = mongoose.model<JsonDocDocument>('Vote', JsonDocSchema);

async function parseAndLoadFile(fileContent: string) {
  try {
    const jsonData = JSON.parse(fileContent);
    await Vote.replaceOne({vote_id: jsonData.vote_id}, jsonData, {upsert: true});
    logger.info('Inserted document.');
  } catch (err) {
    logger.error('Could not insert document.', err);
  }
}

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    logger.error('MONGO_URI environment variable not set.');
    process.exit(1);
  }

  // Connect to MongoDB using Mongoose
  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }

  // Define the base directory where your JSON files are stored.
  const baseDir = '/congress';

  // Load JSON files recursively and insert them into MongoDB
  await recursivelyProcessFiles(baseDir, parseAndLoadFile);
  logger.info('Finished loading JSON files.');

  // Disconnect from MongoDB
  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB.');
}

main().catch((err) => logger.error('Unexpected error:', err));
