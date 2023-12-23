import * as mongoose from 'mongoose';

jest.setTimeout(30000);

beforeAll(async () => {
  const dbName = `test-${global.process.env.JEST_WORKER_ID}`;
  const mongoUri = (global as any).__MONGO_URI__;

  await mongoose.connect(mongoUri, { dbName });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
