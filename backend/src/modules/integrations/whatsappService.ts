import axios from 'axios';

class WhatsAppService {
  private phoneNumberId: string;
  private accessToken: string;
  private apiUrl: string;

  /**
   * Initialize the service with the organization's WhatsApp configuration
   * @param {Object} config { phoneNumberId, accessToken }
   */
  constructor(config: { phoneNumberId?: string; accessToken?: string } = {}) {
    this.phoneNumberId = config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.apiUrl = `https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Send a standard text message
   * @param {string} to - The recipient's phone number
   * @param {string} body - The text message content
   */
  async sendTextMessage(to: string, body: string) {
    try {
      const response = await axios({
        method: 'POST',
        url: this.apiUrl,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: body
          }
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  /**
   * Send an interactive button message
   * @param {string} to - Recipient phone number
   * @param {string} bodyText - Main text body
   * @param {Array} buttons - Array of objects { id, title } (Max 3)
   */
  async sendButtonMessage(to: string, bodyText: string, buttons: any[]) {
    const actionButtons = buttons.map(btn => ({
      type: 'reply',
      reply: {
        id: btn.id,
        title: btn.title
      }
    }));

    try {
      const response = await axios({
        method: 'POST',
        url: this.apiUrl,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
              buttons: actionButtons
            }
          }
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error sending button message:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  /**
   * Send a media message (image, video, document)
   * @param {string} to - Recipient phone number
   * @param {string} url - Media URL
   */
  async sendMediaMessage(to: string, url: string, options?: { caption?: string, type?: string, fileName?: string }) {
    // Determine type by extension if not provided
    const ext = url.split('.').pop()?.toLowerCase() || '';
    let type = options?.type || 'image';
    if (!options?.type) {
      if (['mp4', 'mkv', 'avi'].includes(ext)) type = 'video';
      else if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) type = 'document';
      else if (['mp3', 'ogg', 'wav'].includes(ext)) type = 'audio';
    }

    try {
      const response = await axios({
        method: 'POST',
        url: this.apiUrl,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          to: to,
          type: type,
          [type]: {
            link: url,
            caption: options?.caption,
            filename: options?.fileName
          }
        }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error sending ${type} message:`, error.response ? error.response.data : error.message);
      throw error;
    }
  }
}

export default WhatsAppService;
