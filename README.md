\# VISOR GEOGRÁFICO DE CIRCASIA



\## Descripción del proyecto



Aplicación web SIG para la visualización y consulta de información geográfica y catastral del municipio de Circasia, Quindío.



El proyecto integra una interfaz cartográfica web, un servicio backend desarrollado en Python y una base de datos espacial PostgreSQL con PostGIS.



\## Tecnologías utilizadas



\- Python.

\- FastAPI.

\- PostgreSQL.

\- PostGIS.

\- SQLAlchemy.

\- JavaScript.

\- HTML5 y CSS3.

\- Leaflet.

\- OpenStreetMap.



\## Estructura del proyecto



```text

ENTREGA\_VISOR\_CIRCASIA/

│

├── BACKEND/

│   ├── main.py

│   ├── database.py

│   ├── requirements.txt

│   └── .env.example

│

├── FRONTEND/

│   ├── index.html

│   ├── estilos.css

│   └── mapa.js

│

├── BASE\_DE\_DATOS/

│   └── visor\_circasia.backup

│

├── INSTALAR\_EJECUTAR.BAT

├── .gitignore

└── README.md

```



\## Funcionalidades principales



\- Visualización de información geográfica sobre un mapa interactivo.

\- Consulta de predios mediante código.

\- Visualización de información asociada a los predios y construcciones.

\- Integración de información espacial almacenada en PostGIS.

\- Visualización de coordenadas y escala cartográfica.

\- Herramientas de medición de distancias y áreas.



\## Requisitos para ejecutar el proyecto



\- Windows.

\- Python instalado.

\- PostgreSQL.

\- Extensión PostGIS.

\- Navegador web.



\## Configuración general



1\. Instalar PostgreSQL y habilitar PostGIS.

2\. Crear la base de datos `visor\_circasia`.

3\. Restaurar el respaldo ubicado en `BASE\_DE\_DATOS/visor\_circasia.backup`.

4\. Copiar `BACKEND/.env.example` como `BACKEND/.env`.

5\. Configurar las credenciales locales de PostgreSQL en el archivo `.env`.

6\. Instalar las dependencias de Python indicadas en `BACKEND/requirements.txt`.

7\. Ejecutar el archivo `INSTALAR\_EJECUTAR.BAT`.



\*\*Importante:\*\* El archivo `.env` contiene credenciales locales y no forma parte de este repositorio. Cada usuario debe configurar sus propias credenciales.



\## Ejecución



El archivo `INSTALAR\_EJECUTAR.BAT` permite iniciar los servicios del backend y frontend en el equipo local, siempre que se hayan instalado y configurado previamente los requisitos.



Direcciones locales:



\- Visor: http://127.0.0.1:5500

\- API: http://127.0.0.1:8000

\- Documentación de la API: http://127.0.0.1:8000/docs



\## Base de datos



El respaldo de PostgreSQL/PostGIS se encuentra en la carpeta `BASE\_DE\_DATOS`.



\## Proyecto académico



Desarrollado como parte de la asignatura \*\*Programación para SIG\*\*, de la Universidad del Quindío.





