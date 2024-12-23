# AI English Speaking Practice Chrome Extension

Real-time English speaking practice with AI feedback powered by Google Gemini and ElevenLabs.

## Features

- Real-time speech recognition
- AI-powered pronunciation feedback
- Grammar corrections
- Natural voice response
- Audio visualization
- Contextual practice suggestions

## Setup

1. Clone the repository
2. Get API keys:
   - Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - (Optional) ElevenLabs API key from [ElevenLabs](https://elevenlabs.io)
3. Load the extension:
   - Open Chrome Extensions (chrome://extensions/)
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select extension directory

## Development

### Project Structure
```
extension/
├── src/
│   ├── popup/          # Main UI components
│   ├── background/     # Service worker
│   ├── content/        # Page scripts
│   ├── services/       # API integrations
│   └── utils/          # Helper functions
└── assets/            # Static resources
```

### Build & Test

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Submit pull request

## License

MIT License