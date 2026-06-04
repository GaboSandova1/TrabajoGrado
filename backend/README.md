# ReviewAI Backend (FastAPI)

## Arranque

```bash
cd backend
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Usuarios demo (se crean al iniciar)

| Usuario   | Contraseña   | Rol      |
|-----------|--------------|----------|
| manager   | manager123   | manager  |
| employee  | employee123  | employee |

## Variables de entorno

Copia `.env.example` a `.env` y configura:

- `RAINFOREST_API_KEY`
- `GROQ_API_KEY`
- `SECRET_KEY`

## Endpoints principales

- `POST /api/auth/login` — `{ "username", "password" }`
- `GET /api/auth/me`
- `POST /api/products/analyze` — `{ "product_url", "review_count" }`
- `POST /api/products/compare` — `{ "product_url_1", "product_url_2", "review_count" }`
- `GET /api/analysis/history/me`
