const API_URL = 'http://192.168.1.140/videojuegos_app/';
document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
});
async function inicializarApp() {
    mostrarLoader(true);
    await Promise.all([
        cargarGeneros(),
        cargarPlataformas(),
        obtenerVideojuegos()
    ]);
    
    mostrarLoader(false);
}
async function cargarGeneros() {
    const selectGenero = document.getElementById('id_genero');
    try {
        const res = await fetch(`${API_URL}api-genero.php`);
        if (!res.ok) throw new Error(`Error géneros: ${res.status}`);
        const generos = await res.json();
        
        generos.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id; 
            opt.textContent = g.nombre;
            selectGenero.appendChild(opt);
        });
    } catch (err) {
        console.error(err);
        alert('Error al cargar la lista de géneros.');
    }
}

async function cargarPlataformas() {
    const selectPlataforma = document.getElementById('id_plataforma');
    try {
        const res = await fetch(`${API_URL}api-plataforma.php`);
        if (!res.ok) throw new Error(`Error plataformas: ${res.status}`);
        const plataformas = await res.json();
        
        plataformas.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id; 
            opt.textContent = p.nombre;
            selectPlataforma.appendChild(opt);
        });
    } catch (err) {
        console.error(err);
        alert('Error al cargar la lista de plataformas.');
    }
}
async function obtenerVideojuegos() {
    const lista = document.getElementById('listaVideojuegos');
    lista.innerHTML = '';
    try {
        const res = await fetch(`${API_URL}api-videojuego.php`);
        if (!res.ok) throw new Error(`Error videojuegos: ${res.status}`);
        const videojuegos = await res.json();
        
        if(videojuegos.length === 0) {
            lista.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay videojuegos registrados.</td></tr>`;
            return;
        }
        videojuegos.forEach(juego => {
            const tr = document.createElement('tr');

            const urlImagen = juego.imagen 
                ? `${API_URL}api-imagen.php?nombre=${juego.imagen}` 
                : 'https://via.placeholder.com/80?text=No+Image';

            tr.innerHTML = `
                <td><img src="${urlImagen}" alt="${juego.titulo}" width="80" style="object-fit: cover; border-radius: 4px;"></td>
                <td><strong>${juego.titulo}</strong><br><small>${juego.descripcion || ''}</small></td>
                <td>$${parseFloat(juego.precio).toFixed(2)}</td>
                <td>⭐ ${juego.calificacion}</td>
                <td>
                    <button onclick="prepararEdicion(${juego.id})">Editar</button>
                    <button onclick="prepararParcial(${juego.id})" style="background-color: #ff9800; color: white;">Rápido</button>
                    <button onclick="eliminarVideojuego(${juego.id})" style="background-color: #f44336; color: white;">Eliminar</button>
                </td>
            `;
            lista.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        lista.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error al conectar con la base de datos de videojuegos.</td></tr>`;
    }
}
function mostrarLoader(visibilidad) {
    const loader = document.getElementById('loading');
    if (loader) {
        loader.style.display = visibilidad ? 'block' : 'none';
    }
}
function prepararEdicion(id) { console.log('Editar ID:', id); }
function prepararParcial(id) { console.log('PATCH ID:', id); }
function eliminarVideojuego(id) { console.log('DELETE ID:', id); }

document.getElementById('formulario').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const btnGuardar = document.getElementById('btnGuardar');
    const imgFile = document.getElementById('imagen').files[0];

    // Obtención de valores del formulario
    const titulo = document.getElementById('titulo').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const precio = document.getElementById('precio').value;
    const lanzamiento = document.getElementById('lanzamiento').value;
    const calificacion = document.getElementById('calificacion').value;
    const id_genero = document.getElementById('id_genero').value;
    const id_plataforma = document.getElementById('id_plataforma').value;

    if (!titulo || !precio || !calificacion || !id_genero || !id_plataforma) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
    }

    btnGuardar.disabled = true;
    mostrarLoader(true);

    try {
        let opcionesFetch = {};

        if (imgFile) {
            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('descripcion', descripcion);
            formData.append('precio', precio);
            formData.append('lanzamiento', lanzamiento);
            formData.append('calificacion', calificacion);
            formData.append('id_genero', id_genero);
            formData.append('id_plataforma', id_plataforma);
            formData.append('imagen', imgFile);

            opcionesFetch = {
                method: 'POST',
                body: formData
            };
        } else {
            const datosJSON = {
                titulo: titulo,
                descripcion: descripcion,
                precio: parseFloat(precio),
                lanzamiento: lanzamiento,
                calificacion: parseFloat(calificacion),
                imagen: "",
                id_genero: parseInt(id_genero),
                id_plataforma: parseInt(id_plataforma)
            };

            opcionesFetch = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosJSON)
            };
        }

        const res = await fetch(`${API_URL}api-videojuego.php`, opcionesFetch);
        const data = await res.json();

        if (res.ok) {
            alert('¡Videojuego creado con éxito!');
            document.getElementById('formulario').reset();
            await obtenerVideojuegos();
        } else {
            throw new Error(data.message || `Error del servidor: ${res.status}`);
        }

    } catch (error) {
        console.error('Error al intentar crear:', error);
        alert('Hubo un problema: ' + error.message);
    } finally {
        btnGuardar.disabled = false;
        mostrarLoader(false);
    }
});
async function eliminarVideojuego(id) {
    const longitudConfirmacion = confirm(`¿Estás seguro de que deseas eliminar el videojuego con ID ${id}? Esta acción no se puede deshacer.`);

    if (!longitudConfirmacion) {
        return;
    }

    mostrarLoader(true);

    try {
        const res = await fetch(`${API_URL}api-videojuego.php?id=${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (res.ok) {
            alert('¡Videojuego eliminado con éxito!');
            await obtenerVideojuegos();
        } else {
            throw new Error(data.message || `Error al intentar eliminar: ${res.status}`);
        }

    } catch (error) {
        console.error('Error en la petición DELETE:', error);
        alert('Hubo un problema de conexión: ' + error.message);
    } finally {
        mostrarLoader(false);
    }
}
let idVideojuegoEnEdicion = null;

async function prepararEdicion(id) {
    mostrarLoader(true);
    try {
        const res = await fetch(`${API_URL}api-videojuego.php?id=${id}`);
        if (!res.ok) throw new Error(`No se pudo obtener el videojuego: ${res.status}`);
        
        const juego = await res.json();

        document.getElementById('titulo').value = juego.titulo;
        document.getElementById('descripcion').value = juego.descripcion || '';
        document.getElementById('precio').value = juego.precio;
        document.getElementById('lanzamiento').value = juego.lanzamiento;
        document.getElementById('calificacion').value = juego.calificacion;
        document.getElementById('id_genero').value = juego.id_genero;
        document.getElementById('id_plataforma').value = juego.id_plataforma;

        idVideojuegoEnEdicion = id;
        document.getElementById('btnGuardar').textContent = "Actualizar Videojuego (PUT)";
        document.getElementById('btnGuardar').style.backgroundColor = "#4CAF50";

        document.getElementById('formulario').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error(error);
        alert('Error al precargar los datos del videojuego.');
    } finally {
        mostrarLoader(false);
    }
}
document.getElementById('formulario').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const btnGuardar = document.getElementById('btnGuardar');
    const imgFile = document.getElementById('imagen').files[0];
    const titulo = document.getElementById('titulo').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const precio = document.getElementById('precio').value;
    const lanzamiento = document.getElementById('lanzamiento').value;
    const calificacion = document.getElementById('calificacion').value;
    const id_genero = document.getElementById('id_genero').value;
    const id_plataforma = document.getElementById('id_plataforma').value;
    if (!titulo || !precio || !calificacion || !id_genero || !id_plataforma) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
    }
    btnGuardar.disabled = true;
    mostrarLoader(true);
    try {
        let opcionesFetch = {};
        const metodoHTTP = idVideojuegoEnEdicion ? 'PUT' : 'POST';
        const urlPeticion = idVideojuegoEnEdicion 
            ? `${API_URL}api-videojuego.php?id=${idVideojuegoEnEdicion}`
            : `${API_URL}api-videojuego.php`;
        if (imgFile) {
            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('descripcion', descripcion);
            formData.append('precio', precio);
            formData.append('lanzamiento', lanzamiento);
            formData.append('calificacion', calificacion);
            formData.append('id_genero', id_genero);
            formData.append('id_plataforma', id_plataforma);
            formData.append('imagen', imgFile);
            opcionesFetch = {
                method: metodoHTTP,
                body: formData
            };
        } else {
            const datosJSON = {
                titulo: titulo,
                descripcion: descripcion,
                precio: parseFloat(precio),
                lanzamiento: lanzamiento,
                calificacion: parseFloat(calificacion),
                imagen: "",
                id_genero: parseInt(id_genero),
                id_plataforma: parseInt(id_plataforma)
            };
            opcionesFetch = {
                method: metodoHTTP,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosJSON)
            };
        }
        const res = await fetch(urlPeticion, opcionesFetch);
        const data = await res.json();
        if (res.ok) {
            alert(idVideojuegoEnEdicion ? '¡Videojuego actualizado con éxito (PUT)!' : '¡Videojuego creado con éxito!');
            document.getElementById('formulario').reset();
            idVideojuegoEnEdicion = null;
            btnGuardar.textContent = "Guardar Videojuego";
            btnGuardar.style.backgroundColor = "";    
            await obtenerVideojuegos(); 
        } else {
            throw new Error(data.message || `Error del servidor: ${res.status}`);
        }
    } catch (error) {
        console.error(error);
        alert('Hubo un problema: ' + error.message);
    } finally {
        btnGuardar.disabled = false;
        mostrarLoader(false);
    }
});
async function prepararParcial(id) {
    const nuevoPrecio = prompt("Edición Rápida: Introduce el NUEVO PRECIO:");
    if (nuevoPrecio === null || nuevoPrecio.trim() === "") return; // Cancelado
    const nuevaCalificacion = prompt("Edición Rápida: Introduce la NUEVA CALIFICACIÓN (0-10):");
    if (nuevaCalificacion === null || nuevaCalificacion.trim() === "") return; // Cancelado
    mostrarLoader(true);
    try {
        const datosPatch = {
            precio: parseFloat(nuevoPrecio),
            calificacion: parseFloat(nuevaCalificacion)
        };

        const res = await fetch(`${API_URL}api-videojuego.php?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosPatch)
        });
        const data = await res.json();
        if (res.ok) {
            alert('¡Actualización rápida completada (PATCH)!');
            await obtenerVideojuegos(); // Refrescar lista
        } else {
            throw new Error(data.message || `Error en PATCH: ${res.status}`);
        }
    } catch (error) {
        console.error(error);
        alert('No se pudo realizar la edición rápida: ' + error.message);
    } finally {
        mostrarLoader(false);
    }
}