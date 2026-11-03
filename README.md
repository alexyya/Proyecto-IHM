# Sistema Web para la Optimización de la Gestión Comercial Interna – Plaza Vea

Proyecto académico del curso **Interacción Hombre-Máquina** (UTP). Plaza Vea se usa como **caso de estudio**; el sistema no está afiliado a la empresa y el logotipo es solo texto.

Stack: **MySQL 8 + Node.js (Express) + React (Vite)**, en JavaScript.

## Funcionalidades (≈ 80 %)

| Módulo | Qué incluye |
|---|---|
| Inicio de sesión | Diseño del prototipo (tarjeta centrada «¡Bienvenido de nuevo!» y logotipo recoloreado a la paleta del sistema). Correo y contraseña con botón de ojo para mostrar u ocultar (`aria-pressed`), «Recordarme», recuperar contraseña y errores anunciados (`role="alert"`) |
| Dashboard | Accesos rápidos, 3 indicadores (Promociones Activas indica cuántas terminan en los próximos 3 días), actividad reciente y gráfico «Ingreso de Mercadería» como en Figma: barras contiguas, el día de mayor ingreso resaltado en rojo oscuro y el valor visible en cada barra |
| Gestión de productos | Cuatro **pestañas accesibles** (`role="tablist"`, flechas ← →): **Productos** (búsqueda, filtros por categoría, marca y **estado** —Todos / Activos / Inactivos—, columna **Estado** con insignia «Activo» / «Inactivo» con ícono y texto, filas de productos inactivos atenuadas, **Importar Excel** (CSV), miniatura de 40 px de la imagen del producto —o ícono de marcador si no tiene— con la presentación o modelo en una segunda línea, indicador de stock con ícono y texto, paginación accesible de 8 productos por página, editar y eliminar con confirmación), **Marcas** (lista, agregar y eliminar con confirmación), **Modelos** (formato o envase de cada marca, p. ej. Gloria › Lata 400 g: lista filtrable, agregar y eliminar) y **Categorías y subcategorías** (tarjetas por categoría con sus subcategorías, agregar y eliminar). Cada pestaña tiene su dirección, p. ej. `/productos?tab=marcas` |
| Registrar / editar producto | Tres bloques de campos (incluye **Modelo**, opcional y filtrado por la marca elegida), validación en el cliente y en el servidor, resumen de errores con enlaces a cada campo, confirmación, plantilla CSV, **importar productos desde CSV** (ver más abajo), **imagen del producto** (JPG o PNG de hasta 2 MB, validada en el cliente y en el servidor; vista previa, nombre, tamaño, «Cambiar imagen» y «Eliminar»; se guarda en la base de datos) y **borradores automáticos** |
| Inventario | Pestañas Stock y Movimientos, y registro de ingreso de mercadería (aumenta el stock) |
| Promociones | Lista con filtros y asistente de 3 pasos con vista previa del precio («S/ 100 → S/ 80») |
| Reportes | Tres pestañas: **Reporte de productos** (productos por categoría), **Reporte de inventario** (entradas y salidas por día y lista de stock bajo) y **Reporte de promociones** (promociones por estado y lista con vigencia). Cada una tiene filtros (categoría o estado, marca y fechas), 3 indicadores, un gráfico de barras con el valor escrito en cada barra, una tabla equivalente y **Exportar CSV**. Debajo, **Últimos reportes generados** muestra el historial de exportaciones (tabla `reportes`) |
| Configuración › Preferencias de accesibilidad (**módulos nuevos**) | **Apoyo visual** (alto contraste, foco reforzado e indicadores con ícono y texto, siempre activos) y **Ayuda en formularios** (guardar borradores, ayuda en los formularios, atajos de teclado y aviso antes de cerrar la sesión). El tamaño del texto se controla con el **zoom del navegador** |

### Importar productos (botón «Importar Excel»)

1. Pulse **Descargar plantilla** (Registrar producto) y complete una fila por producto con las columnas `marca, nombre, modelo, presentacion, categoria, subcategoria, precio, contenido, unidad, stock`. El modelo es opcional.
2. En Excel use **Archivo › Guardar como › CSV UTF-8**. Se aceptan archivos separados por coma o por punto y coma, con comillas y con decimales con coma (`4,20`).
3. Pulse **Importar Excel** (en Gestión de productos o en Registrar producto) y elija el archivo. Aparece una **vista previa** con la validación de cada fila: la marca, la categoría, la subcategoría y el modelo deben existir (se comparan por nombre, sin distinguir mayúsculas ni tildes); precio, contenido y stock deben ser números.
4. Pulse **Importar N productos**: el servidor (`POST /api/productos/importar`) vuelve a validar, registra las filas válidas en una sola transacción con código y fecha automáticos, y responde cuántos productos se importaron y qué filas tuvieron errores (con el número de fila y el motivo).

Por ahora los archivos `.xlsx` / `.xls` no se leen directamente (no se usan librerías extra): el sistema muestra «Por ahora la importación acepta CSV. En Excel use Archivo › Guardar como › CSV UTF-8 y vuelva a intentarlo.»

Pendiente para la siguiente versión (≈ 20 %): leer archivos .xlsx directamente, recuperar la contraseña por correo real, roles con permisos diferenciados y registro de salidas de inventario.

## Requisitos

- **Node.js 18.11 o superior** (se recomienda la versión 20 o 22 LTS): <https://nodejs.org>
- **MySQL Server 8.x** y **MySQL Workbench** (o la consola `mysql`)
- Un navegador actual (Chrome, Edge o Firefox)

## Instalación en Windows

### 1. Crear la base de datos

**Con MySQL Workbench**

1. Abra su conexión local (normalmente `root@localhost:3306`).
2. Elija *File › Open SQL Script…*, abra `database/schema.sql` y ejecútelo con el rayo ⚡.
3. Abra `database/seed.sql` y ejecútelo de la misma forma. Las fechas de movimientos y promociones son relativas al día en que se carga (`CURDATE()`), por eso el dashboard siempre muestra los últimos 5 días con datos y una promoción activa que termina en los próximos 3 días.
4. Pulse *Refresh* en el panel *Schemas*. Debe aparecer la base de datos `plazavea_ihm` con 12 tablas (incluye `modelos`).

**Con la consola** (PowerShell o CMD, dentro de la carpeta del proyecto)

```bat
mysql -u root -p < database\schema.sql
mysql -u root -p < database\seed.sql
```

> `schema.sql` borra y vuelve a crear las tablas. Puede ejecutar los dos scripts otra vez cuando quiera volver a los datos iniciales.
> Si ya tenía una versión anterior de la base de datos, **vuelva a ejecutar ambos scripts**: esta versión agrega la tabla `modelos`, las columnas opcionales `productos.modelo_id` y `productos.imagen` (MEDIUMTEXT con la imagen como data URL) y quita la columna `escala_texto` de las preferencias.

### 2. Configurar y ejecutar el backend (API, puerto 4000)

```bat
cd backend
copy .env.example .env
notepad .env
```

En `.env` escriba la contraseña de su usuario `root` de MySQL en `DB_PASSWORD`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=su_contraseña_de_mysql
DB_NAME=plazavea_ihm
JWT_SECRET=cambie_esta_clave_secreta_ihm_2026
PORT=4000
```

Luego ejecute:

```bat
npm install
npm run dev
```

Si todo está bien, verá `API escuchando en http://localhost:4000` y `Conectado a MySQL (plazavea_ihm).`
Deje esta ventana abierta.

### 3. Ejecutar el frontend (Vite, puerto 5173)

En **otra** ventana de terminal:

```bat
cd frontend
npm install
npm run dev
```

Abra <http://localhost:5173>. Vite envía las peticiones `/api` al backend (proxy configurado en `vite.config.js`).

Para generar la versión de producción: `npm run build`, y luego `npm run preview`, que abre <http://localhost:4173>.

## Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@spsa.com.pe | Admin123 |
| Coordinador Comercial | coordinador@spsa.com.pe | Coord123 |
| Encargado de Inventario | inventario@spsa.com.pe | Inv123 |

Las contraseñas se guardan cifradas con bcrypt. Si la tabla `usuarios` está vacía (por ejemplo, si solo ejecutó `schema.sql`), el backend crea estos usuarios automáticamente al iniciar.

## Accesibilidad (WCAG 2.2 AA)

- HTML semántico: `header`, `nav` con `aria-label`, `main`, un `h1` por página, tablas con `th scope`, enlace «Saltar al contenido» y título del documento por página.
- Colores de texto estandarizados: **principal `#2B1613`** (17,1:1 sobre blanco) y **secundario `#603E39`** (9,4:1); texto de éxito `#15803D` (5,0:1); botones primarios en blanco sobre `#C40000` (6,27:1). Todos los textos superan 4,5:1. Ningún estado depende solo del color: siempre hay ícono y texto (también en los gráficos, que usan relleno sólido o rayado y leyenda escrita).
- Escala tipográfica del prototipo Figma: cuerpo, datos y tablas 0.875rem (14 px); etiquetas de formulario y encabezados de tabla 0.8125rem (13 px); textos secundarios 0.75rem (12 px); títulos de página 1.5rem (24 px); títulos de tarjeta 1.125–1.25rem y título de la barra superior 1.25rem (20 px). Los controles miden 40 px de alto (objetivos táctiles ≥ 24 × 24 px).
- Formularios: cada campo tiene `label`, ejemplo en el placeholder, asterisco y `aria-required`. Los errores usan `aria-invalid` y `aria-describedby`, y aparece un resumen con enlaces a cada campo.
- Ventanas modales: `role="dialog"` o `role="alertdialog"` y `aria-modal`. El foco entra en la ventana, queda atrapado dentro, **Esc** la cierra y el foco vuelve al botón que la abrió.
- Notificaciones en una región `aria-live="polite"`.
- **Tamaño del texto con el zoom del navegador** (<kbd>Ctrl</kbd> + <kbd>+</kbd> / <kbd>Ctrl</kbd> + <kbd>-</kbd> o <kbd>Ctrl</kbd> + rueda del mouse). El sistema ya no tiene un selector propio de tamaño: todas las medidas están en `rem`/`em` y la interfaz se reorganiza con *media queries* en `rem` (desde 64rem de ancho disponible). **Menú lateral comprimible**: completo por encima de 80rem (1280 px a 100 %), solo íconos entre 48rem y 80rem (p. ej. 1440 px con zoom de 125 %–175 % o una laptop de 1280 px con zoom de 110 %), y oculto tras el botón «Menú» con 48rem o menos. El botón **Contraer menú / Expandir menú** (`aria-expanded`, `aria-controls`) del pie del menú lo reduce a íconos manualmente y la elección se recuerda en el equipo. Con zoom de 200 % en una ventana de 1440 px el menú lateral pasa a una barra superior, las tablas principales se muestran como tarjetas y **no aparece desplazamiento horizontal** (WCAG 1.4.4 y 1.4.10; también se comprobó al 400 %).
- Pestañas (Gestión de productos y Reportes) con el patrón ARIA *tabs*: `role="tablist"`, `tab`, `tabpanel`, `aria-selected`, `aria-controls` y flechas ← → / Inicio / Fin.
- Gráficos de barras: el valor está escrito sobre cada barra, el área tiene `role="img"` con un resumen en `aria-label` y los mismos datos aparecen en una tabla.
- Atajos (si están activados): **Alt + N** nuevo producto, **Alt + B** ir al buscador, **Alt + G** guardar el formulario y **Esc** cerrar o cancelar.
- Aviso de sesión: aparece a los 13 minutos sin actividad. Para probarlo en clase, abra cualquier página con `?demoSesion=1` (por ejemplo, <http://localhost:5173/?demoSesion=1>) y el aviso aparecerá a los **20 segundos**.

## Estructura

```
Proyecto-IHM/
├── database/
│   ├── schema.sql        # tablas (utf8mb4)
│   └── seed.sql          # datos de ejemplo
├── backend/
│   ├── .env.example
│   └── src/
│       ├── index.js      # servidor Express y manejo de errores
│       ├── db.js         # pool mysql2 (consultas parametrizadas)
│       ├── utils.js
│       ├── middleware/auth.js
│       └── routes/       # auth, dashboard, catalogos (marcas, modelos, categorías),
│                         # productos, inventario, promociones, reportes,
│                         # preferencias, borradores
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx, styles.css
        ├── api/client.js
        ├── context/      # Auth, Preferencias (accesibilidad), Toasts
        ├── components/   # Layout, Modal, Icon, ui (indicadores, switch, errores,
        │                 # pestañas, gráfico de barras, KPI…)
        ├── pages/        # Login, Dashboard, Productos (con pestañas), Catalogos
        │                 # (Marcas, Modelos, Categorías), ProductoForm, Inventario,
        │                 # Promociones, PromocionWizard, Reportes, Preferencias…
        └── utils/formato.js
```

## API REST (resumen)

Todas las rutas, salvo el login, requieren la cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/auth/login | Inicia sesión y devuelve `{ token, usuario }` |
| GET | /api/auth/me | Usuario actual |
| GET | /api/dashboard | Totales, actividad reciente e ingresos de los últimos 5 días |
| GET | /api/catalogos | Categorías, subcategorías, marcas y modelos (con cantidad de productos que usan cada uno) |
| POST | /api/catalogos/marcas | Agrega una marca (`nombre`) |
| DELETE | /api/catalogos/marcas/:id | Elimina una marca sin productos ni promociones (también sus modelos); si está en uso responde 409 con la explicación |
| POST | /api/catalogos/modelos | Agrega un modelo (`marca_id`, `nombre`) |
| DELETE | /api/catalogos/modelos/:id | Elimina un modelo (los productos que lo usaban quedan sin modelo) |
| POST | /api/catalogos/categorias | Agrega una categoría (`nombre`) |
| DELETE | /api/catalogos/categorias/:id | Elimina una categoría sin subcategorías |
| POST | /api/catalogos/subcategorias | Agrega una subcategoría (`categoria_id`, `nombre`) |
| DELETE | /api/catalogos/subcategorias/:id | Elimina una subcategoría sin productos |
| POST | /api/productos/importar | `{ filas: [{ fila, marca, nombre, modelo, presentacion, categoria, subcategoria, precio, contenido, unidad, stock }] }` (nombres, no ids). Valida cada fila, inserta las válidas en una transacción y responde `{ importados, errores: [{ fila, mensaje }] }` |
| GET/POST | /api/productos | Lista (`?q=&categoria=&marca=&estado=` con estado `Activo` o `Inactivo`) y registro (`modelo_id` es opcional y debe pertenecer a la marca). Si hay errores devuelve 400 con `{ errores: { campo: mensaje } }` |
| GET/PUT/DELETE | /api/productos/:id | Consultar (incluye `imagen` como data URL), editar y eliminar. En POST/PUT el campo `imagen` acepta un data URL JPG/PNG de máx. 2 MB; en PUT `null` la elimina y omitirlo la conserva. La lista (`GET /api/productos`) no envía la imagen, solo `tiene_imagen` (0/1) |
| GET | /api/productos/:id/imagen | Bytes de la imagen del producto con su `Content-Type` (requiere sesión; el frontend la descarga con el token y la muestra como miniatura). 404 si no tiene imagen |
| GET | /api/inventario/movimientos | Movimientos |
| POST | /api/inventario/ingresos | Ingreso de mercadería (`producto_id`, `cantidad`, `motivo`) |
| GET/POST | /api/promociones | Lista (`?q=&estado=`) y creación (con el arreglo `marcas`) |
| DELETE | /api/promociones/:id | Eliminar |
| GET | /api/reportes/productos | Indicadores y productos por categoría (`?categoria=&marca=&desde=&hasta=`, fechas de registro) |
| GET | /api/reportes/inventario | Entradas y salidas por día y stock bajo (`?categoria=&marca=&desde=&hasta=`; por defecto los últimos 7 días, máximo 31) |
| GET | /api/reportes/promociones | Promociones por estado y lista con vigencia (`?estado=&marca=&desde=&hasta=`) |
| GET | /api/reportes/historial | Últimos 10 reportes exportados (tabla `reportes`) |
| POST | /api/reportes/historial | Registra un reporte exportado `{ tipo, desde, hasta, filtros, registros }` |
| GET/PUT | /api/preferencias | Preferencias de accesibilidad del usuario (`alto_contraste`, `foco_reforzado`, `guardar_borradores`, `ayuda_formularios`, `atajos_teclado`, `aviso_sesion`) |
| GET/PUT/DELETE | /api/borradores/:formulario | Borradores de formularios |

## Problemas frecuentes

| Mensaje | Solución |
|---|---|
| `No se pudo conectar a MySQL` / `ER_ACCESS_DENIED_ERROR` | Revise `DB_USER` y `DB_PASSWORD` en `backend/.env`, y que el servicio **MySQL80** esté iniciado (*Servicios* de Windows). |
| `ER_BAD_DB_ERROR` | No se ejecutó `database/schema.sql`. |
| La pantalla muestra «No se pudo conectar con el servidor» | El backend no está en ejecución en el puerto 4000. |
| Puerto ocupado | Cambie `PORT` en `.env`. Si lo cambia, actualice también el proxy en `frontend/vite.config.js`. |
| `'npm' no se reconoce…` | Instale Node.js y vuelva a abrir la terminal. |
