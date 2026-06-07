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

- `RAINFOREST_API_KEY` — clave principal
- `RAINFOREST_API_KEY_2` y `RAINFOREST_API_KEY_3` — claves adicionales (rotación automática)
- `GROQ_API_KEY`
- `SECRET_KEY`

## Endpoints principales

- `GET/POST /api/users` — listar y crear empleados (solo manager)
- `GET/PUT /api/users/{id}` — detalle y edición
- `PATCH /api/users/{id}/activate` — activar/desactivar
- `GET/POST /api/tasks` — listar y crear tareas (manager)
- `GET /api/tasks/me` — tareas del empleado
- `PATCH /api/tasks/{id}/status` — cambiar estado (empleado)
- `POST /api/auth/login` — `{ "username", "password" }`
- `GET /api/auth/me`
- `POST /api/products/analyze` — `{ "product_url", "review_count" }`
- `POST /api/products/compare` — `{ "product_url_1", "product_url_2", "review_count" }`
- `GET /api/analysis/history/me`
