import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Datasets table
export const datasets = sqliteTable('datasets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Videos table
export const videos = sqliteTable('videos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  datasetId: integer('dataset_id').notNull().references(() => datasets.id),
  filename: text('filename').notNull(),
  filepath: text('filepath').notNull(),
  duration: real('duration').notNull(),
  originalWidth: integer('original_width').notNull(),
  originalHeight: integer('original_height').notNull(),
  startTime: real('start_time').notNull().default(0.0),
  resolution: text('resolution', { enum: ['1280x720', '720x1280', '768x768'] }).notNull().default('1280x720'),
  cropX: integer('crop_x').notNull().default(0),
  cropY: integer('crop_y').notNull().default(0),
  cropWidth: integer('crop_width').notNull(),
  cropHeight: integer('crop_height').notNull(),
  fps: integer('fps'),
  frameCount: integer('frame_count'),
  status: text('status', { enum: ['pending', 'processed', 'error'] }).notNull().default('pending'),
});

// Relations
export const datasetsRelations = relations(datasets, ({ many }) => ({
  videos: many(videos),
}));

export const videosRelations = relations(videos, ({ one }) => ({
  dataset: one(datasets, {
    fields: [videos.datasetId],
    references: [datasets.id],
  }),
}));

export type Dataset = typeof datasets.$inferSelect;
export type NewDataset = typeof datasets.$inferInsert;
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
