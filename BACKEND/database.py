
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL

# Cargar las variables del archivo .env
load_dotenv()

# Configuración de PostgreSQL
DATABASE_URL = URL.create(
    drivername="postgresql+psycopg2",
    username=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT", "5432")),
    database=os.getenv("DB_NAME")
)

# Crear conexión con PostgreSQL
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

def probar_conexion():
    with engine.connect() as conexion:
        resultado = conexion.exec_driver_sql(
            "SELECT version();"
        )
        return resultado.scalar()
