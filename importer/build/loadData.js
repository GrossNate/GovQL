"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
// Create a flexible schema (strict mode disabled) to accept any JSON data
const JsonDocSchema = new mongoose_1.default.Schema({}, { strict: false });
const JsonDoc = mongoose_1.default.model('votes', JsonDocSchema);
/**
 * Recursively traverses the given directory and inserts any JSON files into MongoDB.
 * @param directory - The base directory to scan.
 */
function loadJSONFiles(directory) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const entries = yield fs_1.promises.readdir(directory, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(directory, entry.name);
                if (entry.isDirectory()) {
                    // Recurse into subdirectories
                    yield loadJSONFiles(fullPath);
                }
                else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
                    console.log(`Processing file: ${fullPath}`);
                    try {
                        const fileContent = yield fs_1.promises.readFile(fullPath, 'utf8');
                        const jsonData = JSON.parse(fileContent);
                        // Insert the JSON data as a document in MongoDB
                        yield JsonDoc.create(jsonData);
                        console.log(`Inserted document from ${fullPath}`);
                    }
                    catch (err) {
                        console.error(`Error processing file ${fullPath}:`, err);
                    }
                }
            }
        }
        catch (err) {
            console.error(`Error reading directory ${directory}:`, err);
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('MONGO_URI environment variable not set.');
            process.exit(1);
        }
        // Connect to MongoDB using Mongoose
        try {
            yield mongoose_1.default.connect(mongoUri);
            console.log('Connected to MongoDB');
        }
        catch (error) {
            console.error('Error connecting to MongoDB:', error);
            process.exit(1);
        }
        // Define the base directory where your JSON files are stored.
        const baseDir = '/congress'; // <-- Update this path as needed
        // Load JSON files recursively and insert them into MongoDB
        yield loadJSONFiles(baseDir);
        console.log('Finished loading JSON files.');
        // Disconnect from MongoDB
        yield mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB.');
    });
}
main().catch((err) => console.error('Unexpected error:', err));
