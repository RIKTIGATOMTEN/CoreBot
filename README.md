<div align="center">
	<br />
	<p>
		<h1>🤖 CoreBot</h1>
	</p>
	<p>
		<em>A lightweight, modular Discord bot framework with zero built-in features</em>
	</p>
	<br />
	<p>
		<a href="https://github.com/RIKTIGATOMTEN/CoreBot"><img src="https://img.shields.io/github/last-commit/RIKTIGATOMTEN/CoreBot?logo=github&logoColor=white&style=flat-square" alt="Last commit" /></a>
		<a href="https://github.com/RIKTIGATOMTEN/CoreBot/graphs/contributors"><img src="https://img.shields.io/github/contributors/RIKTIGATOMTEN/CoreBot?logo=github&logoColor=white&color=blue&style=flat-square" alt="Contributors" /></a>
		<a href="https://github.com/RIKTIGATOMTEN/CoreBot/releases"><img src="https://img.shields.io/github/v/release/RIKTIGATOMTEN/CoreBot?style=flat-square" alt="Latest Release" /></a>
		<a href="https://github.com/RIKTIGATOMTEN/CoreBot/blob/main/LICENSE"><img src="https://img.shields.io/github/license/RIKTIGATOMTEN/CoreBot?style=flat-square" alt="License" /></a>
	</p>
</div>

## 📋 About

**CoreBot** is a minimalist Discord bot framework that doesn't include any built-in features. All functionality comes from addons, giving you complete control over what your bot does. No bloat, faster loading times, total customization.

## 🚀 Features

- ✅ **Zero built-in features** - Start with a clean slate, add only what you need
- ✅ **Addon-based architecture** - All functionality comes from modular addons
- ✅ **Automatic addon discovery** - Automatically discovers addons in `src/addons/`
- ✅ **Dynamic loading system** - Imports and executes addons at runtime
- ✅ **Robust error handling** - Failed addons won't crash the bot
- ✅ **TypeScript-first** - Built with TypeScript for type safety
- ✅ **Developer-friendly** - Easy to understand and extend

## 🛠️ Development Setup
```bash
# Clone the repository
git clone https://github.com/RIKTIGATOMTEN/CoreBot.git
cd CoreBot

# Install dependencies
npm install

# Copy environment template
copy src\config\.env.example src\config\.env

# Edit .env with your bot token
# Then run in dev mode
npm run dev
```

## 📝 Configuration

Edit `src/config/.env`:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
DEBUG=false
```

## 🔌 Creating Addons

Place addons in `src/addons/YourAddon/`:
```
src/addons/YourAddon/
├── addon.info           # Addon metadata
├── script/
│   └── main.ts         # Entry point
└── config/             # Optional configs
```

## 📦 Building
```bash
# Build for production
npm run build

# Output will be in dist/
```

## 🚀 Scripts

- `npm run dev` - Development mode with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
	<sub>Built with ❤️ by RIKTIGATOMTEN</sub>
</div>