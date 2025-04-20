import requests
import json
from time import sleep
from typing import List, Dict, Optional, Union, Any
import sys
import os
from dotenv import load_dotenv

class ChatCompletionMessage:
    def __init__(self, role: str, content: str):
        self.role = role
        self.content = content

    def to_dict(self) -> Dict[str, str]:
        return {"role": self.role, "content": self.content}

class ChatCompletion:
    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url.rstrip('/')
        
    def create(self, 
              messages: List[Union[Dict[str, str], ChatCompletionMessage]],
              model: str = "gpt-3.5-turbo",
              temperature: float = 0.7,
              max_tokens: int = 1000,
              stream: bool = False,
              **kwargs) -> Union[Dict[str, Any], Any]:
        """
        Create a chat completion using the OpenAI-compatible API format
        """
        # Convert messages to dict format if they're ChatCompletionMessage objects
        messages_dict = [
            m.to_dict() if isinstance(m, ChatCompletionMessage) else m 
            for m in messages
        ]
        
        try:
            response = requests.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": messages_dict,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": stream,
                    **kwargs
                },
                headers={"Content-Type": "application/json"},
                stream=stream
            )
            response.raise_for_status()
            
            if stream:
                return response
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Error making request: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response text: {e.response.text}")
            raise

def print_streaming_response(response):
    collected_messages = []
    
    # Process the streaming response
    for line in response.iter_lines():
        if not line:
            continue
            
        # Remove 'data: ' prefix and decode
        line = line.decode('utf-8')
        if not line.startswith('data: '):
            continue
            
        line = line[6:]
        if line == '[DONE]':
            break
            
        try:
            chunk = json.loads(line)
            if chunk.get('choices') and chunk['choices'][0].get('delta', {}).get('content'):
                content = chunk['choices'][0]['delta']['content']
                sys.stdout.write(content)
                sys.stdout.flush()
                collected_messages.append(content)
        except json.JSONDecodeError:
            print(f"Error decoding JSON: {line}", file=sys.stderr)
                
    print()  # New line after streaming completes
    return ''.join(collected_messages)

def main():
    client = ChatCompletion()
    conversation: List[ChatCompletionMessage] = []
    messages = [
        "Hello, how are you?",
    ]
    
    # Test both streaming and non-streaming modes
    for stream_mode in [False, True]:
        print(f"\n{'='*20} Testing {'streaming' if stream_mode else 'non-streaming'} mode {'='*20}")
        conversation = []  # Reset conversation for each test
        
        for message in messages:
            print("\nUser:", message)
            conversation.append(ChatCompletionMessage("user", message))
            
            try:
                if stream_mode:
                    print("Assistant (streaming): ", end='', flush=True)
                    response = client.create(conversation, stream=True)
                    assistant_message = print_streaming_response(response)
                else:
                    response = client.create(conversation, stream=False)
                    assistant_message = response["choices"][0]["message"]["content"]
                    print("Assistant (non-streaming):", assistant_message)
                
                conversation.append(ChatCompletionMessage("assistant", assistant_message))
                sleep(1)
                
            except Exception as e:
                print(f"Error during chat: {str(e)}")
                print("Raw error:", e)
                break

if __name__ == "__main__":
    main()

# Load environment variables
load_dotenv()

def test_flowise_stream():
    flowise_url = os.getenv('FLOWISE_API_URL')
    chatflow_id = os.getenv('FLOWISE_CHATFLOW_ID')
    
    if not flowise_url or not chatflow_id:
        print("Please set FLOWISE_API_URL and FLOWISE_CHATFLOW_ID in .env file")
        return

    url = f"{flowise_url}/api/v1/prediction/{chatflow_id}"
    
    # Test data
    payload = {
        "question": "hello",
        "streaming": True
    }
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    print("Sending request to Flowise API...")
    with requests.post(url, json=payload, headers=headers, stream=True) as response:
        print(f"Response status: {response.status_code}")
        
        buffer = ""
        for chunk in response.iter_lines():
            if chunk:
                text = chunk.decode('utf-8')
                print(f"Raw chunk received: {text}")
                
                # Handle the data: prefix
                if text.startswith('data:'):
                    try:
                        data = json.loads(text[5:])
                        if data.get('event') == 'token':
                            print(f"Token: {data.get('data')}", end='', flush=True)
                    except json.JSONDecodeError as e:
                        print(f"Error parsing JSON: {e}")
                        print(f"Problematic text: {text}")

if __name__ == "__main__":
    test_flowise_stream()
