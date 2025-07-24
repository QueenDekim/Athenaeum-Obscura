
| <img src="templates/static/favicon.png" alt="icon" width="50"/>   | <h1>Athenaeum Obscura</h1> *A platform for hosting static websites*                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `v1.0` |
| ----------------------------------------------------------------- |--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
|                                                                   |<div id="header" align="center"><img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/QueenDekim/Athenaeum-Obscura"> <img alt="GitHub commit activity" src="https://img.shields.io/github/commit-activity/m/QueenDekim/Athenaeum-Obscura"><br><img alt="GitHub Downloads (all assets, all releases)" src="https://img.shields.io/github/downloads/QueenDekim/Athenaeum-Obscura/total"> <img alt="GitHub top language" src="https://img.shields.io/github/languages/top/QueenDekim/Athenaeum-Obscura"><br><a href="./LICENSE" target="_blank"> <img src="https://img.shields.io/github/license/QueenDekim/Athenaeum-Obscura"> </a></div>|        |

---

### Table of Contents
- [1. Introduction](#1-introduction)
  - [1.1. Project Overview](#11-project-overview)
  - [1.2. Purpose of Documentation](#12-purpose-of-documentation)
- [2. System Architecture](#2-system-architecture)
  - [2.1. Overall Architecture](#21-overall-architecture)
  - [2.2. System Components](#22-system-components)
- [3. Detailed Component Descriptions](#3-detailed-component-descriptions)
  - [3.1. `web_server.py` (Web Server)](#31-web_serverpy-web-server)
  - [3.2. `app.py` (SiteManager and Main Logic)](#32-apppy-sitemanager-and-main-logic)
  - [3.3. `generate_previews.py` (Preview Generator)](#33-generate_previewspy-preview-generator)
  - [3.4. Frontend (HTML, CSS, JavaScript)](#34-frontend-html-css-javascript)
- [4. Project Structure](#4-project-structure)
- [5. Installation and Running](#5-installation-and-running)
  - [5.1. Dependencies](#51-dependencies)
  - [5.2. Installation](#52-installation)
  - [5.3. Hosting Websites](#53-hosting-websites)
  - [5.4. Running](#54-running)
- [6. Functionality and Usage](#6-functionality-and-usage)
  - [6.1. Main Page](#61-main-page)
  - [6.2. Viewing Sites](#62-viewing-sites)
  - [6.3. Preview Generation](#63-preview-generation)
- [7. Error Handling and Limitations](#7-error-handling-and-limitations)
- [8. TODO List](#8-todo-list)

## 1. Introduction

### 1.1. Project Overview
**Athenaeum Obscura** is a user-friendly web platform designed for local hosting and management of static websites. It automatically generates visual previews for each site and organizes them into a convenient collection, acting as a "gallery" or "repository" of digital artifacts. This project allows users to easily browse and access their local web projects through a centralized interface.

### 1.2. Purpose of Documentation
This document provides a detailed yet approachable technical description of the architecture, components, functionality, and deployment of the "Athenaeum Obscura" project. It is intended for developers, system administrators, and anyone interested in understanding how the system works.

## 2. System Architecture

### 2.1. Overall Architecture
The "Athenaeum Obscura" system is built on a client-server architecture using the FastAPI framework for the backend and standard web technologies (HTML, CSS, JavaScript) for the frontend. A key feature is the asynchronous monitoring of file system changes and automatic preview generation using Playwright.


### 2.2. System Components

*   **Web Server (FastAPI)**: The main backend component that handles HTTP requests, serves static files, and dynamically generates HTML pages.
*   **SiteManager**: A Python class responsible for detecting, managing, and storing information about static websites. It runs in a separate thread to monitor changes in the file system.
*   **Preview Generator (Playwright)**: An asynchronous module that uses Playwright to launch a headless browser and create screenshots (previews) of websites.
*   **Frontend (Jinja2, HTML, CSS, JS)**: The user interface that displays the list of sites, their previews, and provides update functionality.
*   **File System**: The storage location for static websites (`content/`) and generated previews (`templates/static/previews/`).
*   **State File (`sites.json`)**: A JSON file used to save and load information about registered sites and their last update times.

## 3. Detailed Component Descriptions

### 3.1. `web_server.py` (Web Server)

*   **Technologies**: FastAPI, Jinja2Templates, uvicorn.
*   **Functionality**:
    *   **`start_server(site_manager, base_dir)`**: Initializes the FastAPI application.
    *   **Template Setup**: Uses Jinja2 for rendering HTML pages. Includes a custom filter `timestamp` for formatting time.
    *   **Static File Serving**:
        *   `/static`: Serves common static files (CSS, JS, favicon) from `templates/static`.
        *   `/{site_name}/static`: Dynamically mounts static files for each site (if they exist).
        *   `/{site_name}`: Mounts HTML files for each site, allowing direct access to them.
    *   **Main Page (`/`)**:
        *   Displays a list of sites with pagination (4 items per page).
        *   Passes site information, current page, total number of pages, last update time, and application version to the template.
    *   **Update Endpoint (`/refresh`)**:
        *   Method: `POST`.
        *   Calls the asynchronous function `site_manager.update_sites_list(force_generate=True)` to forcefully update the site list and generate previews.
        *   Includes a timeout of 60 seconds for the update operation.
        *   After a successful update, calls `mount_sites()` to re-register static routes, which is critical for correctly displaying added/removed sites.
        *   Returns a JSON response with status, message, and number of changes.
    *   **Launch**: Uses `uvicorn.run(app, host=HOST, port=PORT)` to run the server, where `HOST` and `PORT` are imported from `config.py`.

### 3.2. `app.py` (SiteManager and Main Logic)

*   **Technologies**: `os`, `sys`, `json`, `time`, `threading`, `asyncio`, `pathlib`.
*   **Class `SiteManager`**:
    *   **`__init__(self, base_dir: Path)`**:
        *   Initializes paths to content, preview directories, and state file.
        *   Creates the preview directory if it does not exist.
        *   Loads previous state from `sites.json`.
        *   Starts a background thread `monitor_thread` to track changes.
    *   **`load_state()`**: Loads the list of sites and last update time from `sites.json`.
    *   **`save_state()`**: Saves the current list of sites and update time to `sites.json`.
    *   **`get_valid_sites()`**: Scans the `content/` directory and returns names of only valid directories (ignoring hidden files and non-directories).
    *   **`monitor_changes()`**:
        *   Runs in a separate thread (`threading.Thread`).
        *   Periodically (every `update_interval` seconds, default is 5) checks `content/` for new or removed sites.
        *   Upon detecting changes, triggers an asynchronous update of the site list in a new thread (`run_async_update`).
    *   **`run_async_update()`**: Creates a new `asyncio` event loop and runs `update_sites_list()` in it. This allows calling asynchronous functions from the synchronous monitoring thread.
    *   **`update_sites_list(self, force_generate=False)` (asynchronous)**:
        *   Main logic for updating the site list.
        *   Uses the `is_updating` flag to prevent simultaneous updates.
        *   Identifies new, removed, and changed sites.
        *   Deletes old preview files for removed sites.
        *   For existing sites, checks `last_modified` (the last modification time of files within the site directory) to determine the need for preview regeneration.
        *   Collects a list of sites requiring preview generation (`new_sites_list`).
        *   Calls `generate_previews()` to generate previews only for necessary sites.
        *   Updates the internal `self.sites` list and saves the state.
        *   Returns the number of detected changes.
    *   **`get_sites()`**: Returns a copy of the current list of sites (thread-safe).
    *   **`stop()`**: Stops the monitoring thread and saves the state before shutting down the application.
*   **`main()` function**:
    *   Initializes `SiteManager`.
    *   Performs an initial update of the site list at application startup.
    *   Starts the web server.
    *   Ensures proper shutdown of `SiteManager` on exit.

### 3.3. `generate_previews.py` (Preview Generator)

*   **Technologies**: `playwright.async_api`, `pathlib`, `asyncio`.
*   **`async def generate_previews(sites: list, base_dir: Path, previews_dir: Path)`**:
    *   Asynchronous function for generating screenshots.
    *   Uses `async_playwright` to launch a headless Chromium browser.
    *   For each site in the list:
        *   Checks for the presence of `index.html` in the site directory. If not, skips it.
        *   Checks if a preview already exists and if the site is not new (for optimization).
        *   Creates a new browser page.
        *   Navigates to the `file://` URL of the site's `index.html`.
        *   Waits for the page to load (using `asyncio.sleep` and `page.evaluate` to wait for `document.readyState === 'complete'`).
        *   Takes a screenshot of the visible area and saves it in `previews_dir` as `site_name.png`.
        *   Handles errors during preview generation.
    *   Closes the browser context and the browser itself after processing all sites.

### 3.4. Frontend (HTML, CSS, JavaScript)

*   **`header.html`**: Contains meta tags, links to CSS, favicon, and the page header.
*   **`footer.html`**: Contains the footer and a link to `main.js`.
*   **`index.html`**:
    *   The main page template.
    *   Includes `header.html` and `footer.html`.
    *   Displays the title "Available Sites" and a "Refresh" button.
    *   Shows the last update time.
    *   Uses a Jinja2 loop to display site cards (`site-card`) with previews.
    *   Implements pagination for navigating through site pages.
    *   Includes a modal (`refresh-modal`) to display the update status.
*   **`main.css`**: Defines styles for all interface elements, including the site grid, cards, pagination, refresh button, and modal window.
*   **`main.js`**:
    *   Handles the click event on the "Refresh" button.
    *   Displays a modal window with a loading indicator.
    *   Sends a `POST` request to `/refresh`.
    *   Sets a timeout for the request.
    *   Handles the server response:
        *   Displays a message about the update result.
        *   If there are changes (`changes_count > 0`), reloads the page after 1 second.
        *   If there are no changes, hides the modal after 3 seconds and also reloads the page (to account for removed sites).
        *   Handles network/server errors.

## 4. Project Structure

```
Athenaeum-Obscura
  ├── content
  ├── src
  │   ├── app.py
  │   ├── config.py
  │   ├── generate_previews.py
  │   └── web_server.py
  ├── templates
  │   └── static
  │   │   ├── css
  │   │   │   └── main.css
  │   │   ├── favicon.png
  │   │   ├── js
  │   │   │   └── main.js
  │   │   └── previews
  │   ├── footer.html
  │   ├── header.html
  │   └── index.html
  ├── README.md
  ├── requirements.txt
  └── sites.json
```

## 5. Installation and Running

### 5.1. Dependencies

All dependencies are listed in `requirements.txt`.

### 5.2. Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/QueenDekim/Athenaeum-Obscura.git
    cd Athenaeum-Obscura
    ```
2.  **Create a virtual environment (recommended)**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # For Linux/macOS
    # venv\Scripts\activate   # For Windows
    ```
3.  **Install Python dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Install Playwright browsers**:
    ```bash
    playwright install
    ```

### 5.3. Hosting Websites
Place your static websites (each in a separate folder containing `index.html`) in the `content/` directory.

Example:
```
Athenaeum-Obscura/
└── content/
    ├── MyWebsite1/
    │   ├── index.html
    │   └── style.css
    └── AnotherProject/
        ├── assets/
        │   └── main.js
        ├── index.html
        └── images/
            └── logo.png
```

### 5.4. Running
Run the main file `app.py`:
```bash
python src/app.py
```
The server will be available at `http://0.0.0.0:8100`.

*Can be changed in `config.py`*

## 6. Functionality and Usage

### 6.1. Main Page
Accessing `http://0.0.0.0:8100` displays the main page with a list of all detected static websites. Each site is represented by a card with its name and a preview (if generated).

### 6.2. Viewing Sites
Clicking on a site card will redirect you to the corresponding static website, which will be served by the "Athenaeum Obscura" server at `http://0.0.0.0:8100/{site_name}`.

### 6.3. Preview Generation
*   Previews are automatically generated for new sites or for sites whose files have been modified.
*   Playwright is used to render the `index.html` of each site and create a screenshot.
*   Generated previews are saved in `templates/static/previews/`.

## 7. Error Handling and Limitations

*   **Missing `index.html`**: If a site's directory does not contain `index.html`, no preview will be generated, and a "No Preview" placeholder will be displayed on the main page.
*   **Preview Generation Timeout**: The generation of previews may take time. A timeout of 60 seconds is set for the update operation in `web_server.py`. If the preview generation for all sites exceeds this time, the request may time out.
*   **Thread Safety**: The `SiteManager` uses `threading.Lock` to ensure thread safety when accessing the list of sites.
*   **Playwright Errors**: Errors during browser launch or screenshot creation are logged to the console.
*   **Local Hosting**: The project is intended for local hosting of static websites and does not include mechanisms for authentication, authorization, or protection against external threats that would be necessary for public deployment.

## 8. TODO List

Here are some potential enhancements we plan to implement in the future:

1. **Dockerization**: Wrap the application in a Docker container for easier deployment and scalability.
2. **File Upload/Deletion**: Add functionality to upload and delete website source files through the web interface.
3. **Authorization**: Implement user authentication to secure the upload and deletion features.
