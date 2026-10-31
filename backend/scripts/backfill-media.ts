/**
 * Recupera medios de WhatsApp Cloud que quedaron guardados solo con el media_id
 * (antes de persistir archivos en chat-media). Meta mantiene los media_id
 * descargables ~30 días, por eso solo se procesan mensajes recientes.
 *
 * Uso: cd backend && npx ts-node --transpile-only scripts/backfill-media.ts
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MEDIA_TYPES = ['image', 'video', 'audio', 'document'];
const MAX_AGE_DAYS = 29;

async function main() {
  const { supabase } = await import('../src/core/config/supabase');
  const { persistCloudMediaMessage } = await import('../src/modules/system/mediaService');

  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, organization_id, type, content, created_at')
    .in('type', MEDIA_TYPES)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('No se pudieron leer los mensajes:', error.message);
    process.exit(1);
  }

  console.log(`Mensajes de media encontrados: ${messages?.length || 0}`);

  const tokenCache = new Map<string, string | null>();
  let recovered = 0;
  let skipped = 0;
  let failed = 0;

  for (const message of messages || []) {
    let parsed: any;
    try {
      parsed = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
    } catch {
      skipped++;
      continue;
    }

    const payload = parsed?.[message.type];
    const mediaId: string | undefined = payload?.id;
    if (!mediaId) {
      skipped++;
      continue;
    }

    if (new Date(message.created_at).getTime() < cutoff) {
      skipped++;
      continue;
    }

    if (!tokenCache.has(message.organization_id)) {
      const { data: conn } = await supabase
        .from('platform_connections')
        .select('config')
        .eq('organization_id', message.organization_id)
        .eq('platform_type', 'whatsapp')
        .eq('status', 'connected')
        .maybeSingle();
      tokenCache.set(message.organization_id, conn?.config?.access_token || null);
    }
    const accessToken = tokenCache.get(message.organization_id);
    if (!accessToken) {
      skipped++;
      continue;
    }

    try {
      const media = await persistCloudMediaMessage(
        { id: parsed.id, type: message.type, [message.type]: payload },
        {
          organizationId: message.organization_id,
          accessToken,
          messageId: parsed.id || message.id,
        },
      );
      if (!media) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('messages')
        .update({ content: JSON.stringify(media) })
        .eq('id', message.id);
      if (updateError) throw new Error(updateError.message);

      recovered++;
      console.log(`OK  ${message.type} ${message.id} -> ${media.url}`);
    } catch (err: any) {
      failed++;
      console.warn(`FALLO ${message.type} ${message.id}: ${err?.response?.data?.error?.message || err?.message || err}`);
    }
  }

  console.log(`\nRecuperados: ${recovered} | Omitidos: ${skipped} | Fallidos: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
