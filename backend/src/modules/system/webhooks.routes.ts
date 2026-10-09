import { Router, Response } from 'express';
import { multiPlatformService } from '../integrations/platform/multiPlatformService';

const router = Router();

// WhatsApp webhook is handled by /api/webhook in api.ts (webhookController.ts)
// This file only handles non-WhatsApp platform webhooks

// Telegram webhook
router.get('/telegram', async (req, res: Response) => {
  await multiPlatformService.verifyWebhook('telegram', req, res);
});

router.post('/telegram', async (req, res: Response) => {
  await multiPlatformService.handleWebhook('telegram', req, res);
});

// Instagram webhook
router.get('/instagram', async (req, res: Response) => {
  await multiPlatformService.verifyWebhook('instagram', req, res);
});

router.post('/instagram', async (req, res: Response) => {
  await multiPlatformService.handleWebhook('instagram', req, res);
});

// TikTok webhook
router.get('/tiktok', async (req, res: Response) => {
  await multiPlatformService.verifyWebhook('tiktok', req, res);
});

router.post('/tiktok', async (req, res: Response) => {
  await multiPlatformService.handleWebhook('tiktok', req, res);
});

// Facebook Messenger webhook
router.get('/facebook_messenger', async (req, res: Response) => {
  await multiPlatformService.verifyWebhook('facebook_messenger', req, res);
});

router.post('/facebook_messenger', async (req, res: Response) => {
  await multiPlatformService.handleWebhook('facebook_messenger', req, res);
});

// Mercado Libre webhook
router.get('/mercadolibre', async (req, res: Response) => {
  await multiPlatformService.verifyWebhook('mercadolibre', req, res);
});

router.post('/mercadolibre', async (req, res: Response) => {
  await multiPlatformService.handleWebhook('mercadolibre', req, res);
});

export default router;
