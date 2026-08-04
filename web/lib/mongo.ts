import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as {
  mongoClientPromise: Promise<MongoClient> | undefined;
};

export function getMongoClientPromise(): Promise<MongoClient> | null {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (!globalForMongo.mongoClientPromise) {
    globalForMongo.mongoClientPromise = new MongoClient(uri).connect();
  }
  return globalForMongo.mongoClientPromise;
}

export async function getReportsCollection() {
  const promise = getMongoClientPromise();
  if (!promise) return null;
  const client = await promise;
  const dbName = process.env.MONGODB_DB || "stock_analyzer";
  return client.db(dbName).collection("reports");
}
