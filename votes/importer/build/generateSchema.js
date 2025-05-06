"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const dotenvx_1 = __importDefault(require("@dotenvx/dotenvx"));
dotenvx_1.default.config();
// Replace with your MongoDB URI and collection name
const MONGO_URI = (_a = process.env.MONGO_URI) !== null && _a !== void 0 ? _a : '';
const COLLECTION_NAME = 'votes';
function generateSchemaFromCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose_1.default.connect(MONGO_URI);
        const db = mongoose_1.default.connection;
        const collection = db.collection(COLLECTION_NAME);
        // Fetch a sample of documents from the collection
        const sampleDocs = yield collection.find().limit(10).toArray();
        if (sampleDocs.length === 0) {
            console.log('No documents found in the collection.');
            mongoose_1.default.disconnect();
            return;
        }
        // Function to infer Mongoose field types
        function inferType(value) {
            if (Array.isArray(value)) {
                return [inferType(value[0])];
            }
            if (typeof value === 'string')
                return String;
            if (typeof value === 'number')
                return Number;
            if (typeof value === 'boolean')
                return Boolean;
            if (value instanceof Date)
                return Date;
            if (typeof value === 'object' && value !== null)
                return new mongoose_1.Schema(inferSchema(value));
            return mongoose_1.Schema.Types.Mixed;
        }
        // Function to infer a schema from a document
        function inferSchema(document) {
            const schemaDefinition = {};
            for (const key in document) {
                schemaDefinition[key] = inferType(document[key]);
            }
            return schemaDefinition;
        }
        // Generate schema from the first document
        const inferredSchema = new mongoose_1.Schema(inferSchema(sampleDocs[1]), { timestamps: true });
        console.log('Generated Schema:', inferredSchema);
        mongoose_1.default.disconnect();
    });
}
generateSchemaFromCollection().catch(console.error);
