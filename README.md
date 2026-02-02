# Prompt Library

A powerful VS Code extension that enables teams to manage, search, and utilize a centralized library of AI prompts. Admins can create and manage prompts, while users can browse, search, and send prompts directly to Windsurf's chat input or contribute prompts back to the team.

## Features

### 🔍 **Search & Filter**
- Full-text search across prompt labels and content
- Filter prompts by category or keyword
- Quick access to relevant prompts

### 👥 **Role-Based Access**
- **Admin Mode**: Create categories, add/edit/delete prompts
- **User Mode**: View, search, and use prompts (read-only)
- Configurable per workspace or user

### 🚀 **Windsurf Integration**
- Send prompts directly to Windsurf's chat input with one click
- Configurable command for custom integration
- Automatic clipboard fallback if Windsurf command unavailable

### 📧 **Contributor Feedback**
- Send user-created prompts to contributors for review
- Share prompt JSON data via email (Outlook/Office365)
- Contributors at gowshick.d@cognizant.com receive formatted emails with prompt details
- Facilitates team collaboration and prompt library expansion

### 📦 **Organized Structure**
- Hierarchical categories for prompt organization
- Support for unlimited nesting
- Persistent storage using VS Code's global state

### ⚡ **Easy to Use**
- Tree view interface in Explorer sidebar
- Right-click context menus for admin actions
- Inline buttons for quick actions

## Installation

1. Install the extension from VS Code Marketplace or load it locally
2. The extension activates automatically when viewing the Prompt Library view
3. Configure your role and preferences (see Configuration section)

## Usage

### For Users

1. **View Prompts**
   - Open the Explorer sidebar
   - Look for "Prompt Library" view
   - Browse categories and prompts

2. **Search Prompts**
   - Click the 🔍 search icon in the Prompt Library header
   - Type your search query
   - Results filter in real-time across all prompt text and labels
   - Click the ✕ icon to clear search

3. **Use a Prompt**
   - Click any prompt to send it to Windsurf's chat input
   - A notification confirms the action
   - Prompt is ready to use in Windsurf

4. **Send Prompt to Contributor** (User Prompts Only)
   - Right-click on any user-created prompt
   - Click "Send to Contributor" (📤 button)
   - Prompt JSON is sent via email to the team contributors
   - Confirmation message appears when email is sent successfully
   - Contributors receive formatted email with:
     - Prompt label and tags
     - Complete JSON representation
     - Raw prompt text
   - Great way to suggest new prompts for the team library!

### For Admins

1. **Create a New Category**
   - Click the ➕ add icon in the Prompt Library header
   - Enter a category name (e.g., "React Patterns", "API Design")
   - Category appears in the tree view

2. **Add a Prompt to a Category**
   - Right-click on a category
   - Click "Add Prompt" (➕ button)
   - Enter a label (e.g., "Custom Hook Template")
   - Enter the full prompt text
   - Prompt is saved and visible immediately

3. **Delete a Prompt**
   - Right-click on any prompt
   - Click "Delete Prompt" (🗑️ button)
   - Confirm the deletion
   - Prompt is removed permanently

4. **Add Top-Level Prompts** (Optional)
   - Use the "Add Prompt" command from the Prompt Library menu
   - Prompts without a category appear at the root level

## Configuration

Configure the extension in VS Code Settings (`Cmd+,` / `Ctrl+,`):

### User Role
```json
"promptLibrary.userRole": "user"  // or "admin"
```
- `user`: View and search prompts (default)
- `admin`: Full access to create, edit, and delete prompts

### Windsurf Integration
```json
"promptLibrary.windsurf.enabled": true
"promptLibrary.windsurf.command": "windsurf.sendToChat"
```
- `enabled`: Enable/disable Windsurf integration
- `command`: Command to send prompts to Windsurf chat (default: `windsurf.sendToChat`)

### Clipboard Fallback
```json
"promptLibrary.copyToClipboard": false
```
- `true`: Always copy prompt to clipboard in addition to Windsurf
- `false`: Only use Windsurf or fallback to clipboard (default)

### Contributor Email Configuration
The extension uses Outlook/Office365 SMTP to send prompts to contributors:
- **From**: HumanaCodeiumSquad@cognizant.com
- **To**: gowshick.d@cognizant.com
- **Email Protocol**: Outlook/Office365 SMTP (smtp.office365.com:587)

For local testing or custom email configuration:
```bash
# Set environment variable with your email password
export EMAIL_PASSWORD="your-outlook-app-password"
```

## Data Storage

- Prompts are stored in VS Code's global state
- Data persists across sessions
- Default prompts are loaded on first installation:
  - **Front End**: React, Vue, Angular
  - **Back End**: Node.js, Python, Java

## Default Prompts

The extension comes pre-populated with example prompts:

```
Front End/
├── React - "Create a React component that..."
├── Vue - "Generate a Vue 3 composition API example for..."
└── Angular - "Build an Angular service that..."

Back End/
├── Node.js - "Create an Express route that..."
├── Python - "Write a Flask endpoint that..."
└── Java - "Implement a Spring Boot controller that..."
```

**Admins can delete these and add their own!**

## Commands

All commands are accessible via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

| Command | Description | Role |
|---------|-------------|------|
| `Search Prompts` | Open search dialog | User/Admin |
| `Clear Search` | Clear active search filter | User/Admin |
| `Add Category` | Create a new prompt category | Admin |
| `Add Prompt` | Add a new prompt to a category | Admin |
| `Delete Prompt` | Remove a prompt | Admin |
| `Use Prompt` | Send prompt to Windsurf chat | User/Admin |
| `Send to Contributor` | Send user prompt JSON to contributor email | User/Admin |

## How Windsurf Integration Works

When you click a prompt:

1. **Primary**: Attempts to execute the configured Windsurf command with the prompt text
2. **Fallback**: If Windsurf command fails or is disabled, copies prompt to clipboard
3. **Both**: If `copyToClipboard` is enabled, does both simultaneously

### Custom Windsurf Command

If your Windsurf extension uses a different command name, update the configuration:

```json
"promptLibrary.windsurf.command": "your.custom.command"
```

The extension will pass the prompt text as the first argument.

## How Contributor Email Works

When you send a prompt to a contributor:

1. **Email Composition**: The prompt data is formatted into a professional email with:
   - Prompt name and tags
   - Complete JSON representation
   - Full prompt text in readable format

2. **Email Delivery**: Email is sent via Outlook/Office365 SMTP from HumanaCodeiumSquad@cognizant.com to gowshick.d@cognizant.com

3. **Recipient Review**: Contributors receive the email and can review the submitted prompt for inclusion in the team library

4. **Notification**: You receive a success/error notification in VS Code confirming the email was sent

## Example Workflows

### Workflow 1: Team Prompt Library
1. Admin creates categories: "API Design", "Code Review", "Documentation"
2. Admin populates with team-approved prompts
3. Users search and send prompts to Windsurf for code generation
4. Users get consistent, team-approved AI assistance

### Workflow 2: Community Contributions
1. Users create custom prompts in their local "User Prompts" category
2. Users test and refine their prompts with Windsurf
3. Users click "Send to Contributor" to share promising prompts
4. Contributors review submissions and add best ones to team library
5. Team benefits from community innovation

### Workflow 3: Multi-Language Support
1. Admin creates categories per language: "Python", "JavaScript", "Go"
2. Admin adds language-specific prompts and boilerplate patterns
3. Users switch contexts and find relevant prompts instantly
4. Team maintains consistency across codebases

### Workflow 4: Knowledge Base
1. Admin creates categories: "Performance", "Security", "Testing"
2. Admin adds battle-tested prompts from code reviews
3. Junior devs learn best practices through prompts
4. Reduces back-and-forth reviews

## Troubleshooting

### Prompts not persisting?
- Check that you're not in a session-only workspace
- Verify `promptLibrary` is not listed in excluded extensions

### Windsurf command not working?
- Verify Windsurf extension is installed
- Check that `promptLibrary.windsurf.command` matches Windsurf's actual command name
- Enable `promptLibrary.copyToClipboard` as temporary workaround
- Check VS Code output for error messages

### Can't find prompts in search?
- Ensure search term matches prompt label or content
- Clear search and try again
- Check user role is not set to admin-only view

### Email not sending to contributor?
- Ensure `EMAIL_PASSWORD` environment variable is set with valid Outlook password
- Verify Outlook account credentials are correct
- Check internet connectivity
- Review VS Code debug console for detailed error messages
- Ensure you're sending from a user prompt (system prompts cannot be sent to contributor)

## Known Issues

- Windsurf command name may vary by extension version—check Windsurf documentation
- Large prompt libraries (1000+ items) may have slight tree view lag
- Multi-line prompts require careful editing (single input dialog)
- Email sending requires valid Outlook credentials and internet connection

## Future Enhancements

- [ ] Export/import prompt libraries
- [ ] Prompt versioning and history
- [ ] Collaborative editing with comments
- [ ] Prompt usage analytics
- [ ] Multi-line prompt editor UI
- [ ] Prompt tags and metadata
- [ ] Integration with other AI chat extensions
- [ ] Web UI for prompt contribution and review
- [ ] Automatic email notifications for contributors

## Contributing

Contributions welcome! Please open issues and PRs on GitHub.

Alternatively, use the "Send to Contributor" feature to submit your created prompts directly!

## License

MIT

---

**Tips:**
- **For Teams**: Share configuration via `.vscode/settings.json` in your repo
- **For Power Users**: Export prompts regularly as backup
- **For Admins**: Start with a few key prompts and expand based on team feedback
- **For Contributors**: Submit great prompts through the "Send to Contributor" feature

Enjoy building with Prompt Library! 🚀
