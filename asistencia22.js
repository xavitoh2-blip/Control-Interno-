/* Online Shop · Asistencia 2.2: interfaz de lectura; respeta API, GPS y revisión administrativa. */
(function(){
  'use strict';
  if(typeof a215RenderAdmin!=='function'||typeof a215Tarjeta!=='function')return;
  var raiz=document.getElementById('adminAsistencia');
  if(!raiz)return;
  var lista=document.getElementById('a196AdminLista');
  var indicadores=document.getElementById('a215Indicadores');
  if(!lista||!indicadores)return;
  var modalAbierto=null;
  var cab=raiz.querySelector('.a215-cabecera h3');
  var subt=raiz.querySelector('.a215-cabecera p');
  if(cab)cab.textContent='Asistencia';
  if(subt)subt.textContent='Tu equipo, sus jornadas y las revisiones en un solo lugar.';
  var dashboard=document.createElement('div');
  dashboard.className='a222-dashboard';
  indicadores.insertAdjacentElement('afterend',dashboard);
  function esc(v){return a196Esc(v);}
  function num(v){return Number(v)||0;}
  function esPendiente(x){return !!x.salida&&(!x.revision||!x.revision.decision||x.revision.decision==='PENDIENTE');}
  function faltaSalida(x){return !!x.entrada&&!x.salida&&a215EstadoRegistro(x)==='SIN_SALIDA';}
  function iniciales(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(z=>z[0]||'').join('').toUpperCase();}
  function fechaSimple(v){
    var d=String(v||'').split('-');
    return d.length===3?d[2]+'/'+d[1]+'/'+d[0]:String(v||'');
  }
  function resumenGrafico(rows){
    var puntual=rows.filter(x=>num(x.tarde)<=0).length;
    var tarde=rows.filter(x=>num(x.tarde)>0).length;
    var pct=rows.length?Math.round(100*puntual/rows.length):0;
    var fechas=[...new Set(rows.map(x=>String(x.fecha||'')).filter(Boolean))].sort().slice(-7);
    var max=Math.max(1,...fechas.map(f=>rows.filter(x=>x.fecha===f).length));
    var barras=fechas.map(f=>{
      var dia=rows.filter(x=>x.fecha===f),llegadas=dia.length,impuntuales=dia.filter(x=>num(x.tarde)>0).length;
      return '<div class="a222-day" title="'+esc(fechaSimple(f))+': '+llegadas+' jornadas, '+impuntuales+' tardanzas">'+
      '<div class="a222-barstack"><div class="a222-bar" style="height:'+Math.max(4,Math.round(llegadas/max*85))+'px"></div>'+
      '<div class="a222-bar tarde" style="height:'+Math.max(4,Math.round(impuntuales/max*85))+'px"></div></div>'+
      '<small>'+esc(f.slice(5))+'</small></div>';
    }).join('');
    dashboard.innerHTML=
      '<section class="a222-chart"><h4>Puntualidad</h4><div class="a222-donutarea">'+
      '<div class="a222-donut" style="background:conic-gradient(#2466d7 0 '+pct+'%,#f5b567 '+pct+'% 100%)"><strong>'+pct+'%</strong></div>'+
      '<div class="a222-legend"><div><b>'+puntual+'</b> a tiempo</div><div><b>'+tarde+'</b> tardanzas</div>'+
      '<div>Según las marcas filtradas</div></div></div></section>'+
      '<section class="a222-chart"><h4>Actividad por día</h4><div class="a222-bars">'+
      (barras||'<div style="font-size:12px;color:#8997a9">Todavía no hay datos para este período.</div>')+
      '</div><div style="font-size:11px;color:#8291a5;margin-top:10px">■ Azul: jornadas &nbsp; ■ Naranja: tardanzas</div></section>';
  }
  function cerrarModal(){
    if(modalAbierto){modalAbierto.remove();modalAbierto=null;}
  }
  function abrirModal(perfil){
    cerrarModal();
    var filas=perfil.filas.slice().sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||'')));
    var pendientes=filas.filter(x=>esPendiente(x)||faltaSalida(x)).length;
    var tardanzas=filas.filter(x=>num(x.tarde)>0).length;
    var m=document.createElement('div');
    m.className='a222-backdrop';
    m.innerHTML=
      '<section class="a222-modal" role="dialog" aria-modal="true" aria-label="Detalle de '+esc(perfil.nombre)+'">'+
      '<header class="a222-modalhead"><div><strong>'+esc(perfil.nombre)+'</strong><small>'+esc([...perfil.areas].join(' · '))+
      ' · Historial de asistencia</small></div><button type="button" class="a222-close" aria-label="Cerrar detalles">×</button></header>'+
      '<div class="a222-modalbody"><div class="a222-modalstats">'+
      '<div>Jornadas<b>'+filas.length+'</b></div><div>Tardanzas<b>'+tardanzas+'</b></div><div>Por revisar<b>'+pendientes+'</b></div>'+
      '</div><div class="a222-turnos"></div></div></section>';
    var registro=m.querySelector('.a222-turnos');
    filas.forEach(x=>{
      var grupo=document.createElement('div');
      var h=document.createElement('div');
      h.className='a222-shifthead';
      h.textContent=fechaSimple(x.fecha)+' · '+(x.sucursal||'')+' · '+(x.turno||'Turno');
      grupo.appendChild(h);
      grupo.appendChild(a215Tarjeta(x));
      registro.appendChild(grupo);
    });
    raiz.appendChild(m);
    modalAbierto=m;
    var cerrar=m.querySelector('.a222-close');
    cerrar.addEventListener('click',cerrarModal);
    m.addEventListener('click',function(e){if(e.target===m)cerrarModal();});
    cerrar.focus();
  }
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&modalAbierto)cerrarModal();
  });
  var volver=raiz.querySelector('.btn-volver');
  if(volver)volver.addEventListener('click',cerrarModal);
  var observer=new MutationObserver(function(){
    if(modalAbierto&&getComputedStyle(raiz).display==='none')cerrarModal();
  });
  observer.observe(raiz,{attributes:true,attributeFilter:['style','class']});
  a215RenderAdmin=function(){
    if(typeof a217RenderAlertaSalida==='function')a217RenderAlertaSalida();
    var fecha=document.getElementById('a215Fecha')?.value||'';
    var sucursal=document.getElementById('a215Sucursal')?.value||'TODAS';
    var estado=document.getElementById('a215Estado')?.value||'TODOS';
    var q=(document.getElementById('a215Buscar')?.value||'').trim().toLocaleUpperCase('es');
    var registros=Array.isArray(a196RegistrosAdmin)?a196RegistrosAdmin:[];
    var visibles=registros.filter(x=>
      (!fecha||x.fecha===fecha)&&
      (sucursal==='TODAS'||x.sucursal===sucursal)&&
      (!q||String(x.empleado||'').toLocaleUpperCase('es').includes(q))&&
      (estado==='TODOS'||estado===a215EstadoRegistro(x)||
       (estado==='TARDE'&&num(x.tarde)>0)||
       (estado==='REVISAR'&&esPendiente(x))||
       (estado==='COMPLETO'&&!!x.salida))
    );
    var sinSalida=visibles.filter(faltaSalida).length;
    var tarde=visibles.filter(x=>num(x.tarde)>0).length;
    var cerrados=visibles.filter(x=>!!x.salida).length;
    var revisar=visibles.filter(esPendiente).length;
    indicadores.innerHTML=[
      ['Jornadas',visibles.length,''],['Con salida',cerrados,''],
      ['Sin cerrar',sinSalida,'a215-alerta'],['Tardanzas',tarde,'a215-alerta']
    ].map(x=>'<div class="a215-kpi '+x[2]+'"><strong>'+x[1]+'</strong><span>'+x[0]+'</span></div>').join('');
    var estadoTexto=document.getElementById('a196AdminEstado');
    if(estadoTexto)estadoTexto.textContent=visibles.length+' jornadas · '+revisar+' revisiones pendientes';
    resumenGrafico(visibles);
    lista.replaceChildren();
    var map=new Map();
    visibles.forEach(x=>{
      var nombre=String(x.empleado||'Sin nombre').trim();
      var key=nombre.toLocaleUpperCase('es');
      if(!map.has(key))map.set(key,{nombre:nombre,areas:new Set(),filas:[]});
      var p=map.get(key);
      p.areas.add(x.sucursal||'Sin sucursal');
      p.filas.push(x);
    });
    var perfiles=[...map.values()].sort((a,b)=>{
      var penA=a.filas.filter(x=>esPendiente(x)||faltaSalida(x)).length;
      var penB=b.filas.filter(x=>esPendiente(x)||faltaSalida(x)).length;
      return penB-penA||a.nombre.localeCompare(b.nombre,'es');
    });
    var title=document.createElement('div');
    title.className='a222-section';
    title.innerHTML='<h4>Colaboradores</h4><small>'+perfiles.length+' empleados · selecciona una tarjeta</small>';
    lista.appendChild(title);
    if(!perfiles.length){
      var vacio=document.createElement('div');
      vacio.className='a222-empty';
      vacio.textContent='Sin registros para estos filtros. Prueba otra fecha o sucursal.';
      lista.appendChild(vacio);
      return;
    }
    var grid=document.createElement('div');
    grid.className='a222-employeegrid';
    perfiles.forEach(p=>{
      var total=p.filas.length;
      var tardanzas=p.filas.filter(x=>num(x.tarde)>0).length;
      var pendientes=p.filas.filter(x=>esPendiente(x)||faltaSalida(x)).length;
      var ultimo=p.filas.slice().sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||'')))[0];
      var card=document.createElement('button');
      card.type='button';
      card.className='a222-employee';
      card.setAttribute('aria-label','Abrir ficha de '+p.nombre);
      card.innerHTML='<div class="a222-emphead"><div class="a222-avatar">'+esc(iniciales(p.nombre))+'</div>'+
        '<div class="a222-name"><strong>'+esc(p.nombre)+'</strong><small>'+esc([...p.areas].join(' · '))+'</small></div>'+
        '<span class="a222-tag '+(pendientes?'':'ok')+'">'+(pendientes?pendientes+' por revisar':'Al día')+'</span></div>'+
        '<div class="a222-minirow"><div><span>Jornadas</span><b>'+total+'</b></div>'+
        '<div><span>Tardanzas</span><b>'+tardanzas+'</b></div><div><span>Última marca</span><b style="font-size:12px">'+esc(fechaSimple(ultimo.fecha))+'</b></div></div>'+
        '<div class="a222-view"><span>Ver asistencia y revisiones</span><span aria-hidden="true">→</span></div>';
      card.addEventListener('click',function(){abrirModal(p);});
      grid.appendChild(card);
    });
    lista.appendChild(grid);
  };
  // La consulta original sigue siendo la fuente única de datos.
  if(Array.isArray(a196RegistrosAdmin)&&a196RegistrosAdmin.length)a215RenderAdmin();
})();