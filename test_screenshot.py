import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("Navigating to EDVC application...")
        page.goto('http://localhost:6010')
        
        await page.wait_for_load_state('networkidle')
        
        print("Taking screenshot...")
        await page.screenshot(path='edvc_screenshot.png', full_page=True)
        
        print("Getting page content...")
        content = await page.content()
        
        print("Page title:", await page.title())
        
        print("Checking for elements...")
        elements = await page.locator('*').all()
        print(f"Found {len(elements)} elements")
        
        await browser.close()
        print("Done!")

if __name__ == '__main__':
    asyncio.run(main())
