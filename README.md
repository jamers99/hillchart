# Hill Chart

A simple, static web app for creating and sharing [Shape Up](https://basecamp.com/shapeup) Hill Charts. Track the progress of project scopes with a beautiful sketched aesthetic.

## What are Hill Charts?

Hill Charts are a visual tool from Basecamp's Shape Up methodology for tracking project progress. Each "scope" (a piece of work) moves along a hill:

- **Left side (Figuring things out)**: The problem-solving phase where you're still understanding the work
- **Right side (Making it happen)**: The execution phase where you're implementing the solution

## Features

- **Visual Progress Tracking**: Drag and drop scopes along the hill to indicate their status
- **Shareable State**: The entire chart state is encoded in the URL - just copy and share the link
- **Image Export**: Copy chart images to clipboard for pasting into GitHub, Slack, or other tools
- **Sketched Style**: Hand-drawn aesthetic using RoughJS for a casual, approachable feel
- **GitHub-Friendly**: Perfect for GitHub Project updates - paste the link and image together
- **100% Static**: No server, no database, no dependencies - just open and use

## Usage

### Creating a Chart

1. **Set a title**: Click the title field at the top and type your chart name
2. **Add scopes**: Click "+ Add Scope" and enter a name for each piece of work
3. **Position scopes**: Drag each scope horizontally to position it on the hill
4. **Edit or delete**: Click on any scope to rename or remove it

### Sharing Your Chart

**Copy Link**: Click "Copy Link" to copy a shareable URL with the full chart state encoded

**Copy Image**: Click "Copy Image" to copy a PNG image to your clipboard, ready to paste

### GitHub Project Updates

Since GitHub Project markdown doesn't support embedded images or iframes:

1. Click "Copy Link" and paste it into your update
2. Click "Copy Image" and paste the image below the link
3. GitHub will upload the image and create a permanent reference

## Technology

- **Vanilla JavaScript**: No frameworks, just clean ES6 modules
- **RoughJS**: For the hand-drawn, sketched appearance
- **html-to-image**: For high-quality image export
- **Caveat Font**: Google Font for handwritten text style