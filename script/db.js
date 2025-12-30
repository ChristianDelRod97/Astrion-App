// --- CONFIGURACIÓN DE INDEXEDDB ---
const DB_NAME = 'SCC_DataDB';
const DB_VERSION = 2;
const STORE_DEMANDA = 'Demand';
const STORE_INFORMACION = 'Model Information'; 
const STORE_FORM_ADICIONAL = 'formularioAdicional';
const STORE_QUASAR_DESPERDICIOS = 'Formulario Quasar Desperdicios';  

// Abre la base de datos
function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains(STORE_DEMANDA)) {
                db.createObjectStore(STORE_DEMANDA, { keyPath: 'id', autoIncrement: true });
            }
            
            if (!db.objectStoreNames.contains(STORE_INFORMACION)) {
                db.createObjectStore(STORE_INFORMACION, { keyPath: 'id', autoIncrement: true });
            }
            
            if (!db.objectStoreNames.contains(STORE_FORM_ADICIONAL)) {
                db.createObjectStore(STORE_FORM_ADICIONAL, { keyPath: 'id', autoIncrement: true });
            }

            if(!db.objectStoreNames.contains(STORE_QUASAR_DESPERDICIOS)) {
                db.createObjectStore(STORE_QUASAR_DESPERDICIOS, { keyPath: 'id', autoIncrement: true });
            }
           
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Guarda datos en IndexedDB
async function addDataToIndexedDB(storeName, dataArray) {
    const db = await openDb();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // Limpiar datos existentes
    await new Promise((res, rej) => {
        const clearReq = store.clear();
        clearReq.onsuccess = () => res();
        clearReq.onerror = (e) => rej(e);
    });
    
    // Añadir nuevos datos
    for (const record of dataArray) {
        store.add(record);
    }
    
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

// Obtiene todos los datos de un store
async function getAllDataFromIndexedDB(storeName) {
    const db = await openDb();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Lee un archivo como ArrayBuffer
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
}

// Procesa una hoja de Excel
// Añadimos startRow y startCol para definir el inicio de la tabla de datos (incluyendo encabezados)
function processSheet(worksheet, columnsToExtract = null) {
    let parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });
    if (parsedData.length === 0) return [];

    // Fila de encabezados (usualmente es la fila 2 en tu archivo)
    const headers = parsedData[0].map(h => h ? h.toString().trim() : '');
    const rows = parsedData.slice(1);
    const result = [];

    rows.forEach(row => {
    const obj = {};
    let isEmptyRow = true;

    headers.forEach((header, index) => {
        const trimmedHeader = header.trim();
        let value = row[index];
        
        // Convertir a número si es posible
        if (typeof value === 'string') {
            const numValue = parseFloat(value.replace(/,/g, ''));
            value = isNaN(numValue) ? value.trim() : numValue;
        }
        
        obj[trimmedHeader] = value;
        
        if (value !== null && value !== undefined && value !== '') {
            isEmptyRow = false;
        }
    });
    
    if (!isEmptyRow) result.push(obj);
});

    // Limpieza final de claves para evitar errores por espacios ocultos
    const cleanedData = result.map(row => {
        const cleanedRow = {};
        for (const key in row) {
            cleanedRow[key.trim()] = row[key];
        }
        return cleanedRow;
    });

    // Muestra las columnas que realmente detectó
    if (cleanedData.length > 0) {
        console.log("🟡 Columnas detectadas:", Object.keys(cleanedData[0]));
    }

    return cleanedData;
}



// Limpia un object store
function clearObjectStore(storeName) {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await openDb();
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        } catch (error) {
            reject(error);
        }
    });
}

// Exportar funciones
window.openDb = openDb;
window.addDataToIndexedDB = addDataToIndexedDB;
window.getAllDataFromIndexedDB = getAllDataFromIndexedDB;
window.readFileAsArrayBuffer = readFileAsArrayBuffer;
window.processSheet = processSheet;
window.clearObjectStore = clearObjectStore;
window.STORE_DEMANDA = STORE_DEMANDA;
window.STORE_INFORMACION = STORE_INFORMACION;
window.STORE_FORM_ADICIONAL = STORE_FORM_ADICIONAL;
window.STORE_QUASAR_DESPERDICIOS = STORE_QUASAR_DESPERDICIOS;