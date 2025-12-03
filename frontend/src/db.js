import { init, i, id } from "@instantdb/react";

// Get your APP_ID from https://instantdb.com/dash
// Create a free account and create a new app to get your APP_ID
const APP_ID = import.meta.env.VITE_INSTANTDB_APP_ID || "";

// Define the schema for our analysis history
const schema = i.schema({
  entities: {
    analysisHistory: i.entity({
      // Market info
      marketId: i.string(),
      marketQuestion: i.string(),
      marketPrice: i.number(),
      // Analysis results
      aiProbability: i.number(),
      edge: i.number(),
      confidence: i.string(),
      reasoning: i.string(),
      // Metadata
      createdAt: i.number(),
    }),
  },
});

// Initialize the database
const db = init({ appId: APP_ID, schema });

// Helper function to generate IDs
export { id };

// Export the db instance
export default db;

