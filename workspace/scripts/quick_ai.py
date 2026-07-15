#!/usr/bin/env python3
"""
DAVE DevBox — Quick AI query from terminal
Usage: python3 workspace/scripts/quick_ai.py "Your question here"
"""
import os
import sys
import json
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError

def load_env():
    env_file = Path(__file__).parent.parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

def ask_openai(prompt):
    key = os.environ.get("OPENAI_API_KEY")
    model = os.environ.get("OPENAI_MODEL", "gpt-4o")
    data = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1024,
    }).encode()
    req = Request("https://api.openai.com/v1/chat/completions", data=data,
                  headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
    with urlopen(req) as r:
        return json.load(r)["choices"][0]["message"]["content"]

def ask_ollama(prompt):
    url = os.environ.get("OLLAMA_URL", "http://localhost:11434")
    model = os.environ.get("OLLAMA_MODEL", "llama3")
    data = json.dumps({"model": model, "messages": [{"role": "user", "content": prompt}], "stream": False}).encode()
    req = Request(f"{url}/api/chat", data=data, headers={"Content-Type": "application/json"})
    with urlopen(req) as r:
        return json.load(r)["message"]["content"]

def main():
    load_env()
    if len(sys.argv) < 2:
        prompt = input("Ask anything: ")
    else:
        prompt = " ".join(sys.argv[1:])

    try:
        if os.environ.get("OPENAI_API_KEY"):
            print(f"[OpenAI] Asking...\n")
            print(ask_openai(prompt))
        elif os.environ.get("OLLAMA_URL") or True:
            print(f"[Ollama] Asking...\n")
            print(ask_ollama(prompt))
        else:
            print("No AI provider configured. Add keys to .env")
    except URLError as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
