import dotenvx from '@dotenvx/dotenvx';
dotenvx.config();

import mongoose from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';

// Define an interface for our document (empty since we allow any JSON structure)
interface JsonDocDocument extends mongoose.Document {}

// Create a flexible schema (strict mode disabled) to accept any JSON data
const JsonDocSchema = new mongoose.Schema({}, { strict: false });
const JsonDoc = mongoose.model<JsonDocDocument>('votes', JsonDocSchema);

/**
 * Recursively traverses the given directory and inserts any JSON files into MongoDB.
 * @param directory - The base directory to scan.
 */
async function loadJSONFiles(directory: string): Promise<void> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        // Recurse into subdirectories
        await loadJSONFiles(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        console.log(`Processing file: ${fullPath}`);
        try {
          const fileContent = await fs.readFile(fullPath, 'utf8');
          const jsonData = JSON.parse(fileContent);
          // Insert the JSON data as a document in MongoDB
          await JsonDoc.create(jsonData);
          console.log(`Inserted document from ${fullPath}`);
        } catch (err) {
          console.error(`Error processing file ${fullPath}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${directory}:`, err);
  }
}

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI environment variable not set.');
    process.exit(1);
  }

  // Connect to MongoDB using Mongoose
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }

  // Define the base directory where your JSON files are stored.
  const baseDir = '/Users/nathangross/capstone/react/ideation/congress-python/congress/data/119/votes/2025'; // <-- Update this path as needed

  // Load JSON files recursively and insert them into MongoDB
  await loadJSONFiles(baseDir);
  console.log('Finished loading JSON files.');

  // Disconnect from MongoDB
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

main().catch((err) => console.error('Unexpected error:', err));
