import { AIProvider, AIProviderStatus, TriageInput, TriageResult } from './types.ts';

/**
 * GeminiProvider (Cloud Option)
 * Optional provider when internet connectivity and API key are available.
 * Never a mandatory dependency in SentinelGrid.
 */
export class GeminiProvider implements AIProvider {
  public id = 'gemini';
  public name = 'Google Gemini Cloud Provider';

  public async isAvailable(): Promise<boolean> {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  }

  public async getStatus(): Promise<AIProviderStatus> {
    const hasKey = await this.isAvailable();
    return {
      providerId: this.id,
      displayName: this.name,
      isConfigured: hasKey,
      statusMessage: hasKey
        ? 'API Key detected (Cloud connected)'
        : 'Not configured (Phase 1 placeholder — optional cloud provider)',
      requiresInternet: true,
      localCompatible: false,
      modelIdentifier: 'gemini-2.5-flash'
    };
  }

  public async triageIncident(_input: TriageInput): Promise<TriageResult> {
    throw new Error('GeminiProvider triage is planned for Phase 3. Core Phase 1 is strictly offline foundation.');
  }
}
