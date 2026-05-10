import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Lấy cấu hình từ .env
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Khởi tạo engine kết nối
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Tạo SessionLocal để thao tác DB
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class cho các models SQLAlchemy
Base = declarative_base()

# Dependency để sử dụng session trong FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
