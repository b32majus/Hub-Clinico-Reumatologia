# Hub Clínico Reumatológico

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue?logo=github)](https://b32majus.github.io/Hub-Clinico-Reumatologia/)
[![Version](https://img.shields.io/badge/version-1.0.0-green)]()
[![Status](https://img.shields.io/badge/status-Release%20Candidate-orange)]()

**Aplicación web local-first para la gestión de datos clínicos en Reumatología**

## 1. Descripción

El Hub Clínico Reumatológico es una aplicación web de uso local (`local-first`) diseñada para estandarizar y agilizar la captura de datos en las consultas del servicio de Reumatología. Su objetivo es transformar la recogida de información de visitas en un proceso estructurado, generando datos de alta calidad listos para el análisis en una base de datos centralizada en un archivo Excel.

La aplicación funciona sin necesidad de instalación ni de un servidor, respetando las estrictas políticas de seguridad de los entornos hospitalarios.

## 🌐 Demo en Vivo

**Accede a la aplicación en:** [https://b32majus.github.io/Hub-Clinico-Reumatologia/](https://b32majus.github.io/Hub-Clinico-Reumatologia/)

> **Nota:** Esta es una aplicación completamente local-first. Tus datos nunca se envían a ningún servidor. Todo se procesa en tu navegador con la máxima seguridad y privacidad.

## 2. Arquitectura y Flujo de Trabajo

Este proyecto utiliza una arquitectura **100% local** con una base de datos basada en un archivo plano.

* **Base de Datos:** Un único archivo **Excel (`Hub_Clinico_Maestro.xlsx`)** ubicado en una unidad de red compartida. Este archivo contiene hojas de cálculo separadas para cada patología activa (`ESPA`, `APS`), cada una con un conjunto de columnas especializado.
* **Flujo de Guardado (Copia Maestra):**
    1.  El clínico rellena el formulario correspondiente a la visita.
    2.  Al pulsar "Estructurar CSV", la aplicación genera una única fila de datos (sin cabeceras) en formato CSV y la **copia al portapapeles**.
    3.  La aplicación notifica al usuario en qué hoja específica (`ESPA`, `APS`...) debe pegar los datos.
    4.  El clínico abre el archivo Excel maestro y pega la fila en la última línea vacía de la hoja correcta. El guardado es gestionado por Excel en la unidad compartida.

## 3. Funcionalidades Principales

* **Formularios Dinámicos:** La interfaz se adapta en tiempo real según la patología seleccionada, mostrando solo los campos y calculadoras relevantes.
* **Homúnculo Interactivo:** Una interfaz visual para el registro detallado de afectación articular (NAD, NAT) y dactilitis.
* **Cálculo de Índices en Tiempo Real:** Las puntuaciones de actividad clínica (BASDAI, ASDAS, MDA, etc.) se calculan y actualizan automáticamente a medida que el usuario introduce los datos.
* **Exportación Dual:**
    * **Para la Historia Clínica:** Genera un informe en texto plano (`TXT`) con formato legible para ser copiado y pegado en el sistema oficial del hospital.
    * **Para la Base de Datos:** Genera una fila de datos CSV normalizada y optimizada para el análisis, lista para ser copiada al Excel maestro.
* **Arquitectura Modular:** El código JavaScript está estructurado en módulos (ES6) para facilitar su mantenimiento y escalabilidad.

## 4. Dependencias

El proyecto está construido con **JavaScript puro (Vanilla JS)** para maximizar la compatibilidad y minimizar las dependencias externas.

* **Dependencias de Terceros:**
    * [Chart.js](https://www.chartjs.org/) - Visualización de datos en dashboards
    * [SheetJS (xlsx)](https://sheetjs.com/) - Lectura/escritura de archivos Excel
    * [Font Awesome 6](https://fontawesome.com/) - Iconos vectoriales
* **Sin dependencias de backend:** La aplicación funciona al 100% en el navegador del cliente

## 📦 Instalación y Uso

### Opción 1: Demo Online (GitHub Pages) ✨

1. Visita [https://b32majus.github.io/Hub-Clinico-Reumatologia/](https://b32majus.github.io/Hub-Clinico-Reumatologia/)
2. Carga tu archivo `Hub_Clinico_Maestro.xlsx` usando el botón **"Cargar Base de Datos"** en el dashboard inicial
3. ¡Listo! La aplicación está lista para capturar datos de pacientes

### Opción 2: Descarga Local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/b32majus/Hub-Clinico-Reumatologia.git
   cd Hub-Clinico-Reumatologia
   ```

2. Abre `index.html` en tu navegador web favorito (Chrome, Firefox, Edge, Safari)

3. (Opcional) Si deseas ejecutar un servidor HTTP local:
   ```bash
   # Con Python 3
   python -m http.server 8000

   # Luego accede a http://localhost:8000
   ```

### Opción 3: Generar Datos de Prueba

Si deseas poblar la base de datos con pacientes ficticios para pruebas:

```bash
python generate_mock_data.py
```

Esto generará automáticamente `Hub_Clinico_Maestro.xlsx` con:
- **60 pacientes ficticios** (30 ESPA + 30 APS)
- **2-5 visitas por paciente** (1 primera visita + seguimientos)
- **Datos clínicos realistas** con distribución estadística normal
- Índices clínicos completamente calculados (BASDAI, ASDAS, MDA, etc.)

## 📁 Estructura del Proyecto

```
Hub-Clinico-Reumatologia/
├── index.html                      # Página principal (dashboard)
├── primera_visita.html             # Formulario primera visita
├── seguimiento.html                # Formulario visita seguimiento
├── estadisticas.html               # Dashboard de estadísticas
├── dashboard_paciente.html         # Dashboard individual del paciente
├── dashboard_search.html           # Buscador de pacientes
├── manage_drugs.html               # Gestión de fármacos
├── manage_professionals.html       # Gestión de profesionales
│
├── style.css                       # Estilos globales
├── style_dashboard.css             # Estilos del dashboard
├── style_estadisticas.css          # Estilos del módulo estadísticas
├── script.js                       # Script global compartido
│
├── modules/                        # Módulos JavaScript reutilizables
│   ├── hubTools.js                # Utilidades y funciones globales
│   ├── dataManager.js             # Gestión y exportación de datos
│   ├── exportManager.js           # Exportación a Excel y CSV
│   ├── homunculus.js              # Interfaz interactiva articular
│   ├── scoreCalculators.js        # Cálculo de índices clínicos (BASDAI, ASDAS, MDA)
│   ├── utils.js                   # Funciones de utilidad comunes
│   ├── mockPatients.js            # Datos ficticios desactivables
│   └── mockDashboardData.js       # Dashboard simulado desactivable
│
├── scripts/                        # Scripts específicos por página
│   ├── script_dashboard.js        # Lógica del dashboard principal
│   ├── script_estadisticas.js     # Lógica del módulo estadísticas
│   ├── script_dashboard_search.js # Búsqueda de pacientes
│   └── ... (más scripts específicos)
│
├── Hub_Clinico_Maestro.xlsx        # Base de datos maestra con pacientes
├── generate_mock_data.py           # Script para generar datos ficticios
└── README.md                       # Este archivo
```

## 🛡️ Seguridad y Privacidad de Datos

### Arquitectura Local-First

Esta aplicación implementa una arquitectura **100% local-first** que garantiza la máxima privacidad y seguridad:

**✅ Seguridad Garantizada:**
- **Sin Servidor Remoto:** Todos los datos se procesan exclusivamente en tu navegador
- **Sin Base de Datos Externa:** No se conecta a servidores remotos, APIs o servicios en la nube
- **Sin Tracking:** No hay sistemas de telemetría, análisis o seguimiento de usuarios
- **Sin Transmisión de Datos:** Los datos clínicos nunca abandonan tu dispositivo
- **Entorno Cerrado y Seguro:** Todo funciona de forma aislada sin conexiones externas

### Gestión de Datos

- **Datos en Tránsito:** Se utilizan exclusivamente en la sesión actual del navegador (memoria RAM)
- **Almacenamiento Local:** Solo se almacenan en `localStorage` los datos de sesión mínimos:
  - Nombre del profesional sanitario actual
  - Configuraciones de preferencias de usuario
- **Datos Clínicos:** Se mantienen únicamente en el formulario hasta que el usuario decide guardarlos
- **Al Cerrar Sesión:** Se limpian automáticamente todos los datos de la sesión
- **Al Cerrar la Pestaña:** Se eliminan todos los datos sin persistencia

### Almacenamiento de Datos Persistentes

Los datos persistentes se guardan **exclusivamente en archivos locales** que el usuario controla:
- **Archivo Excel:** `Hub_Clinico_Maestro.xlsx` ubicado en tu dispositivo o unidad de red
- **Responsabilidad:** El usuario es responsable de mantener backups y seguridad de este archivo
- **Control Total:** Tú decides dónde guardar, quién accede y cómo proteger los datos

### Conformidad y Normativa

Esta arquitectura respeta las regulaciones más estrictas de privacidad y seguridad:
- ✅ **RGPD:** Cumple con regulaciones de protección de datos europeas
- ✅ **HIPAA:** Arquitectura compatible con normativa sanitaria
- ✅ **Política de Seguridad Hospitalaria:** Diseñada para funcionar sin conexión a Internet
- ✅ **Datos Clínicos Sensibles:** Manejo seguro de información médica confidencial

**En Resumen:** Tu aplicación es una fortaleza local donde los datos clínicos nunca salen de tu control.

---

## 📄 Licencia y Uso

### Propiedad Intelectual

**Hub Clínico Reumatológico** es un desarrollo propietario de **Sophilux** para uso exclusivo en entornos autorizados.

### Estado de Versión

- **Versión:** 1.0.0
- **Estado:** Release Candidate (RC)
- Este software está en fase final de validación y puede ser utilizado en producción bajo las condiciones de licencia especificadas

### Autoría y Créditos

- **Concepto y Diseño Clínico:** Silvia - Especialista en Consultoría Reumatológica
- **Desarrollo Principal:** Sophilux Development Team
- **Tecnologías:** JavaScript, HTML5, CSS3, Chart.js, SheetJS

### Términos de Uso

Esta aplicación está autorizada **exclusivamente** para:
- Uso en entornos clínicos autorizados
- Captura de datos de pacientes en consultas de Reumatología
- Análisis interno de datos clínicos

**Prohibido sin autorización expresa:**
- Reproducción o distribución sin permiso
- Uso comercial independiente
- Modificación y distribución de versiones derivadas
- Uso en contextos diferentes al propósito original

### Descargo de Responsabilidad

Este software es una **herramienta de estructuración de datos clínicos** y no constituye:
- Diagnóstico médico
- Tratamiento clínico
- Asesoramiento sanitario

**Responsabilidad del Usuario:** El usuario es responsable de:
- Validar la exactitud de los datos introducidos
- Cumplir con la normativa sanitaria de su jurisdicción
- Mantener backups seguros de los datos
- Implementar controles de acceso adecuados

### Soporte y Actualizaciones

Para actualizaciones y soporte técnico, contactar a Sophilux a través del repositorio oficial:
[https://github.com/b32majus/Hub-Clinico-Reumatologia](https://github.com/b32majus/Hub-Clinico-Reumatologia)

---

## 🤝 Contribuir

Las contribuciones al proyecto son bienvenidas. Para reportar bugs o sugerir mejoras:

1. Abre un issue en GitHub describiendo el problema
2. Proporciona detalles técnicos y pasos para reproducir (si aplica)
3. El equipo revisará y responderá en la brevedad posible

Para cambios de código:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/NuevaFuncionalidad`)
3. Commit tus cambios (`git commit -m 'Add nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/NuevaFuncionalidad`)
5. Abre un Pull Request con descripción detallada

---

## 📞 Contacto y Soporte

- **Repositorio:** [https://github.com/b32majus/Hub-Clinico-Reumatologia](https://github.com/b32majus/Hub-Clinico-Reumatologia)
- **Demo en Vivo:** [https://b32majus.github.io/Hub-Clinico-Reumatologia/](https://b32majus.github.io/Hub-Clinico-Reumatologia/)
- **Desarrollado por:** Sophilux
- **Año:** 2024-2025

---

## 5. Autor

* **Especialista en Consultoría Reumatológica:** Silvia
* **Equipo de Desarrollo:** Sophilux
