import { TextAnalyticsClient, AzureKeyCredential } from '@azure/ai-text-analytics';
import { secureConfig } from '../config/secure-config';
import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  positiveScore: number;
  negativeScore: number;
  neutralScore: number;
}

export interface KeyPhraseExtractionResult {
  keyPhrases: string[];
}

export interface EntityRecognitionResult {
  entities: {
    text: string;
    category: string;
    subcategory?: string;
    confidence: number;
  }[];
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
}

export interface PatientFeedbackAnalysis {
  sentiment: SentimentAnalysisResult;
  keyPhrases: KeyPhraseExtractionResult;
  entities: EntityRecognitionResult;
  language: LanguageDetectionResult;
  riskScore: number;
  recommendations: string[];
}

class AzureAIService {
  private client: TextAnalyticsClient | null = null;
  private initialized = false;
  private rateLimitTracker = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_PER_MINUTE = 20;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const config = secureConfig.getAppConfig();
      const { endpoint, apiKey } = config.integrations.azure;

      if (!endpoint || !apiKey) {
        logger.warn('Azure AI credentials not configured', 'azure-ai');
        return;
      }

      this.client = new TextAnalyticsClient(endpoint, new AzureKeyCredential(apiKey));
      this.initialized = true;
      logger.info('Azure AI Text Analytics initialized successfully', 'azure-ai');
    } catch (error) {
      logger.error('Failed to initialize Azure AI Text Analytics', 'azure-ai', { error });
      handleError(error as Error, 'azure-ai-init');
    }
  }

  private checkRateLimit(operation: string): boolean {
    const now = Date.now();
    const key = `${operation}-${Math.floor(now / 60000)}`; // Per minute bucket
    
    const current = this.rateLimitTracker.get(key) || { count: 0, resetTime: now + 60000 };
    
    if (current.count >= this.RATE_LIMIT_PER_MINUTE) {
      logger.warn(`Rate limit exceeded for ${operation}`, 'azure-ai');
      return false;
    }

    current.count++;
    this.rateLimitTracker.set(key, current);

    // Clean up old entries
    for (const [k, v] of this.rateLimitTracker.entries()) {
      if (v.resetTime < now) {
        this.rateLimitTracker.delete(k);
      }
    }

    return true;
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysisResult | null> {
    if (!this.initialized || !this.client) {
      logger.warn('Azure AI not initialized', 'azure-ai');
      return null;
    }

    if (!this.checkRateLimit('sentiment')) {
      throw new Error('Rate limit exceeded for sentiment analysis');
    }

    try {
      const results = await this.client.analyzeSentiment([text]);
      const result = results[0];

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        sentiment: result.sentiment,
        confidence: result.confidenceScores[result.sentiment],
        positiveScore: result.confidenceScores.positive,
        negativeScore: result.confidenceScores.negative,
        neutralScore: result.confidenceScores.neutral,
      };
    } catch (error) {
      logger.error('Sentiment analysis failed', 'azure-ai', { error, text: text.substring(0, 100) });
      handleError(error as Error, 'azure-ai-sentiment');
      return null;
    }
  }

  async extractKeyPhrases(text: string): Promise<KeyPhraseExtractionResult | null> {
    if (!this.initialized || !this.client) {
      logger.warn('Azure AI not initialized', 'azure-ai');
      return null;
    }

    if (!this.checkRateLimit('keyphrases')) {
      throw new Error('Rate limit exceeded for key phrase extraction');
    }

    try {
      const results = await this.client.extractKeyPhrases([text]);
      const result = results[0];

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        keyPhrases: result.keyPhrases,
      };
    } catch (error) {
      logger.error('Key phrase extraction failed', 'azure-ai', { error, text: text.substring(0, 100) });
      handleError(error as Error, 'azure-ai-keyphrases');
      return null;
    }
  }

  async recognizeEntities(text: string): Promise<EntityRecognitionResult | null> {
    if (!this.initialized || !this.client) {
      logger.warn('Azure AI not initialized', 'azure-ai');
      return null;
    }

    if (!this.checkRateLimit('entities')) {
      throw new Error('Rate limit exceeded for entity recognition');
    }

    try {
      const results = await this.client.recognizeEntities([text]);
      const result = results[0];

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        entities: result.entities.map(entity => ({
          text: entity.text,
          category: entity.category,
          subcategory: entity.subcategory,
          confidence: entity.confidenceScore,
        })),
      };
    } catch (error) {
      logger.error('Entity recognition failed', 'azure-ai', { error, text: text.substring(0, 100) });
      handleError(error as Error, 'azure-ai-entities');
      return null;
    }
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult | null> {
    if (!this.initialized || !this.client) {
      logger.warn('Azure AI not initialized', 'azure-ai');
      return null;
    }

    if (!this.checkRateLimit('language')) {
      throw new Error('Rate limit exceeded for language detection');
    }

    try {
      const results = await this.client.detectLanguage([text]);
      const result = results[0];

      if (result.error) {
        throw new Error(result.error.message);
      }

      const primaryLanguage = result.primaryLanguage;
      return {
        language: primaryLanguage.iso6391Name,
        confidence: primaryLanguage.confidenceScore,
      };
    } catch (error) {
      logger.error('Language detection failed', 'azure-ai', { error, text: text.substring(0, 100) });
      handleError(error as Error, 'azure-ai-language');
      return null;
    }
  }

  async analyzePatientFeedback(feedback: string): Promise<PatientFeedbackAnalysis | null> {
    if (!this.initialized || !this.client) {
      logger.warn('Azure AI not initialized', 'azure-ai');
      return null;
    }

    try {
      // Run all analyses in parallel
      const [sentiment, keyPhrases, entities, language] = await Promise.all([
        this.analyzeSentiment(feedback),
        this.extractKeyPhrases(feedback),
        this.recognizeEntities(feedback),
        this.detectLanguage(feedback),
      ]);

      if (!sentiment || !keyPhrases || !entities || !language) {
        throw new Error('One or more AI analyses failed');
      }

      // Calculate risk score based on sentiment and key phrases
      const riskScore = this.calculateRiskScore(sentiment, keyPhrases, entities);
      const recommendations = this.generateRecommendations(sentiment, keyPhrases, entities, riskScore);

      return {
        sentiment,
        keyPhrases,
        entities,
        language,
        riskScore,
        recommendations,
      };
    } catch (error) {
      logger.error('Patient feedback analysis failed', 'azure-ai', { error });
      handleError(error as Error, 'azure-ai-feedback');
      return null;
    }
  }

  private calculateRiskScore(
    sentiment: SentimentAnalysisResult,
    keyPhrases: KeyPhraseExtractionResult,
    entities: EntityRecognitionResult
  ): number {
    let score = 0;

    // Sentiment-based scoring
    if (sentiment.sentiment === 'negative') {
      score += sentiment.negativeScore * 40;
    } else if (sentiment.sentiment === 'mixed') {
      score += 20;
    }

    // Key phrase-based scoring
    const riskKeywords = ['pain', 'hurt', 'problem', 'issue', 'complaint', 'dissatisfied', 'unhappy'];
    const foundRiskKeywords = keyPhrases.keyPhrases.filter(phrase =>
      riskKeywords.some(keyword => phrase.toLowerCase().includes(keyword))
    );
    score += foundRiskKeywords.length * 10;

    // Entity-based scoring
    const medicalEntities = entities.entities.filter(entity =>
      entity.category === 'HealthcareEntity' || entity.category === 'PersonType'
    );
    if (medicalEntities.length > 0) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  private generateRecommendations(
    sentiment: SentimentAnalysisResult,
    keyPhrases: KeyPhraseExtractionResult,
    entities: EntityRecognitionResult,
    riskScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (riskScore > 70) {
      recommendations.push('High priority: Schedule immediate follow-up call');
      recommendations.push('Consider offering compensation or service recovery');
    } else if (riskScore > 40) {
      recommendations.push('Medium priority: Schedule follow-up within 24 hours');
      recommendations.push('Review treatment plan and address concerns');
    } else if (riskScore > 20) {
      recommendations.push('Low priority: Send follow-up message within 48 hours');
    }

    if (sentiment.sentiment === 'positive') {
      recommendations.push('Consider requesting online review or referral');
      recommendations.push('Add to satisfied patient list for testimonials');
    }

    // Check for specific medical concerns
    const medicalEntities = entities.entities.filter(entity =>
      entity.category === 'HealthcareEntity'
    );
    if (medicalEntities.length > 0) {
      recommendations.push('Medical concern detected: Review clinical notes');
    }

    return recommendations;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getStatus(): { initialized: boolean; rateLimitStatus: Record<string, number> } {
    const rateLimitStatus: Record<string, number> = {};
    const now = Date.now();

    for (const [key, value] of this.rateLimitTracker.entries()) {
      if (value.resetTime > now) {
        rateLimitStatus[key] = this.RATE_LIMIT_PER_MINUTE - value.count;
      }
    }

    return {
      initialized: this.initialized,
      rateLimitStatus,
    };
  }
}

// Export singleton instance
export const azureAIService = new AzureAIService();

// Export convenience functions
export const analyzeSentiment = (text: string) => azureAIService.analyzeSentiment(text);
export const extractKeyPhrases = (text: string) => azureAIService.extractKeyPhrases(text);
export const recognizeEntities = (text: string) => azureAIService.recognizeEntities(text);
export const detectLanguage = (text: string) => azureAIService.detectLanguage(text);
export const analyzePatientFeedback = (feedback: string) => azureAIService.analyzePatientFeedback(feedback);
