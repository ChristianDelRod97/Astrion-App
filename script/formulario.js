document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('dtAdicionales');
    const mensaje = document.querySelector('.message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        mensaje.textContent = 'Guardando datos...';

        const formData = new FormData(form);
        const formAnswers = {
            Turno1Obligatorio: parseInt(formData.get('Turno1Obligatorio')),
            turno2: parseInt(formData.get('turno2')),
            turno3: parseInt(formData.get('turno3')),
            Modelos: parseFloat(formData.get('Modelos')),
            Cambiomindia: parseFloat(formData.get('Cambiomindia')),
            Xdia: parseFloat(formData.get('Xdia')), // NPI en minutos
            Productividad:parseFloat(formData.get('Productividad')),
            Yield: parseFloat(formData.get('Yield')), // Este es el Yield ingresado por el usuario (ej. 95)
            timestamp: new Date().toISOString()
        };

        // *** Lógica de Cálculos ***

        // Calcular minutos de cambio de modelo por día (Modelos × tiempo por cambio)
        let minutoscambiodemodelo = 0;
        
        if (formAnswers.Modelos > 0 && formAnswers.Cambiomindia > 0) {
            minutoscambiodemodelo = formAnswers.Modelos * formAnswers.Cambiomindia;
            
        }
        formAnswers.Cambiomodelo = minutoscambiodemodelo;

       
        // Convertir Yield a decimal para el cálculo (ej. 95 -> 0.95)
        formAnswers.Cambioyi = formAnswers.Yield / 100; // ¡IMPORTANTE! Dividir por 100 aquí
        formAnswers.Cambiopro =formAnswers.Productividad / 100;


        // Mantenimiento total en minutos al mes (ej. 4 días * 24 horas * 60 minutos)
        const mantenimientoMinutosMes = 5760; // 5760 minutos
        //Funcion Dinamica de la obtencion de la fecha 
       const today = new Date();
       const currentYear = today.getFullYear();
       const currentMonth = today.getMonth();
       const daysInMonth = new Date(currentMonth, currentYear + 1 ,0).getDate();
       
        // 1. Calcular el tiempo total calendario (24/7) en minutos al mes
        const tiempoTotalCalendarioMes = 24 * 60 * daysInMonth; // Horas * Minutos/hora * Días del mes

        // 2. Calcular el tiempo de operación por día para los turnos seleccionados, RESTANDO NPI por cada turno
        let minutosOperacionRealPorDia = 0; // Esto será el numerador del Tiempo de Funcionamiento Real por día
        let totalMinutosPlanificadosTurnosDia = 0; // Para referencia o si se necesitara Disponibilidad tradicional

        if (formAnswers.Turno1Obligatorio === 1) {
            minutosOperacionRealPorDia += (432);
            totalMinutosPlanificadosTurnosDia += 432;
        }
        if (formAnswers.turno2 === 1) {
            minutosOperacionRealPorDia += (408);
            totalMinutosPlanificadosTurnosDia += 408;
        }
        if (formAnswers.turno3 === 1) {
            minutosOperacionRealPorDia += (468);
            totalMinutosPlanificadosTurnosDia += 468;
        }

        // 3. Calcular el Tiempo de Funcionamiento Real (Run Time / Variability en minutos)
        // Multiplicar los minutos de operación real por día por los días del mes
        // Y luego restar las pérdidas que son globales/mensuales (cambio de modelo y mantenimiento)
        formAnswers.Variability = (minutosOperacionRealPorDia * daysInMonth) - (minutoscambiodemodelo * daysInMonth) - (formAnswers.Xdia * daysInMonth) - mantenimientoMinutosMes;

        // Asegurarse de que Variability no sea negativo
        if (formAnswers.Variability < 0) {
            formAnswers.Variability = 0;
        }

        // 4. Calcular la Disponibilidad (Availability) como porcentaje decimal
        // Según tu nueva definición: Tiempo de Funcionamiento Real (Variability) / Tiempo Total Calendario (24/7)
        let disponibilidadDecimal = 0;
        if (tiempoTotalCalendarioMes > 0) {
            disponibilidadDecimal = formAnswers.Variability / tiempoTotalCalendarioMes;
        }
        // Guardar la disponibilidad como un factor decimal para el OEE
        formAnswers.Disponibilidad = disponibilidadDecimal;

        // Obtener la Eficiencia promedio
        const capacidadData = await window.getAllDataFromIndexedDB(window.STORE_INFORMACION);
        const eficiencias = capacidadData
            .map(item => parseFloat(item['Eficiencia']))
            .filter(e => !isNaN(e));

        // Asumimos que Eficiencia ya viene como decimal (ej. 0.85)
        formAnswers.Eficiencia = eficiencias.length > 0
            ? (eficiencias.reduce((a, b) => a + b, 0) / eficiencias.length)
            : 0;

        // 5. Calcular OEE (Ahora los tres factores son decimales)
        // OEE = Disponibilidad (decimal) * Eficiencia (decimal) * Yield (decimal)
        formAnswers.OEE = formAnswers.Disponibilidad * formAnswers.Eficiencia * formAnswers.Cambiopro * formAnswers.Cambioyi;


        try {
            await window.addDataToIndexedDB(window.STORE_FORM_ADICIONAL, [formAnswers]);
            mensaje.textContent = 'Data successfully saved!✅';
            setTimeout(() => window.location.href = './Resultados.html', 1000);
        } catch (error) {
            console.error("Error saving additional data:", error);
            mensaje.textContent = `Error saving additional data: ${error.message} ❌`;
        }
    });

    async function checkExistingFormData() {
        try {
            const data = await window.getAllDataFromIndexedDB(window.STORE_FORM_ADICIONAL);
            if (data && data.length > 0) {
                mensaje.textContent = 'Additional previous data found. You can continue to results. ✅';
                const continuarResultadosBtn = document.getElementById('continuarResultadosBtn');
                if (continuarResultadosBtn) {
                    continuarResultadosBtn.disabled = false;
                    continuarResultadosBtn.onclick = () => window.location.href = './Resultados.html';
                }
            }
        } catch (error) {
            console.warn("Previous additional data could not be verified:", error);
        }
    }
    checkExistingFormData();
});