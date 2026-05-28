document.addEventListener('DOMContentLoaded', async () => {
    const resultadoModelo = document.getElementById('ResultadoModelo');
    const ResultadoPerformance = document.getElementById('ResultadoPerformance');
    const resultadoNPI = document.getElementById('ResultadoNPI');
    const resultadoProductividad= document.getElementById('ResultadoProductividad')
    const resultadoYield = document.getElementById('ResultadoYield');
    const resultadoOEE = document.getElementById('ResultadoOEE');
    const generarPDFBtn = document.getElementById('generarPDF');
    const regresarBtn = document.getElementById('regresarBtn');
    const resultadoMaquinas = document.getElementById('ResultadoMaquinas');
    const top10TableBody = document.getElementById('top10TableBody');
    
    let myChartInstance = null;
    let variability = 0;

    try {
        const formResponses = await window.getAllDataFromIndexedDB(window.STORE_FORM_ADICIONAL);
        if (formResponses && formResponses.length > 0) {
            const latestResponse = formResponses[0];
            const cambioModelo = latestResponse.Cambiomodelo ?? 0;
            const cambioXdia = latestResponse.Xdia ?? 0;
            const Cambiopro = latestResponse.Cambiopro?? 0;
            const cambioYi = latestResponse.Cambioyi ?? 0;
            const eficiencia = latestResponse.Eficiencia ?? 0;
            const oee = latestResponse.OEE ?? 0;
            variability = latestResponse.Variability ?? 0;

            resultadoModelo.textContent = cambioModelo.toFixed(2);
            resultadoNPI.textContent = cambioXdia.toFixed(2);
            resultadoYield.textContent = `${(cambioYi * 100).toFixed(2)}%`;
            resultadoProductividad.textContent = `${(Cambiopro * 100).toFixed (2)}%`;
            ResultadoPerformance.textContent = `${(eficiencia * 100).toFixed(2)}%`;
            resultadoOEE.textContent = `${(oee * 100).toFixed(2)}%`;
        } else {
            console.warn("No se encontraron datos en STORE_FORM_ADICIONAL.");
            resultadoModelo.textContent = 'N/A';
            resultadoNPI.textContent = 'N/A';
            resultadoYield.textContent = 'N/A';
            resultadoProductividad.textContent = 'N/A';
            ResultadoPerformance.textContent = 'N/A';
            resultadoOEE.textContent = 'N/A';
            resultadoMaquinas.textContent = 'N/A';
        }
    } catch (error) {
        console.error("Error al cargar datos del formulario:", error);
        resultadoModelo.textContent = 'Error';
        resultadoNPI.textContent = 'Error';
        resultadoYield.textContent = 'Error';
        resultadoProductividad.textContent = 'Error';
        ResultadoPerformance.textContent = 'Error';
        resultadoOEE.textContent = 'Error';
        resultadoMaquinas.textContent = 'Error';
    }

    try {
        const demandaData = await window.getAllDataFromIndexedDB(window.STORE_DEMANDA);
        const capacidadData = await window.getAllDataFromIndexedDB(window.STORE_INFORMACION);

       const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const MONTH_NAME_MAP = {
            january: 'January', february: 'February', march: 'March', april: 'April', may: 'May', june: 'June',
            july: 'July', august: 'August', september: 'September', october: 'October', november: 'November', december: 'December',
            enero: 'January', febrero: 'February', marzo: 'March', abril: 'April', mayo: 'May', junio: 'June',
            julio: 'July', agosto: 'August', septiembre: 'September', octubre: 'October', noviembre: 'November', diciembre: 'December'
        };

        function detectMonthColumns(data) {
            if (!Array.isArray(data) || data.length === 0) return EN_MONTHS.slice();
            const seen = new Set();
            return Object.keys(data[0])
                .map(col => {
                    const normalized = String(col).trim().toLowerCase();
                    return MONTH_NAME_MAP[normalized] || null;
                })
                .filter(month => month && !seen.has(month))
                .filter(month => {
                    seen.add(month);
                    return true;
                });
         }
 
         if (demandaData && demandaData.length > 0 && capacidadData && capacidadData.length > 0) {
            const meses = detectMonthColumns(demandaData);
             const currentYear = new Date().getFullYear();
            const mesIndexMap = Object.fromEntries(EN_MONTHS.map((name, index) => [name, index]));
            const mesActualNombre = meses.length > 0 ? meses[0] : EN_MONTHS[new Date().getMonth()];
            const mesActualIndex = mesIndexMap[mesActualNombre] ?? new Date().getMonth();

            // --- Top 10 calculado para el primer mes de la tabla ---
             const daysInMonth = new Date(currentYear, mesActualIndex + 1, 0).getDate();



            // Calcular demanda del mes actual
           // --- calculo de demanda del mes (igual que lo tenías) ---
            let demandaDelMes = 0;
            demandaData.forEach(row => {
                const valor = parseFloat((row[mesActualNombre] || '0').toString().replace(/,/g, '').trim());
                if (!isNaN(valor)) demandaDelMes += valor;
            });

            // --- parámetros y unidades en MINUTOS ---
            const Sabado3 = 1862;
            const minutosDisponiblesPorDia = (variability - Sabado3); // minutos disponibles POR DÍA (por máquina)
            minutosDisponiblesPorMes = minutosDisponiblesPorDia; // minutos disponibles POR MES (por máquina)

             // 💡 Nuevo log para ver los minutos disponibles por máquina.
            console.log(`Variability (input): ${variability}`);
            console.log(`Minutos disponibles por máquina (al mes): ${minutosDisponiblesPorMes}`);


            const modelosMaquinas = {}; // guardará la "utilización" como fracción (0..)
            
            // --- calculo por modelo (todo en minutos) ---
            capacidadData.forEach(fila => {
                
                   const modelo = String(fila['Assembly (Number)'] || fila['Assembly'] || fila['Part'] || fila['Model'] || '').trim();
                 const uphReal = parseFloat(fila['Actual UPH']) || 0; // UPH = unidades por hora
 
                 if (!modelo || uphReal <= 0) return;
 
                 // Buscar la fila correspondiente en demandaData para este modelo
                const demandaFila = demandaData.find(d => String(d.Part || d['Part']).trim() === modelo);
                 if (!demandaFila) return;
 
                 // Obtener la demanda de este modelo para el mes actual
                 const demandaPorModelo = parseFloat((demandaFila[mesActualNombre] || '0').toString().replace(/,/g, '').trim());
                 if (isNaN(demandaPorModelo) || demandaPorModelo <= 0) return;
 
                 // minutos necesarios para producir la demanda del mes para ESTE modelo
                 const minutosNecesarios = (demandaPorModelo / uphReal) * 60;
 
                 // utilización = minutos necesarios / minutos disponibles por máquina en el mes
                 const utilizacion = minutosNecesarios / minutosDisponiblesPorMes;
 
                 modelosMaquinas[modelo] = utilizacion;
                 console.log('Utilizacion Por modelo:', modelosMaquinas)
 
                 // Log para verificar
                 console.table(`Modelo: ${modelo}, Demanda: ${demandaPorModelo}, Minutos necesarios: ${minutosNecesarios}, Utilización: ${utilizacion}`);
                 
             });
            
 
             // --- ordenar y tomar top 10 por utilización ---
             
             const modelosOrdenados = Object.entries(modelosMaquinas)
                 .map(([modelo, utilizacion]) => ({ modelo, utilizacion }))
                 .sort((a, b) => b.utilizacion - a.utilizacion)
                 .slice(0, 10);
                 // Para corroborar si SI esta ordenando los datos
             console.table(modelosOrdenados);
 
             // --- Llenar la tabla Top 10 ---
             // 
              // ---Para mostrar los detalles por modelo---
             const top10TableBody =document.getElementById('top10TableBody');
             const tooltip = document.getElementById('tooltip');
             const tooltipContent = document.getElementById('tooltip-content');
 
             //Crear un mapeo de los modelos para su busqueda rapida --
 
             const mapaModelos = {};
             capacidadData.forEach(fila => {
                const key = String(fila['Assembly (Number)'] || fila['Assembly'] || fila['Part'] || fila['Model'] || '').trim();
                mapaModelos[key] = fila;
             });
 
             // Llenar la tabla
             top10TableBody.innerHTML = '';
             modelosOrdenados.forEach((item, index) => {
                 const row = document.createElement('tr');
                const modelo = String(item.modelo || '').trim();

                const tdIndex = document.createElement('td');
                tdIndex.textContent = index + 1;

                const tdModelo = document.createElement('td');
                tdModelo.textContent = modelo;
                tdModelo.addEventListener('mouseover', (e) => showTooltip(e, modelo));
                tdModelo.addEventListener('mouseout', hideTooltip);

                const tdUtil = document.createElement('td');
                tdUtil.className = 'result-value';
                tdUtil.textContent = (item.utilizacion * 100).toFixed(2) + '%';

                row.appendChild(tdIndex);
                row.appendChild(tdModelo);
                row.appendChild(tdUtil);

                 top10TableBody.appendChild(row);
            });
            function showTooltip(event, modelo) {
                    const modeloData = mapaModelos[modelo];

                    if (!modeloData) {
                        tooltipContent.innerHTML = 'Datos no encontrados.';
                    } else {
                        const tooltipHtml = `
                            <strong>Model: ${modelo}</strong><br>
                            Pallet Length: ${modeloData['Pallet Length (In)'] || 'N/A'}<br>
                            Conveyor Speed: ${modeloData['Conveyor Speed (ft/min)'] || 'N/A'}<br>
                            Array: ${modeloData['Array'] || 'N/A'}<br>
                            Actual UPH: ${modeloData['Actual UPH'].toFixed(2) || 'N/A'} <br>
                            UPH 100%: ${modeloData['UPH 100%'].toFixed(2) || 'N/A'}`;
                        tooltipContent.innerHTML = tooltipHtml;
                    }

                
                    // Posicionar el tooltip cerca del cursor
                    tooltip.style.left = `${event.pageX + 15}px`;
                    tooltip.style.top = `${event.pageY + 15}px`;
                    tooltip.style.opacity = 1;
                }

                function hideTooltip() {
                    tooltip.style.opacity = 0;
                }

                // Exponer las funciones al ámbito global para que onmouseover pueda llamarlas
                window.showTooltip = showTooltip;
                window.hideTooltip = hideTooltip;

                // Para la alerta del boton 
            function showTooltip2(event) {
                let tooltip = document.getElementById('tooltip2');
                const quasarLink = document.getElementById('quasarLink');

                if(!tooltip){
                    tooltip = document.createElement('div');
                    tooltip.id = 'tooltip2';
                    tooltip.classList.add('tooltipHtml2');
                    document.body.appendChild(tooltip);
                }
                tooltip.innerHTML = `
                          <strong>Before you go...</strong><br>
                            Wouldn't you like to calculate your chemicals?<br>
                            <em>Click on "QUASAR" to do it.</em>
                        `;
                // Posicionar el tooltip cerca del cursor
                tooltip.style.left = `${event.pageX + 15}px`;
                tooltip.style.top = `${event.pageY + 15}px`;
                tooltip.style.opacity = 1;
                if (quasarLink) quasarLink.classList.add('highlight');
            }

            function hideTooltip2() {
                        const tooltip = document.getElementById('tooltip2');
                        if (tooltip) tooltip.style.opacity = 0;

                        // 🔹 Quitar iluminación al salir del tooltip
                        if (quasarLink) quasarLink.classList.remove('highlight');
                }

            window.showTooltip2 = showTooltip2;
            window.hideTooltip2 = hideTooltip2;
            regresarBtn.onmouseover = function(event) { showTooltip2(event, regresarBtn); };
            regresarBtn.onmouseout = hideTooltip2;

            // --- Lógica de la gráfica ---
           
                        const ctx = document.getElementById('grafica').getContext('2d');
                        const sumaPorMesReal = {};
                        const sumaPorMesReal100 = {};

                        meses.forEach(mes => {
                            sumaPorMesReal[mes] = 0;
                            sumaPorMesReal100[mes] = 0;
                        });

                        meses.forEach(mesActualNombre => {
                            // --- Calcular demanda total del mes ---
                            let demandaDelMes = 0;
                            demandaData.forEach(row => {
                                const valor = parseFloat((row[mesActualNombre] || '0').toString().replace(/,/g, '').trim());
                                if (!isNaN(valor)) demandaDelMes += valor;
                            });

                            const monthIndex = mesIndexMap[mesActualNombre];
                            const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
                            const Sabado3 = 1862;
                            const minutosDisponiblesPorDia = (variability - Sabado3);
                            const minutosDisponiblesPorMes = minutosDisponiblesPorDia;
                            

                            const modelosMaquinasReal = {};
                            const modelosMaquinas100 = {};

                            capacidadData.forEach(fila => {
                                const modelo = fila['Assembly (Number)'];
                                const uphReal = parseFloat(fila['Actual UPH']) || 0;
                                const uph100 = parseFloat(fila['UPH 100%']) || 0;
                                

                                if (!modelo) return;

                                const demandaFila = demandaData.find(d => d.Part === modelo);
                                if (!demandaFila) return;

                                const demandaPorModelo = parseFloat((demandaFila[mesActualNombre] || '0').toString().replace(/,/g, '').trim());
                                if (isNaN(demandaPorModelo) || demandaPorModelo <= 0) return;

                                

                                if (uphReal >=0) {
                                    const UPHafectado = uphReal * resultadoProductividad.textContent.slice(0, -1) / 100 * resultadoYield.textContent.slice(0, -1) / 100;
                                    const minutosNecesarios = (demandaPorModelo / UPHafectado) * 60;
                                    const utilizacion = minutosNecesarios / minutosDisponiblesPorMes;
                                    modelosMaquinasReal[modelo] = utilizacion;
                                }

                                if (uph100 > 0) {
                                    const minutosNecesarios100 = (demandaPorModelo / uph100) * 60;
                                    const utilizacion100 = minutosNecesarios100 / minutosDisponiblesPorMes;
                                    modelosMaquinas100[modelo] = utilizacion100;
                                }
                            });

                            // --- sumar la utilización total de todos los modelos ---
                            const sumaUtilizacionReal = Object.values(modelosMaquinasReal).reduce((a, b) => a + b, 0);
                            const sumaUtilizacion100 = Object.values(modelosMaquinas100).reduce((a, b) => a + b, 0);

                            sumaPorMesReal[mesActualNombre] = sumaUtilizacionReal;
                            sumaPorMesReal100[mesActualNombre] = sumaUtilizacion100;

                            console.log(` ${mesActualNombre} → Real: ${sumaUtilizacionReal.toFixed(3)}, 100%: ${sumaUtilizacion100.toFixed(3)}`);
                        });

                        // --- preparar datos para Chart.js ---
                        const labels = meses;
                        const datosReal = meses.map(mes => sumaPorMesReal[mes]);
                        const datos100 = meses.map(mes => sumaPorMesReal100[mes]);

                        const maxMaquinasNecesarias = Math.ceil(Math.max(...datosReal));
                        resultadoMaquinas.textContent = maxMaquinasNecesarias;

                        // --- renderizar gráfica ---
                        if (myChartInstance) myChartInstance.destroy();

                        myChartInstance = new Chart(ctx, {
                            type: 'bar',
                            data: {
                                labels: labels,
                                datasets: [
                                    {
                                        label: 'Required equipment Real',
                                        data: datosReal,
                                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                        borderColor: 'rgba(255, 99, 132, 1)',
                                        borderWidth: 1
                                    },
                                    {
                                        label: 'Required equipment 100%',
                                        data: datos100,
                                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                                        borderColor: 'rgba(75, 192, 192, 1)',
                                        borderWidth: 1
                                    }
                                ]
                            },
                            options: {
                                responsive: true,
                                scales: {
                                    y: { beginAtZero: true },
                                    x: { title: { display: true, text: 'Mes' } }
                                }
                            }
                        });

        } else {
            console.warn("Datos de demanda o capacidad no encontrados.");
            resultadoMaquinas.textContent = 'N/A';
        }
    } catch (error) {
        console.error("Error al cargar gráfico o Top 10:", error);
        resultadoMaquinas.textContent = 'Error';
    }
    
    // --- Botón de PDF ---
    generarPDFBtn.addEventListener('click', async () => {
        generarPDFBtn.style.display = 'none';
        regresarBtn.style.display = 'none';

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'letter');
        const content = document.querySelector('.container');

        try {
            const canvas = await html2canvas(content, { scale: 2, logging: true, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const imgProps = doc.getImageProperties(imgData);

            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const imgDisplayWidth = pdfWidth - 2 * margin;
            const imgDisplayHeight = (imgProps.height * imgDisplayWidth) / imgProps.width;

            let heightLeft = imgDisplayHeight;
            let position = margin;

            doc.setFontSize(24);
            doc.text("Monthly SCC Report", pdfWidth / 2, 40, { align: 'center' });
            position = 60;

            doc.addImage(imgData, 'JPEG', margin, position, imgDisplayWidth, imgDisplayHeight);
            heightLeft -= (pdfHeight - position);

            while (heightLeft >= 0) {
                position = heightLeft - imgDisplayHeight + margin;
                doc.addPage();
                doc.addImage(imgData, 'JPEG', margin, position, imgDisplayWidth, imgDisplayHeight);
                heightLeft -= pdfHeight;
            }

            doc.save(`SCC_Report ${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error("Error al generar el PDF:", error);
        } finally {
            generarPDFBtn.style.display = 'inline-block';
            regresarBtn.style.display = 'inline-block';
        }
    });

    // --- Botón regresar ---
    regresarBtn.addEventListener('click', async () => {
        try {
            await window.clearObjectStore(window.STORE_DEMANDA);
            await window.clearObjectStore(window.STORE_INFORMACION);
            await window.clearObjectStore(window.STORE_FORM_ADICIONAL);
            window.location.href = './index.html';
        } catch (error) {
            console.error('Error al borrar datos:', error);
        }
    });
});

// AI Conection 
/* para conectar con SmartPredict y obtener predicciones basadas en los datos procesados 
Y PARA UN FUTURO
async function smartPredict(values){
    try {
        const response = await fetch("http://127.0.0.1:5001/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values })
        });

        const data = await response.json();
        console.log("AI Prediction:", data);

        // Mostrar en HTML si tienes elementos para ello
        const aiContainer = document.getElementById('aiResults');
        if (aiContainer) {
        aiContainer.innerHTML = `
            <p><strong>Flux consumption:</strong> ${data.flux_prediction} L</p>
            <p><strong>Solder consumption:</strong> ${data.solder_prediction} g</p>
            <p><strong>Liquid usage:</strong> ${data.liquid_prediction} ml</p>
        `;
        } else {
        console.warn("Elemento #aiResults no encontrado. Añádelo en tu HTML si quieres mostrar los resultados.");
        }

        return data;
    } catch (error) {
        console.error("Error connecting to SmartPredict:", error);
  }
}
*/

