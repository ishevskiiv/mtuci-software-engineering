# Программная инженерия — лабораторные работы 1 и 2

Ишевский Владимир, группа БСТ2557, вариант 2 — API студенческого журнала.

- `backend/` — лабораторная работа 1: REST API на FastAPI + SQLite
- `frontend/` — лабораторная работа 2: фронтенд на React (Vite, axios, Bootstrap)

## Запуск

Бэкенд:

```
cd backend
pip install fastapi uvicorn
uvicorn main:app --reload
```

API: http://localhost:8000, документация Swagger: http://localhost:8000/docs

Фронтенд:

```
cd frontend
npm install
npm run dev
```

Открыть http://localhost:5173
