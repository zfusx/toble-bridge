# Toble Bridge

A middleware server that creates an OpenAI-compatible API layer for Flowise, allowing you to use Flowise chatflows with any application or library designed to work with OpenAI's chat completions API.

## Why This Project?

While Flowise provides powerful AI workflow capabilities, many existing applications and libraries are built to work with OpenAI's API format. This middleware bridges that gap by:

- Providing a drop-in replacement for OpenAI's chat completions endpoint
- Supporting both streaming and non-streaming responses
- Maintaining OpenAI-compatible response formats
- Enabling easy integration with existing OpenAI-based applications

## Features

- OpenAI-compatible `/v1/chat/completions` endpoint
- Support for streaming responses
- Error handling and proper error responses
- CORS support for browser-based applications
- Environment-based configuration

## Prerequisites

- Node.js (v14 or higher)
- A running Flowise instance
- A configured Flowise chatflow

## Installation

1. Clone the repository:
```bash
git clone https://github.com/zfusx/toble-bridge.git
cd toble-bridge
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root:
```env
PORT=3001
FLOWISE_API_URL=http://your-flowise-instance:3000
FLOWISE_CHATFLOW_ID=your-chatflow-id
```

## Usage

1. Start the server:
```bash
node index.js
```

2. The server will start on the specified port (default: 3001)

3. Use the API endpoint in your application:
```javascript
const response = await fetch('http://localhost:3001/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello!' }],
    stream: false // Set to true for streaming responses
  })
});
```

## Integrating with AnythingLLM

You can use this compatibility layer to connect AnythingLLM with your Flowise chatflows. Here's how to set it up:

1. Ensure this middleware server is running (follow the installation steps above)

2. In your AnythingLLM settings:
   - Go to "LLM Settings"
   - Select "Generic OpenAI" as your LLM Provider, then open Generic OpenAI Settings
   - Set the following configuration:
     ```
     Base URL: http://localhost:3001/v1 (or your middleware server URL anythingllm would add /chat/completions automaticially)
     API Key: any-value (the middleware doesn't require authentication, you can set the key in flowise)
     Chat Model Name: any-name (this will be displayed in AnythingLLM)
     Tokencontext window: 4000 
     MaxTokens:1024 (any number you would like)
     ```
   - Save your settings

3. AnythingLLM will now send requests through this middleware to your Flowise chatflow

This integration allows you to use your custom Flowise workflows while maintaining compatibility with AnythingLLM's interface and features.

## Testing

The project includes a Python test client (`test_chat.py`) that demonstrates how to use the Toble Bridge with both streaming and non-streaming modes. This script is useful for:

- Testing your Toble Bridge setup
- Understanding the API usage patterns
- Debugging connection issues
- Example implementation of a client

To run the test client:

1. Install Python dependencies:
```bash
pip install requests python-dotenv
```

2. Make sure your `.env` file is configured

3. Run the test script:
```bash
python test_chat.py
```

The script will test both streaming and non-streaming modes of the API, demonstrating how to:
- Create chat completion requests
- Handle streaming responses
- Process API responses
- Manage conversation context

## Environment Variables

- `PORT`: The port number for the server (default: 3001)
- `FLOWISE_API_URL`: The URL of your Flowise instance
- `FLOWISE_CHATFLOW_ID`: The ID of the chatflow you want to use

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Acknowledgments

- Thanks to the Flowise team for creating an amazing AI workflow tool
- Inspired by OpenAI's API design