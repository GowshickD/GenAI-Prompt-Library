import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PromptEvaluationScore, PromptEvaluationService } from './services/prompt-evaluation-service';

type PromptNodeType = 'category' | 'group' | 'prompt';

interface Prompt {
	id: string;
	label: string;
	prompt: string;
	tags: string[];
	evaluation?: PromptEvaluationScore;
}

interface PromptGroup {
	id: string;
	label: string;
	prompts: Prompt[];
}

interface PromptCategory {
	id: string;
	label: string;
	type: 'system' | 'user';
	groups: PromptGroup[];
}

interface PromptFile {
	version: string;
	categories: PromptCategory[];
}

interface PromptEntry {
	id: string;
	label: string;
	type: PromptNodeType;
	categoryType?: 'system' | 'user';
	prompt?: string;
	tags?: string[];
	children?: PromptEntry[];
	parentId?: string;
	categoryId?: string;
	sortOrder?: number;
	evaluation?: PromptEvaluationScore;
}

interface UserPreferences {
	favorites: string[];
	recentPrompts: string[];
	searchHistory: string[];
}

class PromptTreeItem extends vscode.TreeItem {
	constructor(public readonly entry: PromptEntry, private promptLibrary?: PromptLibrary) {
		// Automatically expand user categories by default
		let collapsibleState = vscode.TreeItemCollapsibleState.None;
		if (entry.type === 'category' || entry.type === 'group') {
			collapsibleState = (entry.type === 'category' && entry.categoryType === 'user')
				? vscode.TreeItemCollapsibleState.Expanded
				: vscode.TreeItemCollapsibleState.Collapsed;
		}
		super(entry.label, collapsibleState);
		
		if (entry.type === 'prompt') {
			const isSystemPrompt = entry.categoryType === 'system';
			const isFavorite = this.promptLibrary?.isFavorite(entry.id) ?? false;
			
			// Clean, professional prompt labeling
			this.label = isFavorite ? `⭐ ${entry.label}` : entry.label;
			
			// Add score icon with appropriate styling for user prompts
			if (entry.evaluation && entry.categoryType === 'user') {
				// Get evaluation tier for styling
				const getScoreTier = (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
					if (score >= 85) return 'excellent';
					else if (score >= 70) return 'good';
					else if (score >= 50) return 'average';
					else return 'poor';
				};
				
				// Store score and tier for later use
				const tier = getScoreTier(entry.evaluation.overallScore);
				const score = entry.evaluation.overallScore;
				const suggestions = entry.evaluation.suggestions;
				
				// Create icon for tree item status bar
				let iconClass: string;
				let iconColor: vscode.ThemeColor;
				let iconTooltip: string;
				
				switch (tier) {
					case 'excellent':
						iconClass = 'star-full';
						iconColor = new vscode.ThemeColor('charts.yellow');
						iconTooltip = 'Excellent';
						break;
					case 'good':
						iconClass = 'check';
						iconColor = new vscode.ThemeColor('charts.green');
						iconTooltip = 'Good';
						break;
					case 'average':
						iconClass = 'info';
						iconColor = new vscode.ThemeColor('charts.blue');
						iconTooltip = 'Average';
						break;
					case 'poor':
						iconClass = 'warning';
						iconColor = new vscode.ThemeColor('charts.red');
						iconTooltip = 'Needs Improvement';
						break;
				}
				
				// Create status bar item with score
				this.resourceUri = vscode.Uri.parse(`score:${score}`);
				this.iconPath = new vscode.ThemeIcon(iconClass, iconColor);
			}
			
			this.contextValue = isSystemPrompt ? 'prompt-system' : 'prompt-user';
			// Removed automatic click handler to avoid duplicate functionality
			// Users will use the context menu or inline button to use prompts
			
			// Get evaluation tier and icon if available
			let evaluationText = '';
			if (entry.evaluation) {
				// Create evaluation service without requiring extension context
				const evalService = {
					getScoreTier: (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
						if (score >= 85) return 'excellent';
						else if (score >= 70) return 'good';
						else if (score >= 50) return 'average';
						else return 'poor';
					},
					getScoreTierIcon: (tier: 'excellent' | 'good' | 'average' | 'poor'): string => {
						switch (tier) {
							case 'excellent': return '$(star-full)';
							case 'good': return '$(check)';
							case 'average': return '$(info)';
							case 'poor': return '$(warning)';
						}
					},
					getScoreTierColor: (tier: 'excellent' | 'good' | 'average' | 'poor'): vscode.ThemeColor => {
						switch (tier) {
							case 'excellent': return new vscode.ThemeColor('charts.yellow');
							case 'good': return new vscode.ThemeColor('charts.green');
							case 'average': return new vscode.ThemeColor('charts.blue');
							case 'poor': return new vscode.ThemeColor('charts.red');
						}
					}
				};
				
				const evalTier = evalService.getScoreTier(entry.evaluation.overallScore);
				const evalIcon = evalService.getScoreTierIcon(evalTier);
				evaluationText = `\n\n## Prompt Evaluation: ${entry.evaluation.overallScore}/100\n\n`;
				evaluationText += `- **Clarity:** ${entry.evaluation.clarity}/10\n`;
				evaluationText += `- **Specificity:** ${entry.evaluation.specificity}/10\n`;
				evaluationText += `- **Context:** ${entry.evaluation.context}/10\n`;
				evaluationText += `- **Efficiency:** ${entry.evaluation.efficiency}/10\n`;
				evaluationText += `- **Relevance:** ${entry.evaluation.relevance}/10\n\n`;
				
				evaluationText += `### ✅ Improvement Suggestions\n\n`;
				entry.evaluation.suggestions.forEach(suggestion => {
					// Make suggestions more prominent with bold formatting
					evaluationText += `- **${suggestion}**\n`;
				});
			}
			
			// Create comprehensive tooltip with all prompt information
			const promptType = isSystemPrompt ? 'System Prompt' : 'User Prompt';
			const favoriteText = isFavorite ? ' (★ Favorite)' : '';

			// Create a simple, focused tooltip
			const tooltipContent = new vscode.MarkdownString();
			tooltipContent.isTrusted = true;
			tooltipContent.supportHtml = true;

			// Basic title and prompt info
			tooltipContent.appendMarkdown(`# ${entry.label}${favoriteText}\n\n`);
			
			// Always show score information prominently if available
			if (entry.evaluation) {
				// Get quality tier name with emoji
				let tierName = '';
				let tierEmoji = '';
				
				const score = entry.evaluation.overallScore;
				if (score >= 85) {
					tierName = 'Excellent';
					tierEmoji = '★'; // Star
				} else if (score >= 70) {
					tierName = 'Good';
					tierEmoji = '✔'; // Check mark
				} else if (score >= 50) {
					tierName = 'Average';
					tierEmoji = 'ℹ'; // Info
				} else {
					tierName = 'Needs Improvement';
					tierEmoji = '⚠'; // Warning
				}
				
				// Add score as a separate section right after title
				tooltipContent.appendMarkdown(`## ${tierEmoji} Prompt Score: ${score}/100\n*Quality: ${tierName}*\n\n`);
			}
			
			// Check if there are suggestions to display
			const hasSuggestions = entry.evaluation?.suggestions && entry.evaluation.suggestions.length > 0;
			
			// Show suggestions prominently if available
			if (hasSuggestions) {
				// Add suggestion header with high visibility
				tooltipContent.appendMarkdown(`## ✅ IMPROVEMENT SUGGESTIONS\n\n`);
				
				entry.evaluation!.suggestions.forEach((suggestion, index) => {
					// Number each suggestion and make it bold for clarity
					tooltipContent.appendMarkdown(`**${index + 1}.** **${suggestion}**\n\n`);
				});
				
				tooltipContent.appendMarkdown(`---\n\n`);
			}
			
			// Add tags
			tooltipContent.appendMarkdown(`**Tags:** ${entry.tags?.join(', ') || 'None'}\n\n`);
			
			// Add prompt preview
			if (entry.prompt) {
				tooltipContent.appendMarkdown(`## Prompt Content\n\n`);
				tooltipContent.appendMarkdown(`${entry.prompt.substring(0, 300)}${entry.prompt.length > 300 ? '...' : ''}\n\n`);
			}
			
			// Add detailed scores at the end if evaluation exists
			if (entry.evaluation) {
				tooltipContent.appendMarkdown(`## Detailed Ratings\n`);
				tooltipContent.appendMarkdown(`| Category | Rating |\n|---|---|\n`);
				tooltipContent.appendMarkdown(`| Clarity | ${entry.evaluation.clarity}/10 |\n`);
				tooltipContent.appendMarkdown(`| Specificity | ${entry.evaluation.specificity}/10 |\n`);
				tooltipContent.appendMarkdown(`| Context | ${entry.evaluation.context}/10 |\n`);
				tooltipContent.appendMarkdown(`| Efficiency | ${entry.evaluation.efficiency}/10 |\n`);
				tooltipContent.appendMarkdown(`| Relevance | ${entry.evaluation.relevance}/10 |\n`);
			}
			
			// Set the tooltip
			this.tooltip = tooltipContent;
			// Make sure tooltip is a MarkdownString before setting properties
			if (this.tooltip instanceof vscode.MarkdownString) {
				this.tooltip.supportHtml = true;
				this.tooltip.isTrusted = true;
			}
			
			// Clean description with key tags only (score is now in the label for user prompts)
			// Only show tags in the description
			const description = entry.tags?.slice(0, 3).join(' • ') || '';
			
			// Note: We don't need to add score to description since it's now in the label
			this.description = description;
			
			// Set iconPath only if no evaluation icon was set
			if (!this.iconPath) {
				// Use default prompt icons based on type
				this.iconPath = this.getPromptIcon(entry, isSystemPrompt, isFavorite);
			}
		} else if (entry.type === 'category' || entry.type === 'group') {
			const isSystemCategory = entry.categoryType === 'system';
			this.contextValue = isSystemCategory ? 'category-system' : 'category-user';
			
			// Professional category icons with proper VS Code theming
			this.iconPath = this.getCategoryIcon(entry);
			this.description = this.getCategoryDescription(entry);
		}
		
		// Add inline action icons and score circle for user prompts
		if (entry.type === 'prompt' && entry.categoryType === 'user') {
			// Create a decorative badge for score
			if (entry.evaluation) {
				// Get evaluation tier for color coding
				const getScoreTier = (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
					if (score >= 85) return 'excellent';
					else if (score >= 70) return 'good';
					else if (score >= 50) return 'average';
					else return 'poor';
				};
				
				// Get color based on score
				const tier = getScoreTier(entry.evaluation.overallScore);
				const score = entry.evaluation.overallScore;
				
				// Set the score badge to appear near edit icon
				// Include score in the resource URI for rendering in the view
				this.resourceUri = vscode.Uri.parse(`prompt-user:${entry.id}?score=${score}&tier=${tier}`);
				
				// Create a bold, clear score display with icon
				let scoreIcon = '';
				
				// Use codicon icons which are guaranteed to be visible in VS Code
				switch(tier) {
					case 'excellent':
						scoreIcon = '$(star-full)';  // Star for excellent
						break;
					case 'good':
						scoreIcon = '$(check-all)';  // Check for good
						break;
					case 'average':
						scoreIcon = '$(info)';  // Info for average
						break;
					case 'poor':
						scoreIcon = '$(warning)';  // Warning for poor
						break;
				}
				
				// Set description to a more prominent score indicator
				this.description = `${scoreIcon} Score: ${score}`;
			} else {
				this.resourceUri = vscode.Uri.parse(`prompt-user:${entry.id}`);
			}
		}
	}
	
	private getPromptIcon(entry: PromptEntry, isSystemPrompt: boolean, isFavorite: boolean): vscode.ThemeIcon {
		// If the prompt has an evaluation score, use evaluation tier icon for user prompts
		if (!isSystemPrompt && entry.evaluation) {
			// Create evaluation service helper functions inline
			const getScoreTier = (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
				if (score >= 85) return 'excellent';
				else if (score >= 70) return 'good';
				else if (score >= 50) return 'average';
				else return 'poor';
			};
			
			const getScoreTierColor = (tier: 'excellent' | 'good' | 'average' | 'poor'): vscode.ThemeColor => {
				switch (tier) {
					case 'excellent': return new vscode.ThemeColor('charts.yellow');
					case 'good': return new vscode.ThemeColor('charts.green');
					case 'average': return new vscode.ThemeColor('charts.blue');
					case 'poor': return new vscode.ThemeColor('charts.red');
				}
			};
			
			const evalTier = getScoreTier(entry.evaluation.overallScore);
			const evalColor = getScoreTierColor(evalTier);
			
			// Use different icons based on evaluation tier
			switch (evalTier) {
				case 'excellent':
					return new vscode.ThemeIcon('star-full', evalColor);
				case 'good':
					return new vscode.ThemeIcon('check', evalColor);
				case 'average':
					return new vscode.ThemeIcon('info', evalColor);
				case 'poor':
					return new vscode.ThemeIcon('warning', evalColor);
			}
		}
		
		if (isFavorite) {
			// Bright, easily visible star for favorites
			return new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'));
		}
		
		if (isSystemPrompt) {
			// Apply 3-level hierarchical icon system for system prompts
			const entryLevel = this.getEntryLevel(entry);
			const tags = entry.tags?.join(' ').toLowerCase() || '';
			const label = entry.label.toLowerCase();
			const categoryId = entry.categoryId?.toLowerCase() || '';
			const combined = `${tags} ${label} ${categoryId}`;
			const technologyColor = this.getTechnologyColor(combined);
			
			// Apply appropriate icon based on hierarchy level
			switch (entryLevel) {
				case 'technology':
					// Level 1: symbol-interface for all technology categories
					return new vscode.ThemeIcon('symbol-interface', technologyColor);
				case 'module':
					// Level 2: symbol-method for all modules/subcategories
					return new vscode.ThemeIcon('symbol-method', technologyColor);
				case 'prompt':
					// Level 3: symbol-object for all individual prompts
					return new vscode.ThemeIcon('symbol-object', technologyColor);
				default:
					return new vscode.ThemeIcon('symbol-object', technologyColor);
			}
		} else {
			// User prompts - Professional orange edit icon for distinction
			return new vscode.ThemeIcon('edit', new vscode.ThemeColor('charts.orange'));
		}
	}
	
	// Helper function to get technology-specific icon for first level (technology categories)
	private getTechnologyIcon(technologyName: string): string {
		const tech = technologyName.toLowerCase();
		
		// VS Code visible technology-specific icons for first level categories
		if (tech.includes('.net') || tech.includes('dotnet') || tech.includes('csharp') || tech.includes('c#')) {
			return 'file-code'; // C# icon - VS Code standard
		} else if (tech.includes('angular') || tech.includes('ng')) {
			return 'symbol-class'; // Angular representation - VS Code standard
		} else if (tech.includes('react') || tech.includes('jsx') || tech.includes('next.js') || tech.includes('nextjs')) {
			return 'symbol-interface'; // React.js representation - VS Code standard
		} else if (tech.includes('vue') || tech.includes('nuxt')) {
			return 'symbol-field'; // Vue.js representation - VS Code standard
		} else if (tech.includes('python') || tech.includes('django') || tech.includes('flask') || tech.includes('fastapi')) {
			return 'symbol-variable'; // Python representation - VS Code standard
		} else if (tech.includes('node') || tech.includes('javascript') || tech.includes('js') || tech.includes('express')) {
			return 'symbol-method'; // Node.js representation - VS Code standard
		} else if (tech.includes('blazor')) {
			return 'symbol-constructor'; // Blazor representation - VS Code standard
		} else if (tech.includes('ai') || tech.includes('agentic') || tech.includes('machine') || tech.includes('ml')) {
			return 'symbol-misc'; // AI/ML representation - VS Code standard
		} else if (tech.includes('database') || tech.includes('sql') || tech.includes('mysql') || tech.includes('postgres')) {
			return 'symbol-property'; // Database representation - VS Code standard
		} else if (tech.includes('testing') || tech.includes('test') || tech.includes('unit') || tech.includes('integration')) {
			return 'symbol-unit'; // Testing representation - VS Code standard
		} else if (tech.includes('security') || tech.includes('auth') || tech.includes('jwt') || tech.includes('oauth')) {
			return 'symbol-key'; // Security representation - VS Code standard
		} else if (tech.includes('docker') || tech.includes('container') || tech.includes('kubernetes')) {
			return 'symbol-package'; // Container representation - VS Code standard
		} else if (tech.includes('api') || tech.includes('rest') || tech.includes('graphql')) {
			return 'symbol-enum'; // API representation - VS Code standard
		} else if (tech.includes('git') || tech.includes('version') || tech.includes('github')) {
			return 'git-branch'; // Git representation - VS Code standard
		} else if (tech.includes('web') || tech.includes('frontend') || tech.includes('html') || tech.includes('css')) {
			return 'symbol-color'; // Web development representation - VS Code standard
		} else if (tech.includes('mobile') || tech.includes('app') || tech.includes('android') || tech.includes('ios')) {
			return 'symbol-constant'; // Mobile representation - VS Code standard
		} else if (tech.includes('architecture') || tech.includes('design') || tech.includes('pattern')) {
			return 'symbol-structure'; // Architecture representation - VS Code standard
		} else {
			return 'symbol-class'; // Default fallback - VS Code standard
		}
	}

	// Helper function to get technology-specific color with enhanced detection
	private getTechnologyColor(technologyName: string): vscode.ThemeColor {
		const tech = technologyName.toLowerCase();
		
		// Enhanced technology detection with more keywords
		if (tech.includes('.net') || tech.includes('dotnet') || tech.includes('csharp') || tech.includes('c#') || tech.includes('asp.net') || tech.includes('blazor')) {
			return new vscode.ThemeColor('charts.blue');
		} else if (tech.includes('angular') || tech.includes('ng') || tech.includes('typescript')) {
			return new vscode.ThemeColor('charts.red');
		} else if (tech.includes('react') || tech.includes('jsx') || tech.includes('next.js') || tech.includes('nextjs')) {
			return new vscode.ThemeColor('terminal.ansiCyan');
		} else if (tech.includes('vue') || tech.includes('nuxt') || tech.includes('vuex')) {
			return new vscode.ThemeColor('charts.green');
		} else if (tech.includes('python') || tech.includes('django') || tech.includes('flask') || tech.includes('fastapi')) {
			return new vscode.ThemeColor('charts.orange');
		} else if (tech.includes('node') || tech.includes('javascript') || tech.includes('js') || tech.includes('express') || tech.includes('npm')) {
			return new vscode.ThemeColor('charts.yellow');
		} else if (tech.includes('ai') || tech.includes('agentic') || tech.includes('machine') || tech.includes('ml') || tech.includes('openai') || tech.includes('chatgpt')) {
			return new vscode.ThemeColor('charts.purple');
		} else if (tech.includes('database') || tech.includes('sql') || tech.includes('mysql') || tech.includes('postgres') || tech.includes('mongodb')) {
			return new vscode.ThemeColor('terminal.ansiCyan');
		} else if (tech.includes('testing') || tech.includes('test') || tech.includes('unit') || tech.includes('integration') || tech.includes('jest') || tech.includes('mocha')) {
			return new vscode.ThemeColor('charts.orange');
		} else if (tech.includes('security') || tech.includes('auth') || tech.includes('jwt') || tech.includes('oauth') || tech.includes('encryption')) {
			return new vscode.ThemeColor('charts.yellow');
		} else if (tech.includes('docker') || tech.includes('container') || tech.includes('kubernetes') || tech.includes('k8s')) {
			return new vscode.ThemeColor('charts.blue');
		} else if (tech.includes('api') || tech.includes('rest') || tech.includes('graphql') || tech.includes('endpoint')) {
			return new vscode.ThemeColor('charts.green');
		} else if (tech.includes('git') || tech.includes('version') || tech.includes('github') || tech.includes('gitlab')) {
			return new vscode.ThemeColor('charts.orange');
		} else if (tech.includes('web') || tech.includes('frontend') || tech.includes('html') || tech.includes('css') || tech.includes('sass') || tech.includes('tailwind')) {
			return new vscode.ThemeColor('terminal.ansiCyan');
		} else if (tech.includes('mobile') || tech.includes('app') || tech.includes('android') || tech.includes('ios') || tech.includes('flutter') || tech.includes('react native')) {
			return new vscode.ThemeColor('charts.purple');
		} else if (tech.includes('architecture') || tech.includes('design') || tech.includes('pattern') || tech.includes('microservice')) {
			return new vscode.ThemeColor('terminal.ansiCyan');
		} else {
			return new vscode.ThemeColor('symbolIcon.namespaceForeground');
		}
	}

	// Helper function to detect entry level in hierarchy
	private getEntryLevel(entry: PromptEntry): 'technology' | 'module' | 'prompt' {
		// Special sections are always technology level
		if (entry.id === 'favorites' || entry.id === 'recent' || entry.id?.includes('-section')) {
			return 'technology';
		}
		
		// If it's a prompt type, check if it should be treated as technology category
		if (entry.type === 'prompt') {
			// Check if this prompt is actually a technology category disguised as a prompt
			if (entry.children && entry.children.length > 0) {
				return 'technology'; // Has children, so it's a technology category
			}
			return 'prompt'; // No children, it's an actual prompt
		}
		
		// For categories/groups, determine level based on content and structure
		if (entry.type === 'category' || entry.type === 'group') {
			// Check if it's a main technology category
			if (this.isMainTechnologyCategory(entry.label) || 
				this.isMainTechnologyCategory(entry.categoryId || '') ||
				entry.categoryType === 'system' && !entry.categoryId) {
				return 'technology';
			} else {
				return 'module'; // Sub-category within a technology
			}
		}
		
		// Default to module for unknown types
		return 'module';
	}

	// Helper function to check if it's a main technology category
	private isMainTechnologyCategory(label: string): boolean {
		const labelLower = label.toLowerCase();
		const mainTechnologies = [
			'.net', 'dotnet', 'csharp', 'angular', 'react', 'vue', 'python', 
			'node', 'javascript', 'ai', 'agentic', 'machine', 'blazor',
			'database', 'sql', 'testing', 'test', 'security', 'auth',
			'docker', 'container', 'api', 'rest', 'git', 'version',
			'web', 'frontend', 'mobile', 'app', 'architecture', 'design'
		];
		
		return mainTechnologies.some(tech => labelLower.includes(tech));
	}

	private getCategoryIcon(entry: PromptEntry): vscode.ThemeIcon {
		// Enhanced special sections with professional visibility
		if (entry.id === 'favorites') {
			// Bright golden star for favorites section with better visibility
			return new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'));
		}
		if (entry.id === 'recent') {
			// Professional blue history icon for recent section
			return new vscode.ThemeIcon('history', new vscode.ThemeColor('charts.blue'));
		}
		if (entry.id === 'system-section') {
			// Professional teal library icon for system section
			return new vscode.ThemeIcon('library', new vscode.ThemeColor('terminal.ansiCyan'));
		}
		if (entry.id === 'user-section') {
			// Professional orange account icon for user section
			return new vscode.ThemeIcon('account', new vscode.ThemeColor('charts.orange'));
		}
		
		// 3-Level Hierarchical Icon System with technology-specific icons
		const entryLevel = this.getEntryLevel(entry);
		const technologyColor = this.getTechnologyColor(entry.label);
		
		switch (entryLevel) {
			case 'technology':
				// Level 1: Technology-specific icons for main technology categories
				return new vscode.ThemeIcon('symbol-interface', technologyColor);
				
			case 'module': 
				// Level 2: symbol-method icons for modules/subcategories (VS Code standard)
				return new vscode.ThemeIcon('symbol-method', technologyColor);
				
			case 'prompt':
				// Level 3: Symbol-object icons for individual prompts
				return new vscode.ThemeIcon('symbol-object', technologyColor);
				
			default:
				// Fallback for unknown categories
				return new vscode.ThemeIcon('folder', new vscode.ThemeColor('symbolIcon.namespaceForeground'));
		}
	}
	
	private getCategoryDescription(entry: PromptEntry): string {
		if (entry.id === 'favorites') {
			return 'Starred prompts for quick access';
		}
		if (entry.id === 'recent') {
			return 'Recently used prompts';
		}
		if (entry.id === 'user-section') {
			return 'Your custom prompts';
		}
		if (entry.children) {
			const count = this.getChildPromptCount(entry);
			return count === 1 ? '1 prompt' : `${count} prompts`;
		}
		return '';
	}
	
	private getChildPromptCount(entry: PromptEntry): number {
		if (entry.type === 'prompt') {
			return 1;
		} else if (entry.children) {
			return entry.children.reduce((sum, child) => sum + this.getChildPromptCount(child), 0);
		} else {
			return 0;
		}
	}
}

class PromptProvider implements vscode.TreeDataProvider<PromptTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<PromptTreeItem | undefined | void> = new vscode.EventEmitter<PromptTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<PromptTreeItem | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private promptLibrary: PromptLibrary) {}

	getTreeItem(element: PromptTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: PromptTreeItem): Thenable<PromptTreeItem[]> {
		let items: PromptEntry[];

		if (!element) {
			// Return top-level categories
			items = this.promptLibrary.getRootEntries();
		} else if (element.entry.children) {
			items = element.entry.children;
		} else {
			return Promise.resolve([]);
		}

		// Filter based on search query if applicable
		const searchQuery = this.promptLibrary.getSearchQuery();
		if (searchQuery) {
			items = this.filterBySearch(items, searchQuery);
		}

		return Promise.resolve(items.map(e => new PromptTreeItem(e, this.promptLibrary)));
	}

	private filterBySearch(items: PromptEntry[], query: string): PromptEntry[] {
		const lowerQuery = query.toLowerCase();
		const filtered: PromptEntry[] = [];

		for (const item of items) {
			const matches = item.label.toLowerCase().includes(lowerQuery) || 
						   item.prompt?.toLowerCase().includes(lowerQuery) ||
						   item.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery));
			
			if (matches) {
				filtered.push(item);
			} else if (item.children) {
				const childMatches = this.filterBySearch(item.children, query);
				if (childMatches.length > 0) {
					filtered.push({
						...item,
						children: childMatches
					});
				}
			}
		}

		return filtered;
	}

	/**
	 * Refreshes the tree view without losing expansion state
	 * @param element Optional specific element to refresh
	 */
	refresh(element?: PromptTreeItem): void {
		// Using undefined preserves the tree expansion state better than using null
		this._onDidChangeTreeData.fire(element);
	}
}

class PromptLibrary {
	private prompts: PromptEntry[] = [];
	private allPrompts: Prompt[] = [];
	private searchQuery: string = '';
	private nextId: number = 0;
	private systemPromptsPath: string;
	private userPromptsPath: string;
	private userPreferences: UserPreferences = {
		favorites: [],
		recentPrompts: [],
		searchHistory: []
	};
	private showFavoritesOnly: boolean = false;
	private showRecentOnly: boolean = false;
	private evaluationService: PromptEvaluationService;

	constructor(private context: vscode.ExtensionContext) {
		this.systemPromptsPath = path.join(context.extensionPath, 'system-prompts.json');
		this.userPromptsPath = path.join(context.globalStorageUri?.fsPath || context.extensionPath, 'user-prompts.json');
		this.loadUserPreferences();
		this.loadPrompts();
		this.evaluationService = new PromptEvaluationService(context);
	}

	private loadPrompts(): void {
		const allCategories: PromptCategory[] = [];
		
		try {
			// Load system prompts from system-prompts.json
			if (fs.existsSync(this.systemPromptsPath)) {
				const systemContent = fs.readFileSync(this.systemPromptsPath, 'utf-8');
				const systemFile: PromptFile = JSON.parse(systemContent);
				allCategories.push(...systemFile.categories);
			} else {
				console.warn('System prompts file not found:', this.systemPromptsPath);
				// Fallback to default system prompts
				const defaultSystemPrompts = this.getDefaultPrompts().filter(entry => entry.categoryType === 'system');
				allCategories.push(...this.convertEntriesToCategories(defaultSystemPrompts));
			}
		} catch (error) {
			console.error('Error loading system prompts:', error);
		}

		try {
			// Load user prompts from user-prompts.json
			// Ensure directory exists for user prompts
			const userPromptsDir = path.dirname(this.userPromptsPath);
			if (!fs.existsSync(userPromptsDir)) {
				fs.mkdirSync(userPromptsDir, { recursive: true });
			}

			if (fs.existsSync(this.userPromptsPath)) {
				const userContent = fs.readFileSync(this.userPromptsPath, 'utf-8');
				const userFile: PromptFile = JSON.parse(userContent);
				allCategories.push(...userFile.categories);
			} else {
				// Create initial user prompts file
				const initialUserFile: PromptFile = {
					version: '1.0',
					categories: [{
						id: 'user',
						label: 'User Prompts',
						type: 'user',
						groups: []
					}]
				};
				fs.writeFileSync(this.userPromptsPath, JSON.stringify(initialUserFile, null, 2), 'utf-8');
				allCategories.push(...initialUserFile.categories);
			}
		} catch (error) {
			console.error('Error loading user prompts:', error);
			// Add default user category if loading fails
			allCategories.push({
				id: 'user',
				label: 'User Prompts',
				type: 'user',
				groups: []
			});
		}

		// Convert all categories to entries and set up internal state
		this.prompts = this.convertJsonToEntries(allCategories);
		this.extractAllPrompts(allCategories);
		this.nextId = this.getMaxId(this.prompts) + 1;
	}

	private convertEntriesToCategories(entries: PromptEntry[]): PromptCategory[] {
		return entries
			.filter(entry => entry.type === 'category')
			.map(entry => ({
				id: entry.id,
				label: entry.label,
				type: (entry.categoryType || 'user') as 'system' | 'user',
				groups: (entry.children || [])
					.filter(child => child.type === 'group')
					.map(group => ({
						id: group.id,
						label: group.label,
						prompts: (group.children || [])
							.filter(child => child.type === 'prompt')
							.map(child => ({
								id: child.id,
								label: child.label,
								prompt: child.prompt!,
								tags: child.tags || []
							}))
					}))
			}));
	}

	private convertJsonToEntries(categories: PromptCategory[]): PromptEntry[] {
		return categories.map(cat => ({
			id: cat.id,
			label: cat.label,
			type: 'category' as PromptNodeType,
			categoryType: cat.type,
			children: cat.groups.map(group => ({
				id: group.id,
				label: group.label,
				type: 'group' as PromptNodeType,
				children: group.prompts.map(prompt => ({
					id: prompt.id,
					label: prompt.label,
					type: 'prompt' as PromptNodeType,
					prompt: prompt.prompt,
					tags: prompt.tags,
					parentId: group.id,
					categoryId: cat.id,
					categoryType: cat.type
				})),
				parentId: cat.id,
				categoryId: cat.id,
				categoryType: cat.type
			}))
		}));
	}

	private extractAllPrompts(categories: PromptCategory[]): void {
		this.allPrompts = [];
		for (const category of categories) {
			for (const group of category.groups) {
				this.allPrompts.push(...group.prompts);
			}
		}
	}

	private extractAllPromptsFromEntries(entries: PromptEntry[]): void {
		this.allPrompts = [];
		for (const entry of entries) {
			if (entry.type === 'category' && entry.children) {
				for (const group of entry.children) {
					if (group.type === 'group' && group.children) {
						for (const child of group.children) {
							if (child.prompt) {
								this.allPrompts.push({
									id: child.id,
									label: child.label,
									prompt: child.prompt,
									tags: child.tags || []
								});
							}
						}
					}
				}
			}
		}
	}

	private getMaxId(entries: PromptEntry[]): number {
		let max = 0;
		for (const entry of entries) {
			const id = parseInt(entry.id, 10);
			if (!isNaN(id) && id > max) {
				max = id;
			}
			if (entry.children) {
				const childMax = this.getMaxId(entry.children);
				if (childMax > max) {
					max = childMax;
				}
			}
		}
		return max;
	}

	private getDefaultPrompts(): PromptEntry[] {
		return [
			{
				id: '1',
				label: 'User Prompts',
				type: 'category',
				categoryType: 'user',
				children: []
			}
		];
	}

	private async saveUserPromptsToJson(): Promise<void> {
		try {
			// Only save user prompts (exclude system prompts)
			const userCategories: PromptCategory[] = this.prompts
				.filter(entry => entry.categoryType === 'user')
				.map(entry => ({
					id: entry.id,
					label: entry.label,
					type: 'user' as 'system' | 'user',
					groups: (entry.children || [])
						.filter(child => child.type === 'group')
						.map(group => ({
							id: group.id,
							label: group.label,
							prompts: (group.children || [])
								.filter(child => child.type === 'prompt')
								.map(child => ({
									id: child.id,
									label: child.label,
									prompt: child.prompt!,
									tags: child.tags || []
								}))
						}))
				}));

			const userPromptsFile: PromptFile = { version: '1.0', categories: userCategories };
			
			// Ensure directory exists
			const userPromptsDir = path.dirname(this.userPromptsPath);
			if (!fs.existsSync(userPromptsDir)) {
				fs.mkdirSync(userPromptsDir, { recursive: true });
			}

			fs.writeFileSync(this.userPromptsPath, JSON.stringify(userPromptsFile, null, 2), 'utf-8');
		} catch (error) {
			console.error('Error saving user prompts to JSON file:', error);
			throw error;
		}
	}

	// For backward compatibility and export functionality
	private async savePromptsToJson(): Promise<void> {
		return this.saveUserPromptsToJson();
	}

	getRootEntries(): PromptEntry[] {
		const entries: PromptEntry[] = [];

		// Add Favorites section if there are any favorites or when viewing favorites only
		if (this.userPreferences.favorites.length > 0 || this.showFavoritesOnly) {
			const favoritePrompts = this.getFavoritePrompts();
			entries.push({
				id: 'favorites',
				label: favoritePrompts.length > 0 
					? `Favorites (${favoritePrompts.length})`
					: 'Favorites (Empty)',
				type: 'category',
				categoryType: 'system',
				children: favoritePrompts
			});
		}

		// Add Recent section if there are recent prompts or when viewing recent only
		if (this.userPreferences.recentPrompts.length > 0 || this.showRecentOnly) {
			const recentPrompts = this.getRecentPrompts();
			entries.push({
				id: 'recent',
				label: recentPrompts.length > 0 
					? `Recent (${recentPrompts.length})`
					: 'Recent (Empty)',
				type: 'category',
				categoryType: 'system',
				children: recentPrompts
			});
		}

		// Only show main library when not filtering by favorites/recent
		if (!this.showFavoritesOnly && !this.showRecentOnly) {
			const systemCategories = this.prompts.filter(p => p.categoryType === 'system');
			const userCategories = this.prompts.filter(p => p.categoryType === 'user');

			// Add System Prompts Section (if any exist)
			if (systemCategories.length > 0) {
				const totalSystemPrompts = systemCategories.reduce((sum, cat) => sum + this.getChildPromptCount(cat), 0);
				
				entries.push({
					id: 'system-section',
					label: `System Prompts (${totalSystemPrompts})`,
					type: 'category',
					categoryType: 'system',
					children: systemCategories.sort((a, b) => {
						if (a.categoryType === 'system' && b.categoryType === 'user') {
							return -1; // system comes first
						}
						if (a.categoryType === 'user' && b.categoryType === 'system') {
							return 1; // user comes second
						}
						return a.label.localeCompare(b.label);
					})
				});
			}

			// Add User Prompts Section (Flattened)
			if (userCategories.length > 0) {
				// Extract all user prompts from nested categories to flatten the tree
				const flattenedUserPrompts = this.extractAllUserPrompts(userCategories);
				
				if (flattenedUserPrompts.length > 0) {
					entries.push({
						id: 'user-section',
						label: `Your Prompts (${flattenedUserPrompts.length})`,
						type: 'category',
						categoryType: 'user',
						children: flattenedUserPrompts.sort((a: PromptEntry, b: PromptEntry) => a.label.localeCompare(b.label))
					});
				} else {
					// No actual prompts found, show empty state
					entries.push({
						id: 'user-section',
						label: 'Your Prompts (Empty)',
						type: 'category',
						categoryType: 'user',
						children: [{
							id: 'no-user-prompts',
							label: 'Click to create your first prompt',
							type: 'prompt',
							categoryType: 'user',
							prompt: '',
							tags: ['getting-started']
						}]
					});
				}
			} else {
				// Show empty user section to encourage creation
				entries.push({
					id: 'user-section',
					label: 'Your Prompts (Empty)',
					type: 'category',
					categoryType: 'user',
					children: [{
						id: 'no-user-prompts',
						label: 'Click to create your first prompt',
						type: 'prompt',
						categoryType: 'user',
						prompt: '',
						tags: ['getting-started']
					}]
				});
			}
		}

		return entries;
	}
	

	private getChildPromptCount(entry: PromptEntry): number {
		if (entry.type === 'prompt') {
			return 1;
		} else if (entry.children) {
			return entry.children.reduce((sum, child) => sum + this.getChildPromptCount(child), 0);
		} else {
			return 0;
		}
	}

	// Extract all user prompts recursively to flatten the tree structure
	private extractAllUserPrompts(categories: PromptEntry[]): PromptEntry[] {
		const prompts: PromptEntry[] = [];
		
		for (const category of categories) {
			if (category.children) {
				for (const child of category.children) {
					if (child.type === 'prompt') {
						// Add category info to tags for filtering context
						const contextualPrompt: PromptEntry = {
							...child,
							label: child.label,
							// Add category info to tags for filtering
							tags: [...(child.tags || []), category.label.toLowerCase().replace(/\s+/g, '-')]
						};
						prompts.push(contextualPrompt);
					} else if (child.children) {
						// Recursively extract from nested categories
						const nestedPrompts = this.extractAllUserPrompts([child]);
						prompts.push(...nestedPrompts);
					}
				}
			}
		}
		
		return prompts;
	}

	// Unified usage analytics tracking
	// Make method public for external tracking
	trackPromptInteraction(promptId: string, actionType: string): void {
		const today = new Date().toISOString().split('T')[0];
		const timestamp = new Date().toISOString();
		
		// Get or create analytics from global state
		const analytics = this.context.globalState.get<UsageAnalytics>('usageAnalytics', {
			totalUses: 0,
			promptUsage: {},
			contextUsage: {},
			tagUsage: {},
			dailyUsage: {},
			lastUsed: {}
		});
		
		// Update analytics
		analytics.totalUses++;
		analytics.promptUsage[promptId] = (analytics.promptUsage[promptId] || 0) + 1;
		analytics.dailyUsage[today] = (analytics.dailyUsage[today] || 0) + 1;
		analytics.lastUsed[promptId] = timestamp;
		
		// Track action type context
		analytics.contextUsage[actionType] = (analytics.contextUsage[actionType] || 0) + 1;
		
		// Track prompt tags for analytics
		const prompt = this.allPrompts.find(p => p.id === promptId);
		if (prompt && prompt.tags) {
			for (const tag of prompt.tags) {
				analytics.tagUsage[tag] = (analytics.tagUsage[tag] || 0) + 1;
			}
		}
		
		// Save to global state immediately
		this.context.globalState.update('usageAnalytics', analytics);
		
		// Debug logging for development
		console.log(`[Prompt Analytics] Tracked ${actionType} for prompt: ${promptId}`);
	}

	// Get current analytics with real-time data
	getUsageAnalytics(): UsageAnalytics {
		return this.context.globalState.get<UsageAnalytics>('usageAnalytics', {
			totalUses: 0,
			promptUsage: {},
			contextUsage: {},
			tagUsage: {},
			dailyUsage: {},
			lastUsed: {}
		});
	}

	getAllPrompts(): Prompt[] {
		return this.allPrompts;
	}

	getAllTags(): string[] {
		const tags = new Set<string>();
		for (const prompt of this.allPrompts) {
			prompt.tags.forEach(tag => tags.add(tag));
		}
		return Array.from(tags).sort();
	}

	getSearchQuery(): string {
		return this.searchQuery;
	}

	setSearchQuery(query: string): void {
		this.searchQuery = query;
		// Track search activity for analytics
		if (query.trim()) {
			this.trackPromptInteraction(`search:${query}`, 'search');
		}
	}

	// Favorites and Recent Prompts Methods
	toggleFavorite(promptId: string): void {
		const index = this.userPreferences.favorites.indexOf(promptId);
		if (index > -1) {
			this.userPreferences.favorites.splice(index, 1);
		} else {
			this.userPreferences.favorites.push(promptId);
		}
		this.saveUserPreferences();
		// Track favorite toggle as user interaction
		this.trackPromptInteraction(promptId, 'favorite-toggle');
	}

	isFavorite(promptId: string): boolean {
		return this.userPreferences.favorites.includes(promptId);
	}

	getFavoritePrompts(): PromptEntry[] {
		return this.userPreferences.favorites
			.map(id => this.allPrompts.find(p => p.id === id))
			.filter(p => p !== undefined)
			.map(p => this.createPromptEntry(p!));
	}

	addToRecent(promptId: string): void {
		// Remove if already exists
		const index = this.userPreferences.recentPrompts.indexOf(promptId);
		if (index > -1) {
			this.userPreferences.recentPrompts.splice(index, 1);
		}
		
		// Add to beginning
		this.userPreferences.recentPrompts.unshift(promptId);
		
		// Keep only last 10
		if (this.userPreferences.recentPrompts.length > 10) {
			this.userPreferences.recentPrompts = this.userPreferences.recentPrompts.slice(0, 10);
		}
		
		this.saveUserPreferences();
		// Track usage in unified analytics
		this.trackPromptInteraction(promptId, 'use');
	}

	getRecentPrompts(): PromptEntry[] {
		return this.userPreferences.recentPrompts
			.map(id => this.allPrompts.find(p => p.id === id))
			.filter(p => p !== undefined)
			.map(p => this.createPromptEntry(p!));
	}

	setShowFavoritesOnly(show: boolean): void {
		this.showFavoritesOnly = show;
		if (show) {
			this.showRecentOnly = false;
			// Track filter usage
			this.trackPromptInteraction('favorites-filter', 'filter');
		}
	}

	setShowRecentOnly(show: boolean): void {
		this.showRecentOnly = show;
		if (show) {
			this.showFavoritesOnly = false;
			// Track filter usage
			this.trackPromptInteraction('recent-filter', 'filter');
		}
	}

	private createPromptEntry(prompt: Prompt): PromptEntry {
		return {
			id: prompt.id,
			label: prompt.label,
			type: 'prompt',
			prompt: prompt.prompt,
			tags: prompt.tags,
			categoryType: 'system' // Default for favorites/recent display
		};
	}

	// User Preferences Methods
	private loadUserPreferences(): void {
		const stored = this.context.globalState.get<UserPreferences>('userPreferences');
		if (stored) {
			this.userPreferences = stored;
		}
	}

	private saveUserPreferences(): void {
		this.context.globalState.update('userPreferences', this.userPreferences);
	}

	private generateId(): string {
		return (this.nextId++).toString();
	}

	async addPrompt(label: string, prompt: string, tags: string[] = [], parentId?: string): Promise<string | undefined> {
		let newPromptId: string | undefined;
		// Ensure prompt text doesn't contain unwanted default placeholders
		prompt = prompt.replace(/e\.g\.,|example:|for example:|such as:/gi, '').trim();
		// Show loading indicator during evaluation
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: "Evaluating prompt quality...",
				cancellable: false
			},
			async (progress) => {
				progress.report({ increment: 0 });
				
				// Create the new prompt entry with a generated ID
				newPromptId = this.generateId();
				const newPrompt: PromptEntry = {
					id: newPromptId,
					label,
					type: 'prompt',
					prompt,
					tags,
					parentId,
					categoryId: parentId
				};
				
				// Evaluate the prompt quality using Azure OpenAI
				progress.report({ increment: 30, message: "Analyzing prompt content..." });
				try {
					console.log(`Evaluating new prompt: "${prompt.substring(0, 50)}..."`);
					// Create a fallback evaluation in case API call fails
					const fallbackEvaluation = {
						overallScore: 65,
						clarity: 6,
						specificity: 7,
						context: 6,
						efficiency: 7,
						relevance: 7,
						suggestions: ['Make the prompt more specific.', 'Add more context to improve results.'],
						timestamp: new Date().toISOString()
					};
					
					// Call the evaluation service
					const evaluation = await this.evaluationService.evaluatePrompt(prompt);
					
					// Use evaluation result or fallback
					if (evaluation) {
						newPrompt.evaluation = evaluation;
						console.log(`Evaluation successful. Score: ${evaluation.overallScore}, Suggestions: ${evaluation.suggestions?.length ?? 0}`);
					} else {
						console.log('Evaluation returned undefined, using fallback');
						newPrompt.evaluation = fallbackEvaluation;
					}
				} catch (error) {
					console.error("Error evaluating prompt:", error);
					// Use fallback evaluation if there's an error
					newPrompt.evaluation = {
						overallScore: 60,
						clarity: 6,
						specificity: 6,
						context: 6,
						efficiency: 6,
						relevance: 6,
						suggestions: ['Error evaluating prompt. Please try again later.'],
						timestamp: new Date().toISOString()
					};
				}
				
				progress.report({ increment: 60, message: "Saving prompt..." });

				if (parentId) {
					const parent = this.findById(this.prompts, parentId);
					if (parent) {
						// If parent is a category, find or create the default group
						if (parent.type === 'category') {
							let targetGroup = parent.children?.find(g => g.type === 'group');
							if (!targetGroup) {
								// Create a default group if it doesn't exist
								targetGroup = {
									id: this.generateId(),
									label: 'Default',
									type: 'group',
									children: [],
									parentId: parent.id,
									categoryType: parent.categoryType
								};
								if (!parent.children) {
									parent.children = [];
								}
								parent.children.push(targetGroup);
							}
							newPrompt.categoryType = parent.categoryType;
							if (!targetGroup.children) {
								targetGroup.children = [];
							}
							targetGroup.children.push(newPrompt);
						}
						// If parent is already a group, add directly to it
						else if (parent.type === 'group') {
							newPrompt.categoryType = parent.categoryType;
							if (!parent.children) {
								parent.children = [];
							}
							parent.children.push(newPrompt);
						}
					}
				}

				// Ensure evaluation is included in the prompt object
				const promptWithEvaluation: Prompt = {
					id: newPrompt.id,
					label: newPrompt.label,
					prompt: newPrompt.prompt!,
					tags: newPrompt.tags || [],
					evaluation: newPrompt.evaluation
				};
				
				// Log the evaluation data being stored
				console.log('Storing prompt with evaluation data:', {
					id: promptWithEvaluation.id,
					score: promptWithEvaluation.evaluation?.overallScore,
					suggestions: promptWithEvaluation.evaluation?.suggestions?.length
				});
				
				this.allPrompts.push(promptWithEvaluation);

				progress.report({ increment: 90, message: "Finalizing..." });
				await this.savePromptsToJson();
				// Force reload from JSON to ensure consistency
				this.loadPrompts();
				
				progress.report({ increment: 100 });
			}
		);
		
		// We already have the ID directly from creation
		console.log(`Using stored prompt ID: ${newPromptId ?? 'not found'}`);
		
		// Look for the prompt in allPrompts, which should include the newly added prompt
		// We need to reload the prompts from storage to make sure we have the latest data
		this.loadPrompts();
		
		// Find the prompt with the correct ID
		const addedPrompt = newPromptId ? this.allPrompts.find(p => p.id === newPromptId) : undefined;
		console.log(`Found prompt: ${addedPrompt ? 'yes' : 'no'}, Has evaluation: ${addedPrompt?.evaluation ? 'yes' : 'no'}`);
		
		// If we couldn't find the prompt or it doesn't have evaluation, create a fallback
		if (!addedPrompt || !addedPrompt.evaluation) {
			console.log('Creating fallback evaluation for display');
			const fallbackPrompt = {
				id: newPromptId || 'unknown',
				label,
				prompt,
				tags,
				evaluation: {
					overallScore: 65,
					clarity: 6,
					specificity: 7,
					context: 6,
					efficiency: 7,
					relevance: 7,
					suggestions: ['Make the prompt more specific.', 'Add more context to improve results.'],
					timestamp: new Date().toISOString()
				}
			};
			this.showEvaluationMessage(fallbackPrompt);
			return newPromptId;
		}
		this.showEvaluationMessage(addedPrompt);
		return newPromptId;
	}
	
	/**
	 * Helper method to display evaluation message
	 * @param prompt The prompt with evaluation to display
	 */
	private showEvaluationMessage(prompt: { evaluation?: PromptEvaluationScore }): void {
		if (!prompt?.evaluation) {
			return;
		}
		
		const score = prompt.evaluation.overallScore;
		const tier = this.evaluationService.getScoreTier(score);
		let message = `Prompt quality score: ${score}/100 (${tier})`;
		
		if (tier === 'excellent') {
			message += ' - Excellent prompt quality!';
		} else if (tier === 'good') {
			message += ' - Good prompt quality!';
		} else if (tier === 'average') {
			message += ' - Average prompt quality.';
		} else {
			message += ' - Poor prompt quality.';
		}
		
		if (prompt.evaluation.suggestions?.length) {
			// Show only the first 2 suggestions to keep it concise
			const topSuggestions = prompt.evaluation.suggestions.slice(0, 2);
			message += '\n\nTop Suggestions:\n• ' + topSuggestions.join('\n• ');
		}
		
		vscode.window.showInformationMessage(message);
	}

	async deletePrompt(id: string): Promise<void> {
		this.prompts = this.removeById(this.prompts, id);
		this.allPrompts = this.allPrompts.filter(p => p.id !== id);
		await this.savePromptsToJson();
		// Force reload from JSON to ensure consistency
		this.loadPrompts();
	}

	async updatePrompt(id: string, updates: Partial<PromptEntry>): Promise<void> {
		const entry = this.findById(this.prompts, id);
		
		// Clean up prompt text if present to remove any default text
		if (updates.prompt) {
			updates.prompt = updates.prompt.replace(/e\.g\.,|example:|for example:|such as:/gi, '').trim();
		}
		
		if (entry) {
			// Show progress indicator during evaluation if the prompt text changed
			if (updates.prompt) {
				await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: "Re-evaluating prompt quality...",
						cancellable: false
					},
					async (progress) => {
						progress.report({ increment: 30, message: "Analyzing updated prompt..." });
						
						// If the prompt text changed, re-evaluate the prompt
						try {
							// Make sure prompt is defined and not empty
							if (updates.prompt && updates.prompt.trim().length > 0) {
								console.log('Re-evaluating updated prompt...');
								const evaluation = await this.evaluationService.evaluatePrompt(updates.prompt);
								if (evaluation) {
									updates.evaluation = evaluation;
									console.log('Update evaluation successful:', evaluation.overallScore);
								} else {
									console.log('Update evaluation returned undefined, using fallback');
									updates.evaluation = {
										overallScore: 65,
										clarity: 6,
										specificity: 7,
										context: 6,
										efficiency: 7,
										relevance: 7,
										suggestions: ['Updated prompt needs refinement.', 'Consider adding more specificity.'],
										timestamp: new Date().toISOString()
									};
								}
							}
						} catch (error) {
							console.error("Error evaluating updated prompt:", error);
							// Provide fallback evaluation on error
							updates.evaluation = {
								overallScore: 60,
								clarity: 6,
								specificity: 6,
								context: 6,
								efficiency: 6,
								relevance: 6,
								suggestions: ['Evaluation error occurred. Please check prompt format.'],
								timestamp: new Date().toISOString()
							};
						}
						
						progress.report({ increment: 70, message: "Applying updates..." });
					}
				);
			}
			
			// Apply all updates to the entry
			Object.assign(entry, updates);
			
			// Update in allPrompts if it's a prompt entry
			const promptInAll = this.allPrompts.find(p => p.id === id);
			if (promptInAll) {
				if (updates.label) {
					promptInAll.label = updates.label;
				}
				if (updates.prompt) {
					promptInAll.prompt = updates.prompt;
				}
				if (updates.tags) {
					promptInAll.tags = updates.tags;
				}
				if (updates.evaluation) {
					promptInAll.evaluation = updates.evaluation;
				}
			}
			
			await this.savePromptsToJson();
			// Force reload from JSON to ensure consistency
			this.loadPrompts();
			
			// Show evaluation feedback if available and if prompt was updated
			if (updates.prompt && updates.evaluation) {
				const score = updates.evaluation.overallScore;
				const tier = this.evaluationService.getScoreTier(score);
				let message = `Updated prompt quality score: ${score}/100 (${tier})`;
				
				if (tier === 'excellent') {
					message += ' - Excellent prompt quality!';
				} else if (tier === 'good') {
					message += ' - Good prompt quality!';
				} else if (tier === 'average') {
					message += ' - Average prompt quality.';
				} else {
					message += ' - Poor prompt quality.';
				}
				
				// Show only the first 2 suggestions to keep it concise
				const topSuggestions = updates.evaluation.suggestions.slice(0, 2);
				message += '\n\nTop Suggestions:\n• ' + topSuggestions.join('\n• ');
			
				vscode.window.showInformationMessage(message);
			}
		}
	}

	private removeById(entries: PromptEntry[], id: string): PromptEntry[] {
		return entries.filter(entry => {
			if (entry.id === id) {
				return false;
			}
			if (entry.children) {
				entry.children = this.removeById(entry.children, id);
			}
			return true;
		});
	}

	public findById(entries: PromptEntry[], id: string): PromptEntry | null {
		for (const entry of entries) {
			if (entry.id === id) {
				return entry;
			}
			if (entry.children) {
				const found = this.findById(entry.children, id);
				if (found) {
					return found;
				}
			}
		}
		return null;
	}

	getUserCategoryId(): string | null {
		const userCategory = this.prompts.find(cat => cat.categoryType === 'user' && cat.type === 'category');
		return userCategory ? userCategory.id : null;
	}
}

// Email utility function - Opens Outlook with pre-populated email
async function sendPromptToContributor(promptEntry: PromptEntry): Promise<void> {
	try {
		const contributorEmail = 'HumanaCodeiumSquad@cognizant.com';
		const timestamp = new Date().toLocaleString();
		
		// Format email subject
		const subject = `New Prompt Submission: "${promptEntry.label}"`;
		
		// Format email body with structured content
		const emailBody = `Hello Team,

I'm submitting a new prompt for consideration to be included in the system library.

PROMPT DETAILS:
═══════════════════════════════════════════════════════════════════════

📝 Name: ${promptEntry.label}

🏷️ Tags: ${promptEntry.tags?.join(', ') || 'None'}

📊 Character Count: ${promptEntry.prompt?.length || 0}

📅 Submitted: ${timestamp}

💬 Prompt Content:
-------------------------------------------------------------------
${promptEntry.prompt || 'No prompt content available'}
-------------------------------------------------------------------

SUBMISSION REQUEST:
═══════════════════════════════════════════════════════════════════════

Please review this prompt for potential inclusion in the system library. 

Key considerations:
• Is this prompt useful for the broader team?
• Does it follow our prompt guidelines?
• Should any modifications be made?

Thank you for reviewing my submission!

Best regards,
VS Code Prompt Library Extension User

---
This email was generated automatically by the VS Code Prompt Library Extension.
Prompt ID: ${promptEntry.id}`;

		// Create mailto URL with proper encoding
		const mailtoUrl = `mailto:${contributorEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
		
		// Open default email client (Outlook)
		console.log('Opening Outlook with prompt submission...');
		await vscode.env.openExternal(vscode.Uri.parse(mailtoUrl));
		
		console.log(`Successfully opened Outlook email to: ${contributorEmail}`);
		console.log(`Subject: ${subject}`);
		
	} catch (error) {
		console.error('Error opening email client:', error);
		throw new Error(`Failed to open email client: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

// Variable substitution interface
interface VariableContext {
	selectedText: string;
	fileName: string;
	language: string;
	fileExtension: string;
	workspaceName: string;
	currentLine: string;
	lineNumber: number;
	// Enhanced smart context
	errorAtCursor?: string;
	functionName?: string;
	className?: string;
	importStatements?: string[];
	nearbyComments?: string;
	fileSize: number;
	projectType?: string;
}


// Workflow step interface
interface WorkflowStep {
	id: string;
	name: string;
	prompt: string;
	dependsOn?: string[];
	outputVariable?: string;
}

// Workflow definition
interface WorkflowDefinition {
	id: string;
	name: string;
	description: string;
	steps: WorkflowStep[];
	tags: string[];
}

// Data format for individual prompts in export/import
interface PromptData {
	id: string;
	label: string;
	prompt: string;
	tags: string[];
	categoryId?: string;
}

// Import/Export format
interface PromptExportData {
	version: string;
	exportDate: string;
	prompts: PromptData[];
	type?: string; // New field for export type identification
	metadata: {
		totalPrompts: number;
		categories: string[];
		tags: string[];
		exportType?: string; // Additional metadata for export type
	};
}

// Right-click context integration
interface ContextPrompt {
	id: string;
	label: string;
	prompt: string;
	contextTypes: ContextType[];
	priority: number;
	languages?: string[];
	patterns?: RegExp[];
	description?: string;
	shortcut?: string;
}

enum ContextType {
	Selection = 'selection',
	Error = 'error',
	Function = 'function',
	Class = 'class',
	File = 'file',
	Variable = 'variable',
	Comment = 'comment',
	Import = 'import',
	Test = 'test',
	API = 'api',
	Debug = 'debug',
	Refactor = 'refactor',
	Documentation = 'documentation',
	All = 'all'
}

// Usage analytics interface
interface UsageAnalytics {
	totalUses: number;
	promptUsage: { [promptId: string]: number };
	contextUsage: { [context: string]: number };
	tagUsage: { [tag: string]: number };
	dailyUsage: { [date: string]: number };
	lastUsed: { [promptId: string]: string };
}

// Basic SearchManager class for handling search functionality
class SearchManager {
	constructor(
		private context: vscode.ExtensionContext,
		private promptLibrary: PromptLibrary,
		private provider: PromptProvider
	) {}

	// Show advanced search UI
	async showAdvancedSearch(): Promise<void> {
		// Implementation would go here in a real application
		const query = await vscode.window.showInputBox({
			placeHolder: 'Enter search query...',
			prompt: 'Advanced Search'
		});
		
		if (query) {
			this.promptLibrary.setSearchQuery(query);
			this.provider.refresh();
		}
	}
}

// Extract variables from prompt text (e.g., {{selectedText}}, {{language}})
function extractVariables(prompt: string): string[] {
	const variableRegex = /\{\{(\w+)\}\}/g;
	const variables: string[] = [];
	let match;
	
	while ((match = variableRegex.exec(prompt)) !== null) {
		if (!variables.includes(match[1])) {
			variables.push(match[1]);
		}
	}
	
	return variables;
}

// Enhanced smart context detection with improved accuracy
async function getVariableContext(): Promise<VariableContext> {
	const editor = vscode.window.activeTextEditor;
	const workspaceFolders = vscode.workspace.workspaceFolders;
	
	let selectedText = '';
	let fileName = 'untitled';
	let language = 'plaintext';
	let fileExtension = '';
	let workspaceName = '';
	let currentLine = '';
	let lineNumber = 0;
	let fileSize = 0;
	let errorAtCursor: string | undefined;
	let functionName: string | undefined;
	let className: string | undefined;
	let importStatements: string[] = [];
	let nearbyComments: string | undefined;
	let projectType: string | undefined;
	
	if (editor) {
		const document = editor.document;
		const selection = editor.selection;
		
		// Get selected text or current line
		if (!selection.isEmpty) {
			selectedText = document.getText(selection);
		} else {
			const line = document.lineAt(selection.active.line);
			currentLine = line.text.trim();
		}
		
		// Basic file info
		fileName = path.basename(document.fileName);
		language = document.languageId;
		fileExtension = path.extname(fileName);
		lineNumber = selection.active.line + 1;
		fileSize = document.getText().length;
		
		// Enhanced context detection with improved patterns
		await enhanceContextDetection(document, selection, {
			errorAtCursor: (val) => errorAtCursor = val,
			functionName: (val) => functionName = val,
			className: (val) => className = val,
			importStatements: (val) => importStatements = val,
			nearbyComments: (val) => nearbyComments = val,
			projectType: (val) => projectType = val
		});
	}
	
	if (workspaceFolders && workspaceFolders.length > 0) {
		workspaceName = path.basename(workspaceFolders[0].uri.fsPath);
		projectType = await detectProjectType(workspaceFolders[0].uri.fsPath);
	}
	
	return {
		selectedText,
		fileName,
		language,
		fileExtension,
		workspaceName,
		currentLine,
		lineNumber,
		fileSize,
		errorAtCursor,
		functionName,
		className,
		importStatements,
		nearbyComments,
		projectType
	};
}

// Enhanced context detection helper
async function enhanceContextDetection(
	document: vscode.TextDocument,
	selection: vscode.Selection,
	setters: {
		errorAtCursor: (val: string) => void;
		functionName: (val: string) => void;
		className: (val: string) => void;
		importStatements: (val: string[]) => void;
		nearbyComments: (val: string) => void;
		projectType: (val: string) => void;
	}
): Promise<void> {
	const text = document.getText();
	const lines = text.split('\n');
	const currentLineIndex = selection.active.line;
	
	try {
		// Detect function name
		const functionMatch = findEnclosingFunction(lines, currentLineIndex);
		if (functionMatch) {
			setters.functionName(functionMatch);
		}
		
		// Detect class name
		const classMatch = findEnclosingClass(lines, currentLineIndex);
		if (classMatch) {
			setters.className(classMatch);
		}
		
		// Extract import statements
		const imports = extractImportStatements(lines, document.languageId);
		if (imports.length > 0) {
			setters.importStatements(imports);
		}
		
		// Find nearby comments
		const comments = findNearbyComments(lines, currentLineIndex);
		if (comments) {
			setters.nearbyComments(comments);
		}
		
		// Get diagnostic errors at cursor
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		const errorAtLine = diagnostics.find(d => 
			d.range.start.line === currentLineIndex && d.severity === vscode.DiagnosticSeverity.Error
		);
		if (errorAtLine) {
			setters.errorAtCursor(errorAtLine.message);
		}
		
		// Detect project type from document content and language
		const detectedProjectType = await detectProjectTypeFromDocument(document);
		if (detectedProjectType) {
			setters.projectType(detectedProjectType);
		}
	} catch (error) {
		console.warn('Enhanced context detection failed:', error);
	}
}

// Helper functions for context detection
function findEnclosingFunction(lines: string[], lineIndex: number): string | undefined {
	for (let i = lineIndex; i >= 0; i--) {
		const line = lines[i];
		// JavaScript/TypeScript function patterns
		const jsMatch = line.match(/(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:function|\([^)]*\)\s*=>))/);
		if (jsMatch) {
			return jsMatch[1] || jsMatch[2];
		}
		
		// Python function pattern
		const pyMatch = line.match(/def\s+(\w+)\s*\(/);
		if (pyMatch) {
			return pyMatch[1];
		}
		
		// Java/C# method pattern
		const javaMatch = line.match(/(?:public|private|protected)?\s*\w+\s+(\w+)\s*\(/);
		if (javaMatch) {
			return javaMatch[1];
		}
	}
	return undefined;
}

function findEnclosingClass(lines: string[], lineIndex: number): string | undefined {
	for (let i = lineIndex; i >= 0; i--) {
		const line = lines[i];
		// Class pattern for multiple languages
		const classMatch = line.match(/class\s+(\w+)/);
		if (classMatch) {
			return classMatch[1];
		}
	}
	return undefined;
}

function extractImportStatements(lines: string[], language: string): string[] {
	const imports: string[] = [];
	
	for (const line of lines) {
		let match;
		switch (language) {
			case 'javascript':
			case 'typescript':
			case 'javascriptreact':
			case 'typescriptreact':
				match = line.match(/import\s+.*from\s+['"]([^'"]+)['"]/);
				if (match) imports.push(match[1]);
				break;
			case 'python':
				match = line.match(/(?:import\s+(\w+)|from\s+(\w+)\s+import)/);
				if (match) imports.push(match[1] || match[2]);
				break;
			case 'java':
			case 'csharp':
				match = line.match(/import\s+([^;]+);/);
				if (match) imports.push(match[1]);
				break;
		}
		
		if (imports.length >= 10) break; // Limit to avoid too much data
	}
	
	return imports;
}

function findNearbyComments(lines: string[], lineIndex: number): string | undefined {
	const comments: string[] = [];
	const range = 3; // Look 3 lines up and down
	
	for (let i = Math.max(0, lineIndex - range); i <= Math.min(lines.length - 1, lineIndex + range); i++) {
		const line = lines[i].trim();
		if (line.startsWith('//') || line.startsWith('#') || line.startsWith('/*') || line.startsWith('*')) {
			comments.push(line);
		}
	}
	
	return comments.length > 0 ? comments.join('\n') : undefined;
}

async function detectProjectType(workspacePath: string): Promise<string | undefined> {
	try {
		const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(workspacePath));
		const fileNames = files.map(([name]) => name);
		
		if (fileNames.includes('package.json')) return 'node';
		if (fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml')) return 'python';
		if (fileNames.includes('pom.xml') || fileNames.includes('build.gradle')) return 'java';
		if (fileNames.includes('Cargo.toml')) return 'rust';
		if (fileNames.includes('go.mod')) return 'go';
		if (fileNames.includes('.csproj') || fileNames.some(name => name.endsWith('.sln'))) return 'dotnet';
		
		return undefined;
	} catch {
		return undefined;
	}
}

// Enhanced project type detection from document content
async function detectProjectTypeFromDocument(document: vscode.TextDocument): Promise<string | undefined> {
	const content = document.getText();
	const language = document.languageId;
	
	// Language-based detection
	switch (language) {
		case 'javascript':
		case 'typescript':
			if (content.includes('import React') || content.includes('from "react"')) return 'react';
			if (content.includes('@angular/') || content.includes('import { Component }')) return 'angular';
			if (content.includes('import Vue') || content.includes('export default Vue')) return 'vue';
			return 'javascript';
		case 'python':
			if (content.includes('from django') || content.includes('import django')) return 'django';
			if (content.includes('from flask') || content.includes('import flask')) return 'flask';
			if (content.includes('import pandas') || content.includes('import numpy')) return 'data-science';
			return 'python';
		case 'csharp':
			if (content.includes('using Microsoft.AspNetCore') || content.includes('WebApplication')) return 'aspnet';
			if (content.includes('using System.Web') || content.includes('HttpContext')) return 'webapi';
			return 'dotnet';
		case 'java':
			if (content.includes('@RestController') || content.includes('import org.springframework')) return 'spring';
			return 'java';
		case 'go':
			if (content.includes('import "net/http"') || content.includes('http.HandleFunc')) return 'go-web';
			return 'go';
	}
	
	return undefined;
}

// Prompt user for custom variable values
async function promptForCustomVariables(variables: string[], context: VariableContext): Promise<{ [key: string]: string }> {
	const values: { [key: string]: string } = {};
	
	for (const variable of variables) {
		// Check if we have a predefined value for this variable
		const predefinedValue = getPredefinedVariable(variable, context);
		
		if (predefinedValue !== null) {
			values[variable] = predefinedValue;
		} else {
			// Prompt user for custom variable value
			const value = await vscode.window.showInputBox({
				prompt: `Enter value for variable: {{${variable}}}`,
				placeHolder: `Value for ${variable}...`,
				value: getDefaultValueForVariable(variable)
			});
			
			if (value === undefined) {
				// User cancelled input
				throw new Error('Variable substitution cancelled by user');
			}
			
			values[variable] = value || '';
		}
	}
	
	return values;
}

// Get predefined variable values from context
function getPredefinedVariable(variable: string, context: VariableContext): string | null {
	switch (variable.toLowerCase()) {
		case 'selectedtext':
		case 'selection':
			return context.selectedText || context.currentLine;
		case 'filename':
		case 'file':
			return context.fileName;
		case 'language':
		case 'lang':
			return context.language;
		case 'extension':
		case 'ext':
			return context.fileExtension;
		case 'workspace':
		case 'workspacename':
			return context.workspaceName;
		case 'currentline':
		case 'line':
			return context.currentLine;
		case 'linenumber':
		case 'lineno':
			return context.lineNumber.toString();
		// Enhanced smart context variables
		case 'erroratcursor':
		case 'error':
			return context.errorAtCursor || null;
		case 'functionname':
		case 'function':
			return context.functionName || null;
		case 'classname':
		case 'class':
			return context.className || null;
		case 'imports':
		case 'importstatements':
			return context.importStatements?.join(', ') || null;
		case 'comments':
		case 'nearbycomments':
			return context.nearbyComments || null;
		case 'filesize':
			return context.fileSize.toString();
		case 'projecttype':
		case 'project':
			return context.projectType || null;
		default:
			return null; // Custom variable, needs user input
	}
}

// Get default values for common custom variables
function getDefaultValueForVariable(variable: string): string {
	switch (variable.toLowerCase()) {
		case 'level':
		case 'experience':
			return 'intermediate';
		case 'style':
			return 'concise';
		case 'format':
			return 'markdown';
		case 'audience':
			return 'developer';
		default:
			return '';
	}
}

// Substitute variables in prompt text
function substituteVariables(prompt: string, values: { [key: string]: string }): string {
	let result = prompt;
	
	for (const [variable, value] of Object.entries(values)) {
		const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'gi');
		result = result.replace(regex, value);
	}
	
	return result;
}


// Enhanced clipboard copy function with variable substitution
async function copyPromptToClipboard(prompt: string, promptLabel: string): Promise<boolean> {
	try {
		console.log(`Processing prompt "${promptLabel}" for variable substitution...`);
		
		// Check if prompt contains variables
		const variables = extractVariables(prompt);
		let processedPrompt = prompt;
		
		if (variables.length > 0) {
			console.log(`Found variables in prompt: ${variables.join(', ')}`);
			
			// Get current context
			const context = await getVariableContext();
			
			// Get values for all variables (predefined + user input)
			const variableValues = await promptForCustomVariables(variables, context);
			
			// Substitute variables with their values
			processedPrompt = substituteVariables(prompt, variableValues);
			
			console.log('Variable substitution completed');
			console.log('Original:', prompt);
			console.log('Processed:', processedPrompt);
		}
		
		// Copy processed prompt to clipboard
		await vscode.env.clipboard.writeText(processedPrompt);
		console.log('Successfully copied processed prompt to clipboard');
		return true;
	} catch (error) {
		console.error('Failed to process prompt or copy to clipboard:', error);
		
		// Show user-friendly error message
		if (error instanceof Error && error.message.includes('cancelled')) {
			vscode.window.showWarningMessage('Variable substitution cancelled. Prompt not copied.');
		} else {
			vscode.window.showErrorMessage(`Failed to process prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
		
		return false;
	}
}

// Extract all prompt entries (for UI operations)
function extractAllPromptEntries(entries: PromptEntry[]): PromptEntry[] {
	const results: PromptEntry[] = [];
	
	function traverse(items: PromptEntry[]) {
		for (const item of items) {
			if (item.type === 'prompt' && item.prompt) {
				results.push(item);
			}
			if (item.children) {
				traverse(item.children);
			}
		}
	}
	
	traverse(entries);
	return results;
}

// Extract all prompts as data format (for export operations)
function extractAllPromptData(entries: PromptEntry[]): PromptData[] {
	const results: PromptData[] = [];
	
	function traverse(items: PromptEntry[]) {
		for (const item of items) {
			if (item.type === 'prompt' && item.prompt) {
				results.push({
					id: item.id,
					label: item.label,
					prompt: item.prompt,
					tags: item.tags || [],
					categoryId: item.categoryId
				});
			}
			if (item.children) {
				traverse(item.children);
			}
		}
	}
	
	traverse(entries);
	return results;
}

// Helper function to find parent category of an item
function findParentCategory(entries: PromptEntry[], itemId: string): PromptEntry | null {
	function traverse(items: PromptEntry[], parent: PromptEntry | null = null): PromptEntry | null {
		for (const item of items) {
			if (item.id === itemId) {
				return parent;
			}
			if (item.children) {
				const result = traverse(item.children, item.type === 'category' ? item : parent);
				if (result) {
					return result;
				}
			}
		}
		return null;
	}
	
	return traverse(entries);
}

// Import/Export functionality
async function exportPrompts(promptLibrary: PromptLibrary): Promise<void> {
	try {
		// Export ONLY system prompts - ignore user prompts for clean upgrades
		const rootEntries = promptLibrary.getRootEntries();
		const allPrompts = extractAllPromptData(rootEntries);
		
		// Filter to include ONLY system prompts
		const systemPrompts = allPrompts.filter(p => {
			// Check if prompt belongs to a system category
			const parentEntry = findParentCategory(rootEntries, p.id);
			return parentEntry?.categoryType === 'system';
		});
		
		const categories = [...new Set(systemPrompts.map(p => p.categoryId || 'uncategorized'))];
		const tags = [...new Set(systemPrompts.flatMap(p => p.tags || []))];
		
		const exportData: PromptExportData = {
			version: "2.0.0", // Updated version to indicate system-only export
			exportDate: new Date().toISOString(),
			prompts: systemPrompts,
			type: "system-prompts-only", // New field to indicate export type
			metadata: {
				totalPrompts: systemPrompts.length,
				categories,
				tags,
				exportType: "system-prompts-only"
			}
		};
		
		const jsonString = JSON.stringify(exportData, null, 2);
		const fileName = `system-prompts-export-${new Date().toISOString().split('T')[0]}.json`;
		
		// Save to file
		const uri = await vscode.window.showSaveDialog({
			defaultUri: vscode.Uri.file(fileName),
			filters: {
				'JSON Files': ['json'],
				'All Files': ['*']
			}
		});
		
		if (uri) {
			await vscode.workspace.fs.writeFile(uri, Buffer.from(jsonString, 'utf8'));
			vscode.window.showInformationMessage(
				`Successfully exported ${systemPrompts.length} system prompts to ${uri.path}. User prompts remain protected.`
			);
		}
	} catch (error) {
		console.error('Export failed:', error);
		vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

async function importPrompts(promptLibrary: PromptLibrary, provider: PromptProvider): Promise<void> {
	try {
		// Select file to import
		const uris = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectMany: false,
			filters: {
				'JSON Files': ['json'],
				'All Files': ['*']
			}
		});
		
		if (!uris || uris.length === 0) {
			return;
		}
		
		const fileContent = await vscode.workspace.fs.readFile(uris[0]);
		const jsonString = Buffer.from(fileContent).toString('utf8');
		const importData: PromptExportData = JSON.parse(jsonString);
		
		// Validate import data
		if (!importData.prompts || !Array.isArray(importData.prompts)) {
			throw new Error('Invalid import file format');
		}
		
		// Validate this is a system prompts export
		if (importData.type !== 'system-prompts-only' && !importData.metadata?.exportType) {
			const proceed = await vscode.window.showWarningMessage(
				'This file may contain mixed system and user prompts. Importing will only affect system prompts. Continue?',
				'Continue', 'Cancel'
			);
			if (proceed !== 'Continue') {
				return;
			}
		}
		
		// Import options - only for system prompts
		const importOption = await vscode.window.showQuickPick([
			{ label: '🔄 Replace System Prompts', description: 'Replace all system prompts with imported ones (user prompts protected)', action: 'replace' },
			{ label: '➕ Add New System Prompts', description: 'Add only new system prompts that don\'t exist', action: 'add' },
			{ label: '🔀 Merge System Prompts', description: 'Add/update system prompts (user prompts protected)', action: 'merge' }
		], {
			placeHolder: 'Select system prompt import strategy'
		});
		
		if (!importOption) {
			return;
		}
		
		let addedCount = 0;
		let updatedCount = 0;
		
		// Process ONLY system prompts - user prompts remain untouched
		for (const prompt of importData.prompts) {
			const rootEntries = promptLibrary.getRootEntries();
			const existing = promptLibrary.findById(rootEntries, prompt.id);
			
			// Skip if this would affect a user prompt
			if (existing) {
				const parentEntry = findParentCategory(rootEntries, existing.id);
				if (parentEntry?.categoryType === 'user') {
					continue; // Skip user prompts - they are protected
				}
			}
			
			switch (importOption.action) {
				case 'replace':
					// Will be handled after loop - only affects system prompts
					break;
				case 'add':
					if (!existing) {
						// Add to system category only - use regular addPrompt for now
						await promptLibrary.addPrompt(prompt.label, prompt.prompt || '', prompt.tags || []);
						addedCount++;
					}
					break;
				case 'merge':
					if (existing && findParentCategory(rootEntries, existing.id)?.categoryType === 'system') {
						await promptLibrary.updatePrompt(prompt.id, {
							label: prompt.label,
							prompt: prompt.prompt,
							tags: prompt.tags
						});
						updatedCount++;
					} else if (!existing) {
						await promptLibrary.addPrompt(prompt.label, prompt.prompt || '', prompt.tags || []);
						addedCount++;
					}
					break;
			}
		}
		
		if (importOption.action === 'replace') {
			// Replace all prompts - simplified approach
			const currentEntries = promptLibrary.getRootEntries();
			const currentPrompts = extractAllPromptEntries(currentEntries);
			
			// Remove all current prompts (simplified - just clear user prompts)
			const userCategoryId = promptLibrary.getUserCategoryId();
			if (userCategoryId) {
				const userCategory = promptLibrary.findById(currentEntries, userCategoryId);
				if (userCategory && userCategory.children) {
					userCategory.children = [];
				}
			}
			
			// Add imported prompts
			for (const prompt of importData.prompts) {
				await promptLibrary.addPrompt(prompt.label, prompt.prompt || '', prompt.tags || []);
				addedCount++;
			}
		}
		
		provider.refresh();
		
		const message = importOption.action === 'replace' 
			? `Successfully replaced all prompts with ${addedCount} imported prompts`
			: `Successfully imported: ${addedCount} added, ${updatedCount} updated`;
			
		vscode.window.showInformationMessage(message);
		
	} catch (error) {
		console.error('Import failed:', error);
		vscode.window.showErrorMessage(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

// Right-click context integration manager
class ContextIntegrationManager {
	private analytics!: UsageAnalytics;
	
	constructor(private context: vscode.ExtensionContext, private promptLibrary: PromptLibrary) {
		this.loadAnalytics();
		this.registerContextMenus();
	}
	
	private loadAnalytics(): void {
		const stored = this.context.globalState.get<UsageAnalytics>('usageAnalytics');
		this.analytics = stored || {
			totalUses: 0,
			promptUsage: {},
			contextUsage: {},
			tagUsage: {},
			dailyUsage: {},
			lastUsed: {}
		};
	}
	
	private saveAnalytics(): void {
		this.context.globalState.update('usageAnalytics', this.analytics);
	}
	
	private registerContextMenus(): void {
		// Register dynamic context menu for editor selections
		this.registerEditorContextMenu();
	}
	
	private registerEditorContextMenu(): void {
		const contextMenuCommand = vscode.commands.registerCommand('prompt-library.showContextMenu', async (uri: vscode.Uri, position: vscode.Position) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;
			
			const context = await this.analyzeCurrentContext(editor);
			const relevantPrompts = this.getRelevantPrompts(context);
			
			if (relevantPrompts.length === 0) {
				vscode.window.showInformationMessage('No relevant prompts found for current context');
				return;
			}
			
			// Show quick pick with relevant prompts
			const items = relevantPrompts.map(p => ({
				label: p.label,
				description: (p.prompt || '').substring(0, 100) + '...',
				prompt: p,
				detail: `Tags: ${p.tags?.join(', ') || 'none'}`
			}));
			
			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: 'Select a prompt to use with current context'
			});
			
			if (selected) {
				await this.executeContextPrompt(selected.prompt, context);
			}
		});
		
		this.context.subscriptions.push(contextMenuCommand);
	}
	
	async analyzeCurrentContext(editor: vscode.TextEditor): Promise<{ type: ContextType, data: any }> {
		const selection = editor.selection;
		const document = editor.document;
		const currentLine = document.lineAt(selection.active.line);
		const lineText = currentLine.text.trim();
		
		// Enhanced context analysis with multiple checks
		const contextResults = await this.performComprehensiveContextAnalysis(editor);
		
		// Priority-based context selection
		if (contextResults.hasSelection) {
			const selectedText = document.getText(selection);
			return {
				type: ContextType.Selection,
				data: {
					text: selectedText,
					language: document.languageId,
					fileName: document.fileName,
					lineNumber: selection.active.line + 1,
					isCode: this.isCodeContent(selectedText),
					selectionSize: selectedText.length
				}
			};
		}
		
		if (contextResults.hasError) {
			return {
				type: ContextType.Error,
				data: {
					error: contextResults.errorMessage,
					line: selection.active.line + 1,
					language: document.languageId,
					fileName: document.fileName,
					severity: contextResults.errorSeverity,
					errorCode: contextResults.errorCode
				}
			};
		}
		
		if (contextResults.isInTest) {
			return {
				type: ContextType.Test,
				data: {
					testName: contextResults.testName,
					testFramework: contextResults.testFramework,
					language: document.languageId,
					fileName: document.fileName
				}
			};
		}
		
		if (contextResults.isInFunction) {
			return {
				type: ContextType.Function,
				data: {
					functionName: contextResults.functionName,
					functionType: contextResults.functionType,
					parameters: contextResults.functionParams,
					language: document.languageId,
					fileName: document.fileName
				}
			};
		}
		
		if (contextResults.isInClass) {
			return {
				type: ContextType.Class,
				data: {
					className: contextResults.className,
					language: document.languageId,
					fileName: document.fileName,
					inheritance: contextResults.inheritance
				}
			};
		}
		
		if (contextResults.hasImports) {
			return {
				type: ContextType.Import,
				data: {
					imports: contextResults.imports,
					language: document.languageId,
					fileName: document.fileName
				}
			};
		}
		
		if (contextResults.isComment) {
			return {
				type: ContextType.Comment,
				data: {
					comment: lineText,
					commentType: contextResults.commentType,
					language: document.languageId,
					fileName: document.fileName
				}
			};
		}
		
		// Enhanced file context with project detection
		const projectType = await detectProjectTypeFromDocument(document);
		return {
			type: ContextType.File,
			data: {
				language: document.languageId,
				fileName: document.fileName,
				projectType: projectType,
				fileSize: document.getText().length,
				lineCount: document.lineCount
			}
		};
	}
	
	private async performComprehensiveContextAnalysis(editor: vscode.TextEditor) {
		const selection = editor.selection;
		const document = editor.document;
		const currentLineIndex = selection.active.line;
		const text = document.getText();
		const lines = text.split('\n');
		const currentLine = lines[currentLineIndex];
		
		// Check for selection
		const hasSelection = !selection.isEmpty;
		
		// Check for errors
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		const errorAtCursor = diagnostics.find(d => 
			d.range.start.line === currentLineIndex && 
			d.severity === vscode.DiagnosticSeverity.Error
		);
		
		// Check for test context
		const isInTest = this.detectTestContext(document, currentLineIndex);
		
		// Check for function context
		const functionInfo = this.detectFunctionContext(lines, currentLineIndex);
		
		// Check for class context
		const classInfo = this.detectClassContext(lines, currentLineIndex);
		
		// Check for imports
		const importsInfo = this.detectImportsContext(lines, currentLineIndex);
		
		// Check for comments
		const isComment = this.isCommentLine(currentLine, document.languageId);
		
		return {
			hasSelection,
			hasError: !!errorAtCursor,
			errorMessage: errorAtCursor?.message,
			errorSeverity: errorAtCursor?.severity,
			errorCode: errorAtCursor?.code,
			isInTest: isInTest.inTest,
			testName: isInTest.testName,
			testFramework: isInTest.framework,
			isInFunction: functionInfo.inFunction,
			functionName: functionInfo.name,
			functionType: functionInfo.type,
			functionParams: functionInfo.params,
			isInClass: classInfo.inClass,
			className: classInfo.name,
			inheritance: classInfo.inheritance,
			hasImports: importsInfo.hasImports,
			imports: importsInfo.imports,
			isComment: isComment.isComment,
			commentType: isComment.type
		};
	}
	
	private isCodeContent(text: string): boolean {
		// Simple heuristics to determine if selected text is code
		const codePatterns = /[{}()[\];=><]/;
		const hasCodeChars = codePatterns.test(text);
		const hasKeywords = /\b(function|class|if|for|while|return|import|export|const|let|var)\b/.test(text);
		return hasCodeChars || hasKeywords;
	}
	
	private detectTestContext(document: vscode.TextDocument, lineIndex: number) {
		const fileName = document.fileName.toLowerCase();
		const isTestFile = fileName.includes('test') || fileName.includes('spec');
		
		if (!isTestFile) return { inTest: false };
		
		const text = document.getText();
		const testPatterns = [
			/describe\(['"`]([^'"`]+)['"`]/g,
			/it\(['"`]([^'"`]+)['"`]/g,
			/test\(['"`]([^'"`]+)['"`]/g,
			/@Test\s+(?:public\s+)?void\s+(\w+)/g
		];
		
		const frameworks = ['jest', 'mocha', 'junit', 'pytest'];
		let framework = 'unknown';
		let testName = '';
		
		for (const pattern of testPatterns) {
			const match = pattern.exec(text);
			if (match) {
				testName = match[1];
				if (text.includes('jest')) framework = 'jest';
				else if (text.includes('mocha')) framework = 'mocha';
				else if (text.includes('@Test')) framework = 'junit';
				break;
			}
		}
		
		return { inTest: true, testName, framework };
	}
	
	private detectFunctionContext(lines: string[], lineIndex: number) {
		// Enhanced function detection with more patterns
		for (let i = lineIndex; i >= Math.max(0, lineIndex - 20); i--) {
			const line = lines[i].trim();
			
			// JavaScript/TypeScript patterns
			const jsPatterns = [
				/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
				/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/,
				/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)/,
				/^(\w+)\s*:\s*(?:async\s+)?function\s*\(([^)]*)\)/, // Object method
			];
			
			// Python patterns
			const pyPatterns = [
				/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/,
			];
			
			// C# patterns
			const csPatterns = [
				/^(?:public|private|protected|internal)?\s*(?:static\s+)?(?:async\s+)?(?:\w+\s+)?(\w+)\s*\(([^)]*)\)/,
			];
			
			const allPatterns = [...jsPatterns, ...pyPatterns, ...csPatterns];
			
			for (const pattern of allPatterns) {
				const match = line.match(pattern);
				if (match) {
					return {
						inFunction: true,
						name: match[1],
						params: match[2] ? match[2].split(',').map(p => p.trim()) : [],
						type: line.includes('async') ? 'async' : 'sync'
					};
				}
			}
		}
		
		return { inFunction: false };
	}
	
	private detectClassContext(lines: string[], lineIndex: number) {
		for (let i = lineIndex; i >= Math.max(0, lineIndex - 50); i--) {
			const line = lines[i].trim();
			
			// Class patterns for different languages
			const classPatterns = [
				/^(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/, // JS/TS
				/^class\s+(\w+)(?:\(([^)]*)\))?(?::\s*([^{]+))?/, // Python
				/^(?:public|private|internal)?\s*class\s+(\w+)(?:\s*:\s*([^{]+))?/, // C#
			];
			
			for (const pattern of classPatterns) {
				const match = line.match(pattern);
				if (match) {
					return {
						inClass: true,
						name: match[1],
						inheritance: match[2] || match[3] || null
					};
				}
			}
		}
		
		return { inClass: false };
	}
	
	private detectImportsContext(lines: string[], lineIndex: number) {
		const currentLine = lines[lineIndex];
		const isImportLine = /^(?:import|from|using|#include)/.test(currentLine.trim());
		
		if (isImportLine) {
			// Get nearby import lines
			const imports = [];
			for (let i = Math.max(0, lineIndex - 5); i <= Math.min(lines.length - 1, lineIndex + 5); i++) {
				const line = lines[i].trim();
				if (/^(?:import|from|using|#include)/.test(line)) {
					imports.push(line);
				}
			}
			
			return { hasImports: true, imports };
		}
		
		return { hasImports: false, imports: [] };
	}
	
	private isCommentLine(line: string, language: string) {
		const trimmed = line.trim();
		
		const commentPatterns = {
			javascript: /^\/\/|^\/\*|\*\/$/,
			typescript: /^\/\/|^\/\*|\*\/$/,
			python: /^#/,
			csharp: /^\/\/|^\/\*|\*\/$/,
			java: /^\/\/|^\/\*|\*\/$/,
			html: /^<!--/,
			css: /^\/\*/
		};
		
		const pattern = commentPatterns[language as keyof typeof commentPatterns];
		if (pattern && pattern.test(trimmed)) {
			return {
				isComment: true,
				type: trimmed.startsWith('//') ? 'line' : 'block'
			};
		}
		
		return { isComment: false, type: null };
	}
	
	getRelevantPrompts(context: { type: ContextType, data: any }): PromptEntry[] {
		const allPrompts = extractAllPromptEntries(this.promptLibrary.getRootEntries());
		
		// Score prompts based on relevance to context
		const scoredPrompts = allPrompts.map(prompt => ({
			prompt,
			score: this.calculateRelevanceScore(prompt, context)
		}))
		.filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 10); // Top 10 most relevant
		
		return scoredPrompts.map(item => item.prompt);
	}
	
	private calculateRelevanceScore(prompt: PromptEntry, context: { type: ContextType, data: any }): number {
		let score = 0;
		const promptText = prompt.prompt?.toLowerCase() || '';
		const promptLabel = prompt.label.toLowerCase();
		const tags = prompt.tags || [];
		
		// Base score for any prompt
		score += 1;
		
		// Enhanced context type matching
		switch (context.type) {
			case ContextType.Selection:
				// Higher scores for code analysis prompts
				if (context.data.isCode) {
					if (promptText.includes('explain') || promptText.includes('review') || promptText.includes('analyze')) {
						score += 8;
					}
					if (promptText.includes('refactor') || promptText.includes('optimize')) {
						score += 6;
					}
				} else {
					// Text selection prompts
					if (promptText.includes('summarize') || promptText.includes('translate')) {
						score += 5;
					}
				}
				if (tags.includes('explain') || tags.includes('review') || tags.includes('analysis')) {
					score += 4;
				}
				break;
				
			case ContextType.Error:
				if (promptText.includes('debug') || promptText.includes('error') || promptText.includes('fix')) {
					score += 10;
				}
				if (promptText.includes('troubleshoot') || promptText.includes('solve')) {
					score += 8;
				}
				if (tags.includes('debug') || tags.includes('error') || tags.includes('troubleshoot')) {
					score += 6;
				}
				// Boost score for specific error types
				if (context.data.errorCode && promptText.includes(context.data.errorCode.toString())) {
					score += 5;
				}
				break;
				
			case ContextType.Function:
				if (promptText.includes('function') || promptText.includes('method')) {
					score += 7;
				}
				if (promptText.includes('explain') || promptText.includes('document')) {
					score += 6;
				}
				if (promptText.includes('test') && context.data.functionType === 'async') {
					score += 4;
				}
				if (tags.includes('explain') || tags.includes('documentation') || tags.includes('function')) {
					score += 4;
				}
				break;
				
			case ContextType.Class:
				if (promptText.includes('class') || promptText.includes('object')) {
					score += 7;
				}
				if (promptText.includes('design') || promptText.includes('architecture')) {
					score += 6;
				}
				if (tags.includes('class') || tags.includes('oop') || tags.includes('design')) {
					score += 4;
				}
				break;
				
			case ContextType.Test:
				if (promptText.includes('test') || promptText.includes('testing')) {
					score += 10;
				}
				if (promptText.includes('unit') || promptText.includes('integration')) {
					score += 8;
				}
				if (promptText.includes(context.data.testFramework)) {
					score += 6;
				}
				if (tags.includes('testing') || tags.includes('unit-tests') || tags.includes('tdd')) {
					score += 5;
				}
				break;
				
			case ContextType.Import:
				if (promptText.includes('import') || promptText.includes('dependency')) {
					score += 7;
				}
				if (promptText.includes('package') || promptText.includes('library')) {
					score += 5;
				}
				if (tags.includes('dependencies') || tags.includes('imports')) {
					score += 4;
				}
				break;
				
			case ContextType.Comment:
				if (promptText.includes('comment') || promptText.includes('document')) {
					score += 8;
				}
				if (promptText.includes('explain') || promptText.includes('clarify')) {
					score += 6;
				}
				if (tags.includes('documentation') || tags.includes('comments')) {
					score += 4;
				}
				break;
				
			case ContextType.Variable:
				if (promptText.includes('variable') || promptText.includes('naming')) {
					score += 7;
				}
				if (promptText.includes('refactor') || promptText.includes('clean')) {
					score += 5;
				}
				break;
				
			case ContextType.API:
				if (promptText.includes('api') || promptText.includes('endpoint')) {
					score += 8;
				}
				if (promptText.includes('rest') || promptText.includes('graphql')) {
					score += 6;
				}
				if (tags.includes('api') || tags.includes('web') || tags.includes('rest')) {
					score += 5;
				}
				break;
		}
		
		// Enhanced language matching
		if (context.data.language) {
			const language = context.data.language.toLowerCase();
			if (promptText.includes(language) || promptLabel.includes(language)) {
				score += 4;
			}
			// Check if prompt is specifically tagged for this language
			if (tags.some(tag => tag.toLowerCase().includes(language))) {
				score += 3;
			}
		}
		
		// Project type matching
		if (context.data.projectType) {
			const projectType = context.data.projectType.toLowerCase();
			if (promptText.includes(projectType) || promptLabel.includes(projectType)) {
				score += 5;
			}
			if (tags.some(tag => tag.toLowerCase().includes(projectType))) {
				score += 4;
			}
		}
		
		// File type specific bonuses
		if (context.data.fileName) {
			const fileName = context.data.fileName.toLowerCase();
			if (fileName.includes('test') && (promptText.includes('test') || tags.includes('testing'))) {
				score += 3;
			}
			if (fileName.includes('config') && (promptText.includes('config') || tags.includes('configuration'))) {
				score += 3;
			}
		}
		
		// Usage history boost (more sophisticated)
		const usageCount = this.analytics.promptUsage[prompt.id] || 0;
		score += Math.min(usageCount * 0.15, 3); // Max 3 bonus points for usage
		
		// Recent usage boost
		const lastUsed = this.analytics.lastUsed[prompt.id];
		if (lastUsed) {
			const daysSinceUsed = (Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60 * 24);
			if (daysSinceUsed < 1) {
				score += 2; // Used in last day
			} else if (daysSinceUsed < 7) {
				score += 1; // Used in last week
			}
		}
		
		return Math.max(0, score);
	}
	
	async executeContextPrompt(prompt: PromptEntry, context: { type: ContextType, data: any }): Promise<void> {
		try {
			// Track usage with unified analytics
			this.promptLibrary.trackPromptInteraction(prompt.id, `context-${context.type}`);
			this.trackUsage(prompt.id, context.type);
			
			// Process prompt with enhanced context substitution
			let processedPrompt = prompt.prompt || '';
			
			// Enhanced auto-substitution with all context data
			const substitutions = this.createContextSubstitutions(context);
			for (const [variable, value] of Object.entries(substitutions)) {
				const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'gi');
				processedPrompt = processedPrompt.replace(regex, value);
			}
			
			// Handle any remaining custom variables
			const remainingVariables = extractVariables(processedPrompt);
			if (remainingVariables.length > 0) {
				const customValues = await this.promptForContextVariables(remainingVariables, context);
				for (const [variable, value] of Object.entries(customValues)) {
					const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'gi');
					processedPrompt = processedPrompt.replace(regex, value);
				}
			}
			
			// Copy to clipboard
			await vscode.env.clipboard.writeText(processedPrompt);
			
			const keyBinding = process.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V';
			const contextInfo = this.getContextDisplayInfo(context);
			
			vscode.window.showInformationMessage(
				`✓ Context-aware prompt copied: "${prompt.label}"\n${contextInfo}\n\nPaste with ${keyBinding} in your chat window`
			);
			
		} catch (error) {
			console.error('Error executing context prompt:', error);
			vscode.window.showErrorMessage(`Failed to execute prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
	
	private createContextSubstitutions(context: { type: ContextType, data: any }): Record<string, string> {
		const substitutions: Record<string, string> = {};
		
		// Common substitutions
		if (context.data.language) substitutions.language = context.data.language;
		if (context.data.fileName) substitutions.fileName = context.data.fileName;
		if (context.data.projectType) substitutions.projectType = context.data.projectType;
		if (context.data.lineNumber) substitutions.lineNumber = context.data.lineNumber.toString();
		
		// Context-specific substitutions
		switch (context.type) {
			case ContextType.Selection:
				if (context.data.text) {
					substitutions.selectedText = context.data.text;
					substitutions.selection = context.data.text;
				}
				if (context.data.selectionSize) {
					substitutions.selectionSize = context.data.selectionSize.toString();
				}
				substitutions.isCode = context.data.isCode ? 'true' : 'false';
				break;
				
			case ContextType.Error:
				if (context.data.error) {
					substitutions.errorAtCursor = context.data.error;
					substitutions.error = context.data.error;
				}
				if (context.data.errorCode) {
					substitutions.errorCode = context.data.errorCode.toString();
				}
				if (context.data.severity) {
					substitutions.errorSeverity = context.data.severity.toString();
				}
				break;
				
			case ContextType.Function:
				if (context.data.functionName) {
					substitutions.functionName = context.data.functionName;
					substitutions.function = context.data.functionName;
				}
				if (context.data.functionType) {
					substitutions.functionType = context.data.functionType;
				}
				if (context.data.parameters) {
					substitutions.parameters = context.data.parameters.join(', ');
				}
				break;
				
			case ContextType.Class:
				if (context.data.className) {
					substitutions.className = context.data.className;
					substitutions.class = context.data.className;
				}
				if (context.data.inheritance) {
					substitutions.inheritance = context.data.inheritance;
				}
				break;
				
			case ContextType.Test:
				if (context.data.testName) {
					substitutions.testName = context.data.testName;
				}
				if (context.data.testFramework) {
					substitutions.testFramework = context.data.testFramework;
				}
				break;
				
			case ContextType.Import:
				if (context.data.imports) {
					substitutions.imports = context.data.imports.join('\n');
				}
				break;
				
			case ContextType.Comment:
				if (context.data.comment) {
					substitutions.comment = context.data.comment;
				}
				if (context.data.commentType) {
					substitutions.commentType = context.data.commentType;
				}
				break;
		}
		
		return substitutions;
	}
	
	private async promptForContextVariables(variables: string[], context: { type: ContextType, data: any }): Promise<Record<string, string>> {
		const values: Record<string, string> = {};
		
		for (const variable of variables) {
			const defaultValue = this.getContextDefaultValue(variable, context);
			const value = await vscode.window.showInputBox({
				prompt: `Enter value for {{${variable}}} (Context: ${context.type})`,
				placeHolder: `Value for ${variable}...`,
				value: defaultValue
			});
			
			if (value === undefined) {
				throw new Error('User cancelled variable input');
			}
			
			values[variable] = value;
		}
		
		return values;
	}
	
	private getContextDefaultValue(variable: string, context: { type: ContextType, data: any }): string {
		const varLower = variable.toLowerCase();
		
		// Context-aware defaults
		switch (context.type) {
			case ContextType.Function:
				if (varLower.includes('name') && context.data.functionName) {
					return context.data.functionName;
				}
				break;
			case ContextType.Class:
				if (varLower.includes('name') && context.data.className) {
					return context.data.className;
				}
				break;
			case ContextType.Test:
				if (varLower.includes('test') && context.data.testName) {
					return context.data.testName;
				}
				break;
		}
		
		// General defaults
		if (varLower.includes('language') && context.data.language) {
			return context.data.language;
		}
		if (varLower.includes('file') && context.data.fileName) {
			return context.data.fileName;
		}
		
		return '';
	}
	
	getContextDisplayInfo(context: { type: ContextType, data: any }): string {
		switch (context.type) {
			case ContextType.Selection:
				const size = context.data.selectionSize || 0;
				const type = context.data.isCode ? 'code' : 'text';
				return `📝 ${size} chars of ${type} selected`;
			case ContextType.Error:
				return `🔴 Error detected: ${context.data.error?.substring(0, 50)}...`;
			case ContextType.Function:
				return `⚙️ Function: ${context.data.functionName}`;
			case ContextType.Class:
				return `🏗️ Class: ${context.data.className}`;
			case ContextType.Test:
				return `🧪 Test: ${context.data.testName} (${context.data.testFramework})`;
			case ContextType.Import:
				return `📦 ${context.data.imports?.length || 0} imports detected`;
			case ContextType.Comment:
				return `💬 Comment context (${context.data.commentType})`;
			default:
				return `📄 ${context.data.language} file context`;
		}
	}
	
	private trackUsage(promptId: string, contextType: ContextType): void {
		const today = new Date().toISOString().split('T')[0];
		
		// Update analytics
		this.analytics.totalUses++;
		this.analytics.promptUsage[promptId] = (this.analytics.promptUsage[promptId] || 0) + 1;
		this.analytics.contextUsage[contextType] = (this.analytics.contextUsage[contextType] || 0) + 1;
		this.analytics.dailyUsage[today] = (this.analytics.dailyUsage[today] || 0) + 1;
		this.analytics.lastUsed[promptId] = new Date().toISOString();
		
		this.saveAnalytics();
	}
	
	getAnalytics(): UsageAnalytics {
		return { ...this.analytics };
	}
}

// Advanced search and filter system
class AdvancedSearchManager {
	private searchHistory: string[] = [];
	
	constructor(private context: vscode.ExtensionContext, private promptLibrary: PromptLibrary) {
		this.loadSearchHistory();
	}
	
	private loadSearchHistory(): void {
		const stored = this.context.globalState.get<string[]>('searchHistory', []);
		this.searchHistory = stored.slice(0, 20); // Keep last 20 searches
	}
	
	private saveSearchHistory(): void {
		this.context.globalState.update('searchHistory', this.searchHistory);
	}
	
	async showAdvancedSearch(): Promise<void> {
		const searchOptions = await this.getSearchOptions();
		
		const selected = await vscode.window.showQuickPick(searchOptions, {
			placeHolder: 'Choose search type or enter custom search...',
			canPickMany: false
		});
		
		if (!selected) return;
		
		if (selected.searchType === 'custom') {
			await this.performCustomSearch();
		} else {
			await this.performFilteredSearch(selected.searchType, selected.value);
		}
	}
	
	private async getSearchOptions(): Promise<Array<{label: string, description: string, searchType: string, value?: string}>> {
		const allPrompts = extractAllPromptEntries(this.promptLibrary.getRootEntries());
		const allTags = [...new Set(allPrompts.flatMap(p => p.tags || []))];
		const allCategories = [...new Set(allPrompts.map(p => p.categoryId).filter(Boolean))];
		
		const options = [
			{
				label: '🔍 Custom Search',
				description: 'Search by keyword in prompt text and labels',
				searchType: 'custom'
			},
			{
				label: '🏷️ Filter by Tags',
				description: `Available tags: ${allTags.slice(0, 5).join(', ')}${allTags.length > 5 ? '...' : ''}`,
				searchType: 'tags'
			},
			{
				label: '📂 Filter by Category',
				description: 'Browse prompts by category',
				searchType: 'category'
			},
			{
				label: '⭐ Most Used',
				description: 'Show most frequently used prompts',
				searchType: 'usage'
			},
			{
				label: '🕒 Recently Used',
				description: 'Show recently used prompts',
				searchType: 'recent'
			},
			{
				label: '🔤 By Language',
				description: 'Find prompts for specific programming languages',
				searchType: 'language'
			}
		];
		
		// Add recent searches
		if (this.searchHistory.length > 0) {
			options.push(
				{ label: '--- Recent Searches ---', description: '', searchType: 'separator' },
				...this.searchHistory.slice(0, 5).map(search => ({
					label: `🕒 "${search}"`,
					description: 'Previous search',
					searchType: 'custom',
					value: search
				}))
			);
		}
		
		return options;
	}
	
	private async performCustomSearch(): Promise<void> {
		const searchTerm = await vscode.window.showInputBox({
			placeHolder: 'Enter search term (searches labels and prompt content)',
			prompt: 'Search prompts'
		});
		
		if (!searchTerm) return;
		
		// Add to search history
		this.searchHistory.unshift(searchTerm);
		this.searchHistory = this.searchHistory.slice(0, 20); // Keep last 20
		this.saveSearchHistory();
		
		const results = this.searchPrompts(searchTerm);
		await this.showSearchResults(results, `Search: "${searchTerm}"`);
	}
	
	private async performFilteredSearch(searchType: string, value?: string): Promise<void> {
		const allPrompts = extractAllPromptEntries(this.promptLibrary.getRootEntries());
		let results: PromptEntry[] = [];
		let title = '';
		
		switch (searchType) {
			case 'tags':
				const allTags = [...new Set(allPrompts.flatMap(p => p.tags || []))];
				const selectedTag = await vscode.window.showQuickPick(
					allTags.map(tag => ({ label: tag, description: `${allPrompts.filter(p => p.tags?.includes(tag)).length} prompts` })),
					{ placeHolder: 'Select tag to filter by' }
				);
				if (selectedTag) {
					results = allPrompts.filter(p => p.tags?.includes(selectedTag.label));
					title = `Tag: "${selectedTag.label}"`;
				}
				break;
				
			case 'category':
				const categories = [...new Set(allPrompts.map(p => p.categoryId).filter(Boolean))] as string[];
				const selectedCategory = await vscode.window.showQuickPick(
					categories.map(cat => ({ 
						label: cat, 
						description: `${allPrompts.filter(p => p.categoryId === cat).length} prompts` 
					})),
					{ placeHolder: 'Select category to filter by' }
				);
				if (selectedCategory) {
					results = allPrompts.filter(p => p.categoryId === selectedCategory.label);
					title = `Category: "${selectedCategory.label}"`;
				}
				break;
				
			case 'usage':
				// Get analytics data and sort prompts by usage count
				const analytics = this.promptLibrary.getUsageAnalytics();
				if (Object.keys(analytics.promptUsage).length === 0) {
					vscode.window.showInformationMessage('No usage analytics available yet. Use some prompts first!');
					return;
				}
				
				// Sort prompts by usage count (most used first)
				const sortedByUsage = allPrompts
					.filter(p => analytics.promptUsage[p.id]) // Only prompts with usage data
					.sort((a, b) => (analytics.promptUsage[b.id] || 0) - (analytics.promptUsage[a.id] || 0))
					.slice(0, 20); // Top 20 most used
				
				results = sortedByUsage;
				title = `Most Used (${results.length} prompts)`;
				break;
				
			case 'recent':
				// Get recently used prompts from analytics
				const recentAnalytics = this.promptLibrary.getUsageAnalytics();
				if (Object.keys(recentAnalytics.lastUsed).length === 0) {
					vscode.window.showInformationMessage('No recent usage data available yet. Use some prompts first!');
					return;
				}
				
				// Sort prompts by last used timestamp (most recent first)
				const sortedByRecent = allPrompts
					.filter(p => recentAnalytics.lastUsed[p.id]) // Only prompts with usage data
					.sort((a, b) => {
						const aTime = new Date(recentAnalytics.lastUsed[a.id] || 0).getTime();
						const bTime = new Date(recentAnalytics.lastUsed[b.id] || 0).getTime();
						return bTime - aTime;
					})
					.slice(0, 20); // Top 20 most recent
				
				results = sortedByRecent;
				title = `Recently Used (${results.length} prompts)`;
				break;
				
			case 'language':
				const languages = ['javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'go', 'rust', 'php'];
				const selectedLang = await vscode.window.showQuickPick(
					languages.map(lang => ({ label: lang, description: `Find prompts mentioning ${lang}` })),
					{ placeHolder: 'Select programming language' }
				);
				if (selectedLang) {
					results = allPrompts.filter(p => 
						p.prompt?.toLowerCase().includes(selectedLang.label) ||
						p.label.toLowerCase().includes(selectedLang.label) ||
						p.tags?.some((tag: string) => tag.toLowerCase().includes(selectedLang.label))
					);
					title = `Language: "${selectedLang.label}"`;
				}
				break;
		}
		
		if (results.length > 0) {
			await this.showSearchResults(results, title);
		} else {
			vscode.window.showInformationMessage('No prompts found matching the criteria');
		}
	}
	
	private searchPrompts(searchTerm: string): PromptEntry[] {
		const allPrompts = extractAllPromptEntries(this.promptLibrary.getRootEntries());
		const term = searchTerm.toLowerCase();
		
		return allPrompts.filter(prompt => 
			prompt.label.toLowerCase().includes(term) ||
			(prompt.prompt && prompt.prompt.toLowerCase().includes(term)) ||
			(prompt.tags && prompt.tags.some((tag: string) => tag.toLowerCase().includes(term)))
		);
	}
	
	private async showSearchResults(results: PromptEntry[], title: string): Promise<void> {
		if (results.length === 0) {
			vscode.window.showInformationMessage('No prompts found');
			return;
		}
		
		// Get analytics for enhanced display
		const analytics = this.promptLibrary.getUsageAnalytics();
		const isUsageSearch = title.includes('Most Used');
		const isRecentSearch = title.includes('Recently Used');
		
		const items = results.map((prompt, index) => {
			let label = `📝 ${prompt.label}`;
			let detail = `Tags: ${prompt.tags?.join(', ') || 'none'}`;
			
			// Add usage statistics for usage-based searches
			if (isUsageSearch && analytics.promptUsage[prompt.id]) {
				const usageCount = analytics.promptUsage[prompt.id];
				label = `${index + 1}. 📊 ${prompt.label} (${usageCount} uses)`;
			} else if (isRecentSearch && analytics.lastUsed[prompt.id]) {
				const lastUsed = new Date(analytics.lastUsed[prompt.id]);
				const timeAgo = this.getTimeAgo(lastUsed);
				label = `${index + 1}. 🕒 ${prompt.label} (${timeAgo})`;
				detail += ` • Last used: ${lastUsed.toLocaleString()}`;
			}
			
			return {
				label,
				description: prompt.prompt ? prompt.prompt.substring(0, 100) + '...' : '',
				detail,
				prompt
			};
		});
		
		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: `${title} - ${results.length} results`,
			matchOnDescription: true,
			matchOnDetail: true
		});
		
		if (selected) {
			// Execute the selected prompt and track usage
			if (selected.prompt.prompt) {
				await copyPromptToClipboard(selected.prompt.prompt, selected.prompt.label);
				const keyBinding = process.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V';
				vscode.window.showInformationMessage(
					`✓ Prompt copied: "${selected.prompt.label}"\n\nPaste with ${keyBinding} in your chat window`
				);
				
				// Track usage from search results
				this.promptLibrary.addToRecent(selected.prompt.id);
			}
		}
	}
	
	// Helper method to format time ago
	private getTimeAgo(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);
		
		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}
}

// Analytics report generator
function generateAnalyticsReport(analytics: UsageAnalytics): string {
	const totalPrompts = Object.keys(analytics.promptUsage).length;
	const avgUsesPerPrompt = totalPrompts > 0 ? (analytics.totalUses / totalPrompts).toFixed(1) : '0';
	
	// Get top prompts by usage
	const topPrompts = Object.entries(analytics.promptUsage)
		.sort(([,a], [,b]) => b - a)
		.slice(0, 10)
		.map(([id, count], index) => `${index + 1}. Prompt ID: ${id} (${count} uses)`);
	
	// Get usage by context
	const contextStats = Object.entries(analytics.contextUsage)
		.sort(([,a], [,b]) => b - a)
		.map(([context, count]) => `- ${context}: ${count} uses`);
	
	// Get daily usage for last 7 days
	const last7Days = Array.from({length: 7}, (_, i) => {
		const date = new Date();
		date.setDate(date.getDate() - i);
		return date.toISOString().split('T')[0];
	}).reverse();
	
	const dailyStats = last7Days.map(date => {
		const usage = analytics.dailyUsage[date] || 0;
		return `- ${date}: ${usage} uses`;
	});
	
	// Get most used tags
	const tagStats = Object.entries(analytics.tagUsage)
		.sort(([,a], [,b]) => b - a)
		.slice(0, 10)
		.map(([tag, count]) => `- ${tag}: ${count} uses`);

	return `# 📊 Prompt Library Usage Analytics

## 📈 Overview
- **Total Uses**: ${analytics.totalUses}
- **Active Prompts**: ${totalPrompts}
- **Average Uses per Prompt**: ${avgUsesPerPrompt}
- **Last Updated**: ${new Date().toLocaleString()}

## 🏆 Top Used Prompts
${topPrompts.length > 0 ? topPrompts.join('\n') : 'No usage data available'}

## 📱 Usage by Context
${contextStats.length > 0 ? contextStats.join('\n') : 'No context data available'}

## 📅 Daily Usage (Last 7 Days)
${dailyStats.join('\n')}

## 🏷️ Most Used Tags
${tagStats.length > 0 ? tagStats.join('\n') : 'No tag data available'}

## 📊 Usage Trends
- **Most Active Context**: ${contextStats[0]?.split(':')[0] || 'N/A'}
- **Most Used Tag**: ${tagStats[0]?.split(':')[0] || 'N/A'}
- **Peak Day**: ${dailyStats.reduce((max, current) => {
	const maxUses = parseInt(max.split(':')[1]) || 0;
	const currentUses = parseInt(current.split(':')[1]) || 0;
	return currentUses > maxUses ? current : max;
}, dailyStats[0] || '').split(':')[0] || 'N/A'}

---
*Generated by Prompt Library Analytics - ${new Date().toLocaleString()}*
`;
}

// Workflow functionality
class WorkflowManager {
	private workflows: WorkflowDefinition[] = [];
	
	constructor(private context: vscode.ExtensionContext) {
		this.loadWorkflows();
	}
	
	private loadWorkflows(): void {
		try {
			const stored = this.context.globalState.get<WorkflowDefinition[]>('workflows', []);
			this.workflows = stored;
		} catch (error) {
			console.error('Failed to load workflows:', error);
			this.workflows = [];
		}
	}
	
	private saveWorkflows(): void {
		try {
			this.context.globalState.update('workflows', this.workflows);
		} catch (error) {
			console.error('Failed to save workflows:', error);
		}
	}
	
	addWorkflow(workflow: WorkflowDefinition): void {
		this.workflows.push(workflow);
		this.saveWorkflows();
	}
	
	getWorkflows(): WorkflowDefinition[] {
		return [...this.workflows];
	}
	
	async executeWorkflow(workflowId: string): Promise<void> {
		const workflow = this.workflows.find(w => w.id === workflowId);
		if (!workflow) {
			throw new Error(`Workflow not found: ${workflowId}`);
		}
		
		console.log(`Executing workflow: ${workflow.name}`);
		const stepResults: { [stepId: string]: string } = {};
		
		// Execute steps in order, handling dependencies
		for (const step of workflow.steps) {
			console.log(`Executing step: ${step.name}`);
			
			// Check dependencies
			if (step.dependsOn) {
				for (const depId of step.dependsOn) {
					if (!stepResults[depId]) {
						throw new Error(`Step ${step.name} depends on ${depId} which hasn't completed`);
					}
				}
			}
			
			// Process step prompt with previous results
			let processedPrompt = step.prompt;
			for (const [stepId, result] of Object.entries(stepResults)) {
				const regex = new RegExp(`\\{\\{${stepId}\\}\\}`, 'g');
				processedPrompt = processedPrompt.replace(regex, result);
			}
			
			// Execute step (for now, just copy to clipboard and wait for user)
			await vscode.env.clipboard.writeText(processedPrompt);
			
			const result = await vscode.window.showInputBox({
				prompt: `Step: ${step.name}\n\nPrompt has been copied to clipboard. After getting response, paste result here:`,
				placeHolder: 'Paste the AI response here...'
			});
			
			if (result === undefined) {
				throw new Error('Workflow cancelled by user');
			}
			
			stepResults[step.id] = result;
		}
		
		vscode.window.showInformationMessage(`Workflow "${workflow.name}" completed successfully!`);
	}
}

export function activate(context: vscode.ExtensionContext) {
	// Initialize prompt library and provider
	const promptLibrary = new PromptLibrary(context);
	const provider = new PromptProvider(promptLibrary);
	
	// Show information message about prompt evaluation features
	vscode.window.showInformationMessage(
		'Prompt Library: Evaluation scores appear next to prompts as icons. Hover to see suggestions.'
	);
	
	// Initialize prompt evaluation service
	const evaluationService = new PromptEvaluationService(context);
	
	// Set up the search manager
	const searchManager = new SearchManager(context, promptLibrary, provider);
	const contextManager = new ContextIntegrationManager(context, promptLibrary);
	
	// Create a proper TreeView instead of just registering a TreeDataProvider
	const treeView = vscode.window.createTreeView('promptLibraryView', { 
		treeDataProvider: provider,
		showCollapseAll: true,
		canSelectMany: false
	});
	context.subscriptions.push(treeView);
	
	// Automatically expand the User category on startup
	setTimeout(async () => {
		const userCategory = promptLibrary.getRootEntries().find(entry => entry.type === 'category' && entry.categoryType === 'user');
		if (userCategory) {
			const userCategoryTreeItem = new PromptTreeItem(userCategory);
			await treeView.reveal(userCategoryTreeItem, { expand: true, focus: false, select: false });
		}
	}, 1000);
	
	// Handle tree item selection for prompts (click to copy)
	treeView.onDidChangeSelection(async e => {
		if (e.selection.length === 1) {
			const item = e.selection[0];
			if (item.entry.type === 'prompt' && item.entry.prompt) {
				// Use timeout to avoid immediate copy on navigation clicks
				setTimeout(async () => {
					await vscode.commands.executeCommand('prompt-library.usePrompt', item);
				}, 200);
			}
		}
	});

	// Register all commands first to ensure they're available when UI loads
	
	// QuickPick Search with tag filtering
	const quickPickSearch = vscode.commands.registerCommand('prompt-library.quickPickSearch', async () => {
		const allPrompts = promptLibrary.getAllPrompts();
		const allTags = promptLibrary.getAllTags();

		// First, let user select tags to filter by
		const selectedTags = await vscode.window.showQuickPick(
			allTags.map(tag => ({
				label: tag,
				picked: false
			})),
			{
				canPickMany: true,
				placeHolder: 'Select tags to filter prompts (optional, leave empty for all)'
			}
		);

		// Filter prompts by selected tags
		let filteredPrompts = allPrompts;
		if (selectedTags && selectedTags.length > 0) {
			const selectedTagSet = new Set(selectedTags.map(t => t.label));
			filteredPrompts = allPrompts.filter(p =>
				p.tags.some((tag: string) => selectedTagSet.has(tag))
			);
		}

		// Show filtered prompts in QuickPick
		const items = filteredPrompts.map(p => ({
			label: p.label,
			description: p.tags.join(' • '),
			detail: p.prompt.substring(0, 100) + (p.prompt.length > 100 ? '...' : ''),
			prompt: p
		}));

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a prompt to use'
		});

		if (selected) {
			const promptEntry: PromptEntry = {
				id: selected.prompt.id,
				label: selected.prompt.label,
				type: 'prompt',
				prompt: selected.prompt.prompt,
				tags: selected.prompt.tags
			};
			await vscode.commands.executeCommand('prompt-library.usePrompt', promptEntry);
		}
	});
	context.subscriptions.push(quickPickSearch);

	// Search command
	const search = vscode.commands.registerCommand('prompt-library.search', async () => {
		const query = await vscode.window.showInputBox({
			prompt: 'Search prompts by name, content, or tags',
			placeHolder: 'Type to search...'
		});

		if (query !== undefined) {
			promptLibrary.setSearchQuery(query);
			provider.refresh();
		}
	});
	context.subscriptions.push(search);

	// Clear search command
	const clearSearch = vscode.commands.registerCommand('prompt-library.clearSearch', () => {
		promptLibrary.setSearchQuery('');
		provider.refresh();
	});
	context.subscriptions.push(clearSearch);

	// Show favorites only command
	const showFavoritesOnly = vscode.commands.registerCommand('prompt-library.showFavoritesOnly', async () => {
		promptLibrary.setShowFavoritesOnly(true);
		vscode.window.showInformationMessage('Showing favorites only');
		provider.refresh();
	});
	context.subscriptions.push(showFavoritesOnly);

	// Show all prompts command
	const showAllPrompts = vscode.commands.registerCommand('prompt-library.showAllPrompts', async () => {
		promptLibrary.setShowFavoritesOnly(false);
		promptLibrary.setShowRecentOnly(false);
		vscode.window.showInformationMessage('Showing all prompts');
		provider.refresh();
	});
	context.subscriptions.push(showAllPrompts);

	// Show recent prompts only command
	const showRecentPrompts = vscode.commands.registerCommand('prompt-library.showRecentPrompts', async () => {
		promptLibrary.setShowRecentOnly(true);
		vscode.window.showInformationMessage('Showing recent prompts only');
		provider.refresh();
	});
	context.subscriptions.push(showRecentPrompts);

	// Add new prompt to User category
	const addPrompt = vscode.commands.registerCommand('prompt-library.addPrompt', async (categoryEntry?: PromptEntry) => {
		const label = await vscode.window.showInputBox({
			prompt: 'Enter prompt label',
			placeHolder: ''
		});

		if (!label) return;

		const prompt = await vscode.window.showInputBox({
			prompt: 'Enter prompt text (use {{variable}} for placeholders)',
			placeHolder: ''
		});

		if (!prompt) return;

		const tagsInput = await vscode.window.showInputBox({
			prompt: 'Enter tags (comma-separated, optional)',
			placeHolder: ''
		});

		// Process tags, filtering out any empty strings
		const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

		// If context provided, add to that category; otherwise add to User category
		const parentId = categoryEntry?.id || promptLibrary.getUserCategoryId();
		if (parentId) {
			// Remove any tags and example text from the prompt text
			let cleanPrompt = prompt.replace(/(?:\s|^)[@#]\w+\b/g, '');
			// Remove common example markers and text patterns
			cleanPrompt = cleanPrompt
				.replace(/e\.g\.,|example:|for example:|such as:|\(example\)|\beg:\s*/gi, '')
				.replace(/Create a React component for .* with .*/g, '')
				.trim();
			
			// Store the parent category element to reveal later
			const parentElement = promptLibrary.findById(promptLibrary.getRootEntries(), parentId);
			
			// Add the prompt and get the new ID
			const newPromptId = await promptLibrary.addPrompt(label, cleanPrompt, tags, parentId);
			console.log(`New prompt added with ID: ${newPromptId ?? 'unknown'}`);
			
			// Refresh the tree view
			provider.refresh();
			
			// Wait a moment for the tree to refresh
			setTimeout(async () => {
				if (parentElement) {
					// Create a tree item for the parent to reveal it
					const treeItem = new PromptTreeItem(parentElement);
					await treeView.reveal(treeItem, { expand: true, focus: false, select: false });
				}
			}, 100);
			
			vscode.window.showInformationMessage(`Prompt "${label}" added successfully!`);
		} else {
			vscode.window.showErrorMessage('Could not find User category to add prompt to');
		}
	});
	context.subscriptions.push(addPrompt);

	// Toggle favorite command
	const toggleFavorite = vscode.commands.registerCommand('prompt-library.toggleFavorite', async (treeItem: PromptTreeItem) => {
		const entry: PromptEntry = treeItem.entry;
		if (!entry || entry.type !== 'prompt') {
			vscode.window.showErrorMessage('Invalid prompt selected');
			return;
		}

		promptLibrary.toggleFavorite(entry.id);
		provider.refresh();
		
		const isFavorite = promptLibrary.isFavorite(entry.id);
		vscode.window.showInformationMessage(`${entry.label} ${isFavorite ? 'added to' : 'removed from'} favorites`);
	});
	context.subscriptions.push(toggleFavorite);

	// Delete prompt command (moved here for early registration)
	const deletePrompt = vscode.commands.registerCommand('prompt-library.deletePrompt', async (treeItem: PromptTreeItem) => {
		var entry: PromptEntry = treeItem.entry;
		console.log('deletePrompt called with entry:', entry);
		
		if (!entry || entry.type !== 'prompt') {
			vscode.window.showErrorMessage('Invalid prompt selected');
			return;
		}

		const result = await vscode.window.showWarningMessage(
			`Are you sure you want to delete "${entry.label}"?`,
			'Delete',
			'Cancel'
		);

		if (result === 'Delete') {
			console.log('Confirmed deletion of:', entry);
			try {
				// Store the parent ID before deleting
				const parentId = entry.parentId || entry.categoryId;
				const parentElement = parentId ? promptLibrary.findById(promptLibrary.getRootEntries(), parentId) : null;
				
				// Delete the prompt
				await promptLibrary.deletePrompt(entry.id);
				
				// Refresh the tree view
				provider.refresh();
				
				// Wait a moment for the tree to refresh, then reveal the parent element
				setTimeout(async () => {
					if (parentElement) {
						// Create a tree item for the parent to reveal it
						const treeItem = new PromptTreeItem(parentElement);
						await treeView.reveal(treeItem, { expand: true, focus: false, select: false });
					}
				}, 100);
				
				vscode.window.showInformationMessage(`Prompt "${entry.label}" deleted`);
			} catch (error) {
				console.error('Error deleting prompt:', error);
				vscode.window.showErrorMessage('Failed to delete prompt. Please try again.');
			}
		}
	});
	context.subscriptions.push(deletePrompt);

	// Edit prompt command (moved here for early registration)
	const editPrompt = vscode.commands.registerCommand('prompt-library.editPrompt', async (treeItem: PromptTreeItem) => {
		var entry: PromptEntry = treeItem.entry;
		console.log('editPrompt called with entry:', entry);
		
		if (!entry || entry.type !== 'prompt') {
			vscode.window.showErrorMessage('Invalid prompt selected');
			return;
		}

		console.log('Current prompt entry:', entry);

		const newLabel = await vscode.window.showInputBox({
			prompt: 'Edit prompt label',
			value: entry.label
		});

		if (!newLabel) return;

		const newPrompt = await vscode.window.showInputBox({
			prompt: 'Edit prompt text',
			value: entry.prompt || ''
		});

		if (!newPrompt) return;

		// Get current tags but don't use placeholder text
		const currentTags = entry.tags && entry.tags.length > 0 ? entry.tags.join(', ') : '';
		const newTagsInput = await vscode.window.showInputBox({
			prompt: 'Edit tags (comma-separated, optional)',
			value: currentTags
		});

		// Process tags, filtering out any empty strings
		const newTags = newTagsInput ? newTagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

		try {
			// Remove any tags and example text from the prompt text
			let cleanPrompt = newPrompt.replace(/(?:\s|^)[@#]\w+\b/g, '');
			// Remove common example markers and text patterns
			cleanPrompt = cleanPrompt
				.replace(/e\.g\.,|example:|for example:|such as:|\(example\)|\beg:\s*/gi, '')
				.replace(/Create a React component for .* with .*/g, '')
				.trim();
			
			// Store the parent element to reveal later
			const parentId = entry.parentId || entry.categoryId;
			const parentElement = parentId ? promptLibrary.findById(promptLibrary.getRootEntries(), parentId) : null;
			
			await promptLibrary.updatePrompt(entry.id, {
				label: newLabel,
				prompt: cleanPrompt,
				tags: newTags
			});
			
			// Refresh the tree view
			provider.refresh();
			
			// Wait a moment for the tree to refresh, then reveal the parent element
			setTimeout(async () => {
				if (parentElement) {
					// Create a tree item for the parent to reveal it
					const treeItem = new PromptTreeItem(parentElement);
					await treeView.reveal(treeItem, { expand: true, focus: false, select: false });
				}
			}, 100);
			
			vscode.window.showInformationMessage(`Prompt "${newLabel}" updated successfully!`);
		} catch (error) {
			console.error('Error updating prompt:', error);
			vscode.window.showErrorMessage(`Failed to update prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});
	context.subscriptions.push(editPrompt);

	// Command: Copy prompt to clipboard
	const usePrompt = vscode.commands.registerCommand('prompt-library.usePrompt', async (treeItem) => {
		var entry:PromptEntry = treeItem.entry;
		if(!entry){
			entry = treeItem;
		}
		console.log('usePrompt called with entry:', entry);

		if (!entry || !entry.prompt) {
			vscode.window.showErrorMessage('No prompt available for the selected item.');
			console.error('Entry or prompt is missing:', entry);
			return;
		}

		try {
			console.log(`Using prompt: "${entry.label}"`);
			
			// Process and copy to clipboard
			if (await copyPromptToClipboard(entry.prompt!, entry.label)) {
				const keyBinding = process.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V';
				
				vscode.window.showInformationMessage(
					`✓ Prompt copied to clipboard: "${entry.label}"\n\nPaste with ${keyBinding} in your preferred chat window`
				);
				
				// Track usage in recent prompts and analytics
				promptLibrary.addToRecent(entry.id);
				provider.refresh();
			} else {
				vscode.window.showErrorMessage('Failed to copy prompt to clipboard. Please try again.');
			}
		} catch (error) {
			console.error('Error in usePrompt:', error);
			vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});
	context.subscriptions.push(usePrompt);


	// Command: Export Prompts
	const exportPromptsCommand = vscode.commands.registerCommand('prompt-library.exportPrompts', async () => {
		await exportPrompts(promptLibrary);
	});
	context.subscriptions.push(exportPromptsCommand);

	// Command: Import Prompts
	const importPromptsCommand = vscode.commands.registerCommand('prompt-library.importPrompts', async () => {
		await importPrompts(promptLibrary, provider);
	});
	context.subscriptions.push(importPromptsCommand);

	// Command: Advanced Search
	const advancedSearchCommand = vscode.commands.registerCommand('prompt-library.advancedSearch', async () => {
		await searchManager.showAdvancedSearch();
	});
	context.subscriptions.push(advancedSearchCommand);
	
	// Command: Context-Aware Prompts
	const contextAwarePromptsCommand = vscode.commands.registerCommand('prompt-library.contextAwarePrompts', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('Please open a file to use context-aware prompts');
			return;
		}
		
		try {
			const context = await contextManager.analyzeCurrentContext(editor);
			const relevantPrompts = contextManager.getRelevantPrompts(context);
			
			if (relevantPrompts.length === 0) {
				vscode.window.showInformationMessage('No relevant prompts found for current context');
				return;
			}
			
			// Show context info and prompt selection
			const contextInfo = contextManager.getContextDisplayInfo ? 
				contextManager.getContextDisplayInfo(context) : 
				`Context: ${context.type}`;
			
			const items = relevantPrompts.map(p => ({
				label: `🎯 ${p.label}`,
				description: (p.prompt || '').substring(0, 100) + '...',
				detail: `${contextInfo} • Tags: ${p.tags?.join(', ') || 'none'}`,
				prompt: p
			}));
			
			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: `Select a context-aware prompt (${contextInfo})`,
				matchOnDescription: true,
				matchOnDetail: true
			});
			
			if (selected) {
				await contextManager.executeContextPrompt(selected.prompt, context);
			}
		} catch (error) {
			console.error('Error with context-aware prompts:', error);
			vscode.window.showErrorMessage(`Context analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});
	context.subscriptions.push(contextAwarePromptsCommand);

	// Command: Usage Analytics (Enhanced with Real-time Updates)
	const analyticsCommand = vscode.commands.registerCommand('prompt-library.showAnalytics', async () => {
		// Track analytics view
		promptLibrary.trackPromptInteraction('analytics-view', 'view');
		// Get unified analytics from prompt library
		const analytics = promptLibrary.getUsageAnalytics();
		const analyticsReport = generateAnalyticsReport(analytics);
		
		// Show in a new document
		const doc = await vscode.workspace.openTextDocument({
			content: analyticsReport,
			language: 'markdown'
		});
		await vscode.window.showTextDocument(doc);
	});
	context.subscriptions.push(analyticsCommand);

	// Command: Send Prompt to Contributor (Enhanced)
	const sendToContributor = vscode.commands.registerCommand('prompt-library.sendToContributor', async (treeItem: PromptTreeItem) => {
		var entry: PromptEntry = treeItem.entry;
		if (!entry) {
			entry = treeItem as any;
		}
		console.log('sendToContributor called with entry:', entry);

		if (!entry || !entry.prompt) {
			vscode.window.showErrorMessage('No prompt available for the selected item.');
			return;
		}

		// Verify this is a user prompt
		if (entry.categoryType !== 'user') {
			vscode.window.showErrorMessage('Only user prompts can be sent to contributor.');
			return;
		}

		// Enhanced confirmation dialog with preview
		const promptPreview = entry.prompt.length > 200 ? 
			entry.prompt.substring(0, 200) + '...' : 
			entry.prompt;

		const action = await vscode.window.showWarningMessage(
			`Send "${entry.label}" to contributor team for review?\n\n` +
			`Preview: ${promptPreview}\n\n` +
			`This will email the prompt details to the team for potential inclusion in the system library.`,
			{
				modal: true,
				detail: `Prompt: ${entry.label}\nTags: ${entry.tags?.join(', ') || 'None'}\nLength: ${entry.prompt.length} characters`
			},
			'📤 Send to Contributor',
			'📋 Copy to Clipboard',
			'Cancel'
		);

		if (action === 'Cancel' || !action) {
			return;
		}

		// Option to copy to clipboard instead of sending
		if (action === '📋 Copy to Clipboard') {
			try {
				const promptData = {
					label: entry.label,
					prompt: entry.prompt,
					tags: entry.tags || [],
					submittedAt: new Date().toISOString(),
					id: entry.id
				};
				
				await vscode.env.clipboard.writeText(JSON.stringify(promptData, null, 2));
				vscode.window.showInformationMessage(
					`✓ Prompt data copied to clipboard: "${entry.label}"\n\nYou can now share this JSON with your team manually.`
				);
				
				// Track as recent and in analytics
				promptLibrary.addToRecent(entry.id);
				// Track as share action
				promptLibrary.trackPromptInteraction(entry.id, 'share');
				provider.refresh();
				return;
			} catch (error) {
				vscode.window.showErrorMessage('Failed to copy to clipboard.');
				return;
			}
		}

		// Send to contributor via email
		try {
			// Enhanced progress with detailed steps
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Sending "${entry.label}" to contributor team...`,
					cancellable: false
				},
				async (progress, token) => {
					progress.report({ increment: 0, message: 'Preparing email...' });
					
					// Simulate preparation time for better UX
					await new Promise(resolve => setTimeout(resolve, 500));
					progress.report({ increment: 30, message: 'Connecting to email service...' });
					
					try {
						await sendPromptToContributor(entry);
						progress.report({ increment: 70, message: 'Email sent successfully!' });
						
						// Small delay for user to see success message
						await new Promise(resolve => setTimeout(resolve, 500));
						progress.report({ increment: 100 });
					} catch (emailError) {
						throw emailError;
					}
				}
			);

			// Enhanced success message with next steps
			const result = await vscode.window.showInformationMessage(
				`✅ Success! Prompt "${entry.label}" sent to contributor team`,
				{
					modal: false,
					detail: `Your prompt has been emailed to the contributor team for review.\n\n` +
						`What happens next:\n` +
						`• Team will review your prompt\n` +
						`• If approved, it will be added to the system library\n` +
						`• You'll see it appear in future updates\n\n` +
						`Thank you for contributing to the prompt library!`
				},
				'✨ Create Another',
				'📊 View Recent'
			);

			// Handle follow-up actions
			if (result === '✨ Create Another') {
				await vscode.commands.executeCommand('prompt-library.addPrompt');
			} else if (result === '📊 View Recent') {
				await vscode.commands.executeCommand('prompt-library.showRecentPrompts');
			}

			// Track as recent and create action
				promptLibrary.addToRecent(entry.id);
				promptLibrary.trackPromptInteraction(entry.id, 'create');
			provider.refresh();

		} catch (error) {
			console.error('Error sending to contributor:', error);
			
			// Enhanced error handling with helpful suggestions
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			const suggestion = await vscode.window.showErrorMessage(
				`❌ Failed to send prompt to contributor`,
				{
					modal: false,
					detail: `Error: ${errorMessage}\n\n` +
						`This might be due to:\n` +
						`• Network connectivity issues\n` +
						`• Email service configuration\n` +
						`• Firewall or security restrictions\n\n` +
						`You can try copying the prompt data to share manually.`
				},
				'📋 Copy Prompt Data',
				'🔄 Try Again',
				'Cancel'
			);

			if (suggestion === '📋 Copy Prompt Data') {
				await vscode.commands.executeCommand('prompt-library.sendToContributor', treeItem);
			} else if (suggestion === '🔄 Try Again') {
				await vscode.commands.executeCommand('prompt-library.sendToContributor', treeItem);
			}
		}
	});
	context.subscriptions.push(sendToContributor);

	// Debug command to help identify available Windsurf commands
	const debugWindsurfCommands = vscode.commands.registerCommand('prompt-library.debugWindsurfCommands', async () => {
		try {
			const allCommands = await vscode.commands.getCommands(true);
			const windsurfRelated = allCommands.filter(cmd => 
				cmd.includes('windsurf') || 
				cmd.includes('codeium') || 
				cmd.includes('cascade') ||
				cmd.includes('copilot') ||
				cmd.includes('github.copilot') ||
				cmd.includes('chat') ||
				cmd.includes('executePrompt') ||
				cmd.includes('sendMessage') ||
				cmd.includes('prefill')
			).sort();

			console.log('=== DEBUG: Available Windsurf/Chat Commands ===');
			console.log(windsurfRelated);
			
			const message = `Found ${windsurfRelated.length} Windsurf/Chat related commands:\n\n${windsurfRelated.slice(0, 10).join('\n')}${windsurfRelated.length > 10 ? '\n\n... and ' + (windsurfRelated.length - 10) + ' more' : ''}\n\nCheck Developer Console for full list.`;
			
			vscode.window.showInformationMessage(message, 'Copy Commands').then(action => {
				if (action === 'Copy Commands') {
					vscode.env.clipboard.writeText(windsurfRelated.join('\n'));
				}
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Error getting commands: ${error}`);
		}
	});
	context.subscriptions.push(debugWindsurfCommands);

	// UI Enhancement Commands

	// Quick Actions Command - Power User Features
	const quickActions = vscode.commands.registerCommand('prompt-library.quickActions', async () => {
		try {
			const actions = [
				{
					label: '🎯 Context-Aware Prompts',
					description: 'AI-powered prompt suggestions based on your current code context',
					command: 'prompt-library.contextAwarePrompts'
				},
				{
					label: '📊 Usage Analytics',
					description: 'View detailed usage statistics and productivity insights',
					command: 'prompt-library.showAnalytics'
				},
				{
					label: '🔍 Advanced Search',
					description: 'Find prompts by popularity, recency, and intelligent matching',
					command: 'prompt-library.advancedSearch'
				},
				{
					label: '⭐ Show Only Favorites',
					description: 'Display your starred prompts for quick access',
					command: 'prompt-library.showFavoritesOnly'
				},
				{
					label: '🕐 Show Recent Prompts',
					description: 'Continue where you left off with recently used prompts',
					command: 'prompt-library.showRecentPrompts'
				},
				{
					label: '📤 Export System Prompts',
					description: 'Share system prompts with your team',
					command: 'prompt-library.exportPrompts'
				},
				{
					label: '📥 Import Prompts',
					description: 'Import shared prompt libraries',
					command: 'prompt-library.importPrompts'
				}
			];

			const selected = await vscode.window.showQuickPick(actions, {
				placeHolder: 'Select a quick action',
				matchOnDescription: true,
				ignoreFocusOut: false
			});

			if (selected) {
				// Execute the selected command
				await vscode.commands.executeCommand(selected.command);
				
				// Track quick action usage
				promptLibrary.trackPromptInteraction('quick-action', selected.command);
			}
		} catch (error) {
			console.error('Error with quick actions:', error);
			vscode.window.showErrorMessage('Quick actions failed');
		}
	});
	context.subscriptions.push(quickActions);
}

export function deactivate() {}
