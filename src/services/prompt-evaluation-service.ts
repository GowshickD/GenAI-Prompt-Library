import * as vscode from 'vscode';
import { OpenAI } from 'openai';
import { azureOpenAIConfig, AzureOpenAIConfig } from '../config/azure-openai-config';

/**
 * Interface for prompt evaluation score
 */
export interface PromptEvaluationScore {
    overallScore: number; // 0-100 score
    clarity: number; // 0-10 score
    specificity: number; // 0-10 score
    context: number; // 0-10 score
    efficiency: number; // 0-10 score
    relevance: number; // 0-10 score
    suggestions: string[];
    timestamp: string;
}

/**
 * Service to evaluate prompts using Azure OpenAI
 */
export class PromptEvaluationService {
    private config = azureOpenAIConfig;
    private enabled: boolean = true;

    constructor(private context: vscode.ExtensionContext) {
        // Get configuration from VS Code settings
        this.updateConfigFromSettings();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('promptLibrary.azureOpenAI')) {
                this.updateConfigFromSettings();
            }
        });
    }

    /**
     * Update configuration from VS Code settings
     */
    private updateConfigFromSettings(): void {
        const config = vscode.workspace.getConfiguration('promptLibrary.azureOpenAI');
        this.enabled = config.get<boolean>('enabled') ?? true;
        
        if (this.enabled) {
            this.config = {
                endpoint: config.get<string>('endpoint') || this.config.endpoint,
                key: config.get<string>('key') || this.config.key,
                deploymentName: config.get<string>('deploymentName') || this.config.deploymentName,
                apiVersion: config.get<string>('apiVersion') || this.config.apiVersion
            };
        }
    }

    /**
     * Evaluate a prompt using Azure OpenAI
     * @param prompt The prompt text to evaluate
     * @returns Evaluation score or undefined if evaluation is disabled
     */
    public async evaluatePrompt(prompt: string): Promise<PromptEvaluationScore | undefined> {
        if (!this.enabled || !prompt || prompt.trim().length === 0) {
            console.log('Evaluation skipped - disabled or empty prompt');
            return undefined;
        }

        try {
            console.log('Starting prompt evaluation for:', prompt.substring(0, 50) + '...');
            
            // The evaluation system prompt
            const systemPrompt = 'You are prompt engineer and an expert in evaluating AI prompts for software development. Your task is to evaluate the given prompt and assess its effectiveness in guiding an AI to produce high-quality software development output and analyze the given prompt and score it based on clarity, specificity, context, efficiency, and relevance. Provide an overall score as well as SPECIFIC, CONCISE suggestions for improvement. Format your response with clear headings and bullet points for suggestions. Always include a "Suggestions for Improvement:" section with 2-3 short, actionable suggestions (maximum 15 words each). Keep each suggestion brief and focused on a single improvement point.';
            
            // The prompt to evaluate wrapped in a user message
            const userPrompt = `Please evaluate the following AI prompt and provide scores (0-10) for clarity, specificity, context, efficiency, and relevance, along with an overall score (0-100) and specific suggestions for improvement:\n\n"${prompt}"`;
            
            // Initialize the OpenAI client with Azure configuration
            const openai = new OpenAI({
                apiKey: '',
                baseURL: '',
            });
            
            console.log('Sending evaluation request to Azure OpenAI...');
            
            // Make the request to Azure OpenAI using the OpenAI client
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });
            
            // Parse the response
            const content = response.choices[0]?.message?.content;
            
            if (!content) {
                throw new Error('No content in response');
            }
            
            // Log the raw response for debugging
            console.log('Raw evaluation response:', content);
            
            // Create default evaluation in case parsing fails
            const defaultEval: PromptEvaluationScore = {
                overallScore: 65,
                clarity: 6,
                specificity: 7,
                context: 6,
                efficiency: 7,
                relevance: 7,
                suggestions: ['Make the prompt more specific.', 'Add more context to improve results.'],
                timestamp: new Date().toISOString()
            };
            
            // Parse the evaluation response
            const parsedEval = this.parseEvaluationResponse(content);
            console.log('Parsed evaluation result:', JSON.stringify(parsedEval));
            
            return parsedEval;
        } catch (error) {
            console.error('Error evaluating prompt:', error);
            // Return a default score for error cases
            return {
                overallScore: 50,
                clarity: 5,
                specificity: 5,
                context: 5,
                efficiency: 5,
                relevance: 5,
                suggestions: ['Error evaluating prompt. Please try again later.'],
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Parse the evaluation response from Azure OpenAI
     * @param content The content of the response
     * @returns Parsed evaluation score
     */
    private parseEvaluationResponse(content: string): PromptEvaluationScore {
        try {
            // Look for scores in the response using regex patterns
            const overallScoreMatch = content.match(/overall\s+score\s*(?::|is|of|\(0-100\))\s*(\d+)/i);
            const clarityMatch = content.match(/clarity\s*(?::|is|of|\(0-10\))\s*(\d+)/i);
            const specificityMatch = content.match(/specificity\s*(?::|is|of|\(0-10\))\s*(\d+)/i);
            const contextMatch = content.match(/context\s*(?::|is|of|\(0-10\))\s*(\d+)/i);
            const efficiencyMatch = content.match(/efficiency\s*(?::|is|of|\(0-10\))\s*(\d+)/i);
            const relevanceMatch = content.match(/relevance\s*(?::|is|of|\(0-10\))\s*(\d+)/i);
            
            // Extract suggestions using multiple approaches
            let suggestions: string[] = [];
            
            // Approach 1: Look for a 'suggestions' section
            const suggestionsSection = content.match(/(?:suggestions?|improvements?|recommendations?)(?:\s*for\s*improvement)?:?\s*([\s\S]+?)(?:$|overall\s+score|clarity\s*:|specificity\s*:|context\s*:|efficiency\s*:|relevance\s*:)/i);
            
            if (suggestionsSection && suggestionsSection[1]) {
                // Try to find bullet points or numbered items
                const bulletItems = suggestionsSection[1].match(/(?:\r?\n|^)\s*[-*•]\s*([^\r\n]+)/g);
                const numberedItems = suggestionsSection[1].match(/(?:\r?\n|^)\s*\d+\.?\s*([^\r\n]+)/g);
                
                if (bulletItems || numberedItems) {
                    // Combine and clean up items
                    const items = [...(bulletItems || []), ...(numberedItems || [])];
                    suggestions = items.map(item => {
                        return item.replace(/^\s*[-*•\d\.]+\s*/, '').trim();
                    }).filter(item => item.length > 0);
                } else {
                    // If no bullet points, try to split by lines
                    suggestions = suggestionsSection[1]
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 5 && !line.match(/^\s*(suggestions?|improvements?|recommendations?)/i));
                }
            }
            
            // Approach 2: Try to find bullet points or numbered items in the entire text
            if (suggestions.length === 0) {
                const allBulletItems = content.match(/(?:\r?\n|^)\s*[-*•]\s*([^\r\n]+)/g);
                const allNumberedItems = content.match(/(?:\r?\n|^)\s*\d+\.?\s*([^\r\n]+)/g);
                
                if (allBulletItems || allNumberedItems) {
                    const items = [...(allBulletItems || []), ...(allNumberedItems || [])];
                    suggestions = items.map(item => {
                        return item.replace(/^\s*[-*•\d\.]+\s*/, '').trim();
                    }).filter(item => item.length > 0);
                }
            }
            
            // Approach 3: Extract sentences that might be suggestions
            if (suggestions.length === 0) {
                suggestions = content
                    .split(/[.!?]\s+/)
                    .filter(s => {
                        const trimmed = s.trim();
                        return trimmed.length > 10 && 
                               trimmed.length < 150 && 
                               !trimmed.match(/\b(score|clarity|specificity|context|efficiency|relevance)\b/i) &&
                               (trimmed.match(/\b(should|could|may|might|consider|try|add|improve|enhance|revise)\b/i));
                    })
                    .map(s => s.trim() + '.')
                    .slice(0, 3);
            }
            
            // Log extracted suggestions
            console.log('Extracted suggestions (before processing):', suggestions);
            
            // Process suggestions to make them concise (max 100 words)
            suggestions = this.processSuggestions(suggestions);
            
            console.log('Processed suggestions:', suggestions);
            
            return {
                overallScore: overallScoreMatch ? parseInt(overallScoreMatch[1], 10) : 50,
                clarity: clarityMatch ? parseInt(clarityMatch[1], 10) : 5,
                specificity: specificityMatch ? parseInt(specificityMatch[1], 10) : 5,
                context: contextMatch ? parseInt(contextMatch[1], 10) : 5,
                efficiency: efficiencyMatch ? parseInt(efficiencyMatch[1], 10) : 5,
                relevance: relevanceMatch ? parseInt(relevanceMatch[1], 10) : 5,
                suggestions: suggestions.length > 0 ? suggestions : ['No specific suggestions provided.'],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error parsing evaluation response:', error);
            return {
                overallScore: 50,
                clarity: 5,
                specificity: 5,
                context: 5,
                efficiency: 5,
                relevance: 5,
                suggestions: ['Error parsing evaluation response.'],
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get score tier based on overall score
     * @param score The overall score
     * @returns The score tier (excellent, good, average, poor)
     */
    public getScoreTier(score: number): 'excellent' | 'good' | 'average' | 'poor' {
        if (score >= 85) {
            return 'excellent';
        } else if (score >= 70) {
            return 'good';
        } else if (score >= 50) {
            return 'average';
        } else {
            return 'poor';
        }
    }

    /**
     * Get the icon for a score tier
     * @param tier The score tier
     * @returns The icon for the tier
     */
    public getScoreTierIcon(tier: 'excellent' | 'good' | 'average' | 'poor'): string {
        switch (tier) {
            case 'excellent':
                return '$(star-full)';
            case 'good':
                return '$(check)';
            case 'average':
                return '$(info)';
            case 'poor':
                return '$(warning)';
        }
    }

    /**
     * Get the color for a score tier
     * @param tier The score tier
     * @returns The ThemeColor for the tier
     */
    public getScoreTierColor(tier: 'excellent' | 'good' | 'average' | 'poor'): vscode.ThemeColor {
        switch (tier) {
            case 'excellent':
                return new vscode.ThemeColor('charts.yellow');
            case 'good':
                return new vscode.ThemeColor('charts.green');
            case 'average':
                return new vscode.ThemeColor('charts.blue');
            case 'poor':
                return new vscode.ThemeColor('charts.red');
        }
    }
    
    /**
     * Process suggestions to make them concise and clear
     * @param suggestions Array of extracted suggestions
     * @returns Processed suggestions that are concise (max 100 words each)
     */
    private processSuggestions(suggestions: string[]): string[] {
        // Ensure we have at most 2 suggestions for conciseness
        const limitedSuggestions = suggestions.slice(0, 2);
        
        return limitedSuggestions.map(suggestion => {
            // Remove any prefix phrases like "You should" or "I recommend"
            let processed = suggestion.replace(/^\s*(?:you\s+(?:should|could|might)|i\s+(?:recommend|suggest)|consider|try\s+to)\s+/i, '');
            
            // Capitalize first letter if it's not already
            processed = processed.charAt(0).toUpperCase() + processed.slice(1);
            
            // Ensure it ends with proper punctuation
            if (!processed.endsWith('.') && !processed.endsWith('!') && !processed.endsWith('?')) {
                processed += '.';
            }
            
            // Truncate to roughly 80 characters (about 12-15 words) for conciseness
            if (processed.length > 80) {
                const truncated = processed.substring(0, 77);
                // Ensure we don't cut in the middle of a word
                const lastSpaceIndex = truncated.lastIndexOf(' ');
                if (lastSpaceIndex > 60) {
                    return truncated.substring(0, lastSpaceIndex) + '...';
                }
                return truncated + '...';
            }
            
            return processed;
        });
    }
}
