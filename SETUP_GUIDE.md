# Prompt Library Extension - Quick Start Guide

## Installation & Setup

### 1. Enable Admin Mode (Optional)

To manage prompts (add/edit/delete), open VS Code Settings and add:

```json
{
  "promptLibrary.userRole": "admin"
}
```

### 2. Configure Windsurf Integration (Optional)

Customize how prompts are sent to Windsurf:

```json
{
  "promptLibrary.windsurf.enabled": true,
  "promptLibrary.windsurf.command": "Codeium.codeium-enterprise-updater",
  "promptLibrary.copyToClipboard": false
}
```

## Quick Start

### View Your Prompt Library
1. Click the **Prompt Library** icon in the Activity Bar (left sidebar)
2. Expand categories to see available prompts
3. Hover over any prompt to see its tags

### Find Prompts Quickly

**Method 1: Filter by Tags** (Recommended)
- Click the **Filter** icon (⊕) in the title bar
- Select one or more tags (use checkboxes)
- Choose a prompt from the filtered list
- Prompt is automatically sent to Windsurf chat

**Method 2: Text Search**
- Click the **Search** icon (🔍) in the title bar
- Type to search by name, content, or tags
- Click a prompt to use it
- Click **Clear** icon (✕) to remove the filter

### Use a Prompt

1. **Via TreeView**: Click any prompt in the Prompt Library tree
2. **Via QuickPick**: Use the filter icon to select by tags
3. **Via Search**: Find it with text search

The prompt will be:
- **First**: Sent to Windsurf chat (if available)
- **Second**: Copied to clipboard (if Windsurf unavailable)

### Manage Prompts (Admin Only)

**Add a New Prompt**
1. Expand a category
2. Click the **Add** icon (➕) next to the category name
3. Enter prompt label (e.g., "React Form Validation")
4. Enter the full prompt text
5. Enter tags (comma-separated, e.g., "react, forms, validation")

**Add a New Category**
1. Click the **Add** icon (➕) in the title bar
2. Enter category name (e.g., "Mobile Development")

**Delete a Prompt**
1. Right-click the prompt
2. Click **Delete Prompt**
3. Confirm the deletion

## Available Prompts

The library includes 25+ pre-configured prompts across:

- **Front End**: React, Vue, Angular, CSS
- **Back End**: Node.js, Express, Python, Flask, Java, Spring Boot
- **Database**: SQL, MongoDB, PostgreSQL
- **DevOps**: Docker, Kubernetes, CI/CD
- **Testing**: Jest, Cypress, Pytest

Each prompt has concept tags for easy filtering.

## Common Tasks

### Find React Prompts
```
1. Click Filter icon (⊕)
2. Type or select "react"
3. Choose from React-specific prompts
```

### Search for Authentication Patterns
```
1. Click Search icon (🔍)
2. Type "authentication"
3. See all auth-related prompts
```

### Get REST API Prompt
```
1. Click Filter icon (⊕)
2. Select "rest-api" tag
3. Choose your preferred backend (Node.js, Python, Java, etc.)
```

## Settings Reference

| Setting | Type | Default | Purpose |
|---------|------|---------|---------|
| `userRole` | "user" \| "admin" | "user" | Enable/disable prompt management |
| `windsurf.enabled` | boolean | true | Enable Windsurf integration |
| `windsurf.command` | string | "Codeium.codeium-enterprise-updater" | Windsurf command ID |
| `copyToClipboard` | boolean | false | Always copy to clipboard |

## Keyboard Shortcuts

While there are no default keybindings, you can add your own in VS Code:

**Preferences → Keyboard Shortcuts**

Suggested shortcuts:
```json
{
  "key": "ctrl+shift+p",
  "command": "prompt-library.quickPickSearch"
},
{
  "key": "ctrl+shift+f",
  "command": "prompt-library.search"
}
```

## Troubleshooting

### Prompts Don't Appear
- Check that `prompts.json` exists in the extension directory
- Reload VS Code (Ctrl+R or Cmd+R)
- Check the Debug Console for errors

### Can't Add Prompts
- Verify `userRole` is set to "admin" in settings
- Reload VS Code after changing settings
- Check that VS Code has write permissions

### Prompt Not Sent to Windsurf
- Verify Windsurf is installed and running
- Check `windsurf.enabled` is set to `true`
- Try enabling `copyToClipboard` as a fallback
- Verify the `windsurf.command` setting matches your extension

### Tags Not Showing
- Hover over a prompt in the tree view
- Tags appear in the tooltip
- Filter icon shows all available tags

## Tips & Tricks

1. **Combine Tags**: Use multiple tags in the filter to narrow results
2. **Keep Library Updated**: Regularly review and add new prompts
3. **Use Descriptive Labels**: Make prompt labels clear and specific
4. **Organize by Category**: Create categories that match your workflow
5. **Tag Consistently**: Use the same tags for similar concepts

## File Locations

- **Prompts**: `<extension-root>/prompts.json`
- **Settings**: Open Command Palette → "Preferences: Open Settings (JSON)"
- **Extension Data**: Stored in VS Code's global state

## Need Help?

- Check the **IMPLEMENTATION.md** file for detailed documentation
- Review **prompts.json** to see the JSON structure
- Look at the extension code in **src/extension.ts** for implementation details

## Examples

### Example 1: React Developer Workflow
```
1. Click Filter (⊕) → Select "react" → Choose "React Functional Component"
2. Windsurf receives the prompt in chat
3. Continue working with Windsurf
4. When needed, click Filter again for other React prompts
```

### Example 2: Full Stack Development
```
1. Click Filter (⊕) → Select "react" and "rest-api"
2. Choose a React prompt first, get code suggestions
3. Then click Filter → Select "node.js" and "rest-api"
4. Get backend API code for your frontend
```

### Example 3: Building Prompts Library (Admin)
```
1. Set userRole to "admin"
2. Add category: "Machine Learning"
3. Add prompts: "Python ML Pipeline", "TensorFlow Model", etc.
4. Tag them: "python", "ml", "tensorflow"
5. Share with your team
```

## Support & Feedback

This extension is designed to make your AI-assisted coding workflow smooth and efficient. For issues, suggestions, or contributions, please reach out to the maintainer.

Happy prompting! 🚀