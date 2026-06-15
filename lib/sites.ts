/**
 * Demos web publicadas en un link público (para enviar al cliente por WhatsApp).
 * Se guardan en KV y se sirven en /w/<slug> sin login.
 */
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv";

export interface PublishedSite { slug: string; name: string; html: string; at: number; }

const PREFIX = "site:";

export function slugify(s: string): string {
  return (s || "demo")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "demo";
}

export async function saveSite(name: string, html: string): Promise<PublishedSite | null> {
  if (!kvConfigured()) return null;
  const rand = Math.random().toString(36).slice(2, 6);
  const slug = `${slugify(name)}-${rand}`;
  const site: PublishedSite = { slug, name, html, at: Date.now() };
  await kvSetJSON(PREFIX + slug, site);
  return site;
}

export async function getSite(slug: string): Promise<PublishedSite | null> {
  if (!kvConfigured()) return null;
  return await kvGetJSON<PublishedSite>(PREFIX + slug);
}
