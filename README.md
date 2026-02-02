# Hill Chart

A simple, static web app for creating and sharing [Shape Up](https://basecamp.com/shapeup) Hill Charts.

## What are Hill Charts?

Hill Charts visualize project progress. Each scope moves along a hill:
- **Left side**: Figuring things out (problem-solving)
- **Right side**: Making it happen (execution)

## Features

- Drag scopes along the hill to show progress
- Shareable URLs with full chart state encoded
- Copy images to clipboard for GitHub, Slack, etc.
- Hand-drawn aesthetic using RoughJS
- 100% static - no server, no database

## Usage

1. Set a title at the top
2. Click "+ Add Scope" to add work items
3. Drag scopes horizontally to position them
4. Double-click a scope to edit or delete it
5. Use "Copy Link" or "Copy Image" to share

## Technology

- Vanilla JavaScript (ES6 modules)
- [RoughJS](https://roughjs.com/) for sketched style
- [Caveat](https://fonts.google.com/specimen/Caveat) font (embedded)