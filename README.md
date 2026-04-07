# InvenSight

Inventory Management System with Sales Forecasting and POS Terminal integration.

## Team Setup Guide

See the [TEAM_SETUP_GUIDE.md](file:///c:/Users/USER/Desktop/InvenSight/TEAM_SETUP_GUIDE.md) for a comprehensive, step-by-step setup for both Docker and Native (manual) environments.

---

To get this project running on your machine with the shared database:

### 1. Prerequisites
- Docker and Docker Compose installed.
- Git.

### 2. Initial Setup
1.  **Clone the Repository**:
    ```bash
    git clone <your-repo-url>
    cd InvenSight
    ```
2.  **Environment Setup**:
    Copy the example environment file to `.env`:
    ```bash
    cp .env.example .env
    ```
3.  **Launch Docker**:
    ```bash
    docker-compose up --build
    ```

### 3. Database Initialization
-   The first time you run `docker-compose up`, Docker will automatically load `backup.sql` into your local database.
-   Access the app at `http://localhost`.
-   The default admin credentials are in your `.env` file (ROOT_ADMIN_USERNAME / ROOT_ADMIN_KEY).

## Troubleshooting
-   **Database didn't load?**: Docker only loads the `backup.sql` if the database volume is empty. If you need to "reset" to the shared database, run:
    ```bash
    docker-compose down -v
    docker-compose up
    ```
    *(Warning: This deletes any local changes you've made to the database.)*