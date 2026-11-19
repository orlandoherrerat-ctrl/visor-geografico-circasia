
import json

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import engine, probar_conexion

app = FastAPI(
    title="Visor Geográfico de Circasia",
    description="API geográfica de Azimut Cero Topografía y Geomática",
    version="1.0.0"
)

# Acceso desde nuestra página web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def inicio():
    return {
        "mensaje": "API del Visor Geográfico de Circasia",
        "estado": "Funcionando correctamente"
    }


@app.get("/api/estado")
def estado():
    try:
        version = probar_conexion()

        return {
            "conexion": "Exitosa",
            "base_datos": "visor_circasia",
            "postgresql": version
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error de conexión: {str(error)}"
        )


@app.get("/api/capas")
def consultar_capas():

    tablas = [
        "predios",
        "construcciones",
        "manzanas",
        "barrios",
        "vias_nomenclatura"
    ]

    resultado = {}

    try:
        with engine.connect() as conexion:

            for tabla in tablas:
                consulta = text(
                    f'SELECT COUNT(*) FROM catastro."{tabla}"'
                )

                cantidad = conexion.execute(
                    consulta
                ).scalar_one()

                resultado[tabla] = cantidad

        return {
            "estado": "Correcto",
            "capas": resultado
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error consultando las capas: {str(error)}"
        )


# NUEVO SERVICIO: CONSULTAR PREDIOS EN GEOJSON
@app.get("/api/predios")
def obtener_predios(
    limite: int = Query(default=100, ge=1, le=1000)
):

    consulta = text("""
        SELECT
            "OBJECTID" AS objectid,
            "CODIGO" AS codigo,
            "MANZANA_CODIGO" AS manzana_codigo,
            ST_AsGeoJSON(
                ST_Transform("SHAPE", 4326)
            ) AS geometria
        FROM catastro.predios
        WHERE "SHAPE" IS NOT NULL
        ORDER BY "OBJECTID"
        LIMIT :limite
    """)

    try:
        with engine.connect() as conexion:
            registros = conexion.execute(
                consulta,
                {"limite": limite}
            ).mappings().all()

        elementos = []

        for registro in registros:

            geometria = (
                json.loads(registro["geometria"])
                if registro["geometria"]
                else None
            )

            elementos.append({
                "type": "Feature",
                "geometry": geometria,
                "properties": {
                    "objectid": registro["objectid"],
                    "codigo": registro["codigo"],
                    "manzana_codigo": registro["manzana_codigo"]
                }
            })

        return {
            "type": "FeatureCollection",
            "total": len(elementos),
            "features": elementos
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error generando GeoJSON: {str(error)}"
        )

# ============================================================
# FUNCION GENERAL PARA GENERAR RESPUESTAS GEOJSON
# ============================================================

def generar_geojson(consulta, limite):

    try:
        with engine.connect() as conexion:
            registros = conexion.execute(
                text(consulta),
                {"limite": limite}
            ).mappings().all()

        elementos = []

        for registro in registros:

            geometria = (
                json.loads(registro["geometria"])
                if registro["geometria"]
                else None
            )

            propiedades = {
                clave: valor
                for clave, valor in registro.items()
                if clave != "geometria"
            }

            elementos.append({
                "type": "Feature",
                "geometry": geometria,
                "properties": propiedades
            })

        return {
            "type": "FeatureCollection",
            "total": len(elementos),
            "features": elementos
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error generando GeoJSON: {str(error)}"
        )


# ============================================================
# SERVICIO GEOJSON: CONSTRUCCIONES
# ============================================================

@app.get("/api/construcciones")
def obtener_construcciones(
    limite: int = Query(default=100, ge=1, le=1000)
):

    consulta = """
        SELECT
            "OBJECTID" AS objectid,
            "CODIGO" AS codigo,
            "TERRENO_CODIGO" AS terreno_codigo,
            "TIPO_CONSTRUCCION" AS tipo_construccion,
            "NUMERO_PISOS" AS numero_pisos,
            "ETIQUETA" AS etiqueta,
            ST_AsGeoJSON(
                ST_Transform("SHAPE", 4326)
            ) AS geometria
        FROM catastro.construcciones
        WHERE "SHAPE" IS NOT NULL
        ORDER BY "OBJECTID"
        LIMIT :limite
    """

    return generar_geojson(consulta, limite)


# ============================================================
# SERVICIO GEOJSON: MANZANAS
# ============================================================

@app.get("/api/manzanas")
def obtener_manzanas(
    limite: int = Query(default=100, ge=1, le=1000)
):

    consulta = """
        SELECT
            "OBJECTID" AS objectid,
            "CODIGO" AS codigo,
            "BARRIO_CODIGO" AS barrio_codigo,
            ST_AsGeoJSON(
                ST_Transform("SHAPE", 4326)
            ) AS geometria
        FROM catastro.manzanas
        WHERE "SHAPE" IS NOT NULL
        ORDER BY "OBJECTID"
        LIMIT :limite
    """

    return generar_geojson(consulta, limite)


# ============================================================
# SERVICIO GEOJSON: VIAS Y NOMENCLATURA
# ============================================================

@app.get("/api/vias")
def obtener_vias(
    limite: int = Query(default=100, ge=1, le=1000)
):

    consulta = """
        SELECT
            "OBJECTID" AS objectid,
            "TEXTO" AS texto,
            ST_AsGeoJSON(
                ST_Transform("SHAPE", 4326)
            ) AS geometria
        FROM catastro.vias_nomenclatura
        WHERE "SHAPE" IS NOT NULL
        ORDER BY "OBJECTID"
        LIMIT :limite
    """

    return generar_geojson(consulta, limite)

# ============================================================
# BUSQUEDA DE UN PREDIO DIRECTAMENTE EN POSTGRESQL
# ============================================================

@app.get("/api/buscar-predio")
def buscar_predio(codigo: str = Query(..., min_length=1, max_length=100)):

    consulta = text("""
        SELECT
            "OBJECTID" AS objectid,
            "CODIGO" AS codigo,
            "MANZANA_CODIGO" AS manzana_codigo,
            "CODIGO_MUNICIPIO" AS codigo_municipio,
            ST_AsGeoJSON(
                ST_Transform("SHAPE", 4326)
            ) AS geometria
        FROM catastro.predios
        WHERE "CODIGO" = :codigo
          AND "SHAPE" IS NOT NULL
        LIMIT 1
    """)

    try:
        with engine.connect() as conexion:
            registro = conexion.execute(
                consulta,
                {"codigo": codigo.strip()}
            ).mappings().first()

        if registro is None:
            raise HTTPException(
                status_code=404,
                detail="No se encontró un predio con ese código."
            )

        geometria = json.loads(registro["geometria"])

        elemento = {
            "type": "Feature",
            "geometry": geometria,
            "properties": {
                "objectid": registro["objectid"],
                "codigo": registro["codigo"],
                "manzana_codigo": registro["manzana_codigo"],
                "codigo_municipio": registro["codigo_municipio"]
            }
        }

        return {
            "type": "FeatureCollection",
            "total": 1,
            "features": [elemento]
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error buscando el predio: {str(error)}"
        )

# ============================================================
# FICHA CATASTRAL COMPLETA DE UN PREDIO
# ============================================================

@app.get("/api/ficha-predial")
def ficha_predial(
    codigo: str = Query(..., min_length=1, max_length=100)
):

    consulta_predio = text("""
        SELECT
            "OBJECTID" AS objectid,
            "CODIGO" AS codigo,
            "MANZANA_CODIGO" AS manzana_codigo,
            "CODIGO_ANTERIOR" AS codigo_anterior,
            "CODIGO_MUNICIPIO" AS codigo_municipio,
            "NUMERO_SUBTERRANEOS" AS numero_subterraneos,

            ROUND(
                ST_Area("SHAPE")::numeric,
                2
            ) AS area_m2,

            ROUND(
                (ST_Area("SHAPE") / 10000)::numeric,
                4
            ) AS area_hectareas

        FROM catastro.predios

        WHERE "CODIGO" = :codigo
          AND "SHAPE" IS NOT NULL

        LIMIT 1
    """)

    consulta_construcciones = text("""
        SELECT
            "OBJECTID" AS objectid,
            "CODIGO" AS codigo_construccion,
            "TERRENO_CODIGO" AS terreno_codigo,
            "TIPO_CONSTRUCCION" AS tipo_construccion,
            "TIPO_DOMINIO" AS tipo_dominio,
            "NUMERO_PISOS" AS numero_pisos,
            "NUMERO_SOTANOS" AS numero_sotanos,
            "NUMERO_MEZANINES" AS numero_mezanines,
            "NUMERO_SEMISOTANOS" AS numero_semisotanos,
            "ETIQUETA" AS etiqueta,
            "IDENTIFICADOR" AS identificador,
            "CODIGO_EDIFICACION" AS codigo_edificacion,
            "CODIGO_ANTERIOR" AS codigo_anterior

        FROM catastro.construcciones

        WHERE "TERRENO_CODIGO" = :codigo

        ORDER BY "OBJECTID"
    """)

    try:

        with engine.connect() as conexion:

            registro_predio = conexion.execute(
                consulta_predio,
                {"codigo": codigo.strip()}
            ).mappings().first()

            if registro_predio is None:
                raise HTTPException(
                    status_code=404,
                    detail="No se encontró el predio solicitado."
                )

            registros_construcciones = conexion.execute(
                consulta_construcciones,
                {"codigo": codigo.strip()}
            ).mappings().all()

        predio = dict(registro_predio)

        # Convertir las áreas a valores numéricos JSON.
        if predio["area_m2"] is not None:
            predio["area_m2"] = float(predio["area_m2"])

        if predio["area_hectareas"] is not None:
            predio["area_hectareas"] = float(
                predio["area_hectareas"]
            )

        construcciones = [
            dict(registro)
            for registro in registros_construcciones
        ]

        return {
            "estado": "correcto",
            "predio": predio,
            "total_construcciones": len(construcciones),
            "construcciones": construcciones
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Error consultando la ficha predial: {str(error)}"
        )
