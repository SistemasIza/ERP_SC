import * as XLSX from 'xlsx';
import { supabase } from '../../core/config/supabase';
import { multiWhatsAppService } from '../integrations/multiWhatsAppService';
import { whatsappCloudService } from '../integrations/platform/whatsappCloudService';

const PHONE_HEADER_PATTERN = /cel|celular|telefono|tel[eé]fono|phone|movil|m[oó]vil|whatsapp|numero|n[uú]mero|mobile|contacto/i;

export interface ParsedContact {
  phone: string;
  variables: Record<string, string>;
}

export interface ParsedExcel {
  headers: string[];
  phoneKey: string;
  rows: ParsedContact[];
  total: number;
}

export interface CampaignRow {
  id: string;
  organization_id: string;
  name: string;
  message_template: string;
  whatsapp_connection_id: string | null;
  status: string;
  delay_ms: number;
  total: number;
  sent: number;
  failed: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

interface SendState {
  campaignId: string;
  paused: boolean;
  cancelled: boolean;
}

function normalizePhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 9 && !digits.startsWith('51')) {
    return '51' + digits;
  }
  return digits;
}

// Convierte valores de celdas: fechas de Excel (serial numérico u objeto Date) a YYYY-MM-DD.
// Solo convierte si la columna parece fecha, para no corromper variables numéricas (DNI, montos, etc.).
const DATE_HINT_PATTERN = /fecha|fec\.?|date|vence|vencimiento|revis|dia|day|nacimiento|nac\b|hora|fecha_revision/i;

function normalizeCellValue(value: any, key: string): string {
  if (typeof value === 'string') return value;

  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const looksDate = DATE_HINT_PATTERN.test(key);
  if (
    looksDate &&
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 20000 &&
    value <= 70000
  ) {
    const parsed: any = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${m}-${d}`;
    }
  }

  return String(value ?? '');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function renderTemplate(template: string, variables: Record<string, string> = {}): string {
  let text = template;
  for (const [key, value] of Object.entries(variables || {})) {
    if (value === undefined || value === null) continue;
    const re = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, 'gi');
    text = text.replace(re, String(value));
  }
  // Limpiar cualquier placeholder que no se haya resuelto
  text = text.replace(/\{\{\s*[\w\s-]+\s*\}\}/g, '');
  return text;
}

export function parseExcelBase64(base64Data: string): ParsedExcel {
  const buffer = Buffer.from(base64Data, 'base64');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json: Array<Record<string, any>> = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (json.length === 0) {
    return { headers: [], phoneKey: '', rows: [], total: 0 };
  }

  const headers = Object.keys(json[0]);
  const phoneKey =
    headers.find((h) => PHONE_HEADER_PATTERN.test(h)) ||
    headers[0];

  const rows: ParsedContact[] = [];
  for (const row of json) {
    const rawPhone = String(row[phoneKey] ?? '');
    const phone = normalizePhone(rawPhone);
    if (!phone) continue;

    const variables: Record<string, string> = {};
    for (const h of headers) {
      variables[h] = normalizeCellValue(row[h], h);
    }

    rows.push({ phone, variables });
  }

  return { headers, phoneKey, rows, total: rows.length };
}

async function countContacts(campaignId: string, status: string): Promise<number> {
  const { count, error } = await supabase
    .from('campaign_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', status);
  if (error) {
    console.error('[Campaigns] Error counting contacts:', error);
    return 0;
  }
  return count || 0;
}

async function updateProgress(campaignId: string) {
  const [sent, failed] = await Promise.all([
    countContacts(campaignId, 'sent'),
    countContacts(campaignId, 'failed'),
  ]);
  await supabase
    .from('campaigns')
    .update({ sent, failed, updated_at: new Date().toISOString() })
    .eq('id', campaignId);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class CampaignsService {
  private activeSends: Map<string, SendState> = new Map();

  isSending(campaignId: string): boolean {
    return this.activeSends.has(campaignId);
  }

  // Al iniciar el servidor: cualquier campaña en "sending" quedó huérfana
  async recoverInterruptedCampaigns() {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('status', 'sending');
    if (error) {
      const msg = error.message || '';
      if (error.code === '42P01' || error.code === 'PGRST205' || msg.includes('not find the table') || msg.includes('relation')) {
        console.log('\x1b[33m⚠️  [Campañas]\x1b[0m Tabla no existe aún. Omitiendo recuperación.');
      } else {
        console.error('\x1b[31m❌ [Campañas]\x1b[0m Error recuperando:', error.message);
      }
    } else {
      console.log('\x1b[32m✅ [Campañas]\x1b[0m Recuperación de envíos interrumpidos completada');
    }
  }

  async parseExcel(fileName: string | undefined, base64Data: string): Promise<ParsedExcel> {
    const result = parseExcelBase64(base64Data);
    console.log(`[Campaigns] Parsed "${fileName || 'sin nombre'}" -> ${result.total} contactos, columna teléfono: "${result.phoneKey}"`);
    return result;
  }

  async createCampaign(data: {
    organizationId: string;
    name: string;
    messageTemplate: string;
    whatsappConnectionId: string | null;
    delayMs?: number;
    contacts: ParsedContact[];
    createdBy?: string | null;
    metaTemplateName?: string | null;
    metaTemplateLanguage?: string | null;
    useMarketingApi?: boolean;
  }) {
    const total = data.contacts.length;
    const insertData: any = {
      organization_id: data.organizationId,
      name: data.name,
      message_template: data.messageTemplate,
      whatsapp_connection_id: data.whatsappConnectionId,
      delay_ms: data.delayMs && data.delayMs > 0 ? data.delayMs : 3000,
      status: 'draft',
      total,
      created_by: data.createdBy || null,
    };
    if (data.metaTemplateName) insertData.meta_template_name = data.metaTemplateName;
    if (data.metaTemplateLanguage) insertData.meta_template_language = data.metaTemplateLanguage;
    if (data.useMarketingApi !== undefined) insertData.use_marketing_api = data.useMarketingApi;

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    const contacts = data.contacts.map((c) => ({
      campaign_id: campaign.id,
      phone: c.phone,
      variables: c.variables,
      status: 'pending',
    }));

    if (contacts.length > 0) {
      // Insertar en lotes para evitar exceder el límite de parámetros
      for (let i = 0; i < contacts.length; i += 500) {
        const { error: insertError } = await supabase
          .from('campaign_contacts')
          .insert(contacts.slice(i, i + 500));
        if (insertError) {
          console.error('[Campaigns] Error inserting contacts:', insertError);
          throw insertError;
        }
      }
    }

    return campaign;
  }

  async listCampaigns(organizationId: string): Promise<CampaignRow[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as CampaignRow[];
  }

  async getCampaign(campaignId: string, organizationId: string) {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;
    return campaign;
  }

  async getCampaignContacts(campaignId: string, organizationId: string, limit = 200, offset = 0) {
    const { data: contacts, error, count } = await supabase
      .from('campaign_contacts')
      .select('*', { count: 'exact' })
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { contacts: contacts || [], count: count || 0 };
  }

  async updateCampaign(campaignId: string, organizationId: string, updates: any) {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCampaign(campaignId: string, organizationId: string) {
    const state = this.activeSends.get(campaignId);
    if (state) {
      state.cancelled = true;
      this.activeSends.delete(campaignId);
    }
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return { success: true };
  }

  async startSending(campaignId: string, organizationId: string) {
    if (this.activeSends.has(campaignId)) {
      throw new Error('La campaña ya se está enviando');
    }

    const campaign = await this.getCampaign(campaignId, organizationId);

    if (!campaign.whatsapp_connection_id) {
      throw new Error('La campaña no tiene una conexión WhatsApp asignada');
    }

    // Try Baileys first
    let connection = multiWhatsAppService.getConnection(campaign.whatsapp_connection_id);
    let isCloudApi = false;

    // If not found in Baileys, try Cloud API
    if (!connection || connection.status !== 'connected') {
      const { data: platformConn } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('id', campaign.whatsapp_connection_id)
        .eq('status', 'connected')
        .single();

      if (platformConn) {
        await whatsappCloudService.initializeConnection(platformConn);
        const cloudConn = whatsappCloudService['connections'].get(platformConn.id);
        if (cloudConn) {
          connection = cloudConn as any;
          isCloudApi = true;
        }
      }
    }

    if (!connection || (connection as any).status !== 'connected') {
      throw new Error('La conexión WhatsApp no está conectada. Verifica el estado del dispositivo.');
    }

    await supabase
      .from('campaigns')
      .update({ status: 'sending', started_at: new Date().toISOString(), finished_at: null })
      .eq('id', campaignId);

    const state: SendState = { campaignId, paused: false, cancelled: false };
    this.activeSends.set(campaignId, state);

    // No esperar el envío completo: se procesa en segundo plano
    this.runSendLoop(state, campaign, connection, isCloudApi).catch((err) => {
      console.error('[Campaigns] Send loop error:', err);
      this.activeSends.delete(campaignId);
    });

    return { success: true, status: 'sending' };
  }

  async pauseSending(campaignId: string) {
    const state = this.activeSends.get(campaignId);
    if (!state) {
      await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId);
      return { success: true, status: 'paused' };
    }
    state.paused = true;
    await supabase
      .from('campaigns')
      .update({ status: 'paused' })
      .eq('id', campaignId);
    return { success: true, status: 'paused' };
  }

  async resumeSending(campaignId: string, organizationId: string) {
    const state = this.activeSends.get(campaignId);
    if (!state) {
      return this.startSending(campaignId, organizationId);
    }
    state.paused = false;
    await supabase
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);
    return { success: true, status: 'sending' };
  }

  private async runSendLoop(state: SendState, campaign: any, connection: any, isCloudApi = false) {
    const adapter = isCloudApi
      ? whatsappCloudService.createServiceAdapter(connection)
      : multiWhatsAppService.createWaServiceAdapter(connection);
    const delayMs = Math.max(Number(campaign.delay_ms) || 3000, 500);

    try {
      while (state.paused && !state.cancelled) {
        await sleep(500);
      }
      if (state.cancelled) return;

      const { data: contacts } = await supabase
        .from('campaign_contacts')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      // Batching de escrituras: se acumulan y se vacían cada BATCH_SIZE registros
      const BATCH_SIZE = 50;
      const updatesBatch: any[] = [];
      const flushUpdates = async () => {
        if (updatesBatch.length === 0) return;
        const rows = updatesBatch.splice(0, updatesBatch.length);
        const { error } = await supabase.from('campaign_contacts').upsert(rows, { onConflict: 'id' });
        if (error) console.error('[Campaigns] Error updating contacts:', error);
        await updateProgress(campaign.id);
      };

      for (const contact of contacts || []) {
        if (state.cancelled) return;

        while (state.paused && !state.cancelled) {
          await sleep(500);
        }
        if (state.cancelled) return;

        try {
          const text = renderTemplate(campaign.message_template, contact.variables);
          const phone = normalizePhone(contact.phone);

          // MM API for WhatsApp: envía template de marketing optimizado via /marketing_messages
          if (isCloudApi && campaign.use_marketing_api && campaign.meta_template_name) {
            if (!(adapter as any).sendMarketingMessage) {
              throw new Error('sendMarketingMessage no disponible en el adaptador');
            }
            const langCode = campaign.meta_template_language || 'es';
            let varNames = [...campaign.message_template.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
            if (varNames.length === 0 && contact.variables && typeof contact.variables === 'object') {
              varNames = Object.keys(contact.variables);
            }
            const components = varNames.length > 0
              ? [{ type: 'body', parameters: varNames.map(name => ({ type: 'text', parameter_name: name, text: String(contact.variables?.[name] ?? '') })) }]
              : [];
            console.log(`[Campaigns] MM API: template "${campaign.meta_template_name}", lang: ${langCode}`);
            await (adapter as any).sendMarketingMessage(phone, text, {
              templateName: campaign.meta_template_name,
              languageCode: langCode,
              components,
            });
          } else if (isCloudApi && campaign.meta_template_name) {
            const langCode = campaign.meta_template_language || 'es';
            if (!(adapter as any).sendTemplateMessage) {
              throw new Error('sendTemplateMessage no disponible en el adaptador');
            }
            let varNames = [...campaign.message_template.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
            if (varNames.length === 0 && contact.variables && typeof contact.variables === 'object') {
              varNames = Object.keys(contact.variables);
            }
            console.log(`[Campaigns] Template: "${campaign.meta_template_name}", lang: ${langCode}, vars: [${varNames.join(', ')}]`);
            if (varNames.length > 0) {
              const parameters = varNames.map(name => ({
                type: 'text',
                parameter_name: name,
                text: String(contact.variables?.[name] ?? ''),
              }));
              console.log(`[Campaigns] Sending with parameters:`, JSON.stringify(parameters));
              await (adapter as any).sendTemplateMessage(phone, campaign.meta_template_name, langCode, [
                { type: 'body', parameters },
              ]);
            } else {
              console.log(`[Campaigns] Sending template without parameters`);
              await (adapter as any).sendTemplateMessage(phone, campaign.meta_template_name, langCode);
            }
          } else {
            await adapter.sendTextMessage(phone, text);
          }
          updatesBatch.push({
            ...contact,
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null,
          });
        } catch (err: any) {
          const metaError = err?.response?.data?.error || err?.response?.data;
          const errorMsg = metaError
            ? `Meta API ${metaError.code || ''}: ${metaError.message || JSON.stringify(metaError)}`
            : String(err?.message || err);
          console.error(`[Campaigns] Send FAILED for ${contact.phone}: ${errorMsg}`);
          updatesBatch.push({
            ...contact,
            status: 'failed',
            error_message: errorMsg,
          });
        }

        // Vaciar el lote periódicamente para no escribir fila por fila
        if (updatesBatch.length >= BATCH_SIZE) {
          await flushUpdates();
        }

        // Log progress visually
        const processed = (contact as any)._index !== undefined ? (contact as any)._index + 1 : ((contacts || []).indexOf(contact) + 1);
        const total = campaign.total;
        const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
        const filled = Math.round(pct / 10);
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
        console.log(`\x1b[35m🚀 [Campaña]\x1b[0m ${campaign.name} | Progreso: \x1b[32m[${bar}]\x1b[0m ${pct}% (${processed}/${total})`);

        await sleep(delayMs);
      }

      await flushUpdates();
      await supabase
        .from('campaigns')
        .update({ status: 'completed', finished_at: new Date().toISOString() })
        .eq('id', campaign.id);
    } finally {
      this.activeSends.delete(campaign.id);
    }
  }
}

export const campaignsService = new CampaignsService();
