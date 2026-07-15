#!/usr/bin/env python3
"""
DAVE DevBox — Playwright browser automation demo
Run: python3 workspace/scripts/browser_demo.py
"""
from playwright.sync_api import sync_playwright

def demo_basic():
    """Basic page navigation and screenshot."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Opening example.com...")
        page.goto("https://example.com")
        print(f"Title: {page.title()}")

        # Take screenshot
        page.screenshot(path="workspace/logs/screenshot.png")
        print("Screenshot saved: workspace/logs/screenshot.png")

        browser.close()

def demo_scraping():
    """Simple web scraping example."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Fetching Hacker News headlines...")
        page.goto("https://news.ycombinator.com")

        titles = page.locator(".titleline > a").all_text_contents()
        for i, title in enumerate(titles[:5], 1):
            print(f"{i}. {title}")

        browser.close()

def demo_form():
    """Form interaction example."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Example: DuckDuckGo search
        print("Performing search...")
        page.goto("https://duckduckgo.com")
        page.fill('[name="q"]', "DAVE DevBox AI")
        page.press('[name="q"]', "Enter")
        page.wait_for_load_state("networkidle")
        print(f"Search result page title: {page.title()}")

        browser.close()

if __name__ == "__main__":
    print("=== DAVE DevBox — Browser Automation Demo ===\n")
    demo_basic()
    print()
    demo_scraping()
    print()
    demo_form()
    print("\nDone!")
