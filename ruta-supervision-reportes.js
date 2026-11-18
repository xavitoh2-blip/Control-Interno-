/* Online Shop · Reportes de ventas de ruta v1.1.
   Lectura exclusivamente de pv270Inicio (Preventa); NO modifica datos, caja, pedidos ni inventario. */
(function(){
  'use strict';
  var root=null, panel=null, cache=new Map(), registros=null, periodo=null;
  var token=0, opened=false, graphOpen=false, MAX_DAYS=62;
  function e(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[x];});}
  function money(cents){return '$'+(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function cents(v){var n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n*100):0;}
  function localToday(){try{
    var p=new Intl.DateTimeFormat('en-US',{timeZone:'America/El_Salvador',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),a={};
    p.forEach(function(x){a[x.type]=x.value;});return a.year+'-'+a.month+'-'+a.day;
  }catch(_){return new Date().toISOString().slice(0,10);}}
  function dateParts(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return null;var d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?d:null;}
  function changeDays(s,n){var d=dateParts(s);if(!d)return s;d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
  function rangeDays(a,b){var out=[];for(var d=a;d<=b;d=changeDays(d,1)){out.push(d);if(out.length>MAX_DAYS+1)break;}return out;}
  function amtRow(v){return {empleado:String(v.empleado||'SIN ASIGNAR').trim()||'SIN ASIGNAR',cantidad:cents(v.monto),tipo:String(v.tipo||'').toUpperCase(),uuid:String(v.uuid||'').trim()};}
  function safeStatus(t,error){var x=e('svrgEstado');if(x){x.textContent=t;x.style.color=error?'#a83b47':'#6d8199';}}
  function visible(){return !!root&&root.style.display==='block'&&e('supervisorSection')?.style.display==='block';}
  function preset(v){
    var from=e('svrgDesde'),to=e('svrgHasta'),today=localToday();
    from.min=today.slice(0,4)+'-01-01';to.min=from.min;from.max=today;to.max=today;
    if(v!=='custom'){
      var count=Number(v)||7;to.value=today;from.value=changeDays(today,1-count);
      if(from.value<from.min)from.value=from.min;
    }
    var custom=v==='custom';
    from.readOnly=!custom;to.readOnly=!custom;
    from.style.opacity=custom?'1':'.75';to.style.opacity=custom?'1':'.75';
  }
  function validate(){
    var a=e('svrgDesde').value,b=e('svrgHasta').value;
    if(!dateParts(a)||!dateParts(b)||a>b)return 'Selecciona un rango válido, desde una fecha anterior hasta una posterior.';
    var earliest=localToday().slice(0,4)+'-01-01',today=localToday();
    if(a<earliest||b>today)return 'Consulta fechas del año en curso hasta hoy.';
    var all=rangeDays(a,b);
    if(all.length>MAX_DAYS)return 'El período máximo por consulta es de '+MAX_DAYS+' días para no sobrecargar la aplicación. Divide el período en dos.';
    return null;
  }
  function buildDay(fecha,d){
    var vis=Array.isArray(d.visitas)?d.visitas:[],extras=Array.isArray(d.ventasAdicionales)?d.ventasAdicionales:[],
      empleados=new Map(),visitas=[],ventas=[],seen=new Set();
    vis.forEach(function(x){
      var empleado=String(x.empleado||'SIN ASIGNAR').trim()||'SIN ASIGNAR',id=String(x.uuid||'').trim(),key=id+'|'+empleado;
      if(!empleados.has(id))empleados.set(id,new Set());
      empleados.get(id).add(empleado);
      if(!seen.has(key)){seen.add(key);visitas.push({empleado:empleado,uuid:id});}
      if(String(x.estado||'')==='VENTA_ESTIMADA')ventas.push(amtRow(x));
    });
    var seenExtra=new Set();
    extras.forEach(function(x,i){
      var uuid=String(x.uuid||'').trim(),key=String(x.operacion||'');
      if(key){if(seenExtra.has(key))return;seenExtra.add(key);}
      var row=amtRow(x);
      if(row.empleado==='SIN ASIGNAR'){
        var matches=empleados.get(uuid);
        if(matches&&matches.size===1)row.empleado=[...matches][0];
      }
      ventas.push(row);
    });
    return {fecha:fecha,visitas:visitas,ventas:ventas,extrasDisponibles:Array.isArray(d.ventasAdicionales)};
  }
  function allSellers(){
    var set=new Set();
    (registros||[]).forEach(function(day){day.visitas.forEach(function(x){set.add(x.empleado);});day.ventas.forEach(function(x){set.add(x.empleado);});});
    return [...set].sort(function(a,b){return a.localeCompare(b,'es');});
  }
  function metric(day,seller){
    var vis=day.visitas.filter(function(x){return seller==='TODOS'||x.empleado===seller;}),
      sales=day.ventas.filter(function(x){return seller==='TODOS'||x.empleado===seller;});
    var cash=0,credit=0,others=0;
    sales.forEach(function(x){if(x.tipo==='EFECTIVO')cash+=x.cantidad;else if(x.tipo==='CREDITO')credit+=x.cantidad;else others+=x.cantidad;});
    return {fecha:day.fecha,visitas:vis.length,ventas:sales.length,efectivo:cash,credito:credit,otros:others,total:cash+credit+others};
  }
  function summary(rows){
    return rows.reduce(function(m,r){m.visitas+=r.visitas;m.ventas+=r.ventas;m.efectivo+=r.efectivo;m.credito+=r.credito;m.otros+=r.otros;m.total+=r.total;return m;},
      {visitas:0,ventas:0,efectivo:0,credito:0,otros:0,total:0});
  }
  function table(rows){
    var body=rows.map(function(d){
      return '<tr><td>'+esc(d.fecha.slice(8)+'/'+d.fecha.slice(5,7))+'</td><td>'+d.visitas+'</td><td>'+d.ventas+'</td><td>'+money(d.efectivo)+'</td><td>'+money(d.credito)+'</td><td><b>'+money(d.total)+'</b></td></tr>';
    }).join('');
    return '<div class="svrg-tablewrap"><table class="svrg-table"><thead><tr><th>Fecha</th><th>Visitas</th><th>Ventas</th><th>Efectivo informado</th><th>Crédito informado</th><th>Total informado</th></tr></thead><tbody>'+body+'</tbody></table></div>';
  }
  function graphs(rows,seller){
    var max=Math.max(1,...rows.map(function(x){return x.total;}));
    var height=140,minWidth=Math.max(520,rows.length*30);
    var bars=rows.map(function(r){
      var h=r.total?Math.max(5,Math.round(r.total/max*height)):3;
      return '<div class="svrg-day" title="'+esc(r.fecha)+': '+money(r.total)+'" aria-label="'+esc(r.fecha)+' '+money(r.total)+'">'+
        '<div class="svrg-barbg"><span style="height:'+h+'px"></span></div><small>'+esc(r.fecha.slice(5))+'</small></div>';
    }).join('');
    var report=[];
    (registros||[]).forEach(function(x){x.visitas.forEach(function(v){
      if(!report.some(function(r){return r.name===v.empleado;}))report.push({name:v.empleado,total:0});
    });x.ventas.forEach(function(v){var item=report.find(function(r){return r.name===v.empleado;});if(!item){item={name:v.empleado,total:0};report.push(item);}item.total+=v.cantidad;});});
    report.sort(function(a,b){return b.total-a.total;});
    if(seller!=='TODOS')report=report.filter(function(r){return r.name===seller;});
    var top=Math.max(1,...report.map(function(r){return r.total;}));
    var vendors=report.map(function(x){
      return '<div class="svrg-sellerline"><div class="svrg-sellern">'+esc(x.name)+'</div><div class="svrg-track"><span style="width:'+Math.min(100,Math.round(x.total/top*100))+'%"></span></div><b>'+money(x.total)+'</b></div>';
    }).join('')||'<p class="svrg-small">Sin ventas para graficar.</p>';
    return '<div class="svrg-chartbox"><h4>Ventas por día</h4><p class="svrg-small">Cada barra representa la venta informativa de una fecha.</p>'+
      '<div class="svrg-scroll"><div class="svrg-chart" style="min-width:'+minWidth+'px">'+bars+'</div></div></div>'+
      '<div class="svrg-chartbox"><h4>Ventas por vendedor</h4><div class="svrg-sellers">'+vendors+'</div></div>';
  }
  function render(){
    if(!registros)return;
    var select=e('svrgVendedor'),options=allSellers(),current=select.value||'TODOS';
    if(current!=='TODOS'&&!options.includes(current))current='TODOS';
    select.innerHTML='<option value="TODOS">Todos los vendedores</option>'+options.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join('');
    select.value=current;
    var rows=registros.map(function(day){return metric(day,current);}),m=summary(rows);
    e('svrgKpi').innerHTML=[
      ['Total ventas informativas',money(m.total),'Preventa'],
      ['Clientes visitados',String(m.visitas),'Suma de visitas por día'],
      ['Efectivo informado',money(m.efectivo),'No es caja cobrada'],
      ['Crédito informado',money(m.credito),'No es saldo confirmado']
    ].map(function(x){return '<div class="svrg-stat"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><span>'+x[2]+'</span></div>';}).join('');
    e('svrgTabla').innerHTML=table(rows);
    e('svrgGraficas').innerHTML=graphs(rows,current);
    e('svrgGraficas').hidden=!graphOpen;
    e('svrgGraficaBtn').textContent=graphOpen?'Ocultar gráficas':'📊 Ver gráficas';
    e('svrgGraficaBtn').setAttribute('aria-expanded',String(graphOpen));
    e('svrgExportar').disabled=false;
    var missing=registros.filter(function(d){return !d.extrasDisponibles;}).length;
    e('svrgNota').textContent=missing?
      '⚠️ En '+missing+' día(s) el servidor no devolvió ventas adicionales; los totales pueden estar incompletos. Los importes son informativos de Preventa, no cobros confirmados.':
      'Los importes son informativos de Preventa. No se suman con la caja ni las ventas reales de Despacho.';
    safeStatus('Período consultado: '+periodo.desde+' al '+periodo.hasta+' · '+registros.length+' días cargados.');
  }
  async function load(force){
    if(!visible())return;
    var err=validate();if(err)return safeStatus(err,true);
    var desde=e('svrgDesde').value,hasta=e('svrgHasta').value,fechas=rangeDays(desde,hasta),v=++token;
    periodo={desde:desde,hasta:hasta};registros=null;
    e('svrgKpi').innerHTML='';e('svrgTabla').innerHTML='';e('svrgGraficas').innerHTML='';
    e('svrgExportar').disabled=true;e('svrgConsultar').disabled=true;
    safeStatus('Preparando consulta de '+fechas.length+' días…');
    var idx=0,done=0,failed=null,result=new Array(fechas.length);
    async function worker(){
      while(idx<fechas.length && !failed && token===v && visible()){
        var i=idx++,day=fechas[i];
        try{
          var stored=cache.get(day);
          var fresh=stored && Date.now()-stored.ts < (day===localToday()?60000:300000);
          var d=(!force&&fresh)?stored.data:await window.pv270API('pv270Inicio',{fecha:day},true);
          if(!d||!Array.isArray(d.visitas)||String(d.fecha||'')!==day)throw Error('No se recibió el historial correcto.');
          cache.set(day,{data:d,ts:Date.now()});
          result[i]=buildDay(day,d);done++;
          if(token===v) safeStatus('Consultando: '+done+' de '+fechas.length+' días…');
        }catch(ex){
          failed={fecha:day,mensaje:String(ex&&ex.message||ex)};
          return;
        }
      }
    }
    try{
      if(typeof window.pv270API!=='function')throw Error('No se encontró la consulta original de Preventa.');
      await Promise.all([worker(),worker()]);
      if(token!==v)return;
      if(failed){
        return safeStatus('No fue posible completar el rango. Falló '+failed.fecha+': '+failed.mensaje+'. Vuelve a consultar; no se mostrarán totales parciales.',true);
      }
      if(result.some(function(x){return !x;})){
        return safeStatus('La consulta quedó incompleta. Vuelve a intentarlo; no se mostrarán totales parciales.',true);
      }
      registros=result;render();
    }catch(ex){if(v===token)safeStatus('Error: '+String(ex&&ex.message||ex),true);}
    finally{if(v===token)e('svrgConsultar').disabled=false;}
  }
  function toggleReport(){
    opened=!opened;panel.hidden=!opened;
    e('svrgAbrir').textContent=opened?'Cerrar reportes':'📅 Reportes y gráficas';
    e('svrgAbrir').setAttribute('aria-expanded',String(opened));
    if(!opened)token++;
    if(opened&&!registros)safeStatus('Elige un período y pulsa Consultar. La primera consulta puede tomar más tiempo porque Preventa guarda el historial por día.');
  }
  function download(){
    if(!registros)return;
    var seller=e('svrgVendedor').value||'TODOS',rows=registros.map(function(x){return metric(x,seller);});
    var columns=[['Fecha','Vendedor','Visitas','Ventas','Efectivo informado','Crédito informado','Otros','Total informado']];
    rows.forEach(function(x){columns.push([x.fecha,seller,x.visitas,x.ventas,(x.efectivo/100).toFixed(2),(x.credito/100).toFixed(2),(x.otros/100).toFixed(2),(x.total/100).toFixed(2)]);});
    var quote=function(v){var t=String(v==null?'':v);if(/^\s*[=+\-@]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
    var csv='\uFEFF'+columns.map(function(r){return r.map(quote).join(',');}).join('\r\n');
    var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    var a=document.createElement('a');a.href=url;a.download='OnlineShop_Ventas_Preventa_'+periodo.desde+'_a_'+periodo.hasta+'.csv';
    document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1200);
  }
  function setup(){
    root=e('adminRutaSupervision');
    if(!root||e('svrgReportes'))return;
    var head=root.querySelector('.svr-head'),anchor=e('svrKpi');
    if(!head||!anchor)return;
    var css=document.createElement('style');css.id='svrgStyles';css.textContent=
      '#adminRutaSupervision .svrg-btn{background:#e7f0ff!important;color:#2256a0!important;border-radius:11px!important;padding:10px 14px!important;min-height:41px!important;width:auto!important;font-size:12px!important;margin:0!important}'+
      '#adminRutaSupervision .svrg-headbtn{background:#ffffff21!important;color:#fff!important;border:1px solid #ffffff62!important;white-space:nowrap}'+
      '#adminRutaSupervision .svrg-card{background:#f7f9fd;border:1px solid #dce7f5;border-radius:21px;padding:17px;margin:13px 0}'+
      '#adminRutaSupervision .svrg-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:13px}'+
      '#adminRutaSupervision .svrg-row h4{margin:0!important;font-size:17px!important}'+
      '#adminRutaSupervision .svrg-control{display:grid;grid-template-columns:1fr 1fr 1fr auto;align-items:end;gap:9px;margin-bottom:15px}'+
      '#adminRutaSupervision .svrg-control label{font-size:11px;color:#6a7f99;font-weight:750}'+
      '#adminRutaSupervision .svrg-control input,#adminRutaSupervision .svrg-control select{height:43px!important;margin-top:5px!important;padding:9px 11px!important;border-radius:10px!important;width:100%!important;min-width:0!important;background:#fff!important;color:#28405d!important;border:1px solid #d6e3f3!important}'+
      '#adminRutaSupervision .svrg-primary{background:#1d5cc2!important;color:#fff!important;border-radius:10px!important;min-height:43px!important;padding:10px 15px!important;width:auto!important;margin:0!important}'+
      '#adminRutaSupervision .svrg-small{font-size:11px;color:#73869e;line-height:1.55}'+
      '#adminRutaSupervision .svrg-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:12px 0}'+
      '#adminRutaSupervision .svrg-stat{background:#fff;border:1px solid #e2eaf5;border-radius:14px;padding:14px 12px;min-width:0}'+
      '#adminRutaSupervision .svrg-stat small,#adminRutaSupervision .svrg-stat span{font-size:10px;color:#7d8da2;display:block}'+
      '#adminRutaSupervision .svrg-stat strong{font-size:clamp(17px,2vw,24px);display:block;color:#203d66;margin:5px 0;overflow-wrap:anywhere}'+
      '#adminRutaSupervision .svrg-actions{display:flex;align-items:center;gap:9px;justify-content:space-between;flex-wrap:wrap;margin:15px 0}'+
      '#adminRutaSupervision .svrg-actions label{font-size:11px;color:#667d99}'+
      '#adminRutaSupervision .svrg-actions select{width:auto;min-width:170px;margin:5px 0 0;padding:8px 11px;border-radius:10px;background:#fff}'+
      '#adminRutaSupervision .svrg-chartarea{display:grid;grid-template-columns:1.1fr 1fr;gap:12px;margin:13px 0}'+
      '#adminRutaSupervision .svrg-chartbox{background:#fff;border:1px solid #e1eaf5;padding:15px;border-radius:15px;min-width:0}'+
      '#adminRutaSupervision .svrg-chartbox h4{margin:0 0 6px!important;font-size:14px!important}'+
      '#adminRutaSupervision .svrg-scroll{overflow-x:auto;max-width:100%;padding-bottom:5px}'+
      '#adminRutaSupervision .svrg-chart{display:flex;gap:6px;align-items:end;min-height:178px;padding:9px 5px 0}'+
      '#adminRutaSupervision .svrg-day{flex:1;min-width:15px;text-align:center;font-size:10px;color:#7d90a8}'+
      '#adminRutaSupervision .svrg-barbg{height:144px;display:flex;align-items:end;justify-content:center}'+
      '#adminRutaSupervision .svrg-barbg span{width:80%;max-width:24px;display:block;background:linear-gradient(180deg,#55aaf5,#2664cf);border-radius:6px 6px 2px 2px}'+
      '#adminRutaSupervision .svrg-day small{display:block;font-size:9px;margin-top:7px;color:#8193aa}'+
      '#adminRutaSupervision .svrg-sellers{display:grid;gap:11px;margin-top:13px}'+
      '#adminRutaSupervision .svrg-sellerline{display:grid;grid-template-columns:95px 1fr 80px;gap:8px;align-items:center;font-size:11px}'+
      '#adminRutaSupervision .svrg-sellern{overflow-wrap:anywhere;font-size:11px;font-weight:700}'+
      '#adminRutaSupervision .svrg-track{height:11px;background:#eef3fa;border-radius:20px;overflow:hidden}'+
      '#adminRutaSupervision .svrg-track span{background:#2197ae;display:block;height:100%;border-radius:20px}'+
      '#adminRutaSupervision .svrg-sellerline>b{text-align:right;font-size:11px}'+
      '#adminRutaSupervision .svrg-tablewrap{border-radius:12px;overflow-x:auto;background:#fff;border:1px solid #e1eaf5;max-height:500px;overflow-y:auto}'+
      '#adminRutaSupervision .svrg-table{border-collapse:collapse;width:100%;min-width:650px;font-size:11px}'+
      '#adminRutaSupervision .svrg-table th,#adminRutaSupervision .svrg-table td{padding:9px 11px;border-bottom:1px solid #edf2f8;text-align:left;white-space:nowrap}'+
      '#adminRutaSupervision .svrg-table th{position:sticky;top:0;background:#edf4fd;color:#48617f}'+
      '#adminRutaSupervision [hidden]{display:none!important}'+
      '@media(max-width:900px){#adminRutaSupervision .svrg-control{grid-template-columns:repeat(2,minmax(0,1fr))}#adminRutaSupervision .svrg-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}#adminRutaSupervision .svrg-chartarea{grid-template-columns:1fr}}'+
      '@media(max-width:600px){#adminRutaSupervision .svrg-control{grid-template-columns:1fr 1fr}#adminRutaSupervision .svrg-control label:first-child{grid-column:1/-1}#adminRutaSupervision .svrg-control button{grid-column:1/-1}#adminRutaSupervision .svrg-card{padding:12px}#adminRutaSupervision .svrg-headbtn{white-space:normal}}';
    document.head.appendChild(css);
    var opener=document.createElement('button');opener.id='svrgAbrir';opener.type='button';opener.className='svrg-btn svrg-headbtn';
    opener.setAttribute('aria-expanded','false');opener.setAttribute('aria-controls','svrgReportes');opener.textContent='📅 Reportes y gráficas';
    head.appendChild(opener);
    panel=document.createElement('section');panel.id='svrgReportes';panel.className='svrg-card';panel.hidden=true;
    panel.innerHTML='<div class="svrg-row"><h4>Reporte de ventas por período</h4><span class="svrg-small">Solo lectura · Preventa</span></div>'+
      '<div class="svrg-control"><label>Período<select id="svrgPeriodo"><option value="7">Últimos 7 días</option><option value="14">Últimos 14 días</option><option value="30">Últimos 30 días</option><option value="custom">Personalizado</option></select></label>'+
      '<label>Desde<input type="date" id="svrgDesde"></label><label>Hasta<input type="date" id="svrgHasta"></label>'+
      '<button type="button" class="svrg-primary" id="svrgConsultar">Consultar período</button></div>'+
      '<p id="svrgEstado" class="svrg-small" role="status">Elige un período para consultar las ventas.</p>'+
      '<div id="svrgKpi" class="svrg-metrics"></div>'+
      '<div class="svrg-actions"><label>Filtrar resultados por vendedor<select id="svrgVendedor"><option value="TODOS">Todos los vendedores</option></select></label>'+
      '<div style="display:flex;gap:7px;flex-wrap:wrap"><button type="button" class="svrg-btn" id="svrgGraficaBtn" aria-expanded="false">📊 Ver gráficas</button>'+
      '<button type="button" class="svrg-btn" id="svrgExportar" disabled>Exportar CSV</button></div></div>'+
      '<div id="svrgGraficas" class="svrg-chartarea" hidden></div>'+
      '<h4 style="font-size:14px!important;margin:15px 0 8px!important">Detalle diario</h4><div id="svrgTabla"></div>'+
      '<p id="svrgNota" class="svrg-small">Los importes de Preventa son informativos; los cobros reales se consultan en Despacho.</p>';
    root.insertBefore(panel,anchor);
    preset('7');
    opener.addEventListener('click',toggleReport);
    e('svrgPeriodo').addEventListener('change',function(){preset(this.value);registros=null;e('svrgKpi').textContent='';e('svrgTabla').textContent='';e('svrgGraficas').textContent='';e('svrgExportar').disabled=true;});
    e('svrgConsultar').addEventListener('click',function(){load(false);});
    e('svrgGraficaBtn').addEventListener('click',function(){graphOpen=!graphOpen;e('svrgGraficas').hidden=!graphOpen;e('svrgGraficaBtn').textContent=graphOpen?'Ocultar gráficas':'📊 Ver gráficas';e('svrgGraficaBtn').setAttribute('aria-expanded',String(graphOpen));});
    e('svrgVendedor').addEventListener('change',render);
    e('svrgExportar').addEventListener('click',download);
    window.addEventListener('pagehide',function(){token++;});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();