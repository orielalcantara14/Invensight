# 🚀 InvenSight Team Setup Guide

Welcome to the **InvenSight** project! This guide will walk you through setting up your local environment, including the newly integrated **Prophet AI Sales Forecasting** system.

---

## 📋 Prerequisites
Ensure you have the following installed before starting:

- **Git**: For version control.
- **Node.js 18+**: For the React frontend.
- **Python 3.10+**: For the FastAPI backend.
- **PostgreSQL 14+** (if not using Docker).
- **Docker & Docker Compose** (highly recommended for the easiest setup).

---

## 🏗️ Step 1: Initial Repository Setup
1.  **Clone the Repository**:
    ```bash
    git clone <your-repository-url>
    cd InvenSight
    ```
2.  **Environment Configuration**:
    Create your local `.env` file from the template:
    ```bash
    cp .env.example .env
    ```
    *(Edit `.env` if you need to change your local database credentials or default admin keys.)*

---

## 🐳 Option A: Setup with Docker (Recommended)
This is the fastest way to get the database, backend, and frontend running in sync.

1.  **Build and Start**:
    ```bash
    docker compose up --build
    ```
    > [!IMPORTANT]
    > The first build may take **2-5 minutes** because the **Prophet** forecasting engine needs to compile mathematical models.

2.  **Database Auto-Load**:
    The first time you run this, Docker will automatically load the shared data from `backup.sql` into the `invensight-db` container.

3.  **Access the App**:
    -   Frontend: [http://localhost](http://localhost)
    -   API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 💻 Option B: Native Setup (No Docker)
Follow these steps if you prefer to run the services directly on your machine.

### 1. Database Initialization
1.  **Install PostgreSQL**: Download from [postgresql.org](https://www.postgresql.org/download/). During installation, set your password (recommend using `Rocketman09` to match the default `.env`).
2.  **Create Database**: Open `pgAdmin` or `psql` and run:
    ```sql
    CREATE DATABASE InvenSight;
    ```
3.  **Restore Data**: Open your terminal (ensure `psql` is in your PATH) and run:
    ```bash
    psql -U postgres -d InvenSight -f backup.sql
    ```
    > [!TIP]
    > If the password doesn't match your `.env`, update the `DB_PASSWORD` field in your `.env` file to match whatever you chose during Postgres installation.

### 2. Backend Setup
1.  **Navigate & Env**:
    ```bash
    cd server
    python -m venv venv
    .\venv\Scripts\activate  # Windows
    # source venv/bin/activate # Mac/Linux
    ```
2.  **Install Prophet & Deps**:
    ```bash
    pip install -r requirements.txt
    ```
    > [!CAUTION]
    > **Windows Users**: If `pip install prophet` fails, you may need to install the [C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).

3.  **Start Backend**:
    ```bash
    python main.py
    ```

### 3. Frontend Setup
1.  **Navigate & Install**:
    ```bash
    # (Back in project root)
    npm install
    ```
2.  **Start Frontend**:
    ```bash
    npm run dev
    ```

---

## 🕒 Step 3: Verifying the AI Forecasting
Once the app is running:
1.  Navigate to the **Forecasting** section in the sidebar.
2.  Wait **5-10 seconds** for the AI to synthesize the historical data.
3.  **Verify Zooming**: Use the slider at the bottom of the chart to zoom into specific weeks.
4.  **Verify Decomposition**: Scroll down to the **"Model Decomposition"** chart to see the Trend vs. Seasonal breakdown.

---

## 🔄 Database Syncing (When Pulling Updates)
If a team member pushes an updated `backup.sql`, you can sync your local state:

- **Docker**:
  ```bash
  docker compose down -v
  docker compose up
  ```
- **Native**: 
  To completely refresh your database with the latest backup:
  ```bash
  # Drop the existing DB (close all connections first!)
  dropdb -U postgres InvenSight
  # Re-create and restore
  createdb -U postgres InvenSight
  psql -U postgres -d InvenSight -f backup.sql
  ```

---

## 🛠️ Troubleshooting
- **Forecasting is empty?**: Check your `sales` table. Prophet requires at least **8 unique days** of sales history to generate a baseline.
- **Port Conflicts?**: If Port 8000 is taken, adjust `VITE_API_URL` in your `.env`.
