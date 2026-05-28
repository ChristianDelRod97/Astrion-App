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

    

        // Mensaje al usuario
        mensaje.textContent = "Data processed successfully. Thinking..";

        // Esperar 1.5 segundos y redirigir
        setTimeout(() => {
            window.location.href = './formulario.html';
        },1500);
    });

});
