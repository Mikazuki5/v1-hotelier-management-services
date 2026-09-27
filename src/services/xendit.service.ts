import { Xendit } from 'xendit-node';

const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY || 'xnd_development_dummy_key_replace_me',
});

export class XenditService {
  async createInvoice(params: {
    externalId: string;
    amount: number;
    description: string;
    customerEmail?: string;
  }) {
    try {
      const response = await xenditClient.Invoice.createInvoice({
        data: {
          externalId: params.externalId,
          amount: params.amount,
          description: params.description,
          customer: params.customerEmail ? {
            email: params.customerEmail,
          } : undefined,
          currency: 'IDR',
        }
      });
      return response;
    } catch (error: any) {
      throw new Error(`Failed to create Xendit Invoice: ${error.message}`);
    }
  }

  verifyWebhookToken(token: string): boolean {
    const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN || 'dummy_webhook_token_replace_me';
    return token === webhookToken;
  }
}

export const xenditService = new XenditService();
