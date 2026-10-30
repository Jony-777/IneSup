import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const opiniones = sqliteTable("opiniones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propuesta: text("propuesta").notNull(),
  categoria: text("categoria").notNull(),
  ciudad: text("ciudad").notNull(),
  codigoPostal: text("codigo_postal").notNull(),
  colonia: text("colonia").notNull(),
  seccion: text("seccion").notNull(),
  createdAt: text("created_at").notNull(),
});
