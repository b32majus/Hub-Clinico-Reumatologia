// /modules/dataManager.js
// ACTUALIZACIÓN: Patrón clásico (sin import/export) + funciones adicionales para Fase 2
let appState = { isLoaded: false, db: null };

/**
 * Guarda la base de datos en sessionStorage con manejo inteligente de tamaño
 * Si la BD es demasiado grande, guarda solo una versión limitada
 */
function saveToSessionStorage() {
    try {
        const data = JSON.stringify(appState.db);
        const sizeBytes = new Blob([data]).size;
        const sizeKB = sizeBytes / 1024;
        const sizeMB = sizeKB / 1024;

        // Límite conservador de 4MB (sessionStorage típicamente 5-10MB)
        if (sizeKB > 4096) {
            console.warn(`⚠️ Base de datos muy grande (${sizeMB.toFixed(2)}MB). Guardando versión limitada en sessionStorage.`);

            // Estrategia: Guardar solo últimas 100 visitas de cada hoja
            const limitedDB = {
                ...appState.db,
                ESPA: (appState.db?.ESPA || []).slice(-100),
                APS: (appState.db?.APS || []).slice(-100)
            };

            sessionStorage.setItem('hubClinicoDB', JSON.stringify(limitedDB));
            sessionStorage.setItem('hubClinicoDB_limited', 'true');
            console.log('✓ Base de datos limitada guardada en sessionStorage (últimas 100 visitas por patología).');

            // Advertir al usuario
            if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion(
                    'BD muy grande. Caché limitado a últimas 100 visitas por patología.',
                    'warning'
                );
            }
        } else {
            sessionStorage.setItem('hubClinicoDB', data);
            sessionStorage.removeItem('hubClinicoDB_limited');
            console.log(`✓ Base de datos completa guardada en sessionStorage (${sizeKB.toFixed(0)}KB).`);
        }
    } catch (e) {
        console.error('❌ Error al guardar la base de datos en sessionStorage:', e);

        // Si falla incluso con versión limitada, no guardar nada
        sessionStorage.removeItem('hubClinicoDB');
        sessionStorage.removeItem('hubClinicoDB_limited');

        // Alertar al usuario
        if (typeof HubTools?.utils?.mostrarNotificacion === 'function') {
            HubTools.utils.mostrarNotificacion(
                'Error: BD demasiado grande para caché. Funcionalidad limitada entre páginas.',
                'error'
            );
        } else {
            alert('Error: No se pudo guardar la base de datos en la sesión del navegador. Es posible que sea demasiado grande.');
        }
    }
}

/**
 * Carga un archivo .xlsx, lo procesa con SheetJS y lo guarda en el estado de la aplicación.
 * Es el corazón del dataManager y la única función que interactúa directamente con el archivo.
 * @param {File} file - El objeto File seleccionado por el usuario desde un <input type="file">.
 * @returns {Promise<boolean>} - Devuelve 'true' si la carga fue exitosa, 'false' si falló.
 */
async function loadDatabase(file) {
    // Usamos un bloque try...catch para manejar cualquier posible error durante la lectura o parseo del archivo.
    try {
        // 1. Lee el archivo como un ArrayBuffer, que es el formato que SheetJS necesita.
        const data = await file.arrayBuffer();
        
        // 2. SheetJS lee los datos binarios y crea un objeto "workbook" (libro de trabajo).
        const workbook = XLSX.read(data);
        
        const dbData = {};

        // 3. Itera sobre las hojas de datos de pacientes y profesionales, que tienen una estructura estándar.
        ['ESPA', 'APS', 'Profesionales'].forEach(sheetName => {
            if (workbook.Sheets[sheetName]) {
                let sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                if (sheetName === 'Profesionales') {
                    sheetData = sheetData.map(row => {
                        // Check for common variations of 'cargo' and normalize to 'cargo'
                        const cargoKey = Object.keys(row).find(key => key.toLowerCase() === 'cargo' || key.toLowerCase() === 'rol');
                        if (cargoKey && row[cargoKey] !== undefined && !row.cargo) {
                            row.cargo = row[cargoKey];
                            if (cargoKey !== 'cargo') { // Only delete if it's not already 'cargo'
                                delete row[cargoKey];
                            }
                        }
                        return row;
                    });
                }
                dbData[sheetName] = sheetData;
            }
        });
        
        // 4. Procesa de forma ESPECIAL la hoja 'Fármacos' para crear un objeto anidado.
        if (workbook.Sheets['Fármacos']) {
            const farmacosSheet = workbook.Sheets['Fármacos'];
            // Leemos la hoja como un array de arrays (filas y columnas) para tener control total.
            const farmacosJSON = XLSX.utils.sheet_to_json(farmacosSheet, { header: 1 });
            console.log('DEBUG: farmacosJSON (Fármacos sheet raw data):', farmacosJSON);
            
            // Inicializamos el objeto que contendrá las listas de fármacos.
            dbData['Fármacos'] = {
                Sistemicos: [],
                FAMEs: [],
                Biologicos: []
            };

            // Recorremos las filas de datos (a partir de la segunda fila, índice 1)
            // y extraemos los valores de cada columna para rellenar nuestras listas.
            if (farmacosJSON.length > 1) {
                for (let i = 1; i < farmacosJSON.length; i++) {
                    const row = farmacosJSON[i];
                    console.log('DEBUG: Processing Fármacos row:', i, row);
                    if (row[0]) { // Columna 0: Sistemicos
                        dbData['Fármacos'].Sistemicos.push(row[0]);
                    }
                    if (row[1]) { // Columna 1: FAMEs
                        dbData['Fármacos'].FAMEs.push(row[1]);
                    }
                    if (row[2]) { // Columna 2: Biologicos
                        dbData['Fármacos'].Biologicos.push(row[2]);
                    }
                }
            }
        }

        // 5. Actualiza el estado global de la aplicación.
        appState.db = dbData;
        appState.isLoaded = true;

        console.log("Base de datos cargada y procesada con éxito:", appState.db);

        // Disparar evento personalizado para notificar que la BD está cargada
        window.dispatchEvent(new CustomEvent('databaseLoaded', { detail: appState.db }));
        console.log('✓ Evento databaseLoaded disparado');

        // Guardar en sessionStorage para persistencia entre páginas
        saveToSessionStorage();

        // 6. Devuelve 'true' para indicar que la operación fue exitosa.
        return true;

    } catch (error) {
        // Si algo falla en cualquier punto, lo capturamos aquí.
        console.error("Error crítico al cargar o procesar la base de datos:", error);
        
        // Reseteamos el estado para evitar que la aplicación trabaje con datos corruptos.
        appState.isLoaded = false;
        appState.db = null;
        
        // 7. Devuelve 'false' para indicar que la operación falló.
        return false;
    }
}

/**
 * Devuelve la lista de profesionales.
 * @returns {Array} Array de objetos de profesionales.
 */
function getProfesionales() {
    if (!appState.isLoaded) return [];
    return appState.db?.Profesionales || [];
}

/**
 * Devuelve la lista de fármacos para un tipo específico.
 * @param {string} tipo - El tipo de fármaco (e.g., 'Tratamientos_Sistemicos', 'FAMEs', 'Biologicos').
 * @returns {Array} Array de strings con los nombres de los fármacos.
 */
function getFarmacosPorTipo(tipo) {
    console.log('DEBUG: getFarmacosPorTipo called with tipo:', tipo);
    if (!appState.isLoaded) {
        console.warn('⚠ Base de datos no cargada. No se pueden obtener fármacos.');
        return [];
    }
    
    // Mapeo para mayor flexibilidad y compatibilidad
    const tipoMapping = {
        'Sistemicos': ['Sistemicos', 'Tratamientos_Sistemicos', 'sistemicos'],
        'FAMEs': ['FAMEs', 'fames'],
        'Biologicos': ['Biologicos', 'biologicos']
    };
    
    // Intentar encontrar el tipo solicitado en múltiples posibles claves
    const possibleKeys = tipoMapping[tipo] || [tipo];
    
    for (const key of possibleKeys) {
        if (appState.db?.Fármacos?.[key] && Array.isArray(appState.db.Fármacos[key])) {
            console.log(`✓ Encontrados ${appState.db.Fármacos[key].length} fármacos del tipo "${tipo}" (clave: ${key})`);
            console.log('DEBUG: Returning fármacos:', appState.db.Fármacos[key]);
            return appState.db.Fármacos[key];
        }
    }
    console.warn(`⚠ No se encontraron fármacos para el tipo: ${tipo} con las claves posibles: ${possibleKeys.join(', ')}`);
    return [];
}

/**
 * Devuelve todos los pacientes de todas las hojas
 * @returns {Array} Array de todos los pacientes
 */
function getAllPatients() {
    if (!appState.isLoaded) return [];
    const allPatients = [];
    ['ESPA', 'APS'].forEach(sheetName => {
        if (appState.db?.[sheetName]) {
            allPatients.push(...appState.db[sheetName]);
        }
    });
    return allPatients;
}

/**
 * Busca un paciente por ID en todas las hojas
 * @param {string} patientId - ID del paciente (ej: "ESP-2023-001")
 * @returns {Object|null} - Datos del paciente o null si no existe
 */
function findPatientById(patientId) {
    if (!patientId) {
        return null;
    }

    if (appState.isLoaded) {
        const sheets = ['ESPA', 'APS'];
        for (const sheetName of sheets) {
            const patients = appState.db?.[sheetName] || [];
            const patient = patients.find(p => p.ID_Paciente === patientId);
            if (patient) {
                return { ...patient, pathology: sheetName.toLowerCase() };
            }
        }
    }

    if (typeof window.MockPatients?.getById === 'function') {
        const mockPatient = window.MockPatients.getById(patientId);
        if (mockPatient) {
            console.log(`findPatientById: Paciente ${patientId} encontrado en MockPatients.`);
            const summary = { ...mockPatient.summary };
            if (!summary.pathology) {
                summary.pathology = mockPatient.pathology || null;
            }
            return summary;
        }
    }

    console.warn(`findPatientById: Paciente ${patientId} no encontrado en base de datos ni en MockPatients.`);
    return null;
}

/**
 * Obtiene todas las visitas de un paciente con estructura mejorada para el dashboard
 * @param {string} patientId - ID del paciente
 * @returns {Object} - Objeto con estructura: { allVisits, latestVisit, firstVisit, pathology, treatmentHistory, keyEvents }
 */
function getPatientHistory(patientId) {
    const emptyHistory = { allVisits: [], latestVisit: null, firstVisit: null, pathology: null, treatmentHistory: [], keyEvents: [] };

    if (appState.isLoaded) {
        const sheets = ['ESPA', 'APS'];
        const visits = [];
        let pathology = null;

        sheets.forEach(sheetName => {
            const patients = appState.db?.[sheetName] || [];
            const patientVisits = patients.filter(p => p.ID_Paciente === patientId);
            patientVisits.forEach(visit => {
                visits.push({ ...visit, pathology: sheetName.toLowerCase() });
                if (!pathology) pathology = sheetName.toLowerCase();
            });
        });

        if (visits.length > 0) {
            visits.sort((a, b) => {
                try {
                    const dateA = parseVisitDate(a.Fecha_Visita || a.fechaVisita);
                    const dateB = parseVisitDate(b.Fecha_Visita || b.fechaVisita);
                    return dateB - dateA;
                } catch (e) {
                    console.warn('Error al ordenar fechas:', e);
                    return 0;
                }
            });

            const treatmentHistory = extractTreatmentHistory(visits);
            const keyEvents = extractKeyEvents(visits, pathology);

            return {
                allVisits: visits,
                latestVisit: visits[0],
                firstVisit: visits[visits.length - 1],
                pathology: pathology,
                treatmentHistory: treatmentHistory,
                keyEvents: keyEvents
            };
        }
    }

    // Fallback to MockPatients
    if (typeof window.MockPatients?.getById === 'function') {
        const mockPatient = window.MockPatients.getById(patientId);
        if (mockPatient) {
            console.log(`getPatientHistory: Paciente ${patientId} encontrado en MockPatients.`);
            // The mock data is already sorted chronologically
            const sortedVisits = [...mockPatient.visits].sort((a,b) => new Date(b.fechaVisita) - new Date(a.fechaVisita));
            return {
                allVisits: sortedVisits,
                latestVisit: sortedVisits[0],
                firstVisit: sortedVisits[sortedVisits.length - 1],
                pathology: mockPatient.pathology,
                treatmentHistory: mockPatient.treatmentHistory || [],
                keyEvents: mockPatient.keyEvents || []
            };
        }
    }

    console.warn('Base de datos no cargada y sin fallback de mock para el historial.');
    return emptyHistory;
}

/**
 * Parsea una fecha de múltiples formatos posibles
 * @param {string|Date} dateStr - Fecha en formato DD/MM/YYYY, YYYY-MM-DD, o ya Date
 * @returns {Date} - Objeto Date
 */
function parseVisitDate(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;

    // Intentar formato DD/MM/YYYY
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
    }

    // Intentar formato YYYY-MM-DD
    return new Date(dateStr);
}

/**
 * Extrae el historial de cambios de tratamiento a partir de las visitas
 * @param {Array} visits - Array de visitas ordenadas cronológicamente (reciente primero)
 * @returns {Array} - Array de { date, name, reason }
 */
function extractTreatmentHistory(visits) {
    if (visits.length === 0) return [];

    const treatments = [];
    const seenTreatments = new Set();

    // Recorrer visitas en orden cronológico inverso (antiguo a reciente)
    for (let i = visits.length - 1; i >= 0; i--) {
        const visit = visits[i];

        // Extraer tratamiento actual (puede venir de biologicoSelect, fameSelect, o sistemicoSelect)
        let currentTreatment = visit.biologicoSelect || visit.fameSelect || visit.sistemicoSelect ||
                               visit.Biologico || visit.FAME || visit.Sistémico || null;

        // Si encontramos un tratamiento nuevo (diferente al anterior), registrarlo
        if (currentTreatment && !seenTreatments.has(currentTreatment)) {
            seenTreatments.add(currentTreatment);
            treatments.push({
                startDate: visit.Fecha_Visita || visit.fechaVisita || new Date(),
                name: currentTreatment,
                reason: visit.motivoCambio || visit.comentariosAdicionales || 'Tratamiento activo'
            });
        }
    }

    return treatments;
}

/**
 * Extrae eventos clínicos clave a partir de las visitas mediante comparación de valores
 * @param {Array} visits - Array de visitas ordenadas cronológicamente (reciente primero)
 * @param {string} pathology - Tipo de patología ('espa' o 'aps')
 * @returns {Array} - Array de { date, type, description }
 */
function extractKeyEvents(visits, pathology) {
    if (visits.length < 2) return []; // Se necesitan al menos 2 visitas para inferir eventos

    const events = [];
    const cutoffs = HubTools?.dashboard?.activityCutoffs || {};

    // Procesar visitas en orden cronológico (antiguo a reciente)
    for (let i = visits.length - 1; i >= 0; i--) {
        const currentVisit = visits[i];
        const previousVisit = i > 0 ? visits[i + 1] : null;
        const visitDate = currentVisit.Fecha_Visita || currentVisit.fechaVisita;

        // 1. Registrar cambios explícitos de tratamiento
        if (previousVisit) {
            const currentTx = currentVisit.biologicoSelect || currentVisit.fameSelect ||
                             currentVisit.sistemicoSelect || currentVisit.Biologico ||
                             currentVisit.FAME || currentVisit.Sistémico;
            const previousTx = previousVisit.biologicoSelect || previousVisit.fameSelect ||
                              previousVisit.sistemicoSelect || previousVisit.Biologico ||
                              previousVisit.FAME || previousVisit.Sistémico;

            if (currentTx && previousTx && currentTx !== previousTx) {
                events.push({
                    date: visitDate,
                    type: 'treatment',
                    description: `Cambio de tratamiento: ${previousTx} → ${currentTx}`
                });
            }
        }

        // 2. Detectar eventos adversos si están registrados
        if (currentVisit.efectosAdversos || currentVisit.adverseEvents) {
            events.push({
                date: visitDate,
                type: 'adverse',
                description: currentVisit.efectosAdversos || currentVisit.adverseEvents
            });
        }

        // 3. Detectar flares comparando puntuaciones
        if (previousVisit) {
            let isFlare = false;
            let flareReason = '';

            if (pathology === 'espa' || pathology === 'ESPA') {
                // Comparar BASDAI
                const currBASDAI = parseFloat(currentVisit.basdaiResult || currentVisit.BASDAI);
                const prevBASDAI = parseFloat(previousVisit.basdaiResult || previousVisit.BASDAI);

                if (!isNaN(currBASDAI) && !isNaN(prevBASDAI) && currBASDAI > prevBASDAI + 2) {
                    isFlare = true;
                    flareReason = `BASDAI ↑ (${prevBASDAI.toFixed(1)} → ${currBASDAI.toFixed(1)})`;
                }

                // Comparar ASDAS-CRP
                if (!isFlare) {
                    const currASDAS = parseFloat(currentVisit.asdasCrpResult || currentVisit.ASDAS);
                    const prevASDAS = parseFloat(previousVisit.asdasCrpResult || previousVisit.ASDAS);

                    if (!isNaN(currASDAS) && !isNaN(prevASDAS) && currASDAS > prevASDAS + 0.8) {
                        isFlare = true;
                        flareReason = `ASDAS ↑ (${prevASDAS.toFixed(2)} → ${currASDAS.toFixed(2)})`;
                    }
                }
            } else if (pathology === 'aps' || pathology === 'APS') {
                // Comparar HAQ
                const currHAQ = parseFloat(currentVisit.haqResult || currentVisit.HAQ);
                const prevHAQ = parseFloat(previousVisit.haqResult || previousVisit.HAQ);

                if (!isNaN(currHAQ) && !isNaN(prevHAQ) && currHAQ > prevHAQ + 0.5) {
                    isFlare = true;
                    flareReason = `HAQ ↑ (${prevHAQ.toFixed(2)} → ${currHAQ.toFixed(2)})`;
                }

                // Comparar RAPID3
                if (!isFlare) {
                    const currRAPID3 = parseFloat(currentVisit.rapid3Result || currentVisit.RAPID3);
                    const prevRAPID3 = parseFloat(previousVisit.rapid3Result || previousVisit.RAPID3);

                    if (!isNaN(currRAPID3) && !isNaN(prevRAPID3) && currRAPID3 > prevRAPID3 + 2) {
                        isFlare = true;
                        flareReason = `RAPID3 ↑ (${prevRAPID3.toFixed(1)} → ${currRAPID3.toFixed(1)})`;
                    }
                }
            }

            if (isFlare) {
                events.push({
                    date: visitDate,
                    type: 'flare',
                    description: `Brote clínico detectado: ${flareReason}`
                });
            }
        }

        // 4. Detectar remisión cuando se alcanzan umbrales bajos
        let isRemission = false;
        let remissionReason = '';

        if (pathology === 'espa' || pathology === 'ESPA') {
            const basdai = parseFloat(currentVisit.basdaiResult || currentVisit.BASDAI);
            if (!isNaN(basdai) && basdai < (cutoffs.basdai?.remission || 4)) {
                isRemission = true;
                remissionReason = `BASDAI baja (${basdai.toFixed(1)})`;
            }
        } else if (pathology === 'aps' || pathology === 'APS') {
            const haq = parseFloat(currentVisit.haqResult || currentVisit.HAQ);
            if (!isNaN(haq) && haq < (cutoffs.haq?.remission || 0.5)) {
                isRemission = true;
                remissionReason = `HAQ en remisión (${haq.toFixed(2)})`;
            }
        }

        if (isRemission && previousVisit) {
            // Solo registrar si la visita anterior NO estaba en remisión
            const prevBASDAI = parseFloat(previousVisit.basdaiResult || previousVisit.BASDAI);
            const prevHAQ = parseFloat(previousVisit.haqResult || previousVisit.HAQ);

            let shouldRecord = false;
            if (pathology === 'espa' && !isNaN(prevBASDAI) && prevBASDAI >= 4) shouldRecord = true;
            if (pathology === 'aps' && !isNaN(prevHAQ) && prevHAQ >= 0.5) shouldRecord = true;

            if (shouldRecord) {
                events.push({
                    date: visitDate,
                    type: 'remission',
                    description: `Remisión clínica alcanzada: ${remissionReason}`
                });
            }
        }
    }

    // Ordenar eventos por fecha (ascendente)
    events.sort((a, b) => {
        const dateA = parseVisitDate(a.date);
        const dateB = parseVisitDate(b.date);
        return dateA - dateB;
    });

    return events;
}

/**
 * Intenta inicializar la base de datos desde sessionStorage al cargar la página.
 * @returns {boolean} - Devuelve 'true' si la carga fue exitosa, 'false' si no.
 */
function initDatabaseFromStorage() {
    if (appState.isLoaded) {
        console.log('DB ya cargada, omitiendo carga desde sessionStorage.');
        return true;
    }

    try {
        const storedDb = sessionStorage.getItem('hubClinicoDB');
        if (storedDb) {
            const dbData = JSON.parse(storedDb);
            appState.db = dbData;
            appState.isLoaded = true;
            console.log('✓ Base de datos cargada desde sessionStorage.');
            
            // Disparar evento para que otros scripts sepan que los datos están listos.
            // Usamos un pequeño timeout para asegurar que los listeners de otros scripts ya estén registrados.
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('databaseLoaded', { detail: appState.db }));
                console.log('✓ Evento databaseLoaded disparado desde sessionStorage.');
            }, 100);

            return true;
        }
    } catch (e) {
        console.error('❌ Error al cargar la base de datos desde sessionStorage:', e);
        sessionStorage.removeItem('hubClinicoDB'); // Limpiar datos corruptos
    }

    return false;
}



function getPoblationalData(filters = {}) {
    // Usar la función mock para poblar el dashboard de estadísticas
    if (typeof getMockPoblationalData === 'function') {
        return getMockPoblationalData(filters);
    } else {
        console.error('❌ getMockPoblationalData no está definida. Asegúrate de que mockDashboardData.js esté cargado.');
        // Devolver estructura vacía para evitar errores
        return {
            filteredCohort: [],
            kpis: {
                totalPatients: 0,
                remissionPercent: 0,
                highActivityPercent: 0,
                biologicPercent: 0,
                avgBasdai: 0
            },
            chartData: {
                activity: { labels: [], datasets: [] },
                treatment: { labels: [], datasets: [] },
                comorbidity: { labels: [], datasets: [] },
                correlation: { datasets: [] }
            }
        };
    }
}





function getFarmsDataFromState() {
    if (!appState.isLoaded || !appState.db.Fármacos) {
        return { Tratamientos_Sistemicos: [], FAMEs: [], Biologicos: [] };
    }

    // La estructura de Fármacos ya es { Sistemicos: [...], FAMEs: [...], Biologicos: [...] }
    // Solo necesitamos mapear los nombres correctamente
    return {
        Tratamientos_Sistemicos: appState.db.Fármacos.Sistemicos || [],
        FAMEs: appState.db.Fármacos.FAMEs || [],
        Biologicos: appState.db.Fármacos.Biologicos || []
    };
}

// =====================================

// EXPOSICIÓN AL NAMESPACE HUBTOOLS

// =====================================



// Exponer funciones al namespace global HubTools

if (typeof HubTools !== 'undefined') {

    HubTools.data.initDatabaseFromStorage = initDatabaseFromStorage;
    HubTools.data.loadDatabase = loadDatabase;

    HubTools.data.getProfesionales = getProfesionales;

    HubTools.data.getFarmacosPorTipo = getFarmacosPorTipo;

    HubTools.data.getAllPatients = getAllPatients;

    HubTools.data.findPatientById = findPatientById;

    HubTools.data.getPatientHistory = getPatientHistory;

    HubTools.data.getPoblationalData = getPoblationalData;

    HubTools.data.getFarmsDataFromState = getFarmsDataFromState;

    HubTools.data.loadDrugsData = function() {
        if (!appState.isLoaded || !appState.db.Fármacos) {
            return { FAMEs: [], Biologicos: [], Sistemicos: [] };
        }
        return appState.db.Fármacos;
    };

    HubTools.data.loadProfessionalsData = function() {
        if (!appState.isLoaded || !appState.db.Profesionales) {
            return [];
        }
        return appState.db.Profesionales;
    };

    console.log('✅ Módulo dataManager cargado');

} else {

    console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js primero.');

}

// Mantener compatibilidad con scripts clasicos que esperan funciones globales

if (typeof window !== 'undefined') {
    window.appState = appState;
    window.loadDatabase = loadDatabase;

    window.getProfesionales = getProfesionales;

    window.getFarmacosPorTipo = getFarmacosPorTipo;

    window.getAllPatients = getAllPatients;

    window.findPatientById = findPatientById;

    window.getPatientHistory = getPatientHistory;

    window.getPoblationalData = getPoblationalData;

}

// Autoinicializar desde sessionStorage al cargar el script
initDatabaseFromStorage();



