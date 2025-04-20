require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// OpenAI-compatible chat completions endpoint
app.post('/v1/chat/completions', async (req, res) => {
    try {
        const messages = req.body.messages;
        const lastMessage = messages[messages.length - 1].content;
        const stream = req.body.stream === true;

        if (stream) {
            // Set headers for streaming
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });

            // Initial chunk
            const chunk = {
                id: 'chatcmpl-' + Date.now(),
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: 'flowise-proxy',
                choices: [{
                    index: 0,
                    delta: {
                        role: 'assistant'
                    },
                    finish_reason: null
                }]
            };
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            res.flushHeaders();

            // Call Flowise API with streaming
            console.log('Calling Flowise API with streaming...');
            const flowiseResponse = await axios.post(
                `${process.env.FLOWISE_API_URL}/api/v1/prediction/${process.env.FLOWISE_CHATFLOW_ID}`,
                {
                    question: lastMessage,
                    streaming: true
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    responseType: 'stream'
                }
            );
            console.log('Got streaming response from Flowise');

            let buffer = '';
            flowiseResponse.data.on('data', chunk => {
                const text = chunk.toString();
                
                // Process each line immediately
                const lines = (buffer + text).split('\n');
                buffer = lines.pop(); // Keep the last incomplete line in the buffer

                for (const line of lines) {
                    if (!line.trim() || line.startsWith('message:')) continue;

                    if (line.startsWith('data:')) {
                        try {
                            const data = JSON.parse(line.slice(5));
                            
                            if (data.event === 'token') {
                                const chunk = {
                                    id: 'chatcmpl-' + Date.now(),
                                    object: 'chat.completion.chunk',
                                    created: Math.floor(Date.now() / 1000),
                                    model: 'flowise-proxy',
                                    choices: [{
                                        index: 0,
                                        delta: {
                                            content: data.data
                                        },
                                        finish_reason: null
                                    }]
                                };
                                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                                // Flush immediately after each token
                                res.flushHeaders();
                            }
                        } catch (e) {
                            console.error('Error parsing chunk:', e, line);
                        }
                    }
                }
            });

            flowiseResponse.data.on('end', () => {
                // Process any remaining buffer
                if (buffer.trim()) {
                    try {
                        const data = JSON.parse(buffer.trim().slice(5));
                        if (data.event === 'token') {
                            const chunk = {
                                id: 'chatcmpl-' + Date.now(),
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model: 'flowise-proxy',
                                choices: [{
                                    index: 0,
                                    delta: {
                                        content: data.data
                                    },
                                    finish_reason: null
                                }]
                            };
                            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                        }
                    } catch (e) {
                        console.error('Error parsing final buffer:', e);
                    }
                }

                const doneChunk = {
                    id: 'chatcmpl-' + Date.now(),
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: 'flowise-proxy',
                    choices: [{
                        index: 0,
                        delta: {},
                        finish_reason: 'stop'
                    }]
                };
                res.write(`data: ${JSON.stringify(doneChunk)}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            });

            return;
        }

        // Non-streaming response (existing code)
        const flowiseResponse = await axios.post(
            `${process.env.FLOWISE_API_URL}/api/v1/prediction/${process.env.FLOWISE_CHATFLOW_ID}`,
            {
                question: lastMessage
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        // Transform Flowise response to OpenAI format
        const response = {
            id: 'chatcmpl-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'flowise-proxy',
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: flowiseResponse.data.text || flowiseResponse.data
                },
                finish_reason: 'stop'
            }],
            usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(500).json({
            error: {
                message: 'An error occurred during your request.',
                details: error.response?.data || error.message
            }
        });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Toble Bridge server running on port ${PORT}`);
});