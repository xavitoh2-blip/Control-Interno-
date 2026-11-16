/* Online Shop · Compras Inteligentes · piloto de solo lectura.
   No escribe en inventario ni modifica el catálogo de imágenes. */
(function () {
  'use strict';
  var pendientes = [], facturas = [], trabajando = false;
  var MAX_ARCHIVOS = 12, MAX_MB = 15;

  function el(id) { return document.getElementById(id); }
  function estado(msg, error) {
    var caja = el('fgEstado');
    if (!caja) return;
    caja.textContent = msg;
    caja.style.color = error ? '#b42318' : '#35617d';
  }
  function formatUSD(n) { return n == null || n === '' ? '—' : '$' + Number(n).toFixed(2); }
  function texto(v) { return String(v == null ? '' : v); }
  function p(textoValor, clase) {
    var e = document.createElement('p');
    e.textContent = textoValor;
    if (clase) e.className = clase;
    return e;
  }
  function boton(label, onClick) {
    var b = document.createElement('button'); b.type = 'button';
    b.textContent = label; b.addEventListener('click', onClick);
    b.style.cssText = 'padding:7px 10px;width:auto;max-width:100%;font-size:12px;background:#f0f6ff;color:#12528f;border:1px solid #c9def3;border-radius:8px;';
    return b;
  }
  function inputTexto(valor, callback, tipo) {
    var i = document.createElement('input');
    i.value = valor == null ? '' : valor;
    i.type = tipo || 'text';
    if (i.type === 'number') { i.min = '0'; i.step = 'any'; }
    i.style.cssText = 'width:100%;min-width:65px;padding:6px;border:1px solid #ccd9e8;border-radius:7px;font-size:12px;';
    i.addEventListener('change', function(){callback(i.value);});
    return i;
  }
  function reducirImagen(file) {
    return new Promise(function(resolve, reject) {
      var fr = new FileReader();
      fr.onerror = function(){reject(new Error('No se pudo leer la imagen.'));};
      fr.onload = function(){
        var imagen = new Image();
        imagen.onerror = function(){reject(new Error('Formato de imagen ilegible.'));};
        imagen.onload = function(){
          var max = 2100, escala = Math.min(1, max / Math.max(imagen.width, imagen.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1,Math.round(imagen.width*escala));
          canvas.height = Math.max(1,Math.round(imagen.height*escala));
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(imagen,0,0,canvas.width,canvas.height);
          var uri = canvas.toDataURL('image/jpeg',0.83);
          var b64 = uri.split(',')[1];
          if (!b64 || b64.length > 5200000) return reject(new Error('Fotografía muy grande incluso después de reducirla.'));
          resolve({mimeType:'image/jpeg',base64:b64});
        };
        imagen.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function archivosSeleccionados(lista){
    if(trabajando) return estado('Espera a terminar las lecturas actuales.', true);
    Array.prototype.forEach.call(lista||[],function(f){
      if (pendientes.length + facturas.length >= MAX_ARCHIVOS) return;
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return estado('Solo se admiten JPG, PNG o WEBP en esta etapa.',true);
      if (f.size > MAX_MB * 1024 * 1024) return estado('La foto ' + f.name + ' supera 15 MB.',true);
      if (pendientes.some(function(x){return x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified;})) return;
      pendientes.push(f);
    });
    renderPendientes();
  }
  function renderPendientes(){
    var caja=el('fgPendientes');if(!caja)return;
    caja.textContent='';
    caja.appendChild(p('Fotografías pendientes: ' + pendientes.length + ' · Procesadas: ' + facturas.length));
    pendientes.forEach(function(f,i){
      var r=document.createElement('div');r.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #edf2f8;padding:5px 0;';
      r.appendChild(p((i+1)+'. '+f.name));
      r.appendChild(boton('Quitar',function(){pendientes.splice(i,1);renderPendientes();}));
      caja.appendChild(r);
    });
    var b=el('fgProcesarBoton');if(b)b.disabled=trabajando||!pendientes.length;
  }
  function claveAdminActual(){
    // Reutiliza el inicio de sesión del administrador; la validación REAL se realiza en Apps Script.
    if (typeof a196ClaveAdmin !== 'undefined' && a196ClaveAdmin) return a196ClaveAdmin;
    return '';
  }
  async function analizarUna(file){
    if (typeof URL_API === 'undefined' || !URL_API) throw new Error('No se encontró la URL de Apps Script de Online Shop.');
    var clave=claveAdminActual();
    if (!clave) throw new Error('Abre nuevamente el Panel Administrativo para autorizar la lectura.');
    var jpg=await reducirImagen(file);
    var params=new URLSearchParams({
      accion:'fgAnalizarFacturaGemini',
      claveAdmin:clave,
      mimeType:jpg.mimeType,
      base64:jpg.base64,
      nombreArchivo:file.name
    });
    var r=await fetch(URL_API,{method:'POST',body:params,cache:'no-store'});
    if(!r.ok) throw new Error('No se pudo conectar al servidor (HTTP '+r.status+').');
    var data;
    try { data=await r.json(); } catch(_) { throw new Error('La respuesta no fue JSON. Revisa la integración del doPost.'); }
    if(!data||data.status!=='OK'||!data.factura)throw new Error(data&&data.mensaje||'El servidor no reconoció la factura.');
    return data.factura;
  }
  async function fgProcesar(){
    if(trabajando||!pendientes.length)return;
    if(!claveAdminActual())return estado('Debes iniciar sesión en el Panel Administrativo.',true);
    trabajando=true;renderPendientes();
    var total=pendientes.length;
    for(var i=0;i<total;i++){
      var f=pendientes.shift();
      estado('Leyendo fotografía '+(i+1)+' de '+total+': '+f.name+'…');
      try {
        var dato=await analizarUna(f);
        facturas.push({archivo:f.name, dato:dato, error:''});
      } catch(e) {
        facturas.push({archivo:f.name, dato:null, error:String(e&&e.message||e)});
      }
      renderResultados();renderPendientes();
    }
    trabajando=false;renderPendientes();
    var buenas=facturas.filter(function(x){return !!x.dato;}).length;
    estado('Proceso terminado: '+buenas+' fotografías reconocidas de '+facturas.length+'. Revisa la información antes de exportar.',false);
  }
  function td(contenido){
    var cel=document.createElement('td');cel.style.cssText='padding:6px;border-bottom:1px solid #eef2f8;vertical-align:middle;min-width:80px;';
    if(contenido&&typeof contenido==='object')cel.appendChild(contenido);else cel.textContent=texto(contenido);
    return cel;
  }
  function th(textoValor){
    var c=document.createElement('th');c.textContent=textoValor;
    c.style.cssText='padding:7px;background:#eef6ff;text-align:left;font-size:11px;';
    return c;
  }
  function renderResultados(){
    var box=el('fgResultados');if(!box)return;box.textContent='';
    facturas.forEach(function(item,idx){
      var card=document.createElement('section');
      card.style.cssText='border:1px solid #dbe6f2;border-radius:12px;padding:12px;margin:12px 0;background:#fff;';
      var enc=document.createElement('div');enc.style.cssText='display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;align-items:center;';
      enc.appendChild(p('Factura '+(idx+1)+': '+item.archivo,'fgArchivo'));
      enc.appendChild(boton('Eliminar',function(){if(trabajando)return;facturas.splice(idx,1);renderResultados();renderPendientes();}));
      card.appendChild(enc);
      if(item.error){card.appendChild(p('⚠️ '+item.error));box.appendChild(card);return;}
      var f=item.dato;
      var campos=document.createElement('div');campos.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin:10px 0;';
      [['Proveedor','proveedor'],['Número','numero'],['Fecha','fecha']].forEach(function(par){
        var label=document.createElement('label');label.style.cssText='font-size:12px;font-weight:600;text-align:left;';
        label.appendChild(p(par[0]));
        label.appendChild(inputTexto(f[par[1]],function(v){f[par[1]]=v;}));
        campos.appendChild(label);
      });
      card.appendChild(campos);
      if(f.advertencias&&f.advertencias.length)card.appendChild(p('⚠️ '+f.advertencias.join(' | ')));
      var cont=document.createElement('div');cont.style.cssText='overflow-x:auto;';
      var tabla=document.createElement('table');tabla.style.cssText='border-collapse:collapse;min-width:670px;width:100%;font-size:12px;';
      var head=document.createElement('tr');
      ['Producto (costo)','Cantidad','Unidad','Precio unitario','Total línea',''].forEach(function(x){head.appendChild(th(x));});
      tabla.appendChild(head);
      (f.productos||[]).forEach(function(prod,j){
        var tr=document.createElement('tr');
        tr.appendChild(td(inputTexto(prod.descripcion,function(v){prod.descripcion=v;})));
        tr.appendChild(td(inputTexto(prod.cantidad,function(v){prod.cantidad=v===''?null:Number(v);},'number')));
        tr.appendChild(td(inputTexto(prod.unidad,function(v){prod.unidad=v;})));
        tr.appendChild(td(inputTexto(prod.precioUnitario,function(v){prod.precioUnitario=v===''?null:Number(v);},'number')));
        tr.appendChild(td(inputTexto(prod.totalLinea,function(v){prod.totalLinea=v===''?null:Number(v);},'number')));
        tr.appendChild(td(boton('Quitar',function(){f.productos.splice(j,1);renderResultados();})));
        tabla.appendChild(tr);
      });
      cont.appendChild(tabla);card.appendChild(cont);
      card.appendChild(boton('+ Agregar producto',function(){
        f.productos.push({descripcion:'',cantidad:null,unidad:'',precioUnitario:null,totalLinea:null});renderResultados();
      }));
      var finales=p('Subtotal: '+formatUSD(f.subtotal)+' · IVA: '+formatUSD(f.iva)+' · Total factura: '+formatUSD(f.total));
      finales.style.fontWeight='700';card.appendChild(finales);
      box.appendChild(card);
    });
    var exportar=el('fgExportarBoton');
    if(exportar)exportar.disabled=!facturas.some(function(x){return x.dato&&x.dato.productos&&x.dato.productos.length;});
  }
  function fgExportar(){
    var destino=el('fgDestino')?el('fgDestino').value:'';
    var filas=[['Proveedor','Número factura','Fecha','Destino','Archivo','Descripción producto','Cantidad','Unidad','Costo unitario','Total línea','Total factura']];
    facturas.forEach(function(x){
      if(!x.dato)return;
      var f=x.dato;
      (f.productos||[]).forEach(function(pr){
        filas.push([f.proveedor,f.numero,f.fecha,destino,x.archivo,pr.descripcion,pr.cantidad,pr.unidad,pr.precioUnitario,pr.totalLinea,f.total]);
      });
    });
    if(filas.length<2)return estado('No hay productos para exportar.',true);
    // Neutralizar fórmulas peligrosas al abrir CSV en Excel.
    var cel=function(v){
      var t=texto(v);
      if (/^[\s]*[=+\-@]/.test(t)) t="'"+t;
      return '"'+t.replace(/"/g,'""')+'"';
    };
    var csv='\uFEFF'+filas.map(function(f){return f.map(cel).join(',');}).join('\r\n');
    var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
    var a=document.createElement('a');a.href=url;a.download='OnlineShop_Facturas_Gemini_'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
    estado('CSV exportado. Antes de importar a Akasia, verifica presentaciones, IVA y unidades.',false);
  }
  function fgAbrir(){
    if(!el('fgPendientes'))return;
    if(!el('fgPreparado')){
      var f1=el('fgFotos'),f2=el('fgCamara');
      if(f1)f1.addEventListener('change',function(){archivosSeleccionados(this.files);this.value='';});
      if(f2)f2.addEventListener('change',function(){archivosSeleccionados(this.files);this.value='';});
      var b=el('fgProcesarBoton');if(b)b.addEventListener('click',fgProcesar);
      var ex=el('fgExportarBoton');if(ex)ex.addEventListener('click',fgExportar);
      var marca=document.createElement('i');marca.id='fgPreparado';marca.hidden=true;el('fgPendientes').appendChild(marca);
    }
    renderPendientes();renderResultados();
    estado('Etapa de prueba: las facturas no se guardan ni afectan inventario.',false);
  }
  window.fgAbrir=fgAbrir;
})();
