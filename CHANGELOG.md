# Change Log

All notable changes to the "prompt-library" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.10] - 2025-12-13

### Added
- **Contributor Email Feature**: New "Send to Contributor" functionality allowing users to submit custom prompts via email
- **Contributor Icon**: Send icon (📤) appears on user prompts in the tree view for easy access
- **Email Integration**: Outlook/Office365 SMTP support for sending prompt JSON to contributors
- **New Command**: `prompt-library.sendToContributor` - Send user prompt to contributor for review
- **Email Menu Item**: "Send to Contributor" option in context menu for user prompts only
- **Progress Notification**: Visual feedback while email is being sent
- **Formatted Email Templates**: Professional HTML and plain text email formats with prompt details
- **Nodemailer Dependency**: Added nodemailer (v6.10.1) and @types/nodemailer (v7.0.4) for email functionality
- **Documentation**: Updated README.md and IMPLEMENTATION.md with contributor feature details

### Changed
- Updated package.json to add nodemailer dependencies
- Enhanced README.md with Contributor Feedback feature section
- Expanded IMPLEMENTATION.md with Email Integration Details section
- Modified extension.ts to include sendPromptToContributor command handler

### Configuration
- **Email From**: HumanaCodeiumSquad@cognizant.com
- **Email To**: gowshick.d@cognizant.com
- **Email Protocol**: Outlook/Office365 SMTP (smtp.office365.com:587)
- **Authentication**: Requires EMAIL_PASSWORD environment variable

### Environment Variables
```bash
# Set EMAIL_PASSWORD environment variable with Outlook app password
export EMAIL_PASSWORD="your-outlook-app-password"
```

### Features Details
- Send button only appears on user prompts (system prompts excluded)
- Email contains:
  - Prompt name and tags
  - Complete JSON representation
  - Full prompt text in readable format
- Success/error notifications in VS Code
- Detailed error logging in Debug Console

### Documentation
- README.md: Added "Send Prompt to Contributor" user guide and troubleshooting
- IMPLEMENTATION.md: Added Email Integration Details, command reference, and environment setup

## [Unreleased]

- Initial release