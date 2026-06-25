# Scraper Agent Instructions (Self-Training Memory)

This document contains rules and strategies accumulated by the AI Agent to handle specific website layouts.
When extracting business information from HTML, follow these historical strategies:

## Global Strategies
- Look for `businessName` in `<title>`, `<h1>`, or header logos (alt text).
- Look for `businessSummary` in `<meta name="description">` or an "About Us" section.
- Ignore social media links that point to generic sharing endpoints (e.g., `twitter.com/intent/tweet`).

## Discovered Strategies
(The agent will append new learned strategies here automatically.)

