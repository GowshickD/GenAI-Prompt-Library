# Publishing Guide - Prompt Library Extension

This guide walks through publishing your Prompt Library extension to the VS Code Marketplace.

## Prerequisites

1. **VS Code Marketplace Account**
   - Create account at https://marketplace.visualstudio.com
   - Create a publisher organization named "Gowshick" (already done ✅)

2. **Node.js & npm**
   - Installed and available in PATH
   - Verify: `npm --version`

3. **vsce (VS Code Extension Manager)**
   - Install globally: `npm install -g @vscode/vsce`
   - Verify: `vsce --version`

4. **Personal Access Token (PAT)**
   - Create PAT at: https://dev.azure.com/_usersSettings/tokens
   - Scopes needed: `Marketplace (manage)`
   - Store securely (you'll need this for publishing)

## Current Status

✅ Publisher ID: `Gowshick` (configured in package.json)  
✅ Extension name: `prompt-library`  
✅ Version: `0.0.1`  
✅ All features implemented and documented  

## Step-by-Step Publishing

### 1. Build the Extension for Production

```bash
cd "c:\Users\708935\source\repos\VS Extension\prompt-library"
npm run package
```

This creates an optimized production build with minification.

### 2. Create the VSIX Package

```bash
vsce package
```

Output: `prompt-library-0.0.1.vsix` (already exists!)

**Note:** If you need to rebuild with updates:
```bash
npm run package  # Rebuild
vsce package     # Create new VSIX
```

### 3. Publish to Marketplace

**Option A: Using Personal Access Token (Recommended)**

```bash
vsce publish -p YOUR_PERSONAL_ACCESS_TOKEN
```

**Option B: Interactive Login**

```bash
vsce login Gowshick
# Paste your PAT when prompted
vsce publish
```

**Option C: Store Token for Future Use**

```bash
vsce login Gowshick
# Creates ~/.vsce file with token
vsce publish  # Automatically uses stored token
```

### 4. Verify Publication

1. Visit: https://marketplace.visualstudio.com/items?itemName=Gowshick.prompt-library
2. Or search "prompt-library" in VS Code Extensions
3. Wait 5-10 minutes for propagation

## Updating the Extension

### When making changes:

1. **Update version** in `package.json`
   ```json
   {
     "version": "0.0.2"
   }
   ```

2. **Update CHANGELOG.md** with changes
   ```markdown
   ## 0.0.2 - 2025-12-09
   
   ### Added
   - New feature description
   
   ### Fixed
   - Bug fix description
   ```

3. **Rebuild and publish**
   ```bash
   npm run package
   vsce publish
   ```

## Marketplace Listing Optimization

To make your extension more discoverable:

### 1. Add Icon
Create a 128x128 PNG icon and add to `package.json`:
```json
{
  "icon": "images/icon.png"
}
```

### 2. Add Repository
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/prompt-library"
  }
}
```

### 3. Add Homepage
```json
{
  "homepage": "https://github.com/yourusername/prompt-library/blob/main/README.md"
}
```

### 4. Add Keywords
```json
{
  "keywords": [
    "prompt",
    "ai",
    "windsurf",
    "productivity",
    "library",
    "snippets"
  ]
}
```

### 5. Add License
```json
{
  "license": "MIT"
}
```

## Troubleshooting

### "Publisher ID mismatch"
- ✅ FIXED: Publisher ID is now set to "Gowshick" in package.json

### "vsce not found"
```bash
npm install -g @vscode/vsce
```

### "Authentication failed"
- Verify PAT hasn't expired
- Regenerate new PAT at https://dev.azure.com/_usersSettings/tokens
- Ensure scopes include "Marketplace (manage)"

### "Extension name already taken"
- Change `"name"` in package.json to something unique
- Update commands accordingly

### "No changes to publish"
- Update version number in package.json
- Rebuild: `npm run package`

## Security Best Practices

1. **Never commit tokens** to git
2. **Use environment variables** for sensitive data
3. **Regenerate PATs periodically**
4. **Review permissions** before granting access

## Marketplace Guidelines

Before publishing, ensure you follow:
- [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Marketplace Policies](https://marketplace.visualstudio.com/manage/publishers)

Key points:
- ✅ No external telemetry without consent
- ✅ No ads or excessive popups
- ✅ Clear extension purpose
- ✅ Working functionality
- ✅ Comprehensive documentation

## Post-Publication

### 1. Monitor Reviews
- Check ratings and reviews on Marketplace
- Respond to user feedback
- Fix reported issues promptly

### 2. Update Changelog
Keep `CHANGELOG.md` up-to-date with all versions

### 3. Gather Metrics
- Track download counts
- Monitor user reviews
- Plan improvements

### 4. Plan Future Releases
- V0.0.2: Bug fixes and polish
- V0.1.0: New features (export/import, etc.)
- V1.0.0: Stable release with extensive testing

## Quick Reference Commands

```bash
# Install vsce globally
npm install -g @vscode/vsce

# Build for production
npm run package

# Create VSIX package
vsce package

# Publish with token
vsce publish -p YOUR_TOKEN

# Login and publish
vsce login Gowshick
vsce publish

# Show package contents
vsce ls

# Verify marketplace listing
# Visit: https://marketplace.visualstudio.com/items?itemName=Gowshick.prompt-library
```

## Next Version Roadmap

### 0.0.2 (Bug Fixes)
- [ ] Add icon and banner
- [ ] Improve error messages
- [ ] Add keyboard shortcuts

### 0.1.0 (New Features)
- [ ] Export/import prompts as JSON
- [ ] Edit existing prompts
- [ ] Prompt tags and filtering
- [ ] Recent prompts history

### 1.0.0 (Stable Release)
- [ ] Complete test coverage
- [ ] Performance optimization
- [ ] Team collaboration features
- [ ] Analytics integration

---

**Ready to publish!** 🚀

Your extension is fully configured and ready for the VS Code Marketplace. Once published, anyone can install it by searching "prompt-library" in VS Code Extensions.

For help: support@marketplace.visualstudio.com