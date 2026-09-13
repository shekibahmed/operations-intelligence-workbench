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

  const funnel = await createProductAnalyticsRepository(connection.database).funnelByScenario();
  console.log("Funnel by scenario (aggregate counts, existing events only):");
  if (funnel.length === 0) {
    console.log("(no funnel events recorded yet)");
  }
  for (const row of funnel) {
    console.log(`${row.scenario} / ${row.name}: ${String(row.count)}`);
  }
} finally {
  await connection.close();
}
