document.addEventListener('DOMContentLoaded', () => {

    const continuarBtn = document.getElementById('continuarBtn');
    const mensaje = document.getElementById('mensaje');
    const resultadosDiv = document.getElementById('resultados');

    continuarBtn.addEventListener('click', async () => {

        mensaje.textContent = 'Processing data...';
        continuarBtn.disabled = true;

        resultadosDiv.innerHTML = `
            <link rel="stylesheet" href="./style/Q.U.A.S.A.R.-Style/index.css">
            <div class="spinner-css">
            <img src="./style/sources/girar.png" alt="Cargando...">
            </div>
        `;

        mensaje.textContent = 'Calculating results...';

        // Obtener datos desde IndexedDB
        const capacidadData = await window.getAllDataFromIndexedDB(window.STORE_INFORMACION);

        // Filtrar columnas buscadas
        const columnasbuscadas = capacidadData.map(item => ({
            weldingUsage: item["Welding Usage Factor (Lb)"] || 0,
            fluxUtilization: item["Flux Utilization Factor (Gl)"] || 0,
            chemical1: item["Chemical 1"] || 0,
            chemical2: item["Chemical 2"] || 0,
            chemical3: item["Chemical 3"] ||0,
            chemical4: item["Chemical 4"] || 0

        }));

        console.log('Columnas buscadas para cálculos:', columnasbuscadas);

        // --- GUARDAR LOS DATOS PARA LA SIGUIENTE PÁGINA ---
        localStorage.setItem("QUASAR_ModelInfo", JSON.stringify(columnasbuscadas));

        // Mensaje al usuario
        mensaje.textContent = "Data processed successfully. Thinking...";

        // Esperar 1.5 segundos y redirigir
        setTimeout(() => {
            window.location.href = './QUASAR2.html';
        },1500);
    });

});
