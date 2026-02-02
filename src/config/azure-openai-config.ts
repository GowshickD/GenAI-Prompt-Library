/**
 * Azure OpenAI Configuration for Prompt Evaluation
 */

export interface AzureOpenAIConfig {
    endpoint: string;
    key: string;
    deploymentName: string;
    apiVersion: string;
}

export const azureOpenAIConfig: AzureOpenAIConfig = {
    endpoint: 'https://promptai.openai.azure.com/',
    key: 'O7G6Gbr7TmarJUljb8UOLviK7c55uFvNVZsnwCSYLwg3Uka5yErNJQQJ99CAACYeBjFXJ3w3AAABACOGB3cB',
    deploymentName: 'gpt-4o-mini', // Default deployment name, can be updated via settings
    apiVersion: '2024-04-01-preview' // Default API version, can be updated via settings
};

// Add configuration to package.json to allow users to customize these values
export const defaultConfig = azureOpenAIConfig;
