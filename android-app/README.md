# Online Shop Android · primera prueba

Proyecto Android de prueba que abre la aplicación web existente:

`https://xavitoh2-blip.github.io/Control-Interno-/`

La aplicación web, Google Apps Script, Google Sheets y el catálogo de imágenes
no se modifican. La interfaz se actualiza desde GitHub Pages sin reinstalar
el APK cuando cambie el HTML publicado.

## Funciones de esta primera prueba

- Acceso a los módulos de Online Shop desde un icono Android.
- Almacenamiento local del inicio de sesión web.
- Solicitud de permiso de ubicación al marcar asistencia, solo para el dominio
  `xavitoh2-blip.github.io`.
- Selector de archivos para importar Excel y adjuntar archivos desde la web.
- Diálogos de confirmación de la página.
- Enlaces externos (WhatsApp, Google Maps) en las apps del dispositivo.

## Aún por validar/adaptar antes de uso general

- **Notificaciones OneSignal**: el SDK Web Push no equivale al SDK Android;
  todavía no hay avisos push nativos con la app cerrada.
- **Descargas de archivos creados con `blob:`** desde el HTML (por ejemplo,
  algunas exportaciones Excel) aún no se guardan mediante Android.
- **Cámara, fotos, login, GPS y flujos de pedidos** deben probarse en teléfono
  real antes de utilizar esta beta con colaboradores.
- El acceso de colaboradores debe reforzarse en el servidor: seleccionar un
  nombre en el HTML no autentica a una persona.
- Es necesario tener Internet para las acciones que consultan Google Sheets.

## Crear un APK de prueba con GitHub Actions

1. Abre la pestaña **Actions** del repositorio en GitHub.
2. Selecciona **Online Shop Android APK** y pulsa **Run workflow** desde la
   rama que contiene `android-app`.
3. Cuando termine, abre la ejecución y descarga el artefacto
   `online-shop-android-debug`.
4. Descomprime el ZIP; contiene `app-debug.apk`.
5. Copia el APK al teléfono e instálalo. Android puede solicitar que autorices
   temporalmente la instalación desde el gestor de archivos.

Este APK es **debug**, solo para pruebas internas. No es un paquete de
producción ni está firmado con una clave de publicación persistente.

## Abrir el código con Android Studio

Abre esta carpeta (`android-app`) como proyecto Gradle. Usa JDK 17, SDK Android
36 y Gradle 8.13 con Android Gradle Plugin 8.13.2. Para compilar en Windows,
Android Studio descargará componentes del SDK/Gradle si es necesario.

En la versión de producción habrá que definir una firma privada y conservar
una copia segura del archivo de firma para futuras actualizaciones del APK.
