# Prompt Library Extension - Implementation Guide

## Overview

The Prompt Library extension provides a comprehensive system for managing, searching, and using AI prompts within VS Code with seamless Windsurf integration and contributor feedback mechanism. All users can add, edit, and delete their own prompts in the User Prompts category, while System prompts are read-only. Users can also submit their custom prompts to contributors for team library inclusion.

## Features

### 1. JSON-Based Prompt Loading with Category Types

Prompts are loaded from a `prompts.json` file organized into System and User categories:

- **System Prompts**: Read-only, managed by the extension
- **User Prompts**: Fully editable and deletable by any user

**Structure:**
```json
{
  "categories": [
    {
      "id": "dotnet",
      "label": ".NET",
      "type": "system",
      "prompts": [
        {
          "id": "dotnet-aspnet-core-webapi",
          "label": "ASP.NET Core Web API Endpoint",
          "prompt": "Implement an ASP.NET Core Web API endpoint...",
          "tags": ["dotnet", "aspnet-core", "webapi"]
        }
      ]
    },
    {
      "id": "user-prompts",
      "label": "User Prompts",
      "type": "user",
      "prompts": []
    }
  ]
}
```

### 2. System vs User Prompts

#### System Prompts
- ✅ Can be viewed and used
- ✅ Can be searched and filtered
- ❌ Cannot be edited
- ❌ Cannot be deleted
- ❌ Cannot send to contributor
- 🔒 Read-only access

#### User Prompts
- ✅ Can be viewed and used
- ✅ Can be edited (label, text, tags)
- ✅ Can be deleted
- ✅ Can add new prompts
- ✅ Can send to contributor for review
- ✅ Full CRUD operations

### 3. TreeView Display with Category Types

The Explorer sidebar shows a hierarchical view with visual distinction:

```
📚 Prompt Library
├── 📁 .NET (System)
│   ├── ASP.NET Core Web API Endpoint [dotnet • aspnet-core]
│   ├── EF Core Repository & Unit of Work [dotnet • ef-core]
│   └── JWT Authentication & Authorization [dotnet • jwt]
├── 📁 Angular (System)
│   ├── Standalone Component (OnPush) [angular • components]
│   └── Reactive Form with Validation [angular • forms]
├── 📁 React.js (System)
│   ├── TS Functional Component [react • typescript]
│   └── Redux Toolkit Slice [react • redux]
└── 📁 User Prompts (User)
    ├── My Custom Prompt [custom • ai] 📤 ✏️ 🗑️
    └── Project-Specific Template [template • project] 📤 ✏️ 🗑️
```

- **System Categories**: Collapsed folder icon, read-only prompts
- **User Categories**: Editable folder icon, manageable prompts
- **Icons**: Click any prompt to use it, 📤 to send to contributor, ✏️ to edit, 🗑️ to delete
- **Tooltips**: Hover to see all tags
- **Context Menus**: Right-click for edit/delete/send to contributor (user prompts only)

### 4. Add New Prompts

All users can add new prompts to the User Prompts category:

```
1. Click the add icon (➕) in the Prompt Library title bar
2. Enter prompt label (e.g., "Custom Validation Logic")
3. Enter full prompt text
4. Enter comma-separated tags (e.g., "custom, validation, forms")
5. Prompt is saved to prompts.json in User Prompts category
```

### 5. Edit User Prompts

Edit any prompt in the User Prompts category:

```
1. Right-click on a user prompt
2. Select "Edit Prompt"
3. Update the label, text, and/or tags
4. Confirm changes
5. Changes are saved to prompts.json
```

**Cannot Edit**: System prompts show an error message if you try to edit them.

### 6. Delete User Prompts

Remove any prompt from the User Prompts category:

```
1. Right-click on a user prompt
2. Select "Delete Prompt"
3. Confirm the deletion
4. Prompt is removed from prompts.json
```

**Cannot Delete**: System prompts show an error message if you try to delete them.

### 7. Send Prompt to Contributor

Share user-created prompts with the team contributors for review and potential inclusion in the team library:

```
1. Right-click on a user prompt
2. Click "Send to Contributor" (📤 icon)
3. Prompt JSON is formatted and sent via email
4. Contributors receive email with:
   - Prompt name and tags
   - Complete JSON representation
   - Full prompt text in readable format
5. Confirmation message appears when email is sent
```

**Email Configuration:**
- **From**: HumanaCodeiumSquad@cognizant.com
- **To**: gowshick.d@cognizant.com
- **Protocol**: Outlook/Office365 SMTP (smtp.office365.com:587)
- **Requires**: EMAIL_PASSWORD environment variable with valid Outlook credentials

**Cannot Send**: System prompts cannot be sent to contributor (only user prompts).

### 8. Tag-Based Filtering

Filter prompts by concept tags with multiple selection:

- **QuickPick Multi-Select**: Press the filter icon (⊕) in the Prompt Library view title bar
- Select one or more tags from the list
- See only prompts matching those tags
- Leave empty to see all prompts

### 9. Search & Filter Operations

#### TreeView Search
- Click 🔍 icon to search by name, content, or tags
- Results filter the tree in real-time
- Click ✕ to clear the search

#### QuickPick Multi-Select
- Click ⊕ icon for tag-based filtering
- Select multiple tags with checkboxes
- See filtered prompts with descriptions and preview

### 10. Windsurf Chat Integration

Prompts are sent to Windsurf's chat input with multiple fallback mechanisms:

#### How It Works:
1. **Primary**: Execute the configured Windsurf command (default: `Codeium.codeium-enterprise-updater`)
2. **Fallback**: Copy to clipboard if Windsurf command unavailable
3. **Optional**: Always copy to clipboard in addition to Windsurf

#### Configuration:
In VS Code Settings (`settings.json`):

```json
{
  "promptLibrary.windsurf.enabled": true,
  "promptLibrary.windsurf.command": "Codeium.codeium-enterprise-updater",
  "promptLibrary.copyToClipboard": false
}
```

**Configuration Options:**
- `promptLibrary.windsurf.enabled` (bool): Enable/disable Windsurf integration
- `promptLibrary.windsurf.command` (string): Command ID to execute (can be customized)
- `promptLibrary.copyToClipboard` (bool): Always copy to clipboard

## Usage Examples

### Example 1: Use a System Prompt
```
1. Open Prompt Library in Explorer
2. Expand ".NET" category
3. Click "ASP.NET Core Web API Endpoint"
4. Prompt is sent to Windsurf chat
```

### Example 2: Filter by Tags
```
1. Click filter icon (⊕) in title bar
2. Select "react" and "hooks" tags
3. See only React hook-related prompts
4. Choose a prompt to use it
```

### Example 3: Add a Custom Prompt
```
1. Click add icon (➕) in title bar
2. Label: "My Custom Hook Template"
3. Prompt: "Create a custom React hook that..."
4. Tags: "react, hooks, custom"
5. Prompt appears in User Prompts category
```

### Example 4: Edit a User Prompt
```
1. Right-click on "My Custom Hook Template"
2. Select "Edit Prompt"
3. Update the text or tags
4. Confirm changes
5. Changes are saved to prompts.json
```

### Example 5: Delete a User Prompt
```
1. Right-click on "My Custom Hook Template"
2. Select "Delete Prompt"
3. Confirm deletion
4. Prompt is removed from User Prompts
```

### Example 6: Send Prompt to Contributor
```
1. Create and test a custom prompt in User Prompts
2. Right-click on the prompt
3. Click "Send to Contributor" (📤 icon)
4. Confirmation message appears
5. Contributor receives formatted email with prompt JSON
6. Contributor reviews and adds to team library if approved
```

## File Structure

```
prompt-library/
├── prompts.json                 # System and user prompt definitions
├── src/
│   └── extension.ts            # Main extension code
├── package.json                # Extension manifest
├── README.md                   # User documentation
└── IMPLEMENTATION.md           # This file - technical details
```

## Prompt JSON Format Reference

```typescript
interface PromptFile {
  categories: Array<{
    id: string;                 // Unique category ID
    label: string;              // Display name
    type: "system" | "user";    // Category type
    prompts: Array<{
      id: string;               // Unique prompt ID
      label: string;            // Display name
      prompt: string;           // Full prompt text
      tags: string[];           // Concept tags for filtering
    }>;
  }>;
}
```

## Configuration Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `promptLibrary.windsurf.enabled` | boolean | true | Enable Windsurf integration |
| `promptLibrary.windsurf.command` | string | "Codeium.codeium-enterprise-updater" | Command ID to send prompts |
| `promptLibrary.copyToClipboard` | boolean | false | Always copy to clipboard |

## Command Reference

| Command ID | Title | Context | Availability |
|-----------|-------|---------|--------------|
| `prompt-library.usePrompt` | Use Prompt | All prompts (click) | All prompts |
| `prompt-library.quickPickSearch` | Quick Search by Tags | Title bar | All users |
| `prompt-library.search` | Search Prompts | Title bar | All users |
| `prompt-library.clearSearch` | Clear Search | Title bar | All users |
| `prompt-library.addPrompt` | Add Prompt | Title bar or User category | All users |
| `prompt-library.editPrompt` | Edit Prompt | User prompts only | User prompts only |
| `prompt-library.deletePrompt` | Delete Prompt | User prompts only | User prompts only |
| `prompt-library.sendToContributor` | Send to Contributor | User prompts only | User prompts only |

## Email Integration Details

### Contributor Email Feature

The extension includes functionality to send user-created prompts to team contributors via email for review and potential inclusion in the team library.

**Implementation Overview:**
1. **Email Library**: Uses nodemailer for SMTP communication
2. **Email Provider**: Outlook/Office365 SMTP server (smtp.office365.com:587)
3. **Authentication**: Requires EMAIL_PASSWORD environment variable
4. **Email Format**: Professional HTML and plain text versions

**Email Template Structure:**
```
Subject: New Prompt Contribution: [Prompt Label]

From: HumanaCodeiumSquad@cognizant.com
To: gowshick.d@cognizant.com

Body:
- Prompt name and tags
- JSON representation of the prompt data
- Raw prompt text in readable format
```

**Code Implementation:**
```typescript
async function sendPromptToContributor(promptEntry: PromptEntry): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: 'HumanaCodeiumSquad@cognizant.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password-here'
    }
  });

  const promptJson = {
    id: promptEntry.id,
    label: promptEntry.label,
    prompt: promptEntry.prompt,
    tags: promptEntry.tags || []
  };

  const mailOptions = {
    from: 'HumanaCodeiumSquad@cognizant.com',
    to: 'gowshick.d@cognizant.com',
    subject: `New Prompt Contribution: ${promptEntry.label}`,
    html: `...formatted HTML with prompt details...`,
    text: `...plain text version...`
  };

  await transporter.sendMail(mailOptions);
}
```

**Environment Setup:**
```bash
# Windows Command Prompt
set EMAIL_PASSWORD=your-outlook-app-password

# PowerShell
$env:EMAIL_PASSWORD="your-outlook-app-password"

# Linux/Mac
export EMAIL_PASSWORD="your-outlook-app-password"
```

**Error Handling:**
- SMTP connection errors are caught and displayed to user
- Progress notification shows sending status
- Success/error messages appear in VS Code notification area
- Debug console logs detailed error information

## Key Changes from Previous Version

### Removed
- ❌ Admin/User role configuration (`promptLibrary.userRole`)
- ❌ Role-based access control logic
- ❌ Admin-only commands

### Added
- ✅ System vs User category distinction
- ✅ Edit prompt functionality for user prompts
- ✅ All users can add new prompts
- ✅ Automatic persistence to prompts.json
- ✅ Better visual distinction in tree view
- ✅ **Contributor feedback feature** - Send prompts to contributors via email
- ✅ **Outlook/Office365 email integration** for prompt submissions
- ✅ **Environment-based configuration** for email credentials

### Behavior
- **All users** can view and use all prompts (System and User)
- **All users** can add new prompts to User Prompts category
- **All users** can edit/delete their own (User) prompts
- **All users** can send user prompts to contributors for review
- **No one** can edit/delete System prompts
- **No one** can send System prompts to contributor

## Development

### Building
```bash
npm run compile
```

### Watch Mode
```bash
npm run watch
```

### Packaging
```bash
npm run package
```

### Testing
```bash
npm test
```

## Architecture

### Core Classes

**PromptLibrary**
- Manages prompt data loading and persistence
- Loads from `prompts.json` 
- Handles category type distinction (system/user)
- Saves changes back to prompts.json

**PromptProvider**
- Implements VS Code TreeDataProvider
- Renders tree view with categories and prompts
- Supports search filtering
- Handles both system and user categories

**PromptTreeItem**
- VS Code TreeItem wrapper
- Sets context values based on category type
- Displays tags as descriptions
- Distinguishes system vs user prompts visually

**sendPromptToContributor()**
- Utility function for email operations
- Handles Outlook/Office365 SMTP connection
- Formats prompt data into professional emails
- Manages authentication and error handling

## Troubleshooting

### Prompts Not Loading
- Verify `prompts.json` exists in extension root
- Check JSON syntax is valid
- Look for error messages in Debug Console

### Changes Not Saving
- Verify `prompts.json` is writable
- Check file permissions
- Review error messages in VS Code Output panel

### Windsurf Command Not Working
- Verify `promptLibrary.windsurf.command` matches actual command ID
- Enable `promptLibrary.copyToClipboard` as fallback
- Check Windsurf is installed and running

### Email Not Sending
- Verify `EMAIL_PASSWORD` environment variable is set correctly
- Ensure Outlook account credentials are valid
- Check internet connectivity
- Review VS Code Debug Console for detailed error messages
- Verify Outlook account allows app passwords (if using Office365)
- Ensure you're sending from a user prompt (not system prompt)
- Check Outlook SMTP is not blocked by firewall

## Future Enhancements

- Cloud sync for prompts
- Version history and rollback
- Collaborative editing for teams
- Custom prompt templates with variables
- Export/import prompt libraries
- Keyboard shortcuts for common operations
- Prompt sharing between users
- Category management UI
- Web UI for prompt contribution and review
- Automatic email notifications for contributors
- Prompt approval workflow

## Support

For issues or feature requests, please refer to the extension repository or contact the maintainer.
