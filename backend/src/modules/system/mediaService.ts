import axios from 'axios';
import { createHash } from 'crypto';
import { supabase } from '../../core/config/supabase';

const BUCKET = 'chat-media';
const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

function extensionFromMime(mimeType: string, filename?: string): string {
  const fromName = filename?.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const subtype = (mimeType || '').split('/')[1]?.split(';')[0]?.split('+')[0];
  if (!subtype) return 'bin';
  return subtype === 'mpeg' ? 'mp3' : subtype === 'jpeg' ? 'jpg' : subtype;
}

function safeKey(keyBase: string): string {
  return (keyBase || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 90) || `${Date.now()}`;
}

export async function uploadChatMedia(params: {
  buffer: Buffer;
  mimeType: string;
  organizationId: string;
  keyBase: string;
  filename?: string;
  folder?: 'stickers';
}): Promise<string> {
  const ext = extensionFromMime(params.mimeType, params.filename);
  const fileKey = params.folder === 'stickers'
    ? `sticker-${createHash('sha256').update(params.buffer).digest('hex')}`
    : safeKey(params.keyBase);
  const path = `${params.organizationId}/${params.folder ? `${params.folder}/` : ''}${fileKey}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, params.buffer, {
    contentType: params.mimeType || 'application/octet-stream',
    upsert: true,
  });
  if (error) throw new Error(`No se pudo subir el archivo a chat-media: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadDataUrlToChatMedia(dataUrl: string, opts: {
  organizationId: string;
  keyBase: string;
  filename?: string;
}): Promise<string> {
  const match = dataUrl.match(/^data:([^;,]+)(?:;[^,]*)*;base64,(.+)$/s);
  if (!match) throw new Error('Formato de data URL no válido');
  const [, mimeType, base64Data] = match;
  const buffer = Buffer.from(base64Data, 'base64');
  return uploadChatMedia({
    buffer,
    mimeType,
    organizationId: opts.organizationId,
    keyBase: opts.keyBase,
    filename: opts.filename,
  });
}

// Meta entrega los media por ID: primero se resuelve la URL temporal (5 min)
// y luego se descarga con el mismo token de la conexión.
export async function downloadCloudMedia(mediaId: string, accessToken: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const meta = await axios.get(`${GRAPH_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });
  const url: string | undefined = meta.data?.url;
  if (!url) throw new Error(`Meta no devolvió URL para el media ${mediaId}`);

  const file = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: 'arraybuffer',
    timeout: 30000,
    maxContentLength: 32 * 1024 * 1024,
  });

  const headerType = (file.headers?.['content-type'] as string | undefined)?.split(';')[0];
  return {
    buffer: Buffer.from(file.data),
    mimeType: headerType || meta.data?.mime_type || 'application/octet-stream',
  };
}

export type StoredMediaContent = {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mime_type: string;
  filename?: string;
  caption: string;
};

const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker'] as const;

export function isMediaMessageType(type: string): boolean {
  return (MEDIA_TYPES as readonly string[]).includes(type);
}

export async function persistCloudMediaMessage(message: any, opts: {
  organizationId: string;
  accessToken: string;
  messageId: string;
}): Promise<StoredMediaContent | null> {
  const type = message?.type;
  if (!isMediaMessageType(type)) return null;

  const payload = message?.[type];
  const mediaId: string | undefined = payload?.id;
  if (!mediaId) return null;

  const { buffer, mimeType } = await downloadCloudMedia(mediaId, opts.accessToken);
  const filename: string | undefined = payload?.filename;
  const url = await uploadChatMedia({
    buffer,
    mimeType,
    organizationId: opts.organizationId,
    keyBase: opts.messageId,
    filename,
    folder: type === 'sticker' ? 'stickers' : undefined,
  });

  return {
    url,
    type,
    mime_type: mimeType,
    filename,
    caption: payload?.caption || '',
  };
}

export function buildLocationContent(message: any): any | null {
  const loc = message?.location;
  if (!loc) return null;
  return {
    type: 'location',
    location: {
      latitude: loc.latitude,
      longitude: loc.longitude,
      name: loc.name || '',
      address: loc.address || '',
      url: loc.url || '',
    },
  };
}
