import { AIProvider, AIProviderStatus, TriageInput, TriageResult } from './types.ts';

/**
 * GeminiProvider (Cloud Option)
 * Optional provider when internet connectivity and API key are available.
 * Never a mandatory dependency in SentinelGrid.
 */
export class GeminiProvider implements AIProvider {
  public id = 'gemini';
  public name = 'Google Gemini Cloud Provider';
  public version = '1.0.0';

  public async isAvailable(): Promise<boolean> {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  }

  public async getStatus(): Promise<AIProviderStatus> {
    const hasKey = await this.isAvailable();
    return {
      providerId: this.id,
      displayName: this.name,
      providerVersion: this.version,
      isConfigured: hasKey,
      statusMessage: hasKey
        ? 'API Key detected (Cloud connected)'
        : 'Not configured (Optional cloud provider)',
      requiresInternet: true,
      localCompatible: false,
      isOffline: false,
      modelIdentifier: 'gemini-2.5-flash'
    };
  }

  public async triageIncident(_input: TriageInput): Promise<TriageResult> {
    throw new Error('GeminiProvider is disabled in Phase 3 offline-first mode.');
  }
}
