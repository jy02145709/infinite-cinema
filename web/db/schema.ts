import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const generationUsage = sqliteTable("generation_usage", {
  userId: text("user_id").notNull(),
  usageDate: text("usage_date").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.usageDate] })]);
