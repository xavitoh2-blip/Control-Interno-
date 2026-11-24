/* Online Shop · Restauración aislada Facturas IA · 2026-11-17
   Recupera navegación y carga de fotos. No modifica lógica de otras secciones. */
(function () {
  'use strict';
  function init() {
    var admin = document.getElementById('supervisorSection');
    var menu = document.getElementById('menuAdmin');
    var recepcion = document.getElementById('adminMercaderiaNueva');
    if (!admin || !menu || !recepcion) {
      console.warn('Facturas IA: faltan contenedores del panel administrativo.');
      return;
    }
    if (document.getElementById('adminFacturasGemini')) return;

    var style = document.createElement('style');
    style.id = 'fgUiEstilos';
    style.textContent = [
      '#adminFacturasGemini{max-width:1100px;margin:16px auto 25px;text-align:left;color:#223b59}',
      '#adminFacturasGemini .fg-hero{background:linear-gradient(130deg,#133d79,#226ed2);border-radius:21px;color:#fff;padding:20px 22px;margin-bottom:14px}',
      '#adminFacturasGemini .fg-hero h3{color:white;border:0;margin:0 0 8px;font-size:24px;padding:0}',
      '#adminFacturasGemini .fg-hero p{font-size:12px;line-height:1.5;color:#e3efff;margin:0}',
      '#adminFacturasGemini .fg-card{padding:18px;background:#fff;border:1px solid #dce7f4;border-radius:18px;margin:12px 0;box-shadow:0 8px 20px rgba(26,66,120,.06)}',
      '#adminFacturasGemini .fg-card h4{margin:0 0 10px;font-size:15px;color:#173c68;border:0}',
      '#adminFacturasGemini .fg-inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
      '#adminFacturasGemini label{display:block;margin:8px 0;font-size:12px;font-weight:750;color:#3c5c7e}',
      '#adminFacturasGemini input[type=file],#adminFacturasGemini select{width:100%;background:#f8fbff;border:1px solid #dce7f4;border-radius:11px;padding:12px;min-height:49px;font-size:13px}',
      '#adminFacturasGemini button{min-height:42px;margin:5px 0;border-radius:11px;font-size:13px}',
      '#adminFacturasGemini .fg-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:10px}',
      '#adminFacturasGemini .fg-actions button{flex:1 1 170px}',
      '#adminFacturasGemini .fg-tip{color:#69809d;font-size:12px;line-height:1.6;margin:9px 0}',
      '#adminFacturasGemini #fgEstado{font-size:12px;margin:10px 0;line-height:1.5}',
      '#adminFacturasGemini #fgResultados{max-width:100%;overflow-wrap:anywhere}',
      '#adminMercaderiaNueva #fgRecepcionRevision{border:1px solid #bcd7ef;border-radius:17px;padding:16px;margin:14px 0;background:#fff;overflow-wrap:anywhere}',
      '#adminMercaderiaNueva #fgRecepcionRevision[hidden]{display:none!important}',
      '#adminMercaderiaNueva #fgRecepcionRevision h4{color:#244d78;margin:0 0 8px}',
      '#adminMercaderiaNueva #fgRecepcionRevision .cm55-ai-line{display:block;border:1px solid #e1eaf5;background:#f7faff;border-radius:12px;padding:12px;margin:10px 0}',
      '#adminMercaderiaNueva #fgRecepcionRevision .cm55-ai-line>strong,#adminMercaderiaNueva #fgRecepcionRevision .cm55-ai-line>small{display:block;line-height:1.5}',
      '#adminMercaderiaNueva #fgRecepcionRevision .cm55-ai-line>small{font-size:11px;color:#627a94;margin:4px 0 8px}',
      '#adminMercaderiaNueva #fgRecepcionRevision .cm55-ai-cols{display:grid;grid-template-columns:minmax(0,2fr) minmax(100px,1fr);gap:10px}',
      '#adminMercaderiaNueva #fgRecepcionRevision .cm55-ai-choices{display:grid;gap:4px}',
      '#adminMercaderiaNueva #fgRecepcionRevision .cm55-ai-choices button{width:100%;text-align:left;background:#ebf3ff;color:#214d80;border:1px solid #d8e7f8}',
      '#adminMercaderiaNueva #fgRecepcionRevision .cm55-ai-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '#adminMercaderiaNueva #fgRecepcionRevision .cm55-ai-actions button{flex:1 1 180px}',
      '@media(max-width:680px){#adminFacturasGemini .fg-inputs{grid-template-columns:1fr}#adminFacturasGemini .fg-card{padding:13px}#adminMercaderiaNueva #fgRecepcionRevision .cm55-ai-cols{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(style);

    var acceso = document.createElement('button');
    acceso.type = 'button';
    acceso.className = 'menu-modulo';
    acceso.id = 'fgMenuAcceso';
    acceso.innerHTML = '<span aria-hidden="true">📷</span><b>Facturas con IA</b>';
    acceso.addEventListener('click', function(){window.abrirModuloAdmin('facturasGemini');});
    var ancla = menu.querySelector('button[onclick*="mercaderiaNueva"]');
    if (ancla) ancla.insertAdjacentElement('afterend', acceso);
    else menu.appendChild(acceso);

    var modulo = document.createElement('div');
    modulo.id = 'adminFacturasGemini';
    modulo.className = 'admin-modulo';
    modulo.style.display = 'none';
    modulo.innerHTML =
      '<button type="button" class="btn-volver" id="fgRegresarAdmin">← Volver al panel</button>' +
      '<div class="fg-hero"><h3>📷 Facturas con IA</h3>' +
      '<p>Fotografía o selecciona tus facturas para reconocer productos, costos y cantidades. Cada factura se revisa por separado.</p></div>' +
      '<div class="fg-card"><h4>1. Seleccionar facturas</h4>' +
      '<div class="fg-inputs"><label>Subir fotografías desde tu dispositivo' +
      '<input id="fgFotos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>' +
      '<label>Tomar fotografía con la cámara' +
      '<input id="fgCamara" type="file" accept="image/*" capture="environment"></label></div>' +
      '<label>Destino de recepción<select id="fgDestino"><option value="Matriz">Sucursal Matriz</option></select></label>' +
      '<p class="fg-tip">Puedes elegir hasta 12 fotos de 15 MB cada una. Formatos: JPG, PNG y WEBP. Primero se reconocen; nada se registra automáticamente.</p>' +
      '<div id="fgPendientes" aria-live="polite"></div>' +
      '<div class="fg-actions"><button type="button" id="fgProcesarBoton" disabled>✨ Leer fotos con IA</button>' +
      '<button type="button" id="fgExportarBoton" disabled style="background:#e8f2ff;color:#1b5792">📥 Exportar resultados CSV</button></div>' +
      '<p id="fgEstado" role="status"></p></div>' +
      '<div class="fg-card"><h4>2. Revisar facturas reconocidas</h4>' +
      '<p class="fg-tip">Verifica cada producto y corrige cualquier dato antes de preparar la recepción.</p>' +
      '<div id="fgResultados"></div></div>';
    admin.appendChild(modulo);
    modulo.querySelector('#fgRegresarAdmin').addEventListener('click', function() {
      if (typeof window.volverMenuAdmin === 'function') window.volverMenuAdmin();
    });

    var revision = document.createElement('section');
    revision.id = 'fgRecepcionRevision';
    revision.hidden = true;
    var grid = recepcion.querySelector('.cm55-grid');
    if (grid) grid.parentNode.insertBefore(revision, grid);
    else recepcion.appendChild(revision);

    var botonRecepcion = document.createElement('button');
    botonRecepcion.type='button';
    botonRecepcion.id='fgAccesoDesdeRecepcion';
    botonRecepcion.textContent='📷 Leer factura con IA';
    botonRecepcion.style.cssText='width:auto;max-width:100%;min-height:40px;padding:9px 15px;border-radius:11px;background:#e9f2ff;color:#1858a1;font-size:12px;margin:10px 0;';
    botonRecepcion.addEventListener('click', function(){window.abrirModuloAdmin('facturasGemini');});
    var hero = recepcion.querySelector('.cm55-hero');
    if (hero) hero.insertAdjacentElement('afterend',botonRecepcion);
    else recepcion.appendChild(botonRecepcion);

    var abrirOriginal = window.abrirModuloAdmin;
    if (typeof abrirOriginal !== 'function') {
      modulo.querySelector('#fgEstado').textContent='No se pudo encontrar la navegación administrativa.';
      acceso.disabled = true;
      return;
    }
    window.abrirModuloAdmin = function(moduloSolicitado) {
      if (moduloSolicitado === 'facturasGemini') {
        abrirOriginal.apply(this,arguments); // Cierra las otras pantallas sin modificarlas.
        modulo.style.display='block';
        if (typeof window.fgAbrir==='function') window.fgAbrir();
        else modulo.querySelector('#fgEstado').textContent='No se pudo cargar el lector de facturas. Actualiza la página.';
        return;
      }
      var res=abrirOriginal.apply(this, arguments);
      if (moduloSolicitado==='mercaderiaNueva' && window.fgRecepcionPendiente) {
        // v1.7.92: la revisión ya no depende de cargar el Excel parcial.
        if(typeof window.fgMostrarImportacionRecepcion==='function')
          window.fgMostrarImportacionRecepcion();
      }
      return res;
    };
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();