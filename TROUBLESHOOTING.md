# Prompt Library - Troubleshooting & Testing Guide

## Issues Fixed

### 1. **Use Prompt Functionality**
**Problem**: Prompts weren't being sent to Codeium Enterprise Updater chat window properly.

**Solution Implemented**:
- Enhanced error handling with detailed console logging
- Improved command execution with `Codeium.codeium-enterprise-updater` command
- Added fallback to clipboard with clear user feedback
- Better error messages with checkmark indicators (✓)

**Changes**:
```typescript
// Before: Simple try-catch without proper logging
await vscode.commands.executeCommand(windsurfCommand, entry.prompt);

// After: Enhanced with logging and better error handling
console.log('Attempting to execute command:', windsurfCommand);
console.log('Sending prompt text:', entry.prompt.substring(0, 100));
await vscode.commands.executeCommand(windsurfCommand, entry.prompt);
console.log('Successfully sent to Windsurf');
vscode.window.showInformationMessage(`✓ Prompt sent to Windsurf: "${entry.label}"`);
```

### 2. **Add User Prompt Functionality**
**Problem**: Adding new prompts to the User Prompts category wasn't working reliably.

**Solution Implemented**:
- ID generation now properly increments from the highest existing ID
- User prompts are correctly saved to `prompts.json` with proper categorization
- The `getUserCategoryId()` method ensures prompts are added to the correct "User Prompts" category

**How it Works**:
1. When you click the ➕ Add Prompt button
2. System finds the "User Prompts" category (id: "user")
3. New prompt is created with an auto-incremented ID
4. Prompt is added to the category's children array
5. `savePromptsToJson()` writes changes to `prompts.json`

## Testing Instructions

### Test 1: Using a System Prompt
1. **Open VS Code** with the Prompt Library extension
2. **Expand the .NET category** in the Prompt Library view
3. **Click "ASP.NET Core Web API Endpoint"** prompt
4. **Expected Result**: 
   - Message appears: `✓ Prompt sent to Windsurf: "ASP.NET Core Web API Endpoint"`
   - The prompt text appears in Windsurf chat window
   - **OR** (if Windsurf unavailable): `✓ Prompt copied to clipboard: "ASP.NET Core Web API Endpoint"`

### Test 2: Adding a New User Prompt
1. **Click the ➕ Add Prompt button** in the Prompt Library title bar
2. **Enter prompt details**:
   - Label: `My Custom Prompt`
   - Prompt text: `Write a function that validates email addresses`
   - Tags: `javascript, validation, utilities`
3. **Expected Result**:
   - Message: `Prompt "My Custom Prompt" added successfully`
   - New prompt appears under "User Prompts" category
   - Opens `prompts.json` to verify the prompt was saved:
     ```json
     {
       "id": "user",
       "label": "User Prompts",
       "type": "user",
       "prompts": [
         {
           "id": "2",
           "label": "My Custom Prompt",
           "prompt": "Write a function that validates email addresses",
           "tags": ["javascript", "validation", "utilities"]
         }
       ]
     }
     ```

### Test 3: Using a User Prompt
1. **Expand "User Prompts"** category
2. **Click the newly created "My Custom Prompt"**
3. **Expected Result**: Same as Test 1, but for your custom prompt

### Test 4: Editing a User Prompt
1. **Right-click on "My Custom Prompt"** → Select "Edit Prompt"
2. **Modify the details**:
   - Change label to: `Enhanced Email Validator`
   - Change prompt to: `Write a TypeScript function that validates email with regex and returns detailed error messages`
   - Change tags to: `typescript, validation, regex`
3. **Expected Result**:
   - Message: `Prompt "Enhanced Email Validator" updated successfully`
   - Changes persist in `prompts.json`

### Test 5: Deleting a User Prompt
1. **Right-click on "Enhanced Email Validator"** → Select "Delete Prompt"
2. **Click "Delete"** in the confirmation dialog
3. **Expected Result**:
   - Message: `Prompt "Enhanced Email Validator" deleted`
   - Prompt disappears from tree view
   - Changes persist in `prompts.json`

### Test 6: System Prompts are Read-Only
1. **Try to right-click a System prompt** (e.g., "ASP.NET Core Web API Endpoint")
2. **Expected Result**: 
   - No edit or delete options appear
   - Only "Use Prompt" action available
   - Attempting to delete via command shows: `System prompts cannot be deleted`

### Test 7: QuickPick Search by Tags
1. **Click the ⊕ Filter icon** in the Prompt Library title bar
2. **Select tags**: `react`, `hooks`
3. **Expected Result**: Only prompts with those tags are shown
4. **Select a prompt** (e.g., "TS Functional Component (Hooks + Memo)")
5. **Expected Result**: Prompt is sent to Windsurf/clipboard

### Test 8: Text Search
1. **Click the 🔍 Search icon** in the Prompt Library title bar
2. **Type**: `validation`
3. **Expected Result**: Tree view filters to show only prompts matching "validation"
4. **Click ✕ Clear Search** to reset
5. **Expected Result**: All prompts are visible again

## Debugging

### Enable Debug Console
1. Press `Ctrl+Shift+Y` (Windows/Linux) or `Cmd+Shift+Y` (Mac)
2. Or go to **View** → **Debug Console**

### Monitor Logs
The extension logs detailed information when:

**Adding a Prompt**:
```
Prompt Library extension is now active!
```

**Using a Prompt**:
```
usePrompt called with entry: {id: "1", label: "...", type: "prompt", prompt: "...", ...}
Config: {windsurf: true, windsurfCommand: "Codeium.codeium-enterprise-updater", copyToClipboard: false}
Attempting to execute command: Codeium.codeium-enterprise-updater
Sending prompt text: "Implement an ASP.NET Core Web API endpoint..."
Successfully sent to Windsurf
```

**If Windsurf Not Available**:
```
Windsurf command failed: Error: command 'Codeium.codeium-enterprise-updater' not found
Falling back to clipboard
```

### Check prompts.json
1. **File Path**: `c:\Users\708935\source\repos\VS Extension\prompt-library\prompts.json`
2. **Verify Structure**:
   - Categories should have `type: "system"` or `type: "user"`
   - User prompts should be in the category with `id: "user"`
   - All prompts should have `id`, `label`, `prompt`, and `tags` fields

## Configuration

### VS Code Settings
Go to **File** → **Preferences** → **Settings** and search for "promptLibrary":

```json
{
  "promptLibrary.windsurf.enabled": true,
  "promptLibrary.windsurf.command": "Codeium.codeium-enterprise-updater",
  "promptLibrary.copyToClipboard": false
}
```

**Options**:
- `windsurf.enabled`: Set to `false` to always use clipboard
- `windsurf.command`: Change if using a different chat integration
- `copyToClipboard`: Set to `true` to always copy to clipboard in addition to Windsurf

## Common Issues & Solutions

### Issue: "Prompt copied to clipboard" instead of "Prompt sent to Windsurf"

**Cause**: Codeium Enterprise Updater extension is not installed or command not available

**Solution**:
1. Install **Codeium** or **Windsurf** extension
2. Verify the command ID in settings matches what's installed
3. Enable `copyToClipboard` as a workaround
4. Check VS Code version compatibility (requires v1.90.0+)

### Issue: New user prompts not appearing in tree view

**Cause**: Extension didn't refresh after adding prompt

**Solution**:
1. Check the Debug Console for errors
2. Verify `prompts.json` was written (check file timestamp)
3. Reload VS Code window: `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac)

### Issue: "User Prompts category not found" error

**Cause**: The "User Prompts" category wasn't loaded from `prompts.json`

**Solution**:
1. Verify `prompts.json` contains a category with `id: "user"` and `type: "user"`
2. Check JSON syntax is valid (use online JSON validator)
3. Restart VS Code extension host

### Issue: Edit/Delete buttons not showing on user prompts

**Cause**: The prompt's `categoryType` is not set to `"user"`

**Solution**:
1. Check the prompt in `prompts.json` is under the "User Prompts" category (id: "user")
2. Reload extension: Press `F5` in debug window or restart VS Code

## Architecture Overview

### Data Flow

```
prompts.json (on disk)
    ↓ (loaded on extension activate)
PromptLibrary.loadPrompts()
    ↓
convertJsonToEntries() → PromptEntry[] (in memory)
    ↓
PromptProvider.getChildren() → PromptTreeItem[] (displayed in UI)
    ↓ (user interaction)
addPrompt() / updatePrompt() / deletePrompt()
    ↓
savePromptsToJson() → prompts.json (persisted)
```

### Key Classes

**PromptLibrary**
- Manages all prompt data
- Loads from `prompts.json`
- Provides CRUD operations
- Persists changes to file

**PromptProvider**
- Implements VS Code TreeDataProvider
- Renders tree view structure
- Handles filtering and search

**PromptTreeItem**
- VS Code TreeItem wrapper
- Sets context values (prompt-system, prompt-user, etc.)
- Configures UI icons and tooltips

## File Structure

```
src/extension.ts
├── Interfaces
│   ├── Prompt
│   ├── PromptCategory
│   ├── PromptFile
│   └── PromptEntry
├── Classes
│   ├── PromptTreeItem
│   ├── PromptProvider
│   └── PromptLibrary
└── Commands
    ├── prompt-library.usePrompt
    ├── prompt-library.addPrompt
    ├── prompt-library.editPrompt
    ├── prompt-library.deletePrompt
    ├── prompt-library.quickPickSearch
    ├── prompt-library.search
    └── prompt-library.clearSearch
```

## Next Steps

1. **Test the fixes** using the Test Cases above
2. **Check Debug Console** for any errors or unexpected behavior
3. **Verify `prompts.json`** is being written correctly
4. **Report any issues** with detailed steps to reproduce
5. **Consider additional features**:
   - Keyboard shortcuts for common operations
   - Drag-and-drop to reorder prompts
   - Prompt templates with variables
   - Cloud sync for prompts
   - Collaborative editing

## Support

For detailed logs or troubleshooting:
1. Open Debug Console: `Ctrl+Shift+Y`
2. Perform the action that's failing
3. Share the console output
4. Include the `prompts.json` file content (sanitized if needed)