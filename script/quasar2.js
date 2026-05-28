document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('dtAdicionales');
    const mensaje = document.querySelector('.message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        mensaje.textContent = 'Saving data...';

        const fd = new FormData(form);

        const nameCh4 = fd.get("PctCh4").trim();
        const unitCh4 = fd.get("Chem4Unit").trim();

        const unitMap= {"1": "g", "2": "Gal", "3": "Lb"}

        const data = {
            // químicos base
            Flux: parseFloat(fd.get('Flux')),
            Welding: parseFloat(fd.get('Welding')),

            // nombres
            nameCh1: fd.get("PctCh1").trim(),
            nameCh2: fd.get("PctCh2").trim(),
            nameCh3: fd.get("PctCh3").trim(),
            nameCh4: nameCh4 !== "" ? nameCh4 : null,

            // porcentajes
            chem1Pct: parseFloat(fd.get("Chem1Pct")),
            chem2Pct: parseFloat(fd.get("Chem2Pct")),
            chem3Pct: parseFloat(fd.get("Chem3Pct")),
            chem4Pct: nameCh4 !== "" ? parseFloat(fd.get("Chem4Pct")) : null,

            // unidades
             unitCh1: unitMap[fd.get("Chem1Unit")],
             unitCh2: unitMap[fd.get("Chem2Unit")],
             unitCh3: unitMap[fd.get("Chem3Unit")],
             unitCh4: nameCh4 !== "" ? unitMap[unitCh4] : null,

            timestamp: new Date().toISOString()
        };

        try {
            await addDataToIndexedDB(
                window.STORE_QUASAR_DESPERDICIOS,
                [data]
            );

            mensaje.textContent = "Data saved successfully. Redirecting...";

            setTimeout(() => {
                window.location.href = "QUASAR3.html";
            }, 1000);

        } catch (error) {
            console.error("Error saving waste data:", error);
            mensaje.textContent = "Error saving data ";
        }
    });

});
