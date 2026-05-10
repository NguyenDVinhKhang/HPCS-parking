import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Hỗ trợ 2 cách cấu hình:
#   1. DATABASE_URL=mysql+pymysql://root:@localhost/parking_management  (nguyên chuỗi)
#   2. DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME                 (từng biến — .env của chúng ta)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL") or (
    "mysql+pymysql://{user}:{pw}@{host}:{port}/{db}".format(
        user = os.getenv("DB_USER",     "root"),
        pw   = os.getenv("DB_PASSWORD", ""),
        host = os.getenv("DB_HOST",     "localhost"),
        port = os.getenv("DB_PORT",     "3306"),
        db   = os.getenv("DB_NAME",     "parking_management"),
    )
)

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
