from playwright.async_api import async_playwright
from pathlib import Path
import asyncio

async def generate_previews(sites: list, base_dir: Path, previews_dir: Path):
    try:
        async with async_playwright() as p:
            # Запускаем браузер
            browser = await p.chromium.launch()
            context = await browser.new_context(viewport={'width': 1280, 'height': 720})
            
            for site in sites:
                site_path = Path(site["path"])
                preview_path = previews_dir / f"{site['name']}.png"
                
                # Проверяем, есть ли index.html
                index_file = site_path / "index.html"
                if not index_file.exists():
                    print(f"Index.html not found for {site['name']}, skipping preview")
                    continue
                    
                # Для измененных сайтов всегда генерируем превью
                # Для новых сайтов проверяем, не существует ли уже превью
                if not site.get('new', True) and preview_path.exists():
                    print(f"Preview already exists for {site['name']}, skipping")
                    continue
                
                print(f"Generating preview for {site['name']}")
                
                # Создаем новую страницу
                page = await context.new_page()
                
                try:
                    # Загружаем локальный файл
                    await page.goto(f"file://{index_file.resolve()}", timeout=30000)
                    
                    # Ждем полной загрузки
                    await asyncio.sleep(5)
                    
                    # Пытаемся дождаться загрузки через JavaScript
                    await page.evaluate("""async () => {
                        await new Promise((resolve) => {
                            if (document.readyState === 'complete') {
                                resolve();
                            } else {
                                window.addEventListener('load', resolve);
                            }
                        });
                    }""")
                    
                    # Делаем скриншот только видимой области
                    await page.screenshot(path=preview_path)
                    print(f"Preview generated for {site['name']}")
                except Exception as e:
                    print(f"Failed to generate preview for {site['name']}: {str(e)}")
                finally:
                    await page.close()
            
            # Закрываем браузер
            await context.close()
            await browser.close()
    except Exception as e:
        print(f"Critical error in preview generation: {str(e)}")