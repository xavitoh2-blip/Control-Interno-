/* Online Shop · Cobros y Caja Unificados · vista administrativa
   Usa íntegramente los módulos c226 y c230; no cambia API, saldos ni operaciones.
   El pago mixto real debe implementarse en Despacho junto con Código.gs. */
(function(){
 'use strict';
 var hub,tab='ruta',preOpen=null;
 function id(x){return document.getElementById(x);}
 function fmt(n){return '$'+(Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
 function customerData(){try{return typeof c226Datos!=='undefined'?c226Datos:null;}catch(_){return null;}}
 function routeData(){try{return typeof c230Datos!=='undefined'?c230Datos:null;}catch(_){return null;}}
 function markPaid(){
   var panel=id('c226AdminPanel');
   if(!panel||!hub||hub.style.display!=='block')return;
   panel.querySelectorAll('table.c226-tabla').forEach(function(table){
     if(table.dataset.ccuMarked)return;
     var head=table.rows&&table.rows[0];
     if(!head||head.cells.length!==3)return;
     var titles=Array.from(head.cells).map(function(cell){return cell.textContent.trim().toUpperCase()});
     if(titles.join('|')!=='TICKET|ORIGINAL|DEBE')return;
     var th=document.createElement('th');th.textContent='Abonado';head.insertBefore(th,head.cells[2]);
     Array.from(table.rows).slice(1).forEach(function(row){
       if(row.cells.length!==3)return;
       var original=Number(row.cells[1].textContent.replace(/[^0-9.-]/g,'')),
           debe=Number(row.cells[2].textContent.replace(/[^0-9.-]/g,''));
       var td=row.insertCell(2),value=original-debe;
       td.textContent=Number.isFinite(value)&&value>=0?fmt(value):'—';
       td.style.cssText='font-weight:800;color:#176047;white-space:nowrap';
     });
     table.dataset.ccuMarked='1';
   });
 }
 function summary(){
   markPaid();
   if(!hub||hub.style.display!=='block')return;
   var box=id('ccuMetrics'),d=customerData(),r=routeData(),cards=[];
   if(tab==='clientes'){
     if(d){var total=(d.clientes||[]).reduce(function(v,x){return v+(Number(x.saldo)||0);},0),h=d.cobradoHoy||{};
       cards=[['Cartera pendiente',fmt(total),'Saldo actual'],['Cobrado hoy',fmt((Number(h.efectivo)||0)+(Number(h.transferencia)||0)),'Abonos confirmados'],['Efectivo hoy',fmt(h.efectivo),'Cobros en efectivo'],['Transferencias',fmt(h.transferencia),'Cobros por banco']];
     }else cards=[['Saldos','…','Consultando clientes'],['Abonos','…','Consultando movimientos']];
   }else if(tab==='ruta'){
     if(r){var totals=r.totales||{};
       cards=[['Tickets revisados',String(r.confirmados||0)+' / '+String(r.totalTickets||0),'Entregas verificadas'],['Efectivo a rendir',fmt(r.efectivoAEntregar),'Caja de ruta'],['Ventas a crédito',fmt(totals.ventasCredito),'No equivale al saldo'],['Entregas',String(r.porcentajeEntrega||0)+'%','Unidades entregadas']];
     }else cards=[['Tickets','…','Consultando Kardex'],['Caja','…','Consultando cobros']];
   }else{
     box.innerHTML='';return;
   }
   box.innerHTML=cards.map(function(x){return '<div class="ccu-metric"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>';}).join('');
 }
 function display(mode){
   tab=mode==='clientes'?'clientes':'ruta';
   var m=tab==='clientes'?'creditos':'rutacaja';
   // El sistema original conserva todas sus operaciones y validaciones.
   preOpen.call(window,m);
   id('adminCreditos').style.display=tab==='clientes'?'block':'none';
   id('adminRutaCaja230').style.display=tab==='ruta'?'block':'none';
   hub.style.display='block';
   id('ccuTabs').querySelectorAll('button[data-ccu-tab]').forEach(function(b){
     var active=b.dataset.ccuTab===tab;b.classList.toggle('active',active);
     b.setAttribute('aria-selected',active?'true':'false');
   });
   id('ccuSubTitle').textContent=tab==='ruta'?'Entregas, tickets y liquidación de efectivo':'Cuentas pendientes, abonos y movimientos';
   summary();
 }
 function init(){
   if(id('adminCobrosCajaUnified'))return;
   var admin=id('supervisorSection'),menu=id('menuAdmin'),cred=id('adminCreditos'),route=id('adminRutaCaja230');
   preOpen=window.abrirModuloAdmin;
   if(!admin||!menu||!cred||!route||typeof preOpen!=='function')return;
   var style=document.createElement('style');style.id='ccuStyles';style.textContent=[
     '#adminCobrosCajaUnified{width:min(100%,1180px);max-width:1180px;margin:18px auto;text-align:left;color:#233e5d}',
     '#adminCobrosCajaUnified *{box-sizing:border-box}',
     '#adminCobrosCajaUnified .ccu-hero{background:linear-gradient(120deg,#122f5b,#2465bf);color:white;border-radius:22px;padding:24px;display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:13px}',
     '#adminCobrosCajaUnified .ccu-hero h3{color:white!important;font-size:26px!important;margin:4px 0 7px!important;border:0!important;padding:0!important}',
     '#adminCobrosCajaUnified .ccu-hero p{color:#e6f2ff;line-height:1.5;font-size:12px;margin:0}',
     '#adminCobrosCajaUnified .ccu-hero .ccu-icon{font-size:32px}',
     '#adminCobrosCajaUnified .ccu-tabs{display:flex;flex-wrap:wrap;gap:8px;background:#eef3fa;padding:8px;border-radius:15px;margin:13px 0}',
     '#adminCobrosCajaUnified .ccu-tabs button{flex:1 1 130px;min-height:44px;width:auto!important;margin:0!important;background:transparent!important;color:#4f698b!important;border:1px solid transparent;border-radius:11px;font-size:13px}',
     '#adminCobrosCajaUnified .ccu-tabs button.active{color:#144780!important;background:#fff!important;border-color:#dce8f5!important;box-shadow:0 2px 9px #223b5712}',
     '#adminCobrosCajaUnified .ccu-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0}',
     '#adminCobrosCajaUnified .ccu-metric{padding:15px 14px;background:#fff;border:1px solid #dfe9f5;border-radius:16px}',
     '#adminCobrosCajaUnified .ccu-metric span,#adminCobrosCajaUnified .ccu-metric small{display:block;font-size:11px;color:#788ba3}',
     '#adminCobrosCajaUnified .ccu-metric strong{display:block;font-size:clamp(17px,2.3vw,25px);color:#1c4778;margin:7px 0;font-variant-numeric:tabular-nums}',
     '#adminCobrosCajaUnified .ccu-sub{font-size:12px;color:#697f9a;padding:3px 3px 9px}',
     '#adminCobrosCajaUnified #adminCreditos,#adminCobrosCajaUnified #adminRutaCaja230{margin:0!important;padding:16px;background:white;border-radius:17px;border:1px solid #e0e9f4;max-width:100%;min-width:0}',
     '#adminCobrosCajaUnified #adminCreditos > .btn-volver,#adminCobrosCajaUnified #adminRutaCaja230 > .btn-volver,#adminCobrosCajaUnified #adminCreditos > h3,#adminCobrosCajaUnified #adminRutaCaja230 > h3,#adminCobrosCajaUnified #adminCreditos > p.c226-info,#adminCobrosCajaUnified #adminRutaCaja230 > p.c230-leyenda{display:none!important}',
     '#adminCobrosCajaUnified #adminCreditos .c226-cliente{border:1px solid #e3ebf6;border-radius:14px;padding:13px;margin:10px 0;background:#fafcff}',
     '#adminCobrosCajaUnified #adminRutaCaja230 .c230-panel,#adminCobrosCajaUnified #adminCreditos .c226-panel{max-width:100%;min-width:0}',
     '#adminCobrosCajaUnified #adminCreditos input,#adminCobrosCajaUnified #adminCreditos select,#adminCobrosCajaUnified #adminRutaCaja230 input,#adminCobrosCajaUnified #adminRutaCaja230 select{max-width:100%}',
     '#adminCobrosCajaUnified [hidden]{display:none!important}',
     '@media(max-width:850px){#adminCobrosCajaUnified .ccu-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}',
     '@media(max-width:600px){#adminCobrosCajaUnified .ccu-hero{padding:18px}#adminCobrosCajaUnified #adminCreditos,#adminCobrosCajaUnified #adminRutaCaja230{padding:11px}}'
   ].join('\n');document.head.appendChild(style);
   var oldCred=menu.querySelector('button[onclick*="abrirModuloAdmin(\'creditos\')"]');
   var oldCaja=menu.querySelector('button[onclick*="abrirModuloAdmin(\'rutacaja\')"]');
   hub=document.createElement('section');hub.id='adminCobrosCajaUnified';hub.className='admin-modulo';hub.style.display='none';
   hub.innerHTML='<button type="button" class="btn-volver" id="ccuBack">← Volver al panel administrativo</button>'+
     '<header class="ccu-hero"><div><small>ONLINE SHOP · ADMINISTRACIÓN</small><h3>Clientes, Cobros y Caja</h3><p>Un solo lugar para revisar saldos, tickets, abonos y liquidaciones de ruta.</p></div><span aria-hidden="true" class="ccu-icon">💳</span></header>'+
     '<div class="ccu-tabs" id="ccuTabs" role="tablist" aria-label="Secciones de clientes y caja">'+
     '<button type="button" role="tab" data-ccu-tab="ruta">🧾 Tickets y caja</button>'+
     '<button type="button" role="tab" data-ccu-tab="clientes">💵 Clientes y cobros</button>'+
     '</div><p class="ccu-sub" id="ccuSubTitle"></p><div id="ccuMetrics" class="ccu-metrics"></div>';
   var menuEntry=document.createElement('button');menuEntry.type='button';menuEntry.className='menu-modulo';menuEntry.id='ccuAccess';menuEntry.innerHTML='<span>💳</span><b>Clientes, Cobros y Caja</b>';
   if(oldCred)oldCred.parentNode.insertBefore(menuEntry,oldCred);else menu.appendChild(menuEntry);
   admin.appendChild(hub);
   hub.appendChild(cred);hub.appendChild(route);
   if(oldCred)oldCred.style.display='none';if(oldCaja)oldCaja.style.display='none';
   var safeTab=function(type){if(!hub||!['ruta','clientes'].includes(type))return;display(type);};
   menuEntry.addEventListener('click',function(){safeTab('ruta');});
   id('ccuBack').addEventListener('click',function(){if(typeof window.volverMenuAdmin==='function')window.volverMenuAdmin();});
   id('ccuTabs').querySelectorAll('button[data-ccu-tab]').forEach(function(x){x.addEventListener('click',function(){safeTab(x.dataset.ccuTab);});});
   window.abrirModuloAdmin=function(modulo){
     if(modulo==='cobrosUnificados'||modulo==='creditos'||modulo==='rutacaja'){
       safeTab(modulo==='creditos'?'clientes':'ruta');return;
     }
     return preOpen.apply(this,arguments);
   };
   // Actualiza el resumen cuando terminan de cargar los módulos originales; sin reescribir sus renderizadores.
   if(typeof MutationObserver!=='undefined'){
     var obs=new MutationObserver(summary);
     var panel1=id('c226AdminPanel'),panel2=id('c230PanelAdmin');
     if(panel1)obs.observe(panel1,{childList:true,subtree:false});
     if(panel2)obs.observe(panel2,{childList:true,subtree:false});
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();