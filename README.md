# NexTask

SkillHub is a service marketplace app that connects customers with contractors. The project currently has a Django REST API backend and a React/Vite frontend.

## Tech Stack

### Backend

- Python
- Django
- Django REST Framework
- Simple JWT
- PostgreSQL
- django-cors-headers

### Frontend

- React
- TypeScript
- Vite
- React Router
- Axios
- Tailwind CSS

## Backend Setup

From the repository root:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` with your PostgreSQL connection values:

```env
DB_NAME=skillhub_db
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
```

Run migrations:

```bash
python manage.py migrate
```

Create an admin user:

```bash
python manage.py createsuperuser
```

Start the backend server:

```bash
python manage.py runserver
```

The backend runs at:

```text
http://127.0.0.1:8000/
```

## Frontend Setup

In a second terminal, from the repository root:

```bash
cd frontend/skillHub_frontend
npm install
npm run dev
```

The frontend runs at the Vite URL shown in the terminal, usually:

```text
http://localhost:5173/
```

The frontend API client currently points to:

```text
http://127.0.0.1:8000/api/
```
