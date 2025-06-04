import { format } from 'date-fns';
import { personalizeMessage } from './messaging';
import { sendSMS, sendWhatsApp } from './twilio';

export interface Campaign {
  id: string;
  name: string;
  type: 'recall' | 'reactivation' | 'promotional';
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  startDate: Date;
  endDate: Date;
  template: {
    sms?: {
      en: string;
      fr: string;
      ar: string;
    };
    whatsapp?: {
      en: string;
      fr: string;
      ar: string;
    };
    email?: {
      en: string;
      fr: string;
      ar: string;
    };
  };
  targetPatients: string[];
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    responded: number;
    converted: number;
  };
}

export const createCampaign = (data: Partial<Campaign>): Campaign => {
  return {
    id: crypto.randomUUID(),
    name: '',
    type: 'recall',
    status: 'draft',
    startDate: new Date(),
    endDate: new Date(),
    template: {},
    targetPatients: [],
    metrics: {
      sent: 0,
      delivered: 0,
      opened: 0,
      responded: 0,
      converted: 0
    },
    ...data
  };
};

export const executeCampaign = async (
  campaign: Campaign,
  patients: any[],
  language: 'en' | 'fr' | 'ar' = 'fr'
) => {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const patientId of campaign.targetPatients) {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) continue;

    try {
      if (campaign.template.whatsapp) {
        const message = await personalizeMessage(
          { content: campaign.template.whatsapp, type: campaign.type },
          patient,
          language
        );
        await sendWhatsApp(patient.phone, message);
      } else if (campaign.template.sms) {
        const message = await personalizeMessage(
          { content: campaign.template.sms, type: campaign.type },
          patient,
          language
        );
        await sendSMS(patient.phone, message);
      }

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to send message to ${patient.name}: ${error}`);
    }
  }

  return results;
};

export const analyzeCampaignPerformance = (campaign: Campaign) => {
  const deliveryRate = (campaign.metrics.delivered / campaign.metrics.sent) * 100;
  const openRate = (campaign.metrics.opened / campaign.metrics.delivered) * 100;
  const responseRate = (campaign.metrics.responded / campaign.metrics.delivered) * 100;
  const conversionRate = (campaign.metrics.converted / campaign.metrics.delivered) * 100;

  return {
    deliveryRate,
    openRate,
    responseRate,
    conversionRate,
    roi: calculateCampaignROI(campaign)
  };
};

const calculateCampaignROI = (campaign: Campaign) => {
  // Implement ROI calculation based on campaign type and results
  // This is a placeholder implementation
  const costPerMessage = 0.1; // MAD
  const totalCost = campaign.metrics.sent * costPerMessage;
  const averageRevenue = 500; // MAD per conversion
  const totalRevenue = campaign.metrics.converted * averageRevenue;

  return ((totalRevenue - totalCost) / totalCost) * 100;
};