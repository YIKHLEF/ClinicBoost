import { supabase } from './supabase';
import { sendSMS, sendWhatsApp, validatePhoneNumber, formatPhoneNumber } from '../utils/twilio';
import { handleError, logError } from './error-handling';
import type { Database } from './database.types';

type Campaign = Database['public']['Tables']['campaigns']['Row'];
type Patient = Database['public']['Tables']['patients']['Row'];
type CampaignMessage = Database['public']['Tables']['campaign_messages']['Row'];

export interface CampaignTarget {
  ageRange?: { min?: number; max?: number };
  gender?: 'male' | 'female' | 'other';
  riskLevel?: 'low' | 'medium' | 'high';
  lastVisit?: { operator: 'before' | 'after'; date: string };
  insuranceProvider?: string;
  city?: string;
  status?: 'active' | 'inactive' | 'archived';
}

export interface CampaignExecution {
  campaignId: string;
  totalTargets: number;
  successfulSends: number;
  failedSends: number;
  errors: Array<{ patientId: string; error: string }>;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}

export class CampaignAutomationEngine {
  private executionStatus: Map<string, CampaignExecution> = new Map();

  /**
   * Execute a campaign by sending messages to targeted patients
   */
  async executeCampaign(campaignId: string): Promise<CampaignExecution> {
    try {
      // Get campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        throw new Error(`Campaign not found: ${campaignError?.message}`);
      }

      // Initialize execution tracking
      const execution: CampaignExecution = {
        campaignId,
        totalTargets: 0,
        successfulSends: 0,
        failedSends: 0,
        errors: [],
        startTime: new Date(),
        status: 'running',
      };

      this.executionStatus.set(campaignId, execution);

      // Update campaign status to 'sent'
      await supabase
        .from('campaigns')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      // Get targeted patients
      const targetedPatients = await this.getTargetedPatients(campaign.target_audience as CampaignTarget);
      execution.totalTargets = targetedPatients.length;

      console.log(`Starting campaign ${campaignId} for ${targetedPatients.length} patients`);

      // Process patients in batches to avoid overwhelming the system
      const batchSize = 10;
      const batches = this.chunkArray(targetedPatients, batchSize);

      for (const batch of batches) {
        await Promise.all(
          batch.map(patient => this.sendCampaignMessage(campaign, patient, execution))
        );

        // Small delay between batches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Finalize execution
      execution.endTime = new Date();
      execution.status = execution.failedSends === 0 ? 'completed' : 'completed';

      // Update campaign statistics
      await supabase
        .from('campaigns')
        .update({
          total_recipients: execution.totalTargets,
          total_sent: execution.successfulSends,
          total_delivered: execution.successfulSends, // Will be updated by webhooks
        })
        .eq('id', campaignId);

      console.log(`Campaign ${campaignId} completed: ${execution.successfulSends}/${execution.totalTargets} sent`);

      return execution;
    } catch (error: any) {
      const execution = this.executionStatus.get(campaignId);
      if (execution) {
        execution.status = 'failed';
        execution.endTime = new Date();
      }

      logError(handleError(error), `Campaign execution failed: ${campaignId}`);
      throw error;
    }
  }

  /**
   * Get patients based on campaign targeting criteria
   */
  private async getTargetedPatients(targetAudience: CampaignTarget): Promise<Patient[]> {
    let query = supabase
      .from('patients')
      .select('*')
      .eq('status', targetAudience.status || 'active');

    // Apply age range filter
    if (targetAudience.ageRange) {
      const currentDate = new Date();
      
      if (targetAudience.ageRange.min) {
        const maxBirthDate = new Date(currentDate.getFullYear() - targetAudience.ageRange.min, currentDate.getMonth(), currentDate.getDate());
        query = query.lte('date_of_birth', maxBirthDate.toISOString().split('T')[0]);
      }
      
      if (targetAudience.ageRange.max) {
        const minBirthDate = new Date(currentDate.getFullYear() - targetAudience.ageRange.max - 1, currentDate.getMonth(), currentDate.getDate());
        query = query.gte('date_of_birth', minBirthDate.toISOString().split('T')[0]);
      }
    }

    // Apply gender filter
    if (targetAudience.gender) {
      query = query.eq('gender', targetAudience.gender);
    }

    // Apply risk level filter
    if (targetAudience.riskLevel) {
      query = query.eq('risk_level', targetAudience.riskLevel);
    }

    // Apply city filter
    if (targetAudience.city) {
      query = query.ilike('city', `%${targetAudience.city}%`);
    }

    // Apply insurance provider filter
    if (targetAudience.insuranceProvider) {
      query = query.ilike('insurance_provider', `%${targetAudience.insuranceProvider}%`);
    }

    const { data: patients, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch targeted patients: ${error.message}`);
    }

    // Apply last visit filter (requires joining with appointments)
    if (targetAudience.lastVisit && patients) {
      const filteredPatients = await this.filterByLastVisit(patients, targetAudience.lastVisit);
      return filteredPatients;
    }

    return patients || [];
  }

  /**
   * Filter patients by last visit date
   */
  private async filterByLastVisit(
    patients: Patient[], 
    lastVisitFilter: { operator: 'before' | 'after'; date: string }
  ): Promise<Patient[]> {
    const patientIds = patients.map(p => p.id);
    
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('patient_id, start_time')
      .in('patient_id', patientIds)
      .eq('status', 'completed')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching appointments for filtering:', error);
      return patients; // Return all patients if we can't filter
    }

    // Get last appointment for each patient
    const lastAppointments = new Map<string, string>();
    appointments?.forEach(apt => {
      if (!lastAppointments.has(apt.patient_id)) {
        lastAppointments.set(apt.patient_id, apt.start_time);
      }
    });

    const filterDate = new Date(lastVisitFilter.date);

    return patients.filter(patient => {
      const lastVisit = lastAppointments.get(patient.id);
      
      if (!lastVisit) {
        // No appointments found - include if looking for patients who haven't visited recently
        return lastVisitFilter.operator === 'before';
      }

      const lastVisitDate = new Date(lastVisit);
      
      if (lastVisitFilter.operator === 'before') {
        return lastVisitDate < filterDate;
      } else {
        return lastVisitDate > filterDate;
      }
    });
  }

  /**
   * Send campaign message to a specific patient
   */
  private async sendCampaignMessage(
    campaign: Campaign,
    patient: Patient,
    execution: CampaignExecution
  ): Promise<void> {
    try {
      // Validate phone number
      if (!patient.phone || !validatePhoneNumber(patient.phone)) {
        throw new Error('Invalid phone number');
      }

      // Personalize message template
      const personalizedMessage = this.personalizeMessage(campaign.message_template, patient);

      // Format phone number
      const formattedPhone = formatPhoneNumber(patient.phone);

      // Create campaign message record
      const { data: messageRecord, error: messageError } = await supabase
        .from('campaign_messages')
        .insert({
          campaign_id: campaign.id,
          patient_id: patient.id,
          message_content: personalizedMessage,
          phone_number: formattedPhone,
          status: 'pending',
        })
        .select()
        .single();

      if (messageError || !messageRecord) {
        throw new Error(`Failed to create message record: ${messageError?.message}`);
      }

      // Send message via SMS (default) or WhatsApp
      const messageType = this.determineMessageType(campaign);
      let sendResult;

      if (messageType === 'whatsapp') {
        sendResult = await sendWhatsApp({
          to: formattedPhone,
          body: personalizedMessage,
        });
      } else {
        sendResult = await sendSMS({
          to: formattedPhone,
          body: personalizedMessage,
        });
      }

      if (sendResult.success) {
        // Update message record with success
        await supabase
          .from('campaign_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            twilio_message_sid: sendResult.messageId,
          })
          .eq('id', messageRecord.id);

        execution.successfulSends++;
      } else {
        throw new Error(sendResult.error || 'Message sending failed');
      }
    } catch (error: any) {
      execution.failedSends++;
      execution.errors.push({
        patientId: patient.id,
        error: error.message,
      });

      // Update message record with error
      await supabase
        .from('campaign_messages')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('campaign_id', campaign.id)
        .eq('patient_id', patient.id);

      console.error(`Failed to send message to patient ${patient.id}:`, error.message);
    }
  }

  /**
   * Personalize message template with patient data
   */
  private personalizeMessage(template: string, patient: Patient): string {
    return template
      .replace(/\{firstName\}/g, patient.first_name)
      .replace(/\{lastName\}/g, patient.last_name)
      .replace(/\{fullName\}/g, `${patient.first_name} ${patient.last_name}`)
      .replace(/\{phone\}/g, patient.phone || '')
      .replace(/\{email\}/g, patient.email || '')
      .replace(/\{city\}/g, patient.city || '')
      .replace(/\{insuranceProvider\}/g, patient.insurance_provider || '');
  }

  /**
   * Determine message type based on campaign settings
   */
  private determineMessageType(campaign: Campaign): 'sms' | 'whatsapp' {
    // Check if campaign name or description indicates WhatsApp
    const campaignText = `${campaign.name} ${campaign.description || ''}`.toLowerCase();
    
    if (campaignText.includes('whatsapp') || campaignText.includes('wa')) {
      return 'whatsapp';
    }
    
    return 'sms'; // Default to SMS
  }

  /**
   * Utility function to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get execution status for a campaign
   */
  getExecutionStatus(campaignId: string): CampaignExecution | null {
    return this.executionStatus.get(campaignId) || null;
  }

  /**
   * Cancel a running campaign
   */
  async cancelCampaign(campaignId: string): Promise<void> {
    const execution = this.executionStatus.get(campaignId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = new Date();

      // Update campaign status
      await supabase
        .from('campaigns')
        .update({ status: 'completed' })
        .eq('id', campaignId);
    }
  }

  /**
   * Schedule a campaign for future execution
   */
  async scheduleCampaign(campaignId: string, scheduledTime: Date): Promise<void> {
    await supabase
      .from('campaigns')
      .update({
        status: 'scheduled',
        scheduled_at: scheduledTime.toISOString(),
      })
      .eq('id', campaignId);

    // In a real implementation, you would set up a job scheduler here
    console.log(`Campaign ${campaignId} scheduled for ${scheduledTime.toISOString()}`);
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string) {
    const { data: messages, error } = await supabase
      .from('campaign_messages')
      .select('status, sent_at, delivered_at, opened_at, clicked_at')
      .eq('campaign_id', campaignId);

    if (error) {
      throw new Error(`Failed to fetch campaign analytics: ${error.message}`);
    }

    const analytics = {
      totalSent: messages?.filter(m => m.status === 'sent').length || 0,
      totalDelivered: messages?.filter(m => m.delivered_at).length || 0,
      totalOpened: messages?.filter(m => m.opened_at).length || 0,
      totalClicked: messages?.filter(m => m.clicked_at).length || 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
    };

    if (analytics.totalSent > 0) {
      analytics.deliveryRate = (analytics.totalDelivered / analytics.totalSent) * 100;
      analytics.openRate = (analytics.totalOpened / analytics.totalSent) * 100;
      analytics.clickRate = (analytics.totalClicked / analytics.totalSent) * 100;
    }

    return analytics;
  }
}

// Export singleton instance
export const campaignEngine = new CampaignAutomationEngine();
