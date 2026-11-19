
// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================

const API = "http://127.0.0.1:8000";

const mapa = L.map("mapa").setView([4.618, -75.635], 15);

// ============================================================
// ESCALA CARTOGRÁFICA
// ============================================================

L.control.scale({
    position: "bottomleft",
    metric: true,
    imperial: false,
    maxWidth: 150
}).addTo(mapa);

// ============================================================
// HERRAMIENTAS DE MEDICIÓN DE DISTANCIAS Y ÁREAS
// ============================================================

// Grupo donde se almacenarán los dibujos realizados.
const elementosMedicion = new L.FeatureGroup();

mapa.addLayer(elementosMedicion);


// Configuración de las herramientas de dibujo.
const controlDibujo = new L.Control.Draw({

    position: "topleft",

    draw: {

        // Medición de distancias.
        polyline: {
            shapeOptions: {
                color: "#e67e22",
                weight: 4
            }
        },

        // Medición de áreas.
        polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
                color: "#16a085",
                weight: 3,
                fillOpacity: 0.25
            }
        },

        // Desactivar herramientas que no necesitamos.
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false

    },

    edit: {

        featureGroup: elementosMedicion,

        remove: true

    }

});


// Agregar herramientas al mapa.
mapa.addControl(controlDibujo);


// ============================================================
// CALCULAR DISTANCIA
// ============================================================

function calcularDistancia(coordenadas) {

    let distanciaTotal = 0;

    for (let i = 0; i < coordenadas.length - 1; i++) {

        distanciaTotal += mapa.distance(
            coordenadas[i],
            coordenadas[i + 1]
        );

    }

    return distanciaTotal;

}


// ============================================================
// CALCULAR ÁREA
// ============================================================

function calcularArea(coordenadas) {

    return L.GeometryUtil.geodesicArea(coordenadas);

}


// ============================================================
// RESULTADOS DE LAS MEDICIONES
// ============================================================

mapa.on(L.Draw.Event.CREATED, function (evento) {

    const capa = evento.layer;

    elementosMedicion.addLayer(capa);


    // --------------------------------------------------------
    // MEDICIÓN DE DISTANCIA
    // --------------------------------------------------------

    if (evento.layerType === "polyline") {

        const coordenadas = capa.getLatLngs();

        const distancia = calcularDistancia(coordenadas);

        let resultado;

        if (distancia >= 1000) {

            resultado = (distancia / 1000).toFixed(3) + " km";

        } else {

            resultado = distancia.toFixed(2) + " m";

        }

        capa.bindPopup(
            "<b>MEDICIÓN DE DISTANCIA</b><br>" +
            "Longitud: " + resultado
        ).openPopup();

    }


    // --------------------------------------------------------
    // MEDICIÓN DE ÁREA
    // --------------------------------------------------------

    if (evento.layerType === "polygon") {

        const coordenadas = capa.getLatLngs()[0];

        const area = calcularArea(coordenadas);

        const hectareas = area / 10000;

        capa.bindPopup(
            "<b>MEDICIÓN DE ÁREA</b><br>" +
            "Superficie: " + area.toFixed(2) + " m²<br>" +
            "Superficie: " + hectareas.toFixed(4) + " ha"
        ).openPopup();

    }

});


// ============================================================
// VISUALIZACIÓN DE COORDENADAS
// ============================================================

const controlCoordenadas = L.control({
    position: "bottomright"
});

controlCoordenadas.onAdd = function () {

    const contenedor = L.DomUtil.create(
        "div",
        "control-coordenadas"
    );

    contenedor.style.background = "white";
    contenedor.style.padding = "8px 12px";
    contenedor.style.border = "1px solid #bbb";
    contenedor.style.borderRadius = "5px";
    contenedor.style.fontSize = "12px";
    contenedor.style.fontWeight = "bold";
    contenedor.style.boxShadow = "0 1px 5px rgba(0,0,0,0.25)";

    contenedor.innerHTML = "Latitud: -- | Longitud: --";

    return contenedor;
};

controlCoordenadas.addTo(mapa);


// Actualizar coordenadas al mover el cursor.
mapa.on("mousemove", function (evento) {

    const latitud = evento.latlng.lat.toFixed(6);
    const longitud = evento.latlng.lng.toFixed(6);

    controlCoordenadas.getContainer().innerHTML =
        `Latitud: ${latitud} | Longitud: ${longitud}`;

});


// Mapa base de OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 22
}).addTo(mapa);


// ============================================================
// ESTILOS DE LAS CAPAS
// ============================================================

const estiloPredios = {
    color: "#1676b8",
    weight: 1,
    fillColor: "#36a9e1",
    fillOpacity: 0.20
};

const estiloConstrucciones = {
    color: "#b74727",
    weight: 1,
    fillColor: "#ed7952",
    fillOpacity: 0.55
};

const estiloManzanas = {
    color: "#7b4ba1",
    weight: 2,
    fillColor: "#b28bd0",
    fillOpacity: 0.12
};

const estiloVias = {
    color: "#e3a51b",
    weight: 3
};


// ============================================================
// FUNCIONES DE INFORMACIÓN
// ============================================================

function escaparHTML(valor) {
    if (valor === null || valor === undefined) {
        return "Sin información";
    }

    return String(valor).replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caracter]);
}


async function agregarPopupPredio(feature, layer) {

    const p = feature.properties || {};

    // Mostrar información inicial mientras se consulta la ficha.
    layer.bindPopup(`
        <div class="popup-predio">
            <strong>CONSULTANDO INFORMACIÓN CATASTRAL...</strong>
            <p>Por favor espera.</p>
        </div>
    `);

    layer.on("click", async function () {

        const codigo = p.codigo;

        if (!codigo) {
            layer.setPopupContent("Este predio no tiene código disponible.");
            return;
        }

        layer.setPopupContent(`
            <div class="popup-predio">
                <strong>CONSULTANDO INFORMACIÓN CATASTRAL...</strong>
                <p>Consultando PostgreSQL...</p>
            </div>
        `);

        layer.openPopup();

        try {

            const respuesta = await fetch(
                `${API}/api/ficha-predial?codigo=${encodeURIComponent(codigo)}`
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.detail || "No fue posible consultar el predio."
                );
            }

            const predio = datos.predio;
            const construcciones = datos.construcciones || [];

            const area = Number(predio.area_m2 || 0)
                .toLocaleString("es-CO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

            const hectareas = Number(predio.area_hectareas || 0)
                .toLocaleString("es-CO", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4
                });

            const listaConstrucciones = construcciones.length
                ? construcciones.map((c, indice) => `
                    <div style="
                        border-top: 1px solid #ddd;
                        padding: 8px 0;
                        margin-top: 8px;
                    ">
                        <strong>Construcción ${indice + 1}</strong>
                        <br>
                        Código: ${escaparHTML(c.codigo_construccion)}
                        <br>
                        Tipo: ${escaparHTML(c.tipo_construccion)}
                        <br>
                        Dominio: ${escaparHTML(c.tipo_dominio)}
                        <br>
                        Pisos: ${escaparHTML(c.numero_pisos)}
                        <br>
                        Sótanos: ${escaparHTML(c.numero_sotanos)}
                        <br>
                        Mezanines: ${escaparHTML(c.numero_mezanines)}
                        <br>
                        Semisótanos: ${escaparHTML(c.numero_semisotanos)}
                        <br>
                        Etiqueta: ${escaparHTML(c.etiqueta)}
                        <br>
                        Identificador: ${escaparHTML(c.identificador)}
                    </div>
                `).join("")
                : "<p>Este predio no tiene construcciones asociadas.</p>";

            const ficha = `
                <div class="popup-predio" style="
                    min-width: 260px;
                    max-width: 340px;
                    font-size: 13px;
                ">

                    <h3 style="
                        color: #1676b8;
                        margin: 0 0 10px 0;
                    ">
                        FICHA CATASTRAL
                    </h3>

                    <strong>INFORMACIÓN DEL TERRENO</strong>

                    <hr>

                    <b>Código predial:</b><br>
                    ${escaparHTML(predio.codigo)}

                    <br><br>

                    <b>Código de manzana:</b><br>
                    ${escaparHTML(predio.manzana_codigo)}

                    <br><br>

                    <b>Código anterior:</b><br>
                    ${escaparHTML(predio.codigo_anterior)}

                    <br><br>

                    <b>Código municipio:</b><br>
                    ${escaparHTML(predio.codigo_municipio)}

                    <br><br>

                    <b>Área del terreno:</b><br>
                    ${area} m²

                    <br>
                    ${hectareas} ha

                    <br><br>

                    <b>Número de subterráneos:</b><br>
                    ${escaparHTML(predio.numero_subterraneos)}

                    <hr>

                    <strong>
                        CONSTRUCCIONES (${datos.total_construcciones})
                    </strong>

                    ${listaConstrucciones}

                </div>
            `;

            layer.setPopupContent(ficha);
            layer.openPopup();

            console.log("Ficha predial consultada:", datos);

        } catch (error) {

            layer.setPopupContent(`
                <strong>Error consultando la ficha predial</strong>
                <p>${escaparHTML(error.message)}</p>
            `);

            console.error("Error en ficha predial:", error);
        }
    });
}

function agregarPopupConstruccion(feature, layer) {
    const p = feature.properties || {};

    layer.bindPopup(`
        <strong>CONSTRUCCIÓN</strong><br>
        Código: ${escaparHTML(p.codigo)}<br>
        Predio: ${escaparHTML(p.terreno_codigo)}<br>
        Tipo: ${escaparHTML(p.tipo_construccion)}<br>
        Pisos: ${escaparHTML(p.numero_pisos)}<br>
        Etiqueta: ${escaparHTML(p.etiqueta)}
    `);
}

function agregarPopupManzana(feature, layer) {
    const p = feature.properties || {};

    layer.bindPopup(`
        <strong>MANZANA</strong><br>
        Código: ${escaparHTML(p.codigo)}<br>
        Barrio: ${escaparHTML(p.barrio_codigo)}
    `);
}

function agregarPopupVia(feature, layer) {
    const p = feature.properties || {};

    layer.bindPopup(`
        <strong>NOMENCLATURA VIAL</strong><br>
        ${escaparHTML(p.texto)}
    `);
}


// ============================================================
// GRUPOS DE CAPAS
// ============================================================

const capaPredios = L.geoJSON(null, {
    style: estiloPredios,
    onEachFeature: agregarPopupPredio
});

const capaConstrucciones = L.geoJSON(null, {
    style: estiloConstrucciones,
    onEachFeature: agregarPopupConstruccion
});

const capaManzanas = L.geoJSON(null, {
    style: estiloManzanas,
    onEachFeature: agregarPopupManzana
});

const capaVias = L.geoJSON(null, {
    style: estiloVias,
    onEachFeature: agregarPopupVia
});

// Capa independiente para el predio buscado.
const capaResultadoBusqueda = L.geoJSON(null, {
    style: {
        color: "#ff0000",
        weight: 4,
        fillColor: "#ffcc00",
        fillOpacity: 0.45
    },
    onEachFeature: agregarPopupPredio
});


// ============================================================
// CARGAR CAPAS GEOJSON
// ============================================================

async function cargarCapa(url, capa, nombre) {
    try {
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        capa.addData(datos);

        console.log(
            `${nombre}: ${datos.total} elementos cargados`
        );

        return datos.total;

    } catch (error) {
        console.error(`Error cargando ${nombre}:`, error);
        mostrarError(`${nombre}: ${error.message}`);
        return 0;
    }
}


// ============================================================
// MENSAJES DE ERROR
// ============================================================

function mostrarError(mensaje) {
    const resultado = document.getElementById("resultado-busqueda");
    resultado.textContent = mensaje;
}


// ============================================================
// CONEXIÓN CON LA API
// ============================================================

async function comprobarConexion() {
    const indicador = document.getElementById("estado-conexion");

    try {
        const respuesta = await fetch(`${API}/api/estado`);

        if (!respuesta.ok) {
            throw new Error("La API no responde correctamente");
        }

        const datos = await respuesta.json();

        indicador.textContent = "Base de datos conectada";
        indicador.style.background = "#28784d";

        console.log("Estado de conexión:", datos);

    } catch (error) {
        indicador.textContent = "Sin conexión con la API";
        indicador.style.background = "#a93226";
        console.error(error);
    }
}


// ============================================================
// ESTADÍSTICAS
// ============================================================

async function consultarEstadisticas() {
    const contenedor = document.getElementById("informacion-capas");

    try {
        const respuesta = await fetch(`${API}/api/capas`);

        if (!respuesta.ok) {
            throw new Error("No fue posible consultar las capas");
        }

        const datos = await respuesta.json();

        contenedor.innerHTML = "";

        for (const [nombre, cantidad] of Object.entries(datos.capas)) {
            const fila = document.createElement("p");

            fila.textContent =
                `${nombre.replaceAll("_", " ")}: ${cantidad.toLocaleString("es-CO")}`;

            contenedor.appendChild(fila);
        }

    } catch (error) {
        contenedor.textContent = "Error consultando estadísticas";
        console.error(error);
    }
}


// ============================================================
// CONTROLES DE CAPAS
// ============================================================

function configurarControl(id, capa) {
    const control = document.getElementById(id);

    control.addEventListener("change", function () {
        if (this.checked) {
            mapa.addLayer(capa);
        } else {
            mapa.removeLayer(capa);
        }
    });
}


// ============================================================
// BÚSQUEDA DIRECTA EN POSTGRESQL
// ============================================================

async function buscarPredio() {
    const codigoBuscado = document
        .getElementById("buscar-predio")
        .value.trim();

    const resultado = document.getElementById("resultado-busqueda");

    if (!codigoBuscado) {
        resultado.textContent = "Escribe un código predial.";
        return;
    }

    resultado.textContent = "Buscando predio en la base de datos...";

    capaResultadoBusqueda.clearLayers();

    try {
        const respuesta = await fetch(
            `${API}/api/buscar-predio?codigo=${encodeURIComponent(codigoBuscado)}`
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.detail || "No fue posible encontrar el predio."
            );
        }

        if (!datos.features || datos.features.length === 0) {
            throw new Error("No se encontró el predio.");
        }

        capaResultadoBusqueda.addData(datos);

        capaResultadoBusqueda.addTo(mapa);

        const extension = capaResultadoBusqueda.getBounds();

        if (extension.isValid()) {
            mapa.fitBounds(extension, {
                padding: [50, 50],
                maxZoom: 21
            });
        }

        capaResultadoBusqueda.eachLayer(function(layer) {
            layer.openPopup();
        });

        resultado.textContent =
            "Predio encontrado correctamente en PostgreSQL.";

    } catch (error) {
        resultado.textContent = error.message;
        console.error("Error en la búsqueda:", error);
    }
}


// ============================================================
// INICIALIZACIÓN DEL VISOR
// ============================================================

async function iniciarVisor() {
    await comprobarConexion();

    await consultarEstadisticas();

    await Promise.all([
        cargarCapa(
            `${API}/api/predios?limite=1000`,
            capaPredios,
            "Predios"
        ),

        cargarCapa(
            `${API}/api/construcciones?limite=1000`,
            capaConstrucciones,
            "Construcciones"
        ),

        cargarCapa(
            `${API}/api/manzanas?limite=1000`,
            capaManzanas,
            "Manzanas"
        ),

        cargarCapa(
            `${API}/api/vias?limite=1000`,
            capaVias,
            "Vías"
        )
    ]);

    capaPredios.addTo(mapa);
    capaVias.addTo(mapa);

    configurarControl("capa-predios", capaPredios);
    configurarControl("capa-construcciones", capaConstrucciones);
    configurarControl("capa-manzanas", capaManzanas);
    configurarControl("capa-vias", capaVias);

    if (capaPredios.getLayers().length > 0) {
        mapa.fitBounds(capaPredios.getBounds(), {
            padding: [20, 20]
        });
    }

    console.log("Visor geográfico inicializado.");
}


// ============================================================
// EVENTOS DE BÚSQUEDA
// ============================================================

document
    .getElementById("btn-buscar")
    .addEventListener("click", buscarPredio);

document
    .getElementById("buscar-predio")
    .addEventListener("keydown", function(evento) {
        if (evento.key === "Enter") {
            buscarPredio();
        }
    });


// ============================================================
// INICIAR APLICACIÓN
// ============================================================

iniciarVisor();
