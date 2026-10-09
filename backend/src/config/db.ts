/**
 * @deprecated This file is DEPRECATED and scheduled for removal.
 * 
 * The project uses PostgreSQL via Supabase, NOT MongoDB.
 * Active database connections are in:
 *   - config/supabase.ts (Supabase client)
 *   - config/database.ts (PostgreSQL pool via pg)
 * 
 * DO NOT use this file for new code.
 * Will be removed after confirming zero active references.
 * 
 * @see config/supabase.ts
 * @see config/database.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;