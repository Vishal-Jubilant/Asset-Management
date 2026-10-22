from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Change this URL to match your actual PostgreSQL credentials
# Format: postgresql://user:password@host:port/dbname
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://postgres:1234@localhost/client_management"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
