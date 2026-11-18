/* Online Shop · Control de Vendedores de Ruta v1.0 · Solo consulta
   Utiliza pv270Inicio y c230ListarRuta existentes; no guarda ni cambia datos. */
(function(){
 'use strict';
 var root=null, data=null, selectedDate='', currentSeller='TODOS', currentQuery='', requestVersion=0, routeVersion=0, routeRows=[];
 var now=new Date();
 function byId(id){return document.getElementById(id);}
 function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function num(v){var n=Number(v);return Number.isFinite(n)?n:0;}
 function cash(v){return '$'+num(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
 function dateSV(){
  try{var a=new Intl.DateTimeFormat('en-US',{timeZone:'America/El_Salvador',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),m={};a.forEach(function(x){m[x.type]=x.value;});return m.year+'-'+m.month+'-'+m.day;}catch(_){return new Date().toISOString().slice(0,10);}
 }
 function previousDay(day,n){
  var d=new Date(day+'T12:00:00Z');if(isNaN(d.getTime()))return dateSV();
  d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);
 }
 function status(msg,error){var el=byId('svrEstado');if(el){el.textContent=msg;el.style.color=error?'#b32940':'#6b7c93';}}
 function visible(){return !!root && root.style.display==='block' && byId('supervisorSection')?.style.display==='block';}
 function uniqueCount(rows){return new Set(rows.map(function(v){return String(v.uuid||v.cliente||'')+'|'+String(v.empleado||'');})).size;}
 function ventas(d){var base=(d.visitas||[]).filter(function(v){return v.estado==='VENTA_ESTIMADA';}).map(function(v){return Object.assign({origen:'VISITA'},v);});
  var adicionales=(d.ventasAdicionales||[]).map(function(v){return Object.assign({origen:'ADICIONAL'},v);});
  return base.concat(adicionales);
 }
 function selDay(n){if(!root)return;var f=byId('svrFecha'),value=previousDay(f.value||dateSV(),n);if(value>'2026-01-01'&&value<=dateSV()){f.value=value;load();}}
 function selectedSales(rows,vis){var employeeByUuid={};
  vis.forEach(function(v){var k=String(v.uuid||'');if(!employeeByUuid[k])employeeByUuid[k]=new Set();employeeByUuid[k].add(String(v.empleado||''));});
  return rows.map(function(v){
   var empleado=String(v.empleado||'');
   if(!empleado){var a=employeeByUuid[String(v.uuid||'')];if(a&&a.size===1)empleado=[...a][0];else empleado='SIN ASIGNAR';}
   return Object.assign({},v,{empleado:empleado});
  });
 }
 function displayRows(){
  if(!data)return {vis:[],sales:[]};
  var vis=(data.visitas||[]),sales=selectedSales(ventas(data),vis);
  var f=function(v){return (currentSeller==='TODOS'||String(v.empleado||'SIN ASIGNAR')===currentSeller)&&(!currentQuery||String(v.cliente||'').toLocaleUpperCase('es').includes(currentQuery)||String(v.empleado||'').toLocaleUpperCase('es').includes(currentQuery));};
  return {vis:vis.filter(f),sales:sales.filter(f)};
 }
 function paint(){
  if(!data||!root)return;
  var original=(data.visitas||[]),allSales=selectedSales(ventas(data),original);
  var sellerSelect=byId('svrVendedor'),names=[...new Set(original.concat(allSales).map(function(v){return String(v.empleado||'SIN ASIGNAR');}))].sort(function(a,b){return a.localeCompare(b,'es');});
  if(currentSeller!=='TODOS'&&!names.includes(currentSeller))currentSeller='TODOS';
  sellerSelect.innerHTML='<option value="TODOS">Todos los vendedores</option>'+names.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>';}).join('');
  sellerSelect.value=currentSeller;
  var filtered=displayRows(),vis=filtered.vis,sales=filtered.sales;
  var estimated=sales.reduce(function(n,v){return n+num(v.monto);},0),
   efectivo=sales.filter(function(v){return v.tipo==='EFECTIVO';}).reduce(function(n,v){return n+num(v.monto);},0),
   credito=sales.filter(function(v){return v.tipo==='CREDITO';}).reduce(function(n,v){return n+num(v.monto);},0);
  var cards=[
   ['Clientes visitados',String(uniqueCount(vis)),'Visitas registradas'],
   ['Ventas informativas',cash(estimated),'No son cobros confirmados'],
   ['Efectivo informado',cash(efectivo),'No equivale a caja'],
   ['Crédito informado',cash(credito),'No crea cuentas por cobrar']
  ];
  byId('svrKpi').innerHTML=cards.map(function(c){return '<div class="svr-kpi"><small>'+c[0]+'</small><strong>'+c[1]+'</strong><span>'+c[2]+'</span></div>';}).join('');
  var bySeller=new Map();
  vis.forEach(function(v){
   var n=String(v.empleado||'SIN ASIGNAR');
   if(!bySeller.has(n))bySeller.set(n,{name:n,vis:0,ventas:0,total:0});
   bySeller.get(n).vis++;
  });
  sales.forEach(function(v){
   var n=String(v.empleado||'SIN ASIGNAR');if(!bySeller.has(n))bySeller.set(n,{name:n,vis:0,ventas:0,total:0});
   bySeller.get(n).ventas++;bySeller.get(n).total+=num(v.monto);
  });
  var vendedores=[...bySeller.values()].sort(function(a,b){return b.total-a.total||a.name.localeCompare(b.name,'es');}),max=Math.max(1,...vendedores.map(function(v){return v.total;}));
  byId('svrBarras').innerHTML=vendedores.length?vendedores.map(function(v){
   var pct=Math.round(v.total/max*100);
   return '<div class="svr-barrow"><div><b>'+esc(v.name)+'</b><small>'+v.vis+' visitas · '+v.ventas+' ventas</small></div><div class="svr-bartrack"><span style="width:'+pct+'%"></span></div><strong>'+cash(v.total)+'</strong></div>';
  }).join(''):'<p class="svr-empty">No hay ventas informativas para estos filtros.</p>';
  var estados={VENTA_ESTIMADA:'Venta registrada',SIN_COMPRA:'Sin compra',CERRADO:'Cerrado',AUSENTE:'Ausente',REPROGRAMADO:'Reprogramado'};
  var saleByUuid=new Map();
  sales.forEach(function(v){var k=String(v.uuid||'');if(!saleByUuid.has(k))saleByUuid.set(k,[]);saleByUuid.get(k).push(v);});
  var html=vis.slice().sort(function(a,b){return String(a.empleado).localeCompare(String(b.empleado),'es')||String(a.hora).localeCompare(String(b.hora));}).map(function(v){
   var group=(saleByUuid.get(String(v.uuid||''))||[]).filter(function(x){return String(x.empleado)===String(v.empleado||'SIN ASIGNAR');});
   var total=group.reduce(function(n,x){return n+num(x.monto);},0);
   var klass=v.estado==='VENTA_ESTIMADA'?'venta':v.estado==='AUSENTE'||v.estado==='REPROGRAMADO'?'pendiente':'neutral';
   return '<article class="svr-client"><div class="svr-clientmain"><span class="svr-avatar" aria-hidden="true">👤</span><div class="svr-clientname"><b>'+esc(v.cliente||'Cliente')+'</b><small>'+esc(v.empleado||'Sin vendedor')+' · '+esc(v.hora||'Sin hora')+'</small></div></div>'+
   '<div class="svr-clientend"><span class="svr-label '+klass+'">'+esc(estados[v.estado]||v.estado||'Visita')+'</span><strong>'+cash(total)+'</strong></div>'+
   '<div class="svr-breakdown">'+(group.length?'Ventas registradas: '+group.length+' · '+group.map(function(x){return esc(x.tipo==='CREDITO'?'Crédito':x.tipo==='EFECTIVO'?'Efectivo':'Sin tipo')+' '+cash(x.monto);}).join(' + '):'Sin venta informativa registrada')+'</div></article>';
  }).join('');
  var extrasSinVisita=sales.filter(function(v){return !vis.some(function(x){return String(x.uuid||'')===String(v.uuid||'')&&String(x.empleado||'SIN ASIGNAR')===String(v.empleado);});});
  if(extrasSinVisita.length){
   html+='<h4 class="svr-subtitle">Ventas adicionales sin visita en este filtro</h4>'+
   extrasSinVisita.map(function(v){return '<article class="svr-client"><b>'+esc(v.cliente||v.uuid||'Cliente')+'</b><small> · '+esc(v.empleado||'Sin vendedor')+'</small><div class="svr-breakdown">'+esc(v.origen||'Adicional')+' · '+cash(v.monto)+'</div></article>';}).join('');
  }
  byId('svrVisitas').innerHTML=html||'<div class="svr-empty">No se registraron visitas para esta fecha y filtros.</div>';
  byId('svrConteo').textContent=vis.length+' visitas · '+sales.length+' registros de venta';
  var aviso=byId('svrDatosAviso');
  aviso.textContent=Object.prototype.hasOwnProperty.call(data,'ventasAdicionales')
    ?'Se incluyen las ventas adicionales que devuelve el servidor. Todo es informativo hasta confirmación en Despacho.'
    :'El servidor no devolvió el campo de ventas adicionales. El total mostrado puede ser parcial y se basa en las visitas con venta.';
  populateRoutes();
 }
 function populateRoutes(){
  var select=byId('svrRuta'),routes=Array.isArray(data?.rutas)?data.rutas:[];
  var linked=routes.filter(function(r){return String(r.fechaPreventa||'')===selectedDate;});
  var items=linked.concat(routes.filter(function(r){return !linked.some(function(x){return String(x.idRuta)===String(r.idRuta);});}));
  var current=select.value;
  select.innerHTML='<option value="">Selecciona un Kardex</option>'+items.map(function(r){
   var match=String(r.fechaPreventa||'')===selectedDate;
   return '<option value="'+esc(r.idRuta)+'">'+(match?'✓ Asociado · ':'Sin relación con este día · ')+'#'+esc(r.numero||r.numeroRuta||'?')+' · '+esc(r.fecha||'')+'</option>';
  }).join('');
  if(items.some(function(x){return String(x.idRuta)===current;}))select.value=current;
  else if(linked.length===1)select.value=linked[0].idRuta;
  var picked=routes.find(function(r){return String(r.idRuta)===select.value;});
  byId('svrVinculo').textContent=!picked?'Selecciona un Kardex para consultar los importes realmente registrados en Despacho.':
   String(picked.fechaPreventa||'')===selectedDate?
   '✓ Kardex asociado expresamente con la fecha de visita consultada.':
   '⚠️ Este Kardex NO está relacionado con la fecha elegida. Sus ventas se mostrarán aparte, sin atribuirlas automáticamente a esas visitas.';
 }
 async function consultRoute(){
  if(!visible()||!data)return;
  var sel=byId('svrRuta'),id=sel.value; if(!id){byId('svrReal').textContent='Selecciona un Kardex.';return;}
  var opts=(data.rutas||[]),picked=opts.find(function(r){return String(r.idRuta)===id;});
  var target=byId('svrReal'),version=++routeVersion; target.textContent='Consultando tickets y cobros de Despacho…';
  try{
   if(typeof window.m200CredencialesAdmin!=='function'||typeof URL_API==='undefined')throw Error('No se encontró la sesión de Administración.');
   var creds=window.m200CredencialesAdmin();
   var payload=new URLSearchParams(Object.assign({accion:'c230ListarRuta',idRuta:id},creds));
   var r=await fetch(URL_API,{method:'POST',body:payload,cache:'no-store'}),d=await r.json();
   if(!r.ok||d.status!=='OK')throw Error(d.mensaje||'No se pudo consultar Despacho.');
   if(version!==routeVersion||!visible()||byId('svrRuta').value!==id)return;
   var details=d.datos;if(!details||String(details.ruta?.idRuta||'')!==String(id))throw Error('No se recuperó el Kardex solicitado. Comprueba que tenga tickets vigentes.');
   var t=details.totales||{},sold=num(t.ventasEfectivo)+num(t.ventasCredito),linked=String(picked?.fechaPreventa||'')===selectedDate;
   routeRows=Array.isArray(details.tickets)?details.tickets:[];
   var base='<div class="svr-realcards"><div><small>Ventas registradas</small><b>'+cash(sold)+'</b></div><div><small>Efectivo por ventas</small><b>'+cash(t.ventasEfectivo)+'</b></div><div><small>Ventas a crédito</small><b>'+cash(t.ventasCredito)+'</b></div><div><small>Abonos (separados)</small><b>'+cash(num(t.abonosEfectivo)+num(t.abonosTransferencia))+'</b></div></div>';
   base+='<p class="svr-note">'+(linked?'Kardex asociado a la fecha de Preventa. ':'Kardex seleccionado manualmente: no se ha confirmado que corresponda a esa fecha. ')+'Estos importes provienen de Tickets y Caja de Ruta; no se suman a Preventa.</p>';
   base+='<div class="svr-tablewrap"><table class="svr-table"><thead><tr><th>Ticket</th><th>Cliente</th><th>Entrega</th><th>Pago</th><th>Registrado</th></tr></thead><tbody>';
   base+=routeRows.slice(0,300).map(function(x){return '<tr><td>'+esc(x.ticket)+'</td><td>'+esc(x.cliente)+'</td><td>'+esc(x.estado)+'</td><td>'+esc(x.pago)+'</td><td>'+cash(x.importeRegistrado)+'</td></tr>';}).join('');
   base+='</tbody></table></div>';
   if(routeRows.length>300)base+='<p class="svr-note">Se muestran los primeros 300 tickets de '+routeRows.length+'.</p>';
   target.innerHTML=base;
  }catch(e){if(version===routeVersion&&visible())target.textContent='No se pudieron consultar las ventas reales: '+e.message;}
 }
 function exportCsv(){
  if(!data)return;
  var f=displayRows(),rows=[['Fecha','Empleado','Cliente','Resultado','Hora','Tipo','Venta informativa','Origen']];
  f.vis.forEach(function(x){rows.push([selectedDate,x.empleado,x.cliente,x.estado,x.hora,x.tipo,x.estado==='VENTA_ESTIMADA'?num(x.monto):0,'VISITA']);});
  var extra=selectedSales(data.ventasAdicionales||[],data.visitas||[]);
  extra.filter(function(x){return(currentSeller==='TODOS'||x.empleado===currentSeller)&&(!currentQuery||String(x.cliente||'').toUpperCase().includes(currentQuery)||String(x.empleado||'').toUpperCase().includes(currentQuery));}).forEach(function(x){rows.push([selectedDate,x.empleado,x.cliente||x.uuid,'VENTA_ADICIONAL',x.hora||'',x.tipo,num(x.monto),'ADICIONAL']);});
  var cell=function(v){var t=String(v==null?'':v);if(/^\s*[=+\-@]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
  var csv='\uFEFF'+rows.map(function(r){return r.map(cell).join(',');}).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  var a=document.createElement('a');a.href=url;a.download='OnlineShop_Preventa_'+selectedDate+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);
 }
 async function load(){
  if(!visible())return;
  var f=byId('svrFecha').value||dateSV(),today=dateSV();
  if(f>'2026-01-01'&&f<=today){}else{status('Selecciona una fecha válida entre enero de 2026 y hoy.',true);return;}
  selectedDate=f;var version=++requestVersion;routeVersion++;data=null;routeRows=[];
  byId('svrKpi').innerHTML='';byId('svrBarras').innerHTML='';byId('svrVisitas').innerHTML='';byId('svrReal').textContent='Selecciona un Kardex relacionado o manual para consultar cobros y entregas.';
  status('Consultando visitas y ventas informativas del '+f+'…');
  try{
   if(typeof window.pv270API!=='function')throw Error('No se encuentra la consulta original de Preventa.');
   var d=await window.pv270API('pv270Inicio',{fecha:f},true);
   if(version!==requestVersion||!visible())return;
   if(!d||!Array.isArray(d.visitas))throw Error('El servidor no devolvió un historial de visitas.');
   data=d;paint();status('Consulta del '+f+' actualizada. Registros originales conservados.');
  }catch(e){if(version===requestVersion&&visible())status('No se pudo cargar el historial: '+e.message,true);}
 }
 function makeUI(){
  var s=document.createElement('style');s.id='svrStyle';s.textContent=
  '#adminRutaSupervision{max-width:1230px;margin:10px auto 25px;color:#1c3150;text-align:left}#adminRutaSupervision *{box-sizing:border-box}'+
  '#adminRutaSupervision .svr-head{border-radius:22px;background:linear-gradient(120deg,#122d55,#235aab);color:white;padding:23px;display:flex;align-items:center;justify-content:space-between;gap:15px}'+
  '#adminRutaSupervision .svr-head h3{color:white!important;font-size:25px!important;border:0!important;padding:0!important;margin:4px 0 7px!important}'+
  '#adminRutaSupervision .svr-head p{font-size:12px;color:#e6efff;margin:0;line-height:1.6}'+
  '#adminRutaSupervision .svr-panel{background:#fff;border:1px solid #e1e9f4;border-radius:18px;padding:17px;margin:13px 0;box-shadow:0 5px 17px #1f41610b}'+
  '#adminRutaSupervision .svr-filters{display:grid;grid-template-columns:1.15fr .85fr 1.3fr auto;align-items:end;gap:10px}'+
  '#adminRutaSupervision label{color:#405d7e;font-size:12px;font-weight:750;display:block}'+
  '#adminRutaSupervision input,#adminRutaSupervision select{background:#f8fbff;border:1px solid #d7e3f3;border-radius:11px;min-height:43px;width:100%;margin:5px 0 0;padding:9px 11px;color:#233b5d}'+
  '#adminRutaSupervision button{width:auto;min-width:0;border-radius:11px;padding:10px 13px;min-height:41px;font-size:12px;margin:0}'+
  '#adminRutaSupervision .svr-buttons{display:flex;gap:7px;flex-wrap:wrap}'+
  '#adminRutaSupervision .svr-buttons button{background:#e6efff;color:#22589e}'+
  '#adminRutaSupervision .svr-note{color:#71849b;font-size:12px;line-height:1.55;margin:10px 0}'+
  '#adminRutaSupervision .svr-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:13px 0}'+
  '#adminRutaSupervision .svr-kpi{background:#fff;border:1px solid #e1e9f4;border-radius:17px;padding:17px 15px}'+
  '#adminRutaSupervision .svr-kpi small,#adminRutaSupervision .svr-kpi span{display:block;color:#7186a0;font-size:11px}'+
  '#adminRutaSupervision .svr-kpi strong{display:block;font-size:clamp(18px,2.3vw,27px);margin:7px 0;color:#173d6b;font-weight:850}'+
  '#adminRutaSupervision h4{font-size:16px!important;color:#203d64;margin:0 0 15px!important;padding:0!important;border:0!important}'+
  '#adminRutaSupervision .svr-barrow{display:grid;grid-template-columns:170px 1fr 110px;gap:13px;align-items:center;margin:10px 0;font-size:12px}'+
  '#adminRutaSupervision .svr-barrow small{display:block;color:#8899ac;font-size:11px;margin-top:3px}'+
  '#adminRutaSupervision .svr-barrow>strong{text-align:right}'+
  '#adminRutaSupervision .svr-bartrack{background:#edf2fb;border-radius:50px;height:12px;overflow:hidden}'+
  '#adminRutaSupervision .svr-bartrack span{display:block;height:100%;background:linear-gradient(90deg,#2765cc,#55adf9);border-radius:50px}'+
  '#adminRutaSupervision .svr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}'+
  '#adminRutaSupervision .svr-client{border:1px solid #e5ebf4;border-radius:14px;background:#fbfcff;padding:13px;min-width:0}'+
  '#adminRutaSupervision .svr-clientmain{display:flex;align-items:center;gap:10px;min-width:0}'+
  '#adminRutaSupervision .svr-avatar{background:#e6effb;padding:10px;border-radius:12px}'+
  '#adminRutaSupervision .svr-clientname{min-width:0;flex:1}'+
  '#adminRutaSupervision .svr-clientname b{font-size:13px;display:block;overflow-wrap:anywhere}'+
  '#adminRutaSupervision .svr-clientname small{font-size:11px;color:#8192a8;display:block;margin-top:2px}'+
  '#adminRutaSupervision .svr-clientend{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:10px 0 5px}'+
  '#adminRutaSupervision .svr-clientend strong{font-size:15px}'+
  '#adminRutaSupervision .svr-label{background:#edf3fa;color:#526b85;padding:5px 9px;border-radius:50px;font-size:10px;font-weight:800}'+
  '#adminRutaSupervision .svr-label.venta{background:#e2f7eb;color:#16704c}'+
  '#adminRutaSupervision .svr-label.pendiente{background:#fff0df;color:#a16926}'+
  '#adminRutaSupervision .svr-breakdown{font-size:11px;color:#75869a;line-height:1.5;overflow-wrap:anywhere}'+
  '#adminRutaSupervision .svr-subtitle{grid-column:1/-1;margin:10px 0!important}'+
  '#adminRutaSupervision .svr-empty{padding:20px;color:#8192a9;font-size:12px;text-align:center;grid-column:1/-1}'+
  '#adminRutaSupervision .svr-route{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end}'+
  '#adminRutaSupervision .svr-realcards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}'+
  '#adminRutaSupervision .svr-realcards>div{background:#f2f6fc;border-radius:12px;padding:13px}'+
  '#adminRutaSupervision .svr-realcards small{font-size:10px;color:#69829e;display:block}'+
  '#adminRutaSupervision .svr-realcards b{display:block;font-size:20px;margin-top:6px}'+
  '#adminRutaSupervision .svr-tablewrap{max-height:480px;overflow:auto;border:1px solid #e5ecf5;border-radius:12px;margin-top:13px}'+
  '#adminRutaSupervision .svr-table{border-collapse:collapse;width:100%;min-width:580px;font-size:12px}'+
  '#adminRutaSupervision .svr-table th,#adminRutaSupervision .svr-table td{text-align:left;border-bottom:1px solid #e9eef5;padding:10px}'+
  '#adminRutaSupervision .svr-table th{background:#f0f5fb;position:sticky;top:0}'+
  '@media(max-width:850px){#adminRutaSupervision .svr-filters{grid-template-columns:repeat(2,minmax(0,1fr))}#adminRutaSupervision .svr-kpis,#adminRutaSupervision .svr-realcards{grid-template-columns:repeat(2,minmax(0,1fr))}}'+
  '@media(max-width:580px){#adminRutaSupervision .svr-head{padding:17px}#adminRutaSupervision .svr-grid{grid-template-columns:1fr}#adminRutaSupervision .svr-filters{grid-template-columns:1fr}#adminRutaSupervision .svr-barrow{grid-template-columns:105px 1fr 74px;gap:7px}#adminRutaSupervision .svr-kpi{padding:12px 10px}}';
  document.head.appendChild(s);
  var admin=byId('supervisorSection'),menu=byId('menuAdmin');
  if(!admin||!menu)return;
  root=document.createElement('div');root.className='admin-modulo';root.id='adminRutaSupervision';root.style.display='none';
  root.innerHTML='<button type="button" class="btn-volver" id="svrVolver">← Volver al panel</button>'+
  '<header class="svr-head"><div><small>ONLINE SHOP · ADMINISTRACIÓN</small><h3>Control de vendedores de ruta</h3><p>Revisa visitas y ventas de cualquier fecha. Preventa y Despacho permanecen separados para evitar duplicaciones.</p></div><span aria-hidden="true" style="font-size:31px">📈</span></header>'+
  '<section class="svr-panel"><div class="svr-filters"><label>Fecha de visita<input type="date" id="svrFecha" min="2026-01-01"></label><label>Vendedor<select id="svrVendedor"><option value="TODOS">Todos</option></select></label><label>Buscar cliente<input type="search" id="svrBuscar" placeholder="Nombre del cliente"></label><div class="svr-buttons"><button type="button" id="svrAyer">Ayer</button><button type="button" id="svrHoy">Hoy</button><button type="button" id="svrActualizar">↻</button></div></div><p id="svrEstado" role="status" class="svr-note"></p></section>'+
  '<div id="svrKpi" class="svr-kpis"></div>'+
  '<section class="svr-panel"><h4>Ventas informativas por vendedor</h4><div id="svrBarras"></div><p class="svr-note" id="svrDatosAviso"></p></section>'+
  '<section class="svr-panel"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><h4 style="margin:0!important">Clientes visitados</h4><div class="svr-buttons"><small id="svrConteo"></small><button id="svrExportar" type="button">Exportar CSV</button></div></div><div id="svrVisitas" class="svr-grid"></div></section>'+
  '<section class="svr-panel"><h4>Ventas reales registradas en Despacho</h4><p class="svr-note">Elige el Kardex que corresponda a esta preventa. Los cobros confirmados se presentan separados de los importes estimados.</p><div class="svr-route"><label>Kardex<select id="svrRuta"></select></label><button id="svrConsultarRuta" type="button">Consultar ventas</button></div><p class="svr-note" id="svrVinculo"></p><div id="svrReal" class="svr-note">Selecciona un Kardex para consultar ventas.</div></section>';
  admin.appendChild(root);
  var acceso=document.createElement('button');acceso.type='button';acceso.className='menu-modulo';acceso.id='svrAcceso';acceso.innerHTML='<span>📈</span><b>Control de Vendedores de Ruta</b>';
  var anchor=menu.querySelector('button[onclick*="preventa270"]');if(anchor)anchor.insertAdjacentElement('afterend',acceso);else menu.appendChild(acceso);
  var prev=window.abrirModuloAdmin;
  if(typeof prev!=='function'){acceso.disabled=true;status('No se encontró el menú de Administración.',true);return;}
  window.abrirModuloAdmin=function(modulo){
   var res=prev.apply(this,arguments);
   if(modulo==='rutaSupervision'){root.style.display='block';byId('svrFecha').max=dateSV();if(!byId('svrFecha').value)byId('svrFecha').value=previousDay(dateSV(),-1);load();}
   return res;
  };
  acceso.addEventListener('click',function(){window.abrirModuloAdmin('rutaSupervision');});
  byId('svrVolver').addEventListener('click',function(){requestVersion++;routeVersion++;if(typeof window.volverMenuAdmin==='function')window.volverMenuAdmin();});
  byId('svrFecha').addEventListener('change',load);
  byId('svrActualizar').addEventListener('click',load);
  byId('svrAyer').addEventListener('click',function(){byId('svrFecha').value=previousDay(dateSV(),-1);load();});
  byId('svrHoy').addEventListener('click',function(){byId('svrFecha').value=dateSV();load();});
  byId('svrVendedor').addEventListener('change',function(){currentSeller=this.value;paint();});
  byId('svrBuscar').addEventListener('input',function(){currentQuery=this.value.trim().toLocaleUpperCase('es');paint();});
  byId('svrRuta').addEventListener('change',function(){routeVersion++;byId('svrReal').textContent='Pulsa «Consultar ventas» para ver los tickets del Kardex.';var r=(data?.rutas||[]).find(x=>String(x.idRuta)===this.value);byId('svrVinculo').textContent=r&&r.fechaPreventa===selectedDate?'✓ Kardex relacionado con la fecha consultada.':'⚠️ Kardex sin relación verificada con esta fecha de Preventa.';});
  byId('svrConsultarRuta').addEventListener('click',consultRoute);
  byId('svrExportar').addEventListener('click',exportCsv);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',makeUI,{once:true});else makeUI();
})();