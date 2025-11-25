# Telegram Helper Bot (TGH)

AI-powered Telegram bot that uses Claude API to understand and execute your requests.

## Setup

### 1. Get a Telegram Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow the prompts
3. Copy the bot token provided

**Note:** The bot will have its own identity - bots cannot send messages as your personal account. To interact with it, simply search for your bot's username in Telegram and start a private chat.

### 2. Get an Anthropic API Key

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Navigate to API Keys section
3. Create a new API key

### 3. Local Development

```bash
# Install dependencies
bun install

# Create .env file
cp .env.example .env

# Edit .env and add your tokens
TELEGRAM_BOT_TOKEN=your_bot_token_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Run the bot
bun run dev
```

### 4. Deploy to Render

1. Push your code to GitHub (already done!)

2. Create a new Web Service on Render:
```bash
# The render.yaml is already configured, but you can also use the CLI
# Make sure to set environment variables in Render dashboard
```

3. Add environment variables in Render dashboard:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
   - `ANTHROPIC_API_KEY`: Your Anthropic API key

4. Deploy!

## Features

The bot currently includes example tools:
- Weather lookup (mock implementation)
- Reminder setting (mock implementation)

Claude API uses function calling to understand your intent and execute the appropriate tool.

## Extending the Bot

Add new tools in `src/claude-assistant.ts`:

1. Add tool definition to the `tools` array
2. Implement the tool logic in `executeToolCall()`

Example tools you could add:
- Web scraping
- Database queries
- API integrations
- File operations
- Calculations

## Architecture

- **Grammy**: Telegram bot framework
- **Anthropic SDK**: Claude API integration with function calling
- **Bun**: Fast JavaScript runtime and package manager
- **Biome**: Linting and formatting
- **Render**: Hosting platform

## Development

```bash
# Format code
bun run format

# Lint code
bun run lint

# Run in development mode (with watch)
bun run dev
```
