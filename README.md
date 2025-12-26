<div align="center">
	<br />
	<p>
		<h1>🤖 CoreBot</h1>
	</p>
	<p>
		<em>A powerful, addon-driven Discord bot framework</em>
	</p>
	<br />

[![Documentation](https://img.shields.io/badge/📚_Documentation-Visit_Docs-blue?style=for-the-badge)](https://riktigatomten.github.io/corebot-docs/)

</div>

---

## About

**CoreBot** is a modular Discord bot framework where the core handles infrastructure and addons provide features. Import `#core` in any addon to access utilities, database, logging, and more.

## ✨ Features

- **Modular** - Add only the features you need
- **Shared Core** - All addons access common utilities via `#core`
- **Self-contained Addons** - Each addon has its own config, database, and events
- **Extension Support** - Addons can have sub-addons
- **Easy to Extend** - Build and share addons without touching core code

## 🚀 Quick Start

1. Clone the repository
2. Run `npm install`
3. Copy `src/config/.env.example` to `src/config/.env`
4. Add your bot token and client ID to `.env`
5. Run `npm run dev`

## 📚 Documentation

Full documentation is available at:

**👉 [https://riktigatomten.github.io/CoreBot-Docs/](https://riktigatomten.github.io/corebot-docs/)**

The documentation covers:
- Getting Started
- Creating Addons
- Core API Reference
- Database Integration
- Event Handling
- Extensions
- And more...

## 🤝 Contributing

Contributions are welcome! Whether it's core improvements, new addons, documentation, or bug fixes.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
	<sub>Built with ❤️ by RiktigaTomten</sub>

</div>
