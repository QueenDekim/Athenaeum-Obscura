import os
import sys
import json
import time
import threading
import asyncio
from pathlib import Path
from web_server import start_server
from generate_previews import generate_previews

class SiteManager:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.content_dir = base_dir / "content"
        self.previews_dir = base_dir / "templates" / "static" / "previews"
        self.state_file = base_dir / "sites.json"
        self.sites = []
        self.lock = threading.Lock()
        self.last_update = 0
        self.update_interval = 5
        self.running = True
        self.is_updating = False
        
        # Создаем директории
        self.previews_dir.mkdir(parents=True, exist_ok=True)
        
        # Загружаем сохраненное состояние
        self.load_state()
        
        # Запускаем фоновый поток
        self.monitor_thread = threading.Thread(target=self.monitor_changes, daemon=True)
        self.monitor_thread.start()
    
    def load_state(self):
        """Загружает список сайтов из файла состояния"""
        try:
            if self.state_file.exists():
                with open(self.state_file, 'r') as f:
                    data = json.load(f)
                    self.sites = data.get('sites', [])
                    self.last_update = data.get('last_update', 0)
                    print(f"Loaded {len(self.sites)} sites from state file")
        except Exception as e:
            print(f"Error loading state: {e}")
            self.sites = []
            self.last_update = 0
    
    def save_state(self):
        """Сохраняет текущее состояние в файл"""
        try:
            with open(self.state_file, 'w') as f:
                data = {
                    'sites': self.sites,
                    'last_update': self.last_update
                }
                json.dump(data, f, indent=2)
                print(f"Saved state with {len(self.sites)} sites")
        except Exception as e:
            print(f"Error saving state: {e}")
    
    def get_valid_sites(self):
        """Возвращает список только валидных директорий сайтов"""
        valid_sites = set()
        for entry in os.listdir(self.content_dir):
            # Игнорируем скрытые файлы/директории (начинающиеся с точки)
            if entry.startswith('.'):
                continue
                
            entry_path = self.content_dir / entry
            # Игнорируем файлы, берем только директории
            if entry_path.is_dir():
                valid_sites.add(entry)
        return valid_sites
    
    def monitor_changes(self):
        while self.running:
            try:
                # Получаем только валидные директории сайтов
                current_sites = self.get_valid_sites()
                
                with self.lock:
                    known_sites = {site['name'] for site in self.sites}
                
                # Сравниваем только валидные сайты
                new_sites = current_sites - known_sites
                removed_sites = known_sites - current_sites
                
                if new_sites or removed_sites:
                    print(f"Changes detected: new={len(new_sites)}, removed={len(removed_sites)}")
                    threading.Thread(
                        target=self.run_async_update,
                        daemon=True
                    ).start()
                time.sleep(self.update_interval)
            except Exception as e:
                print(f"Error in monitor thread: {e}")
                time.sleep(5)
    
    def run_async_update(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self.update_sites_list())
        loop.close()
    
    async def update_sites_list(self, force_generate=False):
        """Обновляет список сайтов с защитой от одновременных вызовов"""
        if self.is_updating:
            print("Update already in progress, skipping")
            return 0
            
        self.is_updating = True
        try:
            # Получаем только валидные директории сайтов
            site_names = sorted(self.get_valid_sites())
            
            with self.lock:
                # Делаем копию текущего списка сайтов
                current_sites = self.sites.copy()
                known_sites = {site['name']: site for site in current_sites}
                known_names = set(known_sites.keys())
            
            # Находим удаленные сайты
            removed_sites = known_names - set(site_names)
            
            # Удаляем превью для удаленных сайтов
            for site_name in removed_sites:
                preview_path = self.previews_dir / f"{site_name}.png"
                if preview_path.exists():
                    try:
                        preview_path.unlink()
                        print(f"Removed preview for deleted site: {site_name}")
                    except Exception as e:
                        print(f"Error removing preview for {site_name}: {e}")
            
            new_sites_list = []  # Сайты, для которых нужно сгенерировать превью
            updated_sites = []
            
            # Обходим все сайты в директории
            for site_name in site_names:
                site_path = self.content_dir / site_name
                
                preview_path = self.previews_dir / f"{site_name}.png"
                is_new = site_name not in known_names
                needs_preview = is_new
                site_mtime = 0
                
                # Если сайт уже известен, проверим, обновился ли он
                if not is_new:
                    # Получаем информацию о сайте из текущего состояния
                    known_site = known_sites[site_name]
                    
                    # Вычисляем время последнего изменения файлов сайта
                    try:
                        site_mtime = max(
                            (f.stat().st_mtime for f in site_path.glob('**/*') if f.is_file()),
                            default=0
                        )
                    except Exception as e:
                        print(f"Error getting mtime for {site_name}: {e}")
                        site_mtime = 0
                    
                    # Проверяем, изменился ли сайт
                    if site_mtime > known_site.get('last_modified', 0):
                        needs_preview = True
                        print(f"Site {site_name} has been modified, regenerating preview")
                    else:
                        # Сохраняем существующие данные
                        site_data = known_site.copy()
                        updated_sites.append(site_data)
                        continue
                
                # Создаем или обновляем данные сайта
                site_data = {
                    "name": site_name,
                    "path": str(site_path),
                    "preview": f"/static/previews/{site_name}.png",
                    "last_modified": site_mtime
                }
                updated_sites.append(site_data)
                
                if needs_preview:
                    new_sites_list.append(site_data)
            
            # Генерируем превью только для новых или измененных сайтов
            if new_sites_list:
                print(f"Generating previews for {len(new_sites_list)} new or changed sites")
                await generate_previews(new_sites_list, self.base_dir, self.previews_dir)
            
            # Удаляем сайты, которых больше нет в директории
            updated_sites = [site for site in updated_sites if site['name'] in site_names]
            
            # Обновляем состояние
            with self.lock:
                self.sites = updated_sites
                self.last_update = time.time()
                self.save_state()
            
            # Возвращаем общее количество изменений (новые + удаленные)
            return len(new_sites_list) + len(removed_sites)
        finally:
            self.is_updating = False
    
    def get_sites(self):
        with self.lock:
            return self.sites.copy()
    
    def stop(self):
        self.running = False
        self.monitor_thread.join(timeout=1.0)
        self.save_state()

def main():
    base_dir = Path(__file__).parent.parent
    site_manager = SiteManager(base_dir)
    
    # Инициализация: обновляем список сайтов при старте
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(site_manager.update_sites_list())
    loop.close()
    
    try:
        start_server(site_manager, str(base_dir))
    finally:
        site_manager.stop()

if __name__ == "__main__":
    main()