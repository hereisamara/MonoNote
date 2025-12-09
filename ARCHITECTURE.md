# MonoNote Architecture

A technical overview of the MonoNote application design, decisions, and trade-offs.

## Overview

MonoNote is a **local-first, zero-dependency note-taking application** built with vanilla HTML, CSS, and JavaScript. It runs entirely in the browser with no backend server.

```
┌─────────────────────────────────────────────────────┐
│                     MonoNote                         │
├─────────────────────────────────────────────────────┤
│  Presentation      index.html + styles.css          │
├─────────────────────────────────────────────────────┤
│  Application       app.js (controller)              │
│  Modules           ├── editor.js (block editor)     │
│                    ├── sidebar.js (navigation)      │
│                    ├── storage.js (persistence)     │
│                    ├── voice.js (speech-to-text)    │
│                    ├── linking.js (wiki links)      │
│                    └── llm.js (AI integration)      │
├─────────────────────────────────────────────────────┤
│  Persistence       localStorage (5MB limit)         │
├─────────────────────────────────────────────────────┤
│  External APIs     OpenAI / Gemini / Anthropic      │
└─────────────────────────────────────────────────────┘
```

## Design Philosophy

### 1. Local-First
All data stays on the user's device. No accounts, no servers, no tracking. Users own their data completely.

### 2. Zero Dependencies
No npm packages, no build step, no bundlers. Open `index.html` and it works. This makes the app:
- Instantly portable (USB drive, any web server)
- Easy to audit (read the code directly)
- Fast to load (no framework overhead)

### 3. Modular Architecture
Each feature is encapsulated in its own module:

| Module | Responsibility |
|--------|----------------|
| `app.js` | Main controller, initialization, theme |
| `storage.js` | CRUD operations, localStorage abstraction |
| `editor.js` | Block-based markdown editing |
| `sidebar.js` | Navigation tree, folders, drag-drop |
| `linking.js` | `[[Wiki-link]]` syntax and backlinks |
| `voice.js` | Speech-to-text with Web Speech API |
| `llm.js` | AI summarization with multiple providers |

## Key Technical Decisions

### Block-Based Editor
Instead of a simple textarea, the editor uses a block-based approach similar to Notion:
- Each paragraph is a separate block
- Markdown renders inline after pressing Enter
- Click to edit rendered content
- Enables future block-level features (drag, slash commands)

### Multi-Provider LLM Integration
The AI module supports multiple providers (OpenAI, Gemini, Anthropic) with:
- Configurable API keys stored in localStorage
- Context-aware action suggestions
- Smart content analysis (detects budgets, projects, tasks)

### Monochrome Theme System
CSS custom properties enable dark/light mode with a single accent-free palette:
- Mass color: black (dark) or white (light)
- Contrast color: opposite
- No distracting colors, focus on content

## Advantages

| Benefit | Description |
|---------|-------------|
| **Privacy** | No data leaves the browser (except AI calls with user consent) |
| **Offline** | Works without internet (except AI features) |
| **Portable** | Deploy to GitHub Pages, Netlify, or run locally |
| **Simple** | Easy to understand, modify, and extend |
| **Fast** | No framework overhead, instant load |
| **Transparent** | All code is readable, no build obfuscation |

## Limitations & Trade-offs

| Limitation | Mitigation |
|------------|------------|
| **No sync across devices** | Export/import functionality planned |
| **5MB localStorage cap** | Sufficient for thousands of notes |
| **No TypeScript** | Clean JSDoc comments for documentation |
| **Manual DOM manipulation** | Modular code keeps complexity manageable |
| **API keys in localStorage** | User-controlled, local-only storage |

## Security Considerations

### API Key Storage
- Stored in localStorage as JSON
- Never transmitted to any server except the chosen LLM provider
- Risk: Accessible via browser DevTools
- Recommendation: Use limited/throwaway API keys

### Data Privacy
- All notes stored locally in browser
- No analytics, no tracking, no telemetry
- AI requests go directly to provider (OpenAI/Google/Anthropic)

## Future Improvements

- [ ] IndexedDB for larger storage capacity
- [ ] Export to Markdown files
- [ ] Import from Notion/Obsidian
- [ ] Encrypted localStorage option
- [ ] PWA for offline installation
- [ ] Collaborative editing via WebRTC

## Why Not Use a Framework?

This is an intentional architectural choice, not a limitation:

1. **Learning**: Demonstrates deep understanding of web fundamentals
2. **Simplicity**: No build tooling, no version conflicts
3. **Portability**: Works anywhere HTML runs
4. **Performance**: Zero runtime overhead
5. **Longevity**: No framework deprecation concerns

> "Simplicity is the ultimate sophistication." — Leonardo da Vinci

---

*MonoNote is designed for users who value privacy, simplicity, and ownership of their data.*
