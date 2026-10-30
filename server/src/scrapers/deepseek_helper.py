import os
import json
import time
import requests

def call_deepseek_ai(api_key, text_content, target_type="general", max_retries=2):
    """
    Sends raw messy text to DeepSeek to intelligently extract business details.
    """
    if not api_key or api_key == 'none':
        return None

    prompt = f"""
    You are an expert AI data extraction engine.
    Extract business information from the messy text below.
    If it's an Instagram or Facebook page, look for phone numbers, emails, and address in the bio/text.
    
    Return EXACTLY AND ONLY valid JSON in this format:
    {{
        "businessName": "Exact Business Name or null",
        "phones": ["+91 9876543210"], // array of phone strings
        "emails": ["example@gmail.com"], // array of email strings
        "address": "Full address string or null"
    }}
    
    MESSY TEXT:
    {text_content[:8000]}
    """

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek-ai/deepseek-v4-pro",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 500,
        "stream": False
    }
    url = "https://integrate.api.nvidia.com/v1/chat/completions"

    for attempt in range(max_retries):
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=25)
            res.raise_for_status()
            content = res.json()['choices'][0]['message']['content']
            
            # Clean markdown formatting if present
            cleaned_content = content.replace('```json', '').replace('```', '').strip()
            parsed_data = json.loads(cleaned_content)
            return parsed_data
        except Exception as e:
            time.sleep(2)
            
    return None
