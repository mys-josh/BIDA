let fileData = null;
let fileName = '';

// Configuración de drag and drop
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#667eea';
    uploadArea.style.background = 'rgba(102, 126, 234, 0.05)';
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#dee2e6';
    uploadArea.style.background = '#f8f9fa';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#dee2e6';
    uploadArea.style.background = '#f8f9fa';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    fileName = file.name;
    showStatus(`Archivo seleccionado: ${fileName}`, 'info');
    
    const fileExtension = fileName.toLowerCase().split('.').pop();
    
    if (fileExtension === 'csv') {
        parseCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        parseExcel(file);
    } else {
        showStatus('Formato de archivo no soportado. Use CSV o Excel.', 'error');
        return;
    }
}

function parseCSV(file) {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            fileData = results.data;
            showPreview(results.data);
            showStatus(`CSV procesado: ${results.data.length} filas encontradas`, 'success');
            document.getElementById('processBtn').disabled = false;
        },
        error: function(error) {
            showStatus(`Error al procesar CSV: ${error.message}`, 'error');
        }
    });
}

function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            fileData = jsonData;
            showPreview(jsonData);
            showStatus(`Excel procesado: ${jsonData.length} filas encontradas`, 'success');
            document.getElementById('processBtn').disabled = false;
        } catch (error) {
            showStatus(`Error al procesar Excel: ${error.message}`, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function showPreview(data) {
    const previewSection = document.getElementById('previewSection');
    const previewContent = document.getElementById('previewContent');
    
    if (data.length === 0) {
        previewContent.innerHTML = '<p>No hay datos para mostrar</p>';
        previewSection.style.display = 'block';
        return;
    }

    const headers = Object.keys(data[0]);
    const previewRows = data.slice(0, 5); // Mostrar solo las primeras 5 filas

    let tableHtml = '<table class="preview-table"><thead><tr>';
    headers.forEach(header => {
        tableHtml += `<th>${header}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    previewRows.forEach(row => {
        tableHtml += '<tr>';
        headers.forEach(header => {
            tableHtml += `<td>${row[header] || ''}</td>`;
        });
        tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';
    
    if (data.length > 5) {
        tableHtml += `<p style="text-align: center; margin-top: 15px; color: #718096;">
            Mostrando 5 de ${data.length} filas
        </p>`;
    }

    previewContent.innerHTML = tableHtml;
    previewSection.style.display = 'block';
}

function processFile() {
    if (!fileData || fileData.length === 0) {
        showStatus('No hay datos para procesar', 'error');
        return;
    }

    const selectedTable = document.getElementById('tableSelect').value;
    if (!selectedTable) {
        showStatus('Por favor selecciona una tabla destino', 'error');
        return;
    }

    showProgress();
    const startTime = Date.now();

    // Simular procesamiento de datos
    let validRows = 0;
    let errorRows = 0;
    let processedRows = 0;

    const totalRows = fileData.length;
    
    const processInterval = setInterval(() => {
        processedRows += Math.min(50, totalRows - processedRows);
        
        // Simular validación de datos
        const currentBatch = Math.min(50, totalRows - (processedRows - 50));
        validRows += Math.floor(currentBatch * 0.9); // 90% válidos
        errorRows += Math.ceil(currentBatch * 0.1);   // 10% errores

        updateProgress((processedRows / totalRows) * 100);
        updateStats(processedRows, validRows, errorRows, Date.now() - startTime);

        if (processedRows >= totalRows) {
            clearInterval(processInterval);
            finishProcessing(validRows, errorRows, Date.now() - startTime);
        }
    }, 100);
}

function showProgress() {
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('statsGrid').style.display = 'grid';
    document.getElementById('processBtn').disabled = true;
}

function updateProgress(percentage) {
    document.getElementById('progressFill').style.width = percentage + '%';
}

function updateStats(total, valid, errors, time) {
    document.getElementById('totalRows').textContent = total;
    document.getElementById('validRows').textContent = valid;
    document.getElementById('errorRows').textContent = errors;
    document.getElementById('processingTime').textContent = (time / 1000).toFixed(1) + 's';
}

function finishProcessing(validRows, errorRows, totalTime) {
    const selectedTable = document.getElementById('tableSelect').value;
    
    showStatus(
        `✅ Procesamiento completado para tabla ${selectedTable}:<br>
        • ${validRows} registros insertados exitosamente<br>
        • ${errorRows} registros con errores<br>
        • Tiempo total: ${(totalTime / 1000).toFixed(1)} segundos`, 
        'success'
    );

    document.getElementById('processBtn').disabled = false;
    
    // Generar SQL de ejemplo
    generateSampleSQL(selectedTable, validRows);
}

function generateSampleSQL(tableName, recordCount) {
    const sqlExamples = {
        'dim_clientes': `
-- Ejemplo de INSERT generado para ${recordCount} clientes
INSERT INTO dim_clientes (nombre_completo, email, telefono, departamento, provincia, distrito, tipo_cliente, fecha_registro)
VALUES 
('María García Vargas', 'maria.garcia@email.com', '987654321', 'Lima', 'Lima', 'Miraflores', 'Nacional', '2024-01-15'),
('Carlos López Mendoza', 'carlos.lopez@email.com', '987654322', 'Arequipa', 'Arequipa', 'Cercado', 'Nacional', '2024-01-16');`,
        
        'dim_productos': `
-- Ejemplo de INSERT generado para ${recordCount} productos
INSERT INTO dim_productos (nombre_producto, categoria, tipo_alpaca, color, talla, precio_unitario, costo_produccion, proveedor)
VALUES 
('Saco Alpaca Huacaya Natural - Talla M', 'Sacos', 'Alpaca Huacaya', 'Natural', 'M', 1200.00, 600.00, 'Alpaca del Perú S.A.'),
('Pantalón Baby Alpaca Negro - Talla L', 'Pantalones', 'Baby Alpaca', 'Negro', 'L', 650.00, 325.00, 'Textiles Andinos EIRL');`,
        
        'fact_ventas': `
-- Ejemplo de INSERT generado para ${recordCount} ventas
INSERT INTO fact_ventas (id_cliente, id_producto, id_fecha, id_empleado, numero_factura, cantidad_vendida, precio_venta_unitario, total_venta)
VALUES 
(150, 25, 20240115, 10, 'F2024000001', 2, 1200.00, 2832.00),
(78, 156, 20240116, 5, 'F2024000002', 1, 650.00, 767.00);`
    };

    const sqlCode = sqlExamples[tableName] || '-- SQL generado para la tabla seleccionada';
    
    showStatus(`
        📝 SQL de ejemplo generado:<br>
        <textarea readonly style="width: 100%; height: 120px; margin-top: 10px; padding: 10px; border-radius: 5px; border: 1px solid #ccc; font-family: monospace; font-size: 12px;">${sqlCode}</textarea>
    `, 'info');
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessages');
    const statusClass = `status-${type}`;
    
    statusDiv.innerHTML = `<div class="${statusClass} status-message">${message}</div>`;
    
    // Auto-hide después de 10 segundos para mensajes de éxito
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 10000);
    }
}

function clearData() {
    fileData = null;
    fileName = '';
    document.getElementById('fileInput').value = '';
    document.getElementById('tableSelect').value = '';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('statsGrid').style.display = 'none';
    document.getElementById('statusMessages').innerHTML = '';
    document.getElementById('processBtn').disabled = true;
    
    showStatus('Datos limpiados. Listo para cargar nuevo archivo.', 'info');
}

// Mapeo de columnas por tabla
const tableSchemas = {
    'dim_clientes': ['nombre_completo', 'email', 'telefono', 'departamento', 'provincia', 'distrito', 'tipo_cliente', 'fecha_registro'],
    'dim_productos': ['nombre_producto', 'categoria', 'tipo_alpaca', 'color', 'talla', 'precio_unitario', 'costo_produccion', 'proveedor'],
    'dim_empleados': ['nombre_empleado', 'cargo', 'sucursal', 'departamento_sucursal', 'comision_porcentaje', 'salario_base'],
    'fact_ventas': ['id_cliente', 'id_producto', 'id_fecha', 'id_empleado', 'numero_factura', 'cantidad_vendida', 'precio_venta_unitario', 'total_venta']
};

// Mostrar esquema esperado cuando se selecciona una tabla
document.getElementById('tableSelect').addEventListener('change', function() {
    const selectedTable = this.value;
    if (selectedTable && tableSchemas[selectedTable]) {
        const schema = tableSchemas[selectedTable];
        showStatus(`
            📋 Columnas esperadas para <strong>${selectedTable}</strong>:<br>
            <code style="background: #f1f5f9; padding: 10px; border-radius: 5px; display: block; margin-top: 10px;">
                ${schema.join(', ')}
            </code>
        `, 'info');
    }
});

// Inicialización
showStatus('Sistema listo. Selecciona un archivo CSV o Excel para comenzar.', 'info');
