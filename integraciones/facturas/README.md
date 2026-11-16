# Compras Inteligentes · Facturas con Gemini (piloto)

## Estado
Implementado en **rama de prueba**, no está desplegado en Online Shop.
El frontend se integra SOLO con el Panel Administrativo y su sección nueva
**Escanear Facturas · IA**. No sustituye Gestión de Compras.

**Alcance de este piloto**
- Hasta 12 imágenes JPG/PNG/WEBP por lote, leídas secuencialmente.
- Cada imagen se interpreta de forma independiente (una foto por factura o página).
- Extracción de proveedor, fecha, número de comprobante, productos, cantidades, unidad,
  costos de compra, subtotal, IVA y total, cuando sean legibles.
- Edición manual de los resultados y exportación CSV para revisión en Excel.
- No guarda compras en Google Sheets, no registra recepciones, no escribe en Akasia,
  no altera inventarios, precios de venta, imágenes ni su hoja de origen.
- El CSV **no** es un formato de importación verificado para Akasia.
- No hay aún detección persistente de facturas duplicadas ni asociación automática al catálogo:
  ambas funciones corresponden a fases posteriores.

## Paso 1: obtener una API key de Gemini
1. Entrar a https://aistudio.google.com/api-keys
2. Crear clave para un proyecto con acceso a Gemini 3.5 Flash-Lite.
3. Abrir el proyecto **Apps Script existente** de Online Shop.
4. Configuración del proyecto > Propiedades de la secuencia de comandos:
   - GEMINI_API_KEY = [valor secreto]
   - FACTURAS_ADMIN_CLAVE = [contraseña que el administrador usa actualmente]
5. **No copiar las claves en GitHub, HTML, mensajes ni Google Sheets.**

La capa gratuita de Gemini puede utilizar los datos enviados para mejorar productos.
No probar con facturas reales sin evaluar esta condición y decidir si es aceptable.

## Paso 2: integrar Apps Script existente
Se necesita abrir el código fuente REAL de la Web App Apps Script.
Este repositorio solo contiene el frontend; NO contiene el doPost(e) actual.

1. Copiar el contenido de [FacturasGemini.gs](FacturasGemini.gs) como archivo nuevo
   en el proyecto Apps Script que sirve a la aplicación actual.
2. Añadir este despacho **dentro del doPost(e) existente** antes de manejar acciones
   generales (NO crear un segundo doPost ni reemplazar el actual):

   if (e && e.parameter && e.parameter.accion === 'fgAnalizarFacturaGemini') {
     return fgProcesarFacturaGemini_(e.parameter);
   }

3. Guardar y desplegar una nueva versión del Web App conservando
   sus autorizaciones y URL_API existentes.
4. Validar primero con fotos de facturas ficticias o anonimizadas.

**Importante:** sin la ruta anterior, la interfaz muestra errores de servidor,
porque no hay un endpoint instalado todavía. No debemos cambiar el doPost a ciegas.

## Paso 3: frontend de Online Shop
El archivo index.html cambia solamente:
- botón junto a Gestión de Compras en el menú Administrador;
- panel nuevo (fuera del inventario);
- una entrada en el mapa abrirModuloAdmin;
- llamada fgAbrir() cuando se abre el panel;
- script nuevo facturas-gemini.js.

El script aprovecha la URL_API y la sesión administrativa existente.
Apps Script además valida por separado la clave usando FACTURAS_ADMIN_CLAVE.

## Pruebas de aceptación antes de publicar
- [ ] El administrador entra y sale sin afectar los módulos existentes.
- [ ] Acepta 2-5 fotografías y procesa secuencialmente.
- [ ] Aviso claro cuando Gemini llega al límite gratuito o falta clave.
- [ ] Verificar cada cantidad, presentación, costo, subtotal, IVA y total frente a la factura.
- [ ] Corregir manualmente antes de exportar CSV.
- [ ] Comprobar que no se creó ninguna fila de inventario ni hubo modificación de imágenes.
- [ ] Repetir una factura sin efectos en inventario.
- [ ] El backend rechaza contraseña incorrecta.
- [ ] Probar en navegador móvil real; cada foto se sube comprimida.
- [ ] Revisar que las otras funciones de Online Shop siguen operativas.

## Límites de seguridad
- Solo JPG/PNG/WEBP; no se admiten aún PDF ni múltiples páginas agrupadas.
- Script limita a 60 páginas diarias, 3.9 MB aprox. de imagen comprimida por llamada
  y 12 fotografías por lote (medida local de seguridad; no es una cuota de Google).
- Las imágenes se envían a Google Gemini desde el servidor Apps Script, no desde la clave
  en navegador.
- No almacena fotografía ni productos extraídos de manera permanente, salvo el CSV que
  el administrador descargue localmente.
- El backend usa servicios de UrlFetchApp, PropertiesService, LockService y ContentService.

## Pendiente
Con el código actual del Apps Script en mano:
1. Integrar y probar la ruta real sin romper las acciones existentes.
2. Añadir historial y control de duplicados por DTE/número.
3. Cruzar productos contra el catálogo Akasia sin tocar su fuente de imágenes.
4. Diseñar recepción de mercadería y escritura autorizada después de revisión.
