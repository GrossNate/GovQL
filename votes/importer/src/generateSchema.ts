import mongoose, { Schema } from 'mongoose';
import dotenvx from '@dotenvx/dotenvx';

dotenvx.config();

// Replace with your MongoDB URI and collection name
const MONGO_URI = process.env.MONGO_URI ?? '';
const COLLECTION_NAME = 'votes';

async function generateSchemaFromCollection() {
  await mongoose.connect(MONGO_URI);
  
  const db = mongoose.connection;
  const collection = db.collection(COLLECTION_NAME);
  
  // Fetch a sample of documents from the collection
  const sampleDocs = await collection.find().limit(10).toArray();
  
  if (sampleDocs.length === 0) {
    console.log('No documents found in the collection.');
    mongoose.disconnect();
    return;
  }

  // Function to infer Mongoose field types
  function inferType(value: any): any {
    if (Array.isArray(value)) {
      return [inferType(value[0])];
    }
    if (typeof value === 'string') return String;
    if (typeof value === 'number') return Number;
    if (typeof value === 'boolean') return Boolean;
    if (value instanceof Date) return Date;
    if (typeof value === 'object' && value !== null) return new Schema(inferSchema(value));
    return Schema.Types.Mixed;
  }

  // Function to infer a schema from a document
  function inferSchema(document: Record<string, any>) {
    const schemaDefinition: Record<string, any> = {};
    for (const key in document) {
      schemaDefinition[key] = inferType(document[key]);
    }
    return schemaDefinition;
  }

  // Generate schema from the first document
  const inferredSchema = new Schema(inferSchema(sampleDocs[1]), { timestamps: true });

  console.log('Generated Schema:', inferredSchema);

  mongoose.disconnect();
}

generateSchemaFromCollection().catch(console.error);
