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
      if (f.productos && f.productos.length) {
        var pasar=boton('📥 Preparar recepción Matriz', function(){fgEnviarRecepcion(item);});
        pasar.style.cssText='width:100%;min-height:43px;margin-top:10px;background:#dff4e9;color:#135d3e;border:1px solid #b7e7d0;border-radius:10px;font-weight:800;';
        card.appendChild(pasar);
      }
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
    if(!el('fgPendientes').dataset.fgPreparado){
      var f1=el('fgFotos'),f2=el('fgCamara');
      if(f1)f1.addEventListener('change',function(){archivosSeleccionados(this.files);this.value='';});
      if(f2)f2.addEventListener('change',function(){archivosSeleccionados(this.files);this.value='';});
      var b=el('fgProcesarBoton');if(b)b.addEventListener('click',fgProcesar);
      var ex=el('fgExportarBoton');if(ex)ex.addEventListener('click',fgExportar);
      el('fgPendientes').dataset.fgPreparado = 'si';
    }
    renderPendientes();renderResultados();
    estado('Etapa de prueba: las facturas no se guardan ni afectan inventario.',false);
  }

  // De factura leída a borrador de recepción. Ninguna acción registra existencias.
  var fgRevision = null;
  var fgTransferidas = new Set();
  function fgAbrirDesdeRecepcion() {
    if (typeof abrirModuloAdmin !== 'function') return;
    abrirModuloAdmin('facturasGemini');
  }
  function fgEnviarRecepcion(item) {
    if (el('fgDestino') && el('fgDestino').value !== 'Matriz') {
      return estado('La recepción automática de facturas está disponible primero para Sucursal Matriz. Selecciona Matriz.', true);
    }
    if (typeof c49SesionAdministrador === 'undefined' || !c49SesionAdministrador) {
      return estado('Debes volver a ingresar como Administrador.', true);
    }
    if (!item || !item.dato || !Array.isArray(item.dato.productos) || !item.dato.productos.length) {
      return estado('Esta factura no contiene productos para preparar.', true);
    }
    var d = item.dato;
    var key = [d.proveedor,d.numero,d.fecha,item.archivo].map(texto).join('|');
    if (fgTransferidas.has(key)) return estado('Esta factura ya se agregó al borrador de esta sesión. Revisa la lista de recepción.', true);
    window.fgRecepcionPendiente = {key:key,archivo:item.archivo,factura:JSON.parse(JSON.stringify(d))};
    fgRevision=null;
    abrirModuloAdmin('mercaderiaNueva');
  }
  function fgEl(tag,valor,clase) {
    var e=document.createElement(tag);
    if (valor != null) e.textContent=texto(valor);
    if(clase)e.className=clase;
    return e;
  }
  function fgTipoUnidadSegura(t) {
    return /^(ud|uds|und|unidad|unidades|unid|u|pz|pza|pieza|piezas)$/i.test(texto(t).trim().replace(/[\s.]/g,''));
  }
  function fgNormalizar(t) {
    if(typeof c42Norm==='function')return c42Norm(t);
    return texto(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  }

  // Búsqueda flexible por marca, presentación y códigos disponibles, sin vinculación automática dudosa.
  function fgClaveBusqueda(v) {
    return texto(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
  }
  function fgPalabrasBusqueda(v) {
    var vacias={BOLSA:1,BOL:1,CAJA:1,CJA:1,PAQUETE:1,PAQ:1,PACK:1,CS:1,
      NI:1,XP:1,SV:1,US:1,MP:1,SAC:1,SOBRE:1,PIEZA:1,PIEZAS:1,
      UNI:1,UND:1,UNIDAD:1,UNIDADES:1,DE:1,DEL:1,CON:1,PARA:1,LA:1,EL:1};
    return fgClaveBusqueda(v).split(/\s+/).filter(function(w){
      return w.length>=3 && !vacias[w] && !/^\d{6,}$/.test(w) && !/^\d+X\d/.test(w);
    });
  }
  function fgConsultaCorta(nombre) {
    var textoBase=texto(nombre).split('|')[0];
    var tokens=fgPalabrasBusqueda(textoBase).filter(function(w){return !/^\d/.test(w);});
    return tokens.slice(0,2).join(' ') || textoBase.trim().slice(0,45);
  }
  function fgPresentaciones(v) {
    var textoBase=texto(v).toUpperCase();
    var encontradas=[],m,re=/(\d+(?:[.,]\d+)?)\s*(KG|GR|G|ML|L)\b/g;
    while((m=re.exec(textoBase))!==null) {
      var cantidad=Number(m[1].replace(',','.'));
      var unidad=m[2];
      if(unidad==='KG'){cantidad*=1000;unidad='G';}
      if(unidad==='GR')unidad='G';
      if(unidad==='L'){cantidad*=1000;unidad='ML';}
      encontradas.push(cantidad+unidad);
    }
    return encontradas;
  }
  function fgBuscarCoincidencias(consulta, nombreFactura, catalogo, maxResultados) {
    if(!Array.isArray(catalogo))return [];
    var tokens=fgPalabrasBusqueda(consulta);
    var query=fgClaveBusqueda(consulta),codigoSolo=/^\d{7,14}$/.test(query);
    if(!tokens.length&&!codigoSolo)return [];
    var sourceTokens=fgPalabrasBusqueda(nombreFactura);
    var sourceSizes=fgPresentaciones(nombreFactura);
    var candidatos=[];
    catalogo.forEach(function(c){
      if(!c || c.ambiguo || !c.nombre)return;
      var name=fgClaveBusqueda(c.nombre),nameTokens=name.split(/\s+/),points=0,coincidencias=0;
      var barcode=texto(c.cbarras||c.codigoBarras||c.codigo_barras||c.barcode||c.codigo||'').replace(/\D/g,'');
      if(codigoSolo) {
        if((barcode && barcode===query) || nameTokens.includes(query)){points+=500;coincidencias++;}
        else return;
      } else {
        tokens.forEach(function(t) {
          if(nameTokens.includes(t)){points+=40;coincidencias++;}
          else if(t.length>=3&&nameTokens.some(function(w){return w.startsWith(t)})){points+=21;coincidencias++;}
          else if(t.length>=4&&name.includes(t)){points+=9;coincidencias++;}
        });
        if(!coincidencias)return; // nunca mostrar productos de otra marca solo por 2 letras
        if(coincidencias===tokens.length)points+=25;
        if(query.length>=4 && name.includes(query))points+=30;
        if(name===fgClaveBusqueda(nombreFactura))points+=130;
        var sourceSet=new Set(sourceTokens);
        points+=Math.min(15,nameTokens.filter(function(t){return sourceSet.has(t)}).length*3);
        var sizes=fgPresentaciones(c.nombre);
        if(sourceSizes.length && sizes.length) {
          if(sizes.some(function(t){return sourceSizes.includes(t)}))points+=32;
          else points-=24;
        }
      }
      candidatos.push({producto:c,puntos:points});
    });
    candidatos.sort(function(a,b){return b.puntos-a.puntos||a.producto.nombre.localeCompare(b.producto.nombre,'es');});
    return candidatos.slice(0,maxResultados||6).map(function(x){return x.producto;});
  }

  // Estado de la fuente real de productos; no registra ni modifica ningún dato.
  function fgBotonesCatalogo(box){
    var fila=fgEl('div',null,'cm55-ai-actions');
    var retry=boton('↻ Consultar catálogo de nuevo',fgRecargarCatalogo);
    retry.style.cssText='background:#e7f0ff;color:#1b5594;font-weight:800;';
    fila.appendChild(retry);
    var excel=boton('📥 Ir al Excel base de Matriz',function(){
      if(typeof abrirModuloAdmin==='function')abrirModuloAdmin('cuadreMatriz');
      if(typeof cm54MostrarPaso==='function')cm54MostrarPaso(1);
    });
    excel.style.cssText='background:#f0f7ff;color:#22547a;font-weight:750;';
    fila.appendChild(excel);
    box.appendChild(fila);
  }
  function fgMostrarErrorCatalogoRecepcion(error){
    var box=el('fgRecepcionRevision');
    if(!box)return;
    box.hidden=false;
    box.textContent='';
    box.appendChild(fgEl('h4','⚠️ Problema al consultar el catálogo Matriz'));
    box.appendChild(pText(texto(error&&error.message||error||'No fue posible consultar la fuente de Akasia.')));
    fgBotonesCatalogo(box);
  }
  async function fgRecargarCatalogo(){
    var box=el('fgRecepcionRevision');
    if(box)box.appendChild(pText('Consultando el catálogo de Sucursal Matriz…'));
    try{
      if(typeof cm55CargarCatalogoRapido!=='function')throw Error('No está disponible la consulta del catálogo.');
      await cm55CargarCatalogoRapido();
      fgMostrarImportacionRecepcion();
    }catch(error){
      if(box){
        box.textContent='';
        box.appendChild(fgEl('h4','⚠️ No fue posible consultar Akasia Matriz'));
        box.appendChild(pText(texto(error&&error.message||error)));
        fgBotonesCatalogo(box);
      }
    }
  }
  function fgMostrarEstadoCatalogo(box){
    var catalogo=typeof cm55CatalogoRapido==='undefined'?[]:cm55CatalogoRapido;
    if(!Array.isArray(catalogo))catalogo=[];
    var total=catalogo.length;
    var desc=fgEl('div',null,'cm55-ai-catalogo-estado');
    desc.style.cssText='padding:10px 12px;border:1px solid #cfe1f5;border-radius:11px;background:#edf6ff;color:#224b77;margin:10px 0;font-size:12px;line-height:1.55;';
    var factura=window.fgRecepcionPendiente&&window.fgRecepcionPendiente.factura;
    var primeros=(factura&&Array.isArray(factura.productos)?factura.productos:[]).slice(0,8);
    var consultados=new Set(),faltantes=[];
    primeros.forEach(function(item){
      var consulta=fgConsultaCorta(item.descripcion);
      var clave=fgClaveBusqueda(consulta);
      if(!clave||consultados.has(clave))return;
      consultados.add(clave);
      if(!fgBuscarCoincidencias(consulta,item.descripcion,catalogo,1).length)faltantes.push(consulta);
    });
    var estado='Catálogo Akasia Matriz: '+total+' productos disponibles para relacionar.';
    if(faltantes.length)estado+=' No veo posibles coincidencias para: '+faltantes.slice(0,5).join(', ')+(faltantes.length>5?' y otros':'')+'.';
    if(consultados.size>0&&faltantes.length===consultados.size)estado+=' Comprueba que el Excel base de Sucursal Matriz esté importado y actualizado.';
    desc.appendChild(fgEl('div',estado));
    box.appendChild(desc);
    if(faltantes.length || total<10)fgBotonesCatalogo(box);
  }
  function fgMostrarImportacionRecepcion() {
    var p=window.fgRecepcionPendiente,box=el('fgRecepcionRevision');
    if(!p||!box)return;
    box.hidden=false;
    if(typeof cm55CatalogoRapido==='undefined' || !Array.isArray(cm55CatalogoRapido) || !cm55CatalogoRapido.length) {
      box.textContent='';
      box.appendChild(fgEl('h4','⚠️ Catálogo Akasia Matriz no disponible'));
      box.appendChild(pText('Se reconoció la factura, pero el catálogo de Matriz no entregó productos. La relación requiere que la hoja CatalogoAkasia_Matriz tenga el Excel base cargado.'));
      fgBotonesCatalogo(box);
      return;
    }
    if(!fgRevision || fgRevision.key!==p.key) {
      var lista=p.factura.productos.slice(0,150).map(function(x) {
        var nombre=texto(x.descripcion).trim();
        var exactos=cm55CatalogoRapido.filter(function(c) {
          return !c.ambiguo && fgNormalizar(c.nombre)===fgNormalizar(nombre);
        });
        var cantidad=Number(x.cantidad);
        var unidades=fgTipoUnidadSegura(x.unidad) && Number.isInteger(cantidad) && cantidad>0 && cantidad<=1000000 ? cantidad : 0;
        return {origen:x,sku:exactos.length===1?exactos[0]:null,unidades:unidades,consulta:exactos.length===1?exactos[0].nombre:fgConsultaCorta(nombre)};
      });
      fgRevision={key:p.key,lista:lista,aprobado:false,proveedor:p.factura.proveedor||''};
    }
    fgRenderRevision();
  }
  function fgRenderRevision() {
    var box=el('fgRecepcionRevision'),p=window.fgRecepcionPendiente;
    if(!box || !fgRevision || !p)return;
    box.hidden=false;box.textContent='';
    box.appendChild(fgEl('h4','✨ Revisar productos de la factura'));
    box.appendChild(pText('Factura: '+texto(p.factura.numero||p.archivo)+' · '+texto(p.factura.proveedor||'Sin proveedor identificado')));
    box.appendChild(pText('Busca por marca o nombre (por ejemplo NIDO o NESCAFÉ) y selecciona el producto correcto. Confirma las unidades por presentación.'));
    fgMostrarEstadoCatalogo(box);
    if(p.factura.productos.length>150)box.appendChild(pText('⚠️ Solo se muestran 150 líneas de esta factura. Las restantes no se traspasarán.'));
    var numeroRelacionados=0;
    fgRevision.lista.forEach(function(linea,i){
      var article=fgEl('article',null,'cm55-ai-line');
      var o=linea.origen;
      article.appendChild(fgEl('strong',(i+1)+'. '+texto(o.descripcion||'Producto sin descripción')));
      article.appendChild(fgEl('small','Factura: '+texto(o.cantidad==null?'Cantidad no legible':o.cantidad)+' '+texto(o.unidad||'sin unidad')+' · Costo facturado: '+formatUSD(o.precioUnitario)));
      var c=fgEl('div',null,'cm55-ai-cols');
      var izq=fgEl('label','Producto correspondiente en Akasia');
      var input=document.createElement('input');
      input.type='search';input.autocomplete='off';input.placeholder='Buscar en catálogo Matriz';
      input.value=linea.sku?linea.sku.nombre:linea.consulta;
      input.setAttribute('aria-label','Relacionar producto '+(i+1)+' con Akasia');
      var suggestions=fgEl('div',null,'cm55-ai-choices');
      suggestions.style.maxHeight='250px';suggestions.style.overflowY='auto';
      input.addEventListener('input',function(){
        linea.sku=null;linea.consulta=input.value;fgRevision.aprobado=false;
        var cb=el('fgConfirmarImportacion');if(cb)cb.checked=false;
        mostrarSugerencias(true);
      });
      input.addEventListener('focus',function(){if(!linea.sku)mostrarSugerencias(true);});
      function mostrarSugerencias(expandido){
        suggestions.textContent='';
        var q=input.value.trim();
        if(fgClaveBusqueda(q).length<3) {
          suggestions.appendChild(fgEl('small','Escribe al menos 3 letras, como NIDO, para evitar resultados de otras marcas.'));
          return;
        }
        var todas=fgBuscarCoincidencias(q,o.descripcion,cm55CatalogoRapido,8);
        var opciones=expandido?todas:todas.slice(0,2);
        if(!todas.length){
          suggestions.appendChild(fgEl('small','No hay coincidencias para "'+q+'". Prueba con la marca (ej. NIDO), el tamaño (ej. 325G) o comprueba que esté en el catálogo de Matriz.'));
          return;
        }
        suggestions.appendChild(fgEl('small','Opciones de Akasia (verifica tamaño y presentación):'));
        opciones.forEach(function(catalogo){
          var b=boton(catalogo.nombre+' · '+(catalogo.costo==null?'sin costo':formatUSD(catalogo.costo)),function(){
            linea.sku=catalogo;linea.consulta=catalogo.nombre;fgRevision.aprobado=false;
            fgRenderRevision();
          });
          suggestions.appendChild(b);
        });
        if(!expandido && todas.length>2) {
          var mas=boton('Ver más coincidencias ('+todas.length+')',function(){mostrarSugerencias(true);});
          mas.style.background='#f5f7fa';mas.style.fontWeight='700';
          suggestions.appendChild(mas);
        }
      }
      if(!linea.sku)mostrarSugerencias(false);
      izq.appendChild(input);izq.appendChild(suggestions);
      c.appendChild(izq);
      var der=fgEl('label','Unidades recibidas');
      var qty=document.createElement('input');
      qty.type='number';qty.min='0';qty.max='1000000';qty.step='1';qty.inputMode='numeric';
      qty.value=String(linea.unidades);
      qty.setAttribute('aria-label','Unidades de '+texto(o.descripcion));
      qty.addEventListener('input',function(){
        linea.unidades=qty.value===''?0:Number(qty.value);
        fgRevision.aprobado=false;
        var cb=el('fgConfirmarImportacion');if(cb)cb.checked=false;
      });
      der.appendChild(qty);
      c.appendChild(der);
      article.appendChild(c);
      if(linea.sku) {
        numeroRelacionados++;
        article.appendChild(fgEl('small','✓ Relacionado: '+linea.sku.nombre+' · costo Akasia '+(linea.sku.costo==null?'no disponible':formatUSD(linea.sku.costo))));
      } else {
        article.appendChild(fgEl('small','⚠️ Sin relacionar: esta línea no podrá agregarse todavía.'));
      }
      box.appendChild(article);
    });
    box.appendChild(pText('Relacionados: '+numeroRelacionados+' de '+fgRevision.lista.length+' · No se guardará nada hasta confirmar la recepción.'));
    var aceptar=document.createElement('label');
    aceptar.style.cssText='display:flex;align-items:flex-start;gap:9px;font-size:12px;margin:10px 0;';
    var cbox=document.createElement('input');cbox.type='checkbox';cbox.id='fgConfirmarImportacion';cbox.checked=fgRevision.aprobado;
    cbox.style.cssText='width:18px;min-width:18px;height:18px;margin:0;';
    cbox.addEventListener('change',function(){fgRevision.aprobado=cbox.checked;});
    aceptar.appendChild(cbox);
    aceptar.appendChild(fgEl('span','Revisé las presentaciones, cantidades y productos relacionados con Akasia.'));
    box.appendChild(aceptar);
    var actions=fgEl('div',null,'cm55-ai-actions');
    var go=boton('📥 Agregar al borrador de recepción',fgAplicarRevision);
    go.style.cssText='background:#18865c;color:#fff;font-weight:800;';
    actions.appendChild(go);
    actions.appendChild(boton('Cancelar',function(){
      window.fgRecepcionPendiente=null;fgRevision=null;box.hidden=true;box.textContent='';
    }));
    box.appendChild(actions);
  }
  function pText(t) {var v=fgEl('p',t);v.style.cssText='font-size:12px;color:#56718b;line-height:1.5;';return v;}
  function fgAplicarRevision(){
    var r=fgRevision, box=el('fgRecepcionRevision');
    if(!r || !r.aprobado)return alert('Primero marca que revisaste los productos y las cantidades.');
    if(typeof c54PeriodoActual==='undefined'||!c54PeriodoActual) return alert('Inicia un período de cuadre Matriz antes de preparar la recepción.');
    if(typeof cm55Lista==='undefined')return alert('No está disponible la lista de recepción.');
    var agregados=[],omitidos=0,nombresNuevos=new Set();
    for(var i=0;i<r.lista.length;i++){
      var x=r.lista[i],q=Number(x.unidades);
      if(!Number.isInteger(q)||q<0||q>1000000)return alert('Corrige la cantidad del producto '+(i+1)+'.');
      if(!x.sku||q===0){omitidos++;continue;}
      var nombre=x.sku.nombre;
      if(!cm55Lista.some(function(y){return fgNormalizar(y.nombre)===fgNormalizar(nombre)}))nombresNuevos.add(fgNormalizar(nombre));
      agregados.push({nombre:nombre,cantidad:q,costo:x.sku.costo==null?null:Number(x.sku.costo)||0});
    }
    if(!agregados.length)return alert('Relaciona al menos un producto y coloca unidades recibidas mayores que cero.');
    if(cm55Lista.length+nombresNuevos.size>150)return alert('La lista de recepción admite hasta 150 productos. Divide las facturas en grupos.');
    var adicionales=(window.fgRecepcionPendiente && window.fgRecepcionPendiente.factura.productos.length>150)?window.fgRecepcionPendiente.factura.productos.length-150:0;
    omitidos+=adicionales;
    if(omitidos && !confirm('Se omitirán '+omitidos+' líneas sin relacionar, con 0 unidades o fuera del límite de 150. ¿Continuar solo con los '+agregados.length+' productos preparados?'))return;
    if(!confirm('¿Agregar '+agregados.length+' líneas al BORRADOR de recepción? Aún no se guardarán en el inventario.'))return;
    var totalesPorProducto = new Map();
    agregados.forEach(function(x){
      var clave=fgNormalizar(x.nombre);
      totalesPorProducto.set(clave,(totalesPorProducto.get(clave)||0)+x.cantidad);
    });
    for(var par of totalesPorProducto){
      var ya=cm55Lista.find(function(y){return fgNormalizar(y.nombre)===par[0]});
      if((ya?ya.cantidad:0)+par[1]>1000000)return alert('La cantidad total de un producto supera el límite de 1,000,000 unidades.');
    }
    var prov=el('cm55Proveedor');
    if(prov && !prov.value.trim() && r.proveedor)prov.value=r.proveedor.slice(0,100);
    agregados.forEach(function(x){
      var ya=cm55Lista.find(function(y){return fgNormalizar(y.nombre)===fgNormalizar(x.nombre);});
      if(ya)ya.cantidad+=x.cantidad;
      else cm55Lista.push(x);
    });
    fgTransferidas.add(r.key);
    window.fgRecepcionPendiente=null;fgRevision=null;
    if(box){box.hidden=true;box.textContent='';}
    cm55Render();
    cm55Estado('✓ Productos agregados al borrador. Verifica la lista y presiona «Guardar toda la recepción» solo cuando hayas recibido la mercadería.');
  }
  window.fgMostrarErrorCatalogoRecepcion=fgMostrarErrorCatalogoRecepcion;
  window.fgAbrirDesdeRecepcion=fgAbrirDesdeRecepcion;
  window.fgMostrarImportacionRecepcion=fgMostrarImportacionRecepcion;

  window.fgAbrir=fgAbrir;
})();
