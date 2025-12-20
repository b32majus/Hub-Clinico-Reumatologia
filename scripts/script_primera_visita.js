// =====================================
// Script Primera Visita - Patrón Clásico
// =====================================
// Este coordinador inicializa módulos y configura eventos para la página de primera visita.
// NOTA: Este archivo NO usa import/export. Las funciones se acceden vía HubTools namespace.

document.addEventListener('DOMContentLoaded', () => {
    // Verificar que HubTools está disponible
    if (typeof HubTools === 'undefined') {
        console.error('❌ HubTools no disponible. Asegúrate de cargar hubTools.js primero.');
        return;
    }

    console.log('🚀 Iniciando script de Primera Visita (Coordinador)...');

    // --- INICIALIZACIÓN ---
    HubTools.data.initDatabaseFromStorage();
    HubTools.homunculus.initHomunculus();
    HubTools.form.inicializarCollapsibles();

    // --- POBLAR SELECTS DE FÁRMACOS DESDE LA BASE DE DATOS ---
    // Función para poblar selects (se ejecuta cuando BD está lista)
    function populateDrugSelects() {
        console.log('🔄 Iniciando población de selects de fármacos...');
        console.log('📊 Estado de la base de datos:', window.appState);
        
        // Verificar disponibilidad de funciones
        console.log('🔍 Disponibilidad de HubTools.data.getFarmacosPorTipo:', typeof HubTools?.data?.getFarmacosPorTipo);
        console.log('🔍 Disponibilidad de HubTools.form.populateSelectFromDatabase:', typeof HubTools?.form?.populateSelectFromDatabase);
        
        // Tratamientos previos
        HubTools.form.populateSelectFromDatabase('previoSistemicoSelect', 'Sistemicos');
        HubTools.form.populateSelectFromDatabase('previoFameSelect', 'FAMEs');
        HubTools.form.populateSelectFromDatabase('previoBiologicoSelect', 'Biologicos');

        // Plan terapéutico
        HubTools.form.populateSelectFromDatabase('sistemicoSelect', 'Sistemicos');
        HubTools.form.populateSelectFromDatabase('fameSelect', 'FAMEs');
        HubTools.form.populateSelectFromDatabase('biologicoSelect', 'Biologicos');

        // Psoriasis
        HubTools.form.populateSelectFromDatabase('psoriasisSistemicoSelect', 'Sistemicos');

        console.log('✓ Todos los selects de fármacos poblados desde la base de datos');
        console.log('Fármacos Sistemicos:', HubTools.data.getFarmacosPorTipo('Sistemicos'));
        console.log('Fármacos FAMEs:', HubTools.data.getFarmacosPorTipo('FAMEs'));
        console.log('Fármacos Biologicos:', HubTools.data.getFarmacosPorTipo('Biologicos'));
    }

    // Poblar inmediatamente si la BD ya está cargada
    if (window.appState?.isLoaded) {
        console.log('📊 Base de datos ya está cargada, poblando selects inmediatamente...');
        populateDrugSelects();
    } else {
        console.log('⏳ Base de datos no cargada, esperando evento databaseLoaded...');
        // Si no está cargada, esperar al evento
        window.addEventListener('databaseLoaded', () => {
            console.log('📊 Evento databaseLoaded recibido, poblando selects de fármacos...');
            populateDrugSelects();
        });
    }

    // --- EVENTO: Selector de Patología ---
    const diagnosticoSelect = document.getElementById('diagnosticoPrimario');
    if (diagnosticoSelect) {
        diagnosticoSelect.addEventListener('change', () => {
            HubTools.form.adaptarFormulario(diagnosticoSelect.value);
        });
    }

    // --- EVENTO: Botones de Biomarcadores (HLA-B27, FR, Anti-CCP) ---
    document.querySelectorAll('.biomarker-badge').forEach(btn => {
        btn.addEventListener('click', function() {
            // Obtener el grupo de botones (hla-btn, fr-btn, apcc-btn)
            const group = this.classList.contains('hla-btn') ? '.hla-btn' :
                          this.classList.contains('fr-btn') ? '.fr-btn' : '.apcc-btn';
            // Remover active de todos los botones del grupo
            document.querySelectorAll(group).forEach(b => b.classList.remove('active'));
            // Añadir active al botón clickeado
            this.classList.add('active');
        });
    });

    // --- EVENTO: Botones Toggle (Afectación Psoriasis, Extra-articular, Comorbilidades, etc.) ---
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
        });
    });

    // --- EVENTO: Checkboxes de Tóxicos ---
    document.querySelectorAll('.toxic-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const detailsInput = this.closest('.toxic-item').querySelector('.toxic-details');
            if (detailsInput) {
                detailsInput.disabled = !this.checked;
                if (!this.checked) {
                    detailsInput.value = '';
                }
            }
        });
    });

    // --- EVENTO: Cálculo automático de IMC ---
    const pesoInput = document.getElementById('peso');
    const tallaInput = document.getElementById('talla');
    const imcInput = document.getElementById('imc');

    if (pesoInput && tallaInput && imcInput) {
        const calcularIMC = () => {
            const peso = parseFloat(pesoInput.value);
            const talla = parseFloat(tallaInput.value);
            if (peso > 0 && talla > 0) {
                const imc = HubTools.utils.calcularIMC(peso, talla);
                imcInput.value = imc !== null ? imc.toFixed(1) : '';
            } else {
                imcInput.value = '';
            }
        };
        pesoInput.addEventListener('input', calcularIMC);
        tallaInput.addEventListener('input', calcularIMC);
    }

        // --- EVENTO: Botón Exportar TXT ---

        const btnExportTxt = document.getElementById('btnExportarTXT');

        if (btnExportTxt) {

            btnExportTxt.addEventListener('click', () => {
                console.log('🔄 === INICIANDO EXPORTACIÓN TXT ===');
                console.log('📊 Estado de HubTools:', {
                    disponible: typeof HubTools !== 'undefined',
                    form: typeof HubTools?.form !== 'undefined',
                    export: typeof HubTools?.export !== 'undefined',
                    utils: typeof HubTools?.utils !== 'undefined'
                });
                
                try {
                    const errores = HubTools.form.validarFormulario();
                    console.log('📋 Resultado validación:', errores);
                    
                    if (errores.length === 0) {
                        console.log('✓ Formulario válido, recopilando datos...');
                        
                        // Verificar disponibilidad de funciones críticas
                        if (typeof HubTools?.form?.recopilarDatosFormulario !== 'function') {
                            console.error('❌ HubTools.form.recopilarDatosFormulario no disponible');
                            HubTools.utils?.mostrarNotificacion?.('Error: función de recopilación no disponible', 'error');
                            return;
                        }
                        
                        if (typeof HubTools?.export?.exportarTXT !== 'function') {
                            console.error('❌ HubTools.export.exportarTXT no disponible');
                            HubTools.utils?.mostrarNotificacion?.('Error: función de exportación no disponible', 'error');
                            return;
                        }
                        
                        const datos = HubTools.form.recopilarDatosFormulario();
                        console.log('📊 Datos recopilados:', datos);
                        
                        console.log('📤 Iniciando exportación TXT...');
                        HubTools.export.exportarTXT(datos);
                    } else {
                        console.warn('⚠ Errores de validación:', errores);
                        HubTools.utils?.mostrarNotificacion?.(`Faltan campos obligatorios: ${errores.join(', ')}`, 'error');
                    }
                } catch (error) {
                    console.error('❌ Error capturado en exportación TXT:', error);
                    console.error('Stack trace:', error.stack);
                    HubTools.utils?.mostrarNotificacion?.(`Error al exportar: ${error.message}`, 'error');
                }
            });

        }

    

        // --- EVENTO: Botón Estructurar CSV ---

        const btnExportCsv = document.getElementById('btnEstructurarCSV');

        if (btnExportCsv) {

            btnExportCsv.addEventListener('click', () => {
                console.log('🔄 === INICIANDO EXPORTACIÓN CSV ===');
                console.log('📊 Estado de HubTools:', {
                    disponible: typeof HubTools !== 'undefined',
                    form: typeof HubTools?.form !== 'undefined',
                    export: typeof HubTools?.export !== 'undefined',
                    utils: typeof HubTools?.utils !== 'undefined'
                });
                
                try {
                    const errores = HubTools.form.validarFormulario();
                    console.log('📋 Resultado validación:', errores);
                    
                    if (errores.length === 0) {
                        console.log('✓ Formulario válido, recopilando datos...');
                        
                        // Verificar disponibilidad de funciones críticas
                        if (typeof HubTools?.form?.recopilarDatosFormulario !== 'function') {
                            console.error('❌ HubTools.form.recopilarDatosFormulario no disponible');
                            HubTools.utils?.mostrarNotificacion?.('Error: función de recopilación no disponible', 'error');
                            return;
                        }
                        
                        if (typeof HubTools?.export?.exportarYCopiarCSV !== 'function') {
                            console.error('❌ HubTools.export.exportarYCopiarCSV no disponible');
                            HubTools.utils?.mostrarNotificacion?.('Error: función de exportación CSV no disponible', 'error');
                            return;
                        }
                        
                        const datos = HubTools.form.recopilarDatosFormulario();
                        console.log('📊 Datos recopilados:', datos);
                        
                        const diagnostico = document.getElementById('diagnosticoPrimario').value;
                        console.log('🔍 Diagnóstico seleccionado:', diagnostico);
                        
                        console.log('📤 Iniciando exportación CSV...');
                        HubTools.export.exportarYCopiarCSV(datos, 'primera', diagnostico);
                    } else {
                        console.warn('⚠ Errores de validación encontrados');
                        HubTools.utils?.mostrarNotificacion?.(`Faltan campos obligatorios: ${errores.join(', ')}`, 'error');
                    }
                } catch (error) {
                    console.error('❌ Error capturado en exportación CSV:', error);
                    console.error('Stack trace:', error.stack);
                    HubTools.utils?.mostrarNotificacion?.(`Error al exportar CSV: ${error.message}`, 'error');
                }
            });

        }

    // --- EVENTO: Botón Nuevo Paciente ---
    const btnNuevoPaciente = document.getElementById('btnNuevoPaciente');
    if (btnNuevoPaciente) {
        btnNuevoPaciente.addEventListener('click', () => {
            // Recargar la página para limpiar el formulario y empezar de nuevo
            location.reload();
        });
    }

console.log('✅ Primera Visita inicializada correctamente');
});