# Contributing to NotionLite

Thanks for your interest in contributing! Here's how you can help.

## 🐛 Reporting Bugs

1. Check existing [Issues](https://github.com/yourusername/notion-lite/issues)
2. Create a new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS info

## 💡 Feature Requests

Open an issue with the `enhancement` label describing:
- The feature you'd like
- Why it would be useful
- Any implementation ideas

## 🔧 Pull Requests

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test in multiple browsers
5. Commit: `git commit -m "Add your feature"`
6. Push: `git push origin feature/your-feature`
7. Open a Pull Request

### Code Style

- Use vanilla JavaScript (no frameworks)
- Keep the modular structure (separate JS files)
- Maintain the monochrome theme aesthetic
- Test both dark and light modes
- Ensure mobile responsiveness

## 📁 Project Structure

| File | Purpose |
|------|---------|
| `app.js` | Main controller, theme toggle |
| `storage.js` | LocalStorage CRUD operations |
| `sidebar.js` | Navigation, folders, drag-drop |
| `editor.js` | Block-based markdown editor |
| `linking.js` | Page linking and backlinks |
| `voice.js` | Voice recording and speech-to-text |

## 🧪 Testing

Since there's no build system:
1. Open `index.html` in your browser
2. Test all features manually
3. Check browser console for errors
4. Test in Chrome, Firefox, Safari, Edge

## Questions?

Open an issue or reach out!
