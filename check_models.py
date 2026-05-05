import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load from .env file
load_dotenv()

# Get API key from environment
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("Error: GEMINI_API_KEY not found in .env file.")
else:
    try:
        genai.configure(api_key=API_KEY)
        
        print(f"Checking available models for API Key: {API_KEY[:6]}...{API_KEY[-4:]}")
        print("-" * 50)
        
        # List available models
        models = list(genai.list_models())
        if not models:
            print("No models found. The key might be valid but has no permissions.")
        else:
            for m in models:
                if 'generateContent' in m.supported_generation_methods:
                    print(f"Model: {m.name}")
        
    except Exception as e:
        print(f"ERROR: {e}")
