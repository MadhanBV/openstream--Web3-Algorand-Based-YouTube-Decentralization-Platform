# OpenStream — Backend Foundation & Authentication (Phases 2–5)

Welcome to the backend service for **OpenStream**, a semi-decentralized Web3 video streaming platform.

This backend provides the REST API gateway connecting the React frontend with PostgreSQL metadata, user identity & JWT authentication, decentralized IPFS storage references, and Algorand blockchain settlement infrastructure.

---

## 1. Technology Stack

* **Language**: Python 3.12+ (tested on Python 3.14)
* **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (High-performance async ASGI REST framework)
* **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
* **Data Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) & `pydantic-settings`
* **ORM & Database Toolkit**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
* **Database Driver**: [psycopg 3](https://www.psycopg.org/psycopg3/) (Modern binary driver for PostgreSQL)
* **Database Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
* **Password Hashing**: [bcrypt](https://pypi.org/project/bcrypt/) (Work factor 12 constant-time hashing)
* **Token Authentication**: [PyJWT](https://pyjwt.readthedocs.io/) (Cryptographically signed HMAC-SHA256 JWT access tokens)
* **Testing**: [Pytest](https://docs.pytest.org/) & [HTTPX](https://www.python-httpx.org/)

---

## 2. Directory Structure

```text
backend/
├── alembic/                 # Alembic migration environment
│   ├── env.py               # Migration runtime configuration
│   ├── script.py.mako       # Migration template
│   └── versions/            # Versioned migration scripts
│       ├── 0001_initial_schema.py      # Initial OpenStream schema (7 tables)
│       └── 0002_add_user_password_hash.py # Added hashed_password to users
├── alembic.ini              # Alembic configuration file
├── app/
│   ├── __init__.py          # App package initialization
│   ├── main.py              # FastAPI application factory, CORS, and ASGI entrypoint
│   ├── config.py            # Pydantic Settings and environment variable management
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py          # FastAPI security dependencies (get_current_user, etc.)
│   │   └── routes/          # REST route handlers
│   │       ├── __init__.py  # Root API router (/api/v1 aggregation)
│   │       ├── auth.py      # Authentication endpoints (register, login, me, token, logout)
│   │       └── health.py    # Health check endpoint (/api/v1/health)
│   ├── core/                # Core security utilities
│   │   ├── __init__.py
│   │   └── security.py      # bcrypt hashing & PyJWT token utilities
│   ├── db/                  # Database connectivity and session management
│   │   ├── __init__.py      # Database package exports (Base, engine, get_db)
│   │   ├── base.py          # SQLAlchemy 2.0 DeclarativeBase
│   │   └── session.py       # Engine, sessionmaker, get_db dependency & connection verifier
│   ├── models/              # SQLAlchemy 2.0 ORM entity models
│   │   ├── __init__.py      # Model registry and metadata exports
│   │   ├── user.py          # User & Creator profile model (with hashed_password)
│   │   ├── video.py         # Video metadata & IPFS CID reference model
│   │   ├── view.py          # Video view tracking model
│   │   ├── interaction.py   # Like & Comment engagement models
│   │   └── reward.py        # Reward ledger & On-chain settlement models
│   ├── schemas/             # Pydantic request/response schemas
│   │   ├── __init__.py      # Schema exports
│   │   ├── auth.py          # Registration, login, token & message schemas
│   │   ├── health.py        # Health response schema
│   │   └── user.py          # Safe UserResponse & profile schemas
│   └── services/            # Domain business logic & Web3/IPFS integrations
│       └── __init__.py
├── tests/                   # Automated test suite
│   ├── __init__.py
│   ├── conftest.py          # Pytest fixtures, TestClient & isolated in-memory test DB
│   ├── test_auth.py         # Authentication, hashing, login, token, & current-user tests
│   ├── test_config.py       # Settings validation & CORS parsing tests
│   ├── test_health.py       # Health check, /docs, and OpenAPI tests
│   └── test_models.py       # Model CRUD, constraints, relationships & cascade tests
├── .env.example             # Configuration template with placeholder variables
├── .env                     # Local environment configuration (git-ignored)
├── .gitignore               # Backend gitignore rules
├── requirements.txt         # Pinned backend dependencies
└── README.md                # Documentation and run instructions
```

---

## 3. Authentication & Security Endpoints

All authentication endpoints are located under `/api/v1/auth`:

### 1. Register Account: `POST /api/v1/auth/register`
Creates a new viewer/creator account.
* **Request (`application/json`)**:
  ```json
  {
    "username": "creator_alice",
    "email": "alice@openstream.io",
    "password": "StrongPassword123!",
    "display_name": "Alice Studio",
    "bio": "Decentralized video creator",
    "is_creator": true
  }
  ```
* **Response (`201 Created`)**:
  ```json
  {
    "id": 1,
    "username": "creator_alice",
    "display_name": "Alice Studio",
    "email": "alice@openstream.io",
    "bio": "Decentralized video creator",
    "avatar_url": null,
    "banner_url": null,
    "wallet_address": null,
    "is_creator": true,
    "is_active": true,
    "created_at": "2026-10-09T08:50:00Z",
    "updated_at": "2026-10-09T08:50:00Z"
  }
  ```
  *(Passwords and password hashes are never returned)*.

### 2. User Login: `POST /api/v1/auth/login`
Authenticates with either username or email and password.
* **Request (`application/json`)**:
  ```json
  {
    "username_or_email": "creator_alice",
    "password": "StrongPassword123!"
  }
  ```
* **Response (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "username": "creator_alice",
      "display_name": "Alice Studio",
      "email": "alice@openstream.io",
      "is_creator": true,
      "is_active": true,
      "created_at": "2026-10-09T08:50:00Z",
      "updated_at": "2026-10-09T08:50:00Z"
    }
  }
  ```

### 3. Current User Profile: `GET /api/v1/auth/me`
Protected endpoint returning the caller's profile.
* **Headers**: `Authorization: Bearer <access_token>`
* **Response (`200 OK`)**:
  ```json
  {
    "id": 1,
    "username": "creator_alice",
    "display_name": "Alice Studio",
    "email": "alice@openstream.io",
    "bio": "Decentralized video creator",
    "avatar_url": null,
    "banner_url": null,
    "wallet_address": null,
    "is_creator": true,
    "is_active": true,
    "created_at": "2026-10-09T08:50:00Z",
    "updated_at": "2026-10-09T08:50:00Z"
  }
  ```

### 4. OAuth2 Token Form (Swagger UI): `POST /api/v1/auth/token`
Allows developers to log in directly via the **Authorize 🔓** button in Swagger UI (`/docs`).

### 5. Logout Session: `POST /api/v1/auth/logout`
Protected endpoint confirming session termination (`{"message": "Successfully logged out"}`).

---

## 4. How to Run on Windows

### Start the Backend Server:
```powershell
# From c:\web3\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### URLs:
* **Interactive API Documentation (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Alternative API Documentation (ReDoc)**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
* **OpenAPI Schema**: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)
* **Health Check**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

## 5. Testing Authentication via Swagger UI (`/docs`)

1. Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) in your browser.
2. Expand `POST /api/v1/auth/register` -> Click **Try it out** -> Input registration details -> Click **Execute**.
3. Click the green **Authorize 🔓** button at the top right of the Swagger page:
   * Enter your registered username (or email) and password.
   * Click **Authorize**.
4. Now you can test `GET /api/v1/auth/me` and any future protected endpoints directly with automatic Bearer token injection!

---

## 6. Running the Automated Test Suite

```powershell
# From c:\web3\backend
.\.venv\Scripts\python.exe -m pytest -v
```
