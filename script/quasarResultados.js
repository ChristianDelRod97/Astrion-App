document.addEventListener('DOMContentLoaded', async () => {
    const btnPDF = document.getElementById('generarPDF');
    const btnRegresar = document.getElementById('regresarBtn');
    /* ==========================================================
       1) CAPTURAR ELEMENTOS DEL HTML
    ========================================================== */
    const elFluxData = document.getElementById('FluxData');
    const elWeldingData = document.getElementById('WeldingData');

    const elChem1Data = document.getElementById('Chem1Data');
    const elChem2Data = document.getElementById('Chem2Data');
    const elChem3Data = document.getElementById('Chem3Data');
    const elChem4Data = document.getElementById('Chem4Data');

    const lblCh1 = document.getElementById('nameCh1Label');
    const lblCh2 = document.getElementById('nameCh2Label');
    const lblCh3 = document.getElementById('nameCh3Label');
    const lblCh4 = document.getElementById('nameCh4Label');

    const lblCh1W = document.getElementById('nameCh1LabelW');
    const lblCh2W = document.getElementById('nameCh2LabelW');
    const lblCh3W = document.getElementById('nameCh3LabelW');
    const lblCh4W = document.getElementById('nameCh4LabelW');

    const colCh1 = document.getElementById('nameCh1Col');
    const colCh2 = document.getElementById('nameCh2Col');
    const colCh3 = document.getElementById('nameCh3Col');
    const colCh4 = document.getElementById('nameCh4Col');

    const elFluxW = document.getElementById('FluxW1');
    const elWeldingW = document.getElementById('weldingW1');

    const elChem1W = document.getElementById('Chem1W');
    const elChem2W = document.getElementById('Chem2W');
    const elChem3W = document.getElementById('Chem3W');
    const elChem4W = document.getElementById('Chem4W');

    const top10ModelsBody = document.getElementById('top10ModelsBody');
    const graficaCanvas = document.getElementById('grafica');

    let chartInstance = null;

       //2) UTILIDADES
    function cleanNumber(n) {
        if (n === undefined || n === null) return 0;
        return parseFloat(String(n).replace(/,/g, '').trim()) || 0;
    }

    const meses = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const mesActualNombre = meses[(new Date()).getMonth()];

    /* ==========================================================
       3) LEER QUÍMICOS GUARDADOS
    ========================================================== */

    let Q = {
        Flux: 0,
        Welding: 0,

        nameCh1: "Chemical 1",
        nameCh2: "Chemical 2",
        nameCh3: "Chemical 3",
        nameCh4: null,

        chem1Pct: 0,
        chem2Pct: 0,
        chem3Pct: 0,
        chem4Pct: null,

        unitCh1: "g",
        unitCh2: "g",
        unitCh3: "g",
        unitCh4: null
    };

    try {
        const saved = await window.getAllDataFromIndexedDB(window.STORE_QUASAR_DESPERDICIOS);

        if (saved && saved.length > 0) {
            const d = saved[0];

            Q.Flux = cleanNumber(d.Flux);
            Q.Welding = cleanNumber(d.Welding);

            Q.nameCh1 = d.nameCh1;
            Q.nameCh2 = d.nameCh2;
            Q.nameCh3 = d.nameCh3;
            Q.nameCh4 = d.nameCh4 || null;

            Q.chem1Pct = cleanNumber(d.chem1Pct);
            Q.chem2Pct = cleanNumber(d.chem2Pct);
            Q.chem3Pct = cleanNumber(d.chem3Pct);
            Q.chem4Pct = d.nameCh4 ? cleanNumber(d.chem4Pct) : null;

            Q.unitCh1 = d.unitCh1;
            Q.unitCh2 = d.unitCh2;
            Q.unitCh3 = d.unitCh3;
            Q.unitCh4 = d.nameCh4 ? d.unitCh4 : null;
        }
    } catch (e) {
        console.error("Error leyendo químicos:", e);
    }

    /* Asignar nombres dinámicos */
    lblCh1.textContent = `${Q.nameCh1} Data`;
    lblCh2.textContent = `${Q.nameCh2} Data`;
    lblCh3.textContent = `${Q.nameCh3} Data`;

    lblCh1W.textContent = `${Q.nameCh1}:`;
    lblCh2W.textContent = `${Q.nameCh2}:`;
    lblCh3W.textContent = `${Q.nameCh3}:`;

    colCh1.textContent = `${Q.nameCh1} Utilization`;
    colCh2.textContent = `${Q.nameCh2} Utilization`;
    colCh3.textContent = `${Q.nameCh3} Utilization`;

    if (Q.nameCh4) {
        lblCh4.textContent = `${Q.nameCh4} Data`;
        lblCh4W.textContent = `${Q.nameCh4}:`;
        colCh4.textContent = `${Q.nameCh4} Utilization`;
    } else {
        lblCh4.style.display = "none";
        lblCh4W.style.display = "none";
        colCh4.style.display = "none";
        elChem4Data.style.display = "none";
        elChem4W.style.display = "none";
    }

    /* ==========================================================
       4) LEER DEMANDA Y CAPACIDAD
    ========================================================== */

    let demandaData = await window.getAllDataFromIndexedDB(window.STORE_DEMANDA) || [];
    let capacidadData = await window.getAllDataFromIndexedDB(window.STORE_INFORMACION) || [];

    function matchModel(row, model) {
        const campos = ["Part","Assembly","Assembly (Number)","Model"];
        return campos.some(c => row[c] && String(row[c]).trim() === String(model).trim());
    }

    function extraerDemandaMes(row) {
        if (!row) return 0;
        const keys = Object.keys(row);
        const target = mesActualNombre.toUpperCase();
        const found = keys.find(k => k.toUpperCase() === target);
        return cleanNumber(found ? row[found] : 0);
    }

    /* ==========================================================
       5) PROCESO DE CONSUMO
    ========================================================== */

    const consumoModelos = [];

    capacidadData.forEach(fila => {
        const modelo = fila["Assembly (Number)"] || fila["Assembly"] || fila["Part"] || fila["Model"];
        if (!modelo) return;

        const demandaFila = demandaData.find(d => matchModel(d, modelo));
        if (!demandaFila) return;

        const demanda = extraerDemandaMes(demandaFila);
        if (demanda <= 0) return;

        const chem1F = cleanNumber(fila["Chemical 1"]);
        const chem2F = cleanNumber(fila["Chemical 2"]);
        const chem3F = cleanNumber(fila["Chemical 3"]);
        const chem4F = Q.nameCh4 ? cleanNumber(fila["Chemical 4"]) : 0;

        const fluxF = cleanNumber(fila["Flux Utilization Factor (Gl)"]);
        const weldF = cleanNumber(fila["Welding Usage Factor (Lb)"]);

        const chem1Ideal = chem1F * demanda;
        const chem2Ideal = chem2F * demanda;
        const chem3Ideal = chem3F * demanda;
        const chem4Ideal = Q.nameCh4 ? chem4F * demanda : 0;

        const fluxIdeal = fluxF * demanda;
        const weldIdeal = weldF * demanda;

        const chem1 = chem1Ideal + chem1Ideal * (Q.chem1Pct / 100);
        const chem2 = chem2Ideal + chem2Ideal * (Q.chem2Pct / 100);
        const chem3 = chem3Ideal + chem3Ideal * (Q.chem3Pct / 100);
        const chem4 = Q.nameCh4 ? chem4Ideal + chem4Ideal * (Q.chem4Pct / 100) : 0;

        const flux  = fluxIdeal  + fluxIdeal  * (Q.Flux / 100);
        const weld  = weldIdeal  + weldIdeal  * (Q.Welding / 100);

        consumoModelos.push({
            modelo,
            flux,
            weld,
            chem1,
            chem2,
            chem3,
            chem4,
            total: flux + weld + chem1 + chem2 + chem3 + chem4
        });
    });

    /* ==========================================================
       6) TOP 10
    ========================================================== */

    const top10 = consumoModelos.sort((a,b) => b.total - a.total).slice(0,10);
    top10ModelsBody.innerHTML = "";

    top10.forEach((m, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${i+1}</td>
            <td>${m.modelo}</td>
            <td>${m.flux.toFixed(3)} gal</td>
            <td>${m.weld.toFixed(3)} Lb</td>
            <td>${m.chem1.toFixed(3)} ${Q.unitCh1}</td>
            <td>${m.chem2.toFixed(3)} ${Q.unitCh2}</td>
            <td>${m.chem3.toFixed(3)} ${Q.unitCh3}</td>
            <td>${Q.nameCh4 ? m.chem4.toFixed(3)+" "+Q.unitCh4 : "-"}</td>
        `;
        top10ModelsBody.appendChild(tr);
    });

    /* ==========================================================
       7) TOTALES
    ========================================================== */

    const totals = consumoModelos.reduce((acc,m) => {
        acc.flux += m.flux;
        acc.weld += m.weld;
        acc.chem1 += m.chem1;
        acc.chem2 += m.chem2;
        acc.chem3 += m.chem3;
        acc.chem4 += m.chem4;
        return acc;
    }, {flux:0, weld:0, chem1:0, chem2:0, chem3:0, chem4:0});

    // Mensual
    elFluxData.textContent = `${totals.flux.toFixed(3)} gal`;
    elWeldingData.textContent = `${totals.weld.toFixed(3)} Lb`;

    elChem1Data.textContent = `${totals.chem1.toFixed(3)} ${Q.unitCh1}`;
    elChem2Data.textContent = `${totals.chem2.toFixed(3)} ${Q.unitCh2}`;
    elChem3Data.textContent = `${totals.chem3.toFixed(3)} ${Q.unitCh3}`;
    if (Q.nameCh4) elChem4Data.textContent = `${totals.chem4.toFixed(3)} ${Q.unitCh4}`;

    // Semanal
    elFluxW.textContent = `${(totals.flux/4).toFixed(3)} gal`;
    elWeldingW.textContent = `${(totals.weld/4).toFixed(3)} Lb`;
    elChem1W.textContent = `${(totals.chem1/4).toFixed(3)} ${Q.unitCh1}`;
    elChem2W.textContent = `${(totals.chem2/4).toFixed(3)} ${Q.unitCh2}`;
    elChem3W.textContent = `${(totals.chem3/4).toFixed(3)} ${Q.unitCh3}`;
    if (Q.nameCh4) elChem4W.textContent = `${(totals.chem4/4).toFixed(3)} ${Q.unitCh4}`;


    /* ==========================================================
       8) GRAFICA
    ========================================================== */

    const ctx = graficaCanvas.getContext("2d");
    if (chartInstance) chartInstance.destroy();

    const datasets = [
        { label: "Flux (gal)", data:[totals.flux], backgroundColor:"rgba(54,162,235,0.7)" },
        { label: "Welding (Lb)", data:[totals.weld], backgroundColor:"rgba(255,159,64,0.7)" },
        { label: `${Q.nameCh1} (${Q.unitCh1})`, data:[totals.chem1], backgroundColor:"rgba(255,99,132,0.7)" },
        { label: `${Q.nameCh2} (${Q.unitCh2})`, data:[totals.chem2], backgroundColor:"rgba(75,192,192,0.7)" },
        { label: `${Q.nameCh3} (${Q.unitCh3})`, data:[totals.chem3], backgroundColor:"rgba(153,102,255,0.7)" }
    ];

    if (Q.nameCh4)
        datasets.push({
            label: `${Q.nameCh4} (${Q.unitCh4})`,
            data:[totals.chem4],
            backgroundColor:"rgba(255,205,86,0.7)"
        });

    chartInstance = new Chart(ctx,{
        type:"bar",
        data:{ labels:["Monthly Usage"], datasets },
        options:{ responsive:true }
    });


    /* ==========================================================
       9) PDF
    ========================================================== */

    function expandContainerForPDF() {
        const container = document.querySelector('.container');
        if (!container) return;
        container.dataset.originalHeight = container.style.height;
        container.style.height = 'auto';
    }

    function restoreContainerAfterPDF() {
        const container = document.querySelector('.container');
        if (!container) return;
        container.style.height = container.dataset.originalHeight || '';
    }

    if (btnPDF) {
        btnPDF.addEventListener('click', async () => {
            btnPDF.style.display = 'none';
            btnRegresar.style.display = 'none';

            try {
                expandContainerForPDF();
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('p', 'pt', 'letter');
                const content = document.querySelector('.container');

                const canvas = await html2canvas(content, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth();
                const margin = 20;
                const imgDisplayWidth = pdfWidth - 2 * margin;
                const imgDisplayHeight = (imgProps.height * imgDisplayWidth) / imgProps.width;

                doc.setFontSize(20);
                doc.text('QUASAR Monthly Report', pdfWidth / 2, 30, { align: 'center' });
                doc.addImage(imgData, 'JPEG', margin, 40, imgDisplayWidth, imgDisplayHeight);

                doc.save(`QUASAR_Report_${mesActualNombre}.pdf`);
            } catch (e) {
                console.error('Error generando PDF:', e);
            } finally {
                restoreContainerAfterPDF();
                btnPDF.style.display = 'inline-block';
                btnRegresar.style.display = 'inline-block';
            }
        });
    }

    /* ==========================================================
       10) TOOLTIP
    ========================================================== */

    window.showTooltipQuasar = function(event) {
        let tooltip = document.getElementById('tooltipQuasar');
        const SCCLink = document.getElementById('SCCLink');

        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'tooltipQuasar';
            tooltip.classList.add('tooltipHtml2');
            document.body.appendChild(tooltip);
        }

        tooltip.innerHTML = `
            <strong>Before you go...</strong><br>
            Remember that the data will be deleted.<br>
            <em>Do you want to continue?</em>
        `;

        tooltip.style.left = `${event.pageX + 15}px`;
        tooltip.style.top = `${event.pageY + 15}px`;
        tooltip.style.opacity = 1;

        if (SCCLink) SCCLink.classList.add('highlight');
    };

    window.hideTooltipQuasar = function() {
        const tooltip = document.getElementById('tooltipQuasar');
        const SCCLink = document.getElementById('SCCLink');

        if (tooltip) tooltip.style.opacity = 0;
        if (SCCLink) SCCLink.classList.remove('highlight');
    };


    /* ==========================================================
       11) BOTÓN REGRESAR
    ========================================================== */

    if (btnRegresar) {
        btnRegresar.addEventListener('click', async () => {
            try {
                if (window.clearObjectStore) {
                    await window.clearObjectStore(window.STORE_DEMANDA);
                    await window.clearObjectStore(window.STORE_FORM_ADICIONAL);
                    await window.clearObjectStore(window.STORE_QUASAR_DESPERDICIOS);
                }
                window.location.href = './index.html';
            } catch (err) {
                window.location.href = './index.html';
            }
        });
    }

}); // FIN DOMContentLoaded
