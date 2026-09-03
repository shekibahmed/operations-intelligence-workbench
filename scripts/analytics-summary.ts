import { createDatabase } from "../packages/persistence/src/database.js";
import { createProductAnalyticsRepository } from "../packages/persistence/src/product-analytics.js";

const connection = createDatabase();

try {
  const summary = await createProductAnalyticsRepository(connection.database).summary();
  console.log(`Product analytics events: ${String(summary.totalEvents)}`);
  for (const event of summary.events) {
    console.log(`${event.name}: ${String(event.count)}`);
  }
  console.log(`Assessment submissions: ${String(summary.assessmentSubmissions)}`);
} finally {
  await connection.close();
}
