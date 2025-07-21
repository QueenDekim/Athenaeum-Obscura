from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import uvicorn
import time
import datetime
import asyncio
from config import HOST, PORT

def get_current_version():
    return '1.0'

def start_server(site_manager, base_dir: str):
    app = FastAPI(title="Web Platform")
    ITEMS_PER_PAGE = 4
    
    # Настройка путей
    templates_dir = os.path.join(base_dir, "templates")
    templates = Jinja2Templates(directory=templates_dir)
    
    # Кастомный фильтр для времени
    def timestamp_filter(value):
        try:
            return datetime.datetime.fromtimestamp(value).strftime('%Y-%m-%d %H:%M:%S')
        except:
            return "N/A"
    
    templates.env.filters['timestamp'] = timestamp_filter
    
    # Статика для главного шаблона
    app.mount(
        "/static",
        StaticFiles(directory=os.path.join(templates_dir, "static")),
        name="template_static"
    )
    
    # Регистрация маршрутов для каждого сайта
    @app.on_event("startup")
    async def mount_sites():
        sites = site_manager.get_sites()
        for site in sites:
            site_name = site["name"]
            site_path = site["path"]
            
            # Монтируем статические файлы сайта
            static_path = os.path.join(site_path, "static")
            if os.path.exists(static_path):
                app.mount(
                    f"/{site_name}/static",
                    StaticFiles(directory=static_path),
                    name=f"{site_name}_static"
                )
            
            # Монтируем HTML-файлы сайта
            app.mount(
                f"/{site_name}",
                StaticFiles(directory=site_path, html=True),
                name=site_name
            )
    
    # Главная страница со списком сайтов
    @app.get("/")
    async def index(request: Request, page: int = 1):
        sites = site_manager.get_sites()
        
        # Рассчитываем общее количество страниц
        total_pages = (len(sites) + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE
        
        # Корректируем номер страницы
        if page < 1:
            page = 1
        elif page > total_pages and total_pages > 0:
            page = total_pages
        
        # Вычисляем индексы для текущей страницы
        start_idx = (page - 1) * ITEMS_PER_PAGE
        end_idx = start_idx + ITEMS_PER_PAGE
        current_sites = sites[start_idx:end_idx]
        
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "sites": current_sites,
                "current_page": page,
                "total_pages": total_pages,
                "last_update": site_manager.last_update,
                "version": get_current_version()
            }
        )
    
    # Обновление списка сайтов
    @app.post("/refresh")
    async def refresh_sites():
        """Обновляет список сайтов и дожидается завершения генерации превью"""
        try:
            # Принудительно обновляем список и генерируем превью для новых сайтов
            # Добавляем таймаут 60 секунд
            changes_count = await asyncio.wait_for(
                site_manager.update_sites_list(force_generate=True),
                timeout=60.0
            )
            
            # После обновления списка сайтов, необходимо обновить монтирование статических файлов
            # Это критично для корректного отображения удаленных/добавленных сайтов
            await mount_sites() # Добавить эту строку
            
            # Возвращаем количество найденных изменений
            return {
                "status": "success",
                "message": f"Обнаружено изменений: {changes_count}" if changes_count > 0 else "Изменений не найдено",
                "changes_count": changes_count
            }
        except asyncio.TimeoutError:
            return {
                "status": "error",
                "message": "Превышено время ожидания",
                "changes_count": 0
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Ошибка обновления: {str(e)}",
                "changes_count": 0
            }
    
    # Запуск сервера
    uvicorn.run(app, host=HOST, port=PORT)