'use strict';

const MOCRCoverage = (() => {
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=v=>Number(v).toLocaleString('zh-CN');
 const names={records:'光刻性能',properties:'材料性质',materials:'材料',papers:'论文',missing_fulltext:'全文获取记录'};
 const scopeNames={direct_metal_oxo_resist:'直接相关',related_resist:'相邻领域',review:'综述',out_of_scope:'范围外',uncertain:'待确认'};
 const definitions={
  records:[
   ['dose','曝光剂量','core','剂量必须结合剂量定义与曝光方式使用；施加剂量不等于灵敏度。'],['size','图形尺寸','core','半间距、线宽与 CD 不是同一个量。'],
   ['contrast','对比度','core'],['LER','线边缘粗糙度','core'],['LWR','线宽粗糙度','core'],['film_thickness','初始膜厚','core'],
   ['exposure_conditions.wavelength','曝光波长','process'],['exposure_conditions.beam_energy','电子束能量','process'],['exposure_conditions.instrument','曝光设备','process'],['exposure_conditions.numerical_aperture','数值孔径','process'],['exposure_conditions.illumination','照明／束流条件','process'],
   ['formulation.solvent','溶剂','process'],['formulation.concentration','浓度','process'],['formulation.additives','添加剂','process'],['formulation.coating','涂膜条件','process'],
   ['substrate','基底','process'],['PAB','涂膜后烘烤','process'],['PEB','曝光后烘烤','process'],['developer','显影条件','process'],
   ['pattern_type','图形类型','pattern'],['pattern_quality','图形质量','pattern'],['roughness_definition','粗糙度定义','pattern'],['film_thickness_after','处理后膜厚','pattern'],['thickness_loss','膜厚损失','pattern']
  ],
  properties:[['metric','性质名称','core'],['value','报告数值','core'],['conditions','测量条件','core'],['method','测量／计算方法','core'],['basis','数据基础','core'],['data_origin','数据来源','core']],
  materials:[['name','材料名称','core'],['metal','金属元素','core'],['formula','化学式','core'],['ligands','配体','core'],['structure_status','结构确定性','core']],
  papers:[['title','论文标题','core'],['doi','DOI','core'],['year','年份','core'],['journal','期刊','core'],['authors','作者','core'],['scope_note','范围说明','core']],
  missing_fulltext:[['title','论文标题','core'],['doi','DOI','core'],['year','年份','core'],['journal','期刊','core'],['acquisition_status','获取状态','core']]
 };
 const get=(row,key)=>key.split('.').reduce((value,part)=>value?.[part],row);
 const present=value=>value!==undefined&&value!==null&&(typeof value!=='string'||value.trim()!=='')&&(typeof value!=='object'||Object.keys(value).length>0);
 const fieldList=(table,group='core')=>(definitions[table]||[]).filter(f=>group==='all'||f[2]===group).map(([key,label,category,note])=>({key,label,category,note:note||'统计字段中是否有值；不代表数值正确、信息已明确或已经适合训练。'}));
 const summarize=(rows,fields)=>fields.map(field=>{const count=rows.filter(row=>present(get(row,field.key))).length;return {...field,count,total:rows.length,missing:rows.length-count,rate:rows.length?count/rows.length*100:null};});
 function groupValue(row,dimension,papers) {
  const paper=papers[row.paper_id]||row;
  return String((dimension==='exposure'?row.exposure:paper[dimension])??'unknown');
 }
 function groupsFor(rows,dimension,papers) {
  const keys=[...new Set(rows.map(row=>groupValue(row,dimension,papers)))];
  if(dimension==='exposure') keys.sort((a,b)=>['EUV','EBL','DUV','UV','other','unknown'].indexOf(a)-['EUV','EBL','DUV','UV','other','unknown'].indexOf(b));
  else if(dimension==='year') keys.sort((a,b)=>Number(a)-Number(b));
  else keys.sort((a,b)=>Object.keys(scopeNames).indexOf(a)-Object.keys(scopeNames).indexOf(b));
  return keys.map(value=>({value,label:dimension==='scope'?(scopeNames[value]||value):value==='unknown'?'未明确':value==='other'?'其他':value,rows:rows.filter(row=>groupValue(row,dimension,papers)===value)}));
 }
 function matches(row,selection,papers) {
  return (!selection.group||groupValue(row,selection.group.dimension,papers)===selection.group.value)
   && present(get(row,selection.key))===(selection.presence!=='missing');
 }
 function mount(root,{papers={},onFilter=null}={}) {
  let table='records',rows=[],view='bar',group='core',sort='desc',dimension='exposure',selection=null,summary=[],matrixGroups=[];
  const local=selector=>root.querySelector(selector);
  root.classList.add('coverage-explorer');
  root.innerHTML=`<div class="coverage-toolbar"><div class="chart-tabs" role="group" aria-label="覆盖率图表视图"><button type="button" data-view="bar" aria-pressed="true">覆盖排行</button><button type="button" data-view="heatmap" aria-pressed="false">分组热力图</button><button type="button" data-view="table" aria-pressed="false">数据明细</button></div><div class="coverage-tools"><label class="chart-select">指标<select data-control="fields" aria-label="覆盖指标组"><option value="core">核心性能</option><option value="process">曝光与工艺</option><option value="pattern">图形与薄膜</option><option value="all">全部业务字段</option></select></label><label class="chart-select" data-role="sort-control">排序<select data-control="sort" aria-label="覆盖率排序"><option value="desc">覆盖率降序</option><option value="asc">缺失优先</option><option value="default">默认顺序</option></select></label><label class="chart-select" data-role="dimension-control" hidden>分组<select data-control="dimension" aria-label="热力图分组"><option value="exposure">曝光方式</option><option value="scope">论文范围</option><option value="year">发表年份</option></select></label><button class="chart-export" data-action="export" type="button" title="下载当前图表为 SVG" aria-label="下载覆盖率图表 SVG"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/></svg>导出图表</button></div></div><div class="coverage-context" role="status" aria-live="polite"></div><div class="coverage-chart" aria-label="字段覆盖率图表"></div><div class="coverage-data" hidden></div><div class="coverage-inspector"><span class="inspector-hint">点击图条或热力图单元格，查看字段详情与缺失记录。</span></div><p class="coverage-footnote">覆盖率 = 当前样本中字段非空的记录数 ÷ 当前样本数。未明确的文本也计为非空；灰色表示未记录，非准确率。</p>`;
  local('.coverage-footnote').append(' 未记录也可能是不适用。');
  const host=local('.coverage-chart');
  let chart=typeof echarts!=='undefined'?echarts.init(host,null,{renderer:'svg'}):null;
  if(!chart) {view='table';local('.coverage-footnote').textContent+=' 图表组件未加载，已显示数据明细。';}
  const palette={core:'#1f5a8f',process:'#16807c',pattern:'#7a61a8'};
  const motion=typeof matchMedia==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  function inspector(item,selectedGroup=null) {
   selection={...item,group:selectedGroup};
   local('.coverage-inspector').innerHTML=`<div class="inspector-copy"><div><strong>${esc(item.label)}</strong>${selectedGroup?`<span class="pill blue">${esc(selectedGroup.label)}</span>`:''}<span class="inspector-rate">${item.rate===null?'暂无样本':item.rate.toFixed(1)+'%'}</span></div><p>${esc(item.note)}</p><span>已有值 <b>${number(item.count)}</b> · 未记录 <b>${number(item.missing)}</b> · 分母 <b>${number(item.total)}</b></span></div>${onFilter?`<div class="inspector-actions"><button type="button" class="btn btn-primary" data-presence="present" ${item.count?'':'disabled'}>查看有值记录</button><button type="button" class="btn" data-presence="missing" ${item.missing?'':'disabled'}>查看缺失记录</button></div>`:''}`;
  }
  function render(context='') {
   const fields=fieldList(table,group);
   summary=summarize(rows,fields);
   if(sort!=='default') summary.sort((a,b)=>(sort==='desc'?-1:1)*((a.rate??-1)-(b.rate??-1)));
   matrixGroups=groupsFor(rows,dimension,papers);
   // ECharts may render the previous option during resize or animation. Keep each
   // option's callbacks bound to its own data, rather than the next render's data.
   const plottedSummary=summary, plottedGroups=matrixGroups;
   local('.coverage-context').innerHTML=`<span class="coverage-sample"><strong>${number(rows.length)}</strong> 条${esc(names[table]||'数据')}</span><span>${esc(context)} · ${summary.length} 个字段</span>`;
   local('[data-role="dimension-control"]').hidden=view!=='heatmap';
   local('[data-role="sort-control"]').hidden=false;
   local('[data-action="export"]').hidden=view==='table';
   root.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
   host.hidden=view==='table';local('.coverage-data').hidden=view!=='table';
   local('.coverage-data').innerHTML=`<table><thead><tr><th>字段</th><th>已有值</th><th>未记录</th><th>覆盖率</th></tr></thead><tbody>${summary.map(item=>`<tr><td><button type="button" data-field="${item.key}">${esc(item.label)}</button></td><td class="num">${number(item.count)}</td><td class="num">${number(item.missing)}</td><td class="num">${item.rate===null?'—':item.rate.toFixed(1)+'%'}</td></tr>`).join('')}</tbody></table>`;
   local('.coverage-inspector').innerHTML='<span class="inspector-hint">点击图条或热力图单元格，查看字段详情与缺失记录。</span>';selection=null;
   if(!chart||view==='table') return;
   host.style.height=`${Math.max(300,Math.min(summary.length,12)*35+100)}px`;
   chart.resize();
   const narrow=host.clientWidth<550;
   const base={animation:motion,animationDuration:400,textStyle:{fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif'},aria:{enabled:true},backgroundColor:'#fff',grid:{left:narrow?106:128,right:view==='heatmap'?24:64,top:26,bottom:54},tooltip:{confine:true,backgroundColor:'#fff',borderColor:'#dfe3ea',padding:12,textStyle:{color:'#1d2430',fontSize:12},extraCssText:'box-shadow:0 8px 24px rgba(18,27,38,.12);border-radius:8px;'},yAxis:{type:'category',inverse:true,data:summary.map(item=>item.label),axisLine:{show:false},axisTick:{show:false},triggerEvent:true,axisLabel:{color:'#647082',fontSize:11,width:narrow?94:116,overflow:'truncate'}},dataZoom:summary.length>12?[{type:'slider',yAxisIndex:0,orient:'vertical',right:0,width:8,start:0,end:12/summary.length*100,showDetail:false,borderColor:'transparent',backgroundColor:'#f6f7f9',fillerColor:'#cbddec',handleSize:0,brushSelect:false}]:[]};
   if(!rows.length) {
    chart.setOption({animation:false,graphic:[{type:'text',left:'center',top:'middle',style:{text:'当前筛选没有样本\n请调整筛选条件',textAlign:'center',fill:'#647082',fontSize:14,lineHeight:24}}]},true);
    return;
   }
   if(view==='bar') {
    chart.setOption({...base,xAxis:{type:'value',min:0,max:100,interval:25,axisLabel:{formatter:'{value}%',color:'#8d98a8',fontSize:10},splitLine:{lineStyle:{color:'#edf0f4',type:'dashed'}}},tooltip:{...base.tooltip,trigger:'axis',axisPointer:{type:'shadow',shadowStyle:{color:'rgba(31,90,143,.035)'}},formatter:items=>{const item=plottedSummary[items[0].dataIndex];return `<strong>${esc(item.label)}</strong><div class="chart-tooltip-rate">${item.rate.toFixed(1)}%</div>已有值 ${number(item.count)} / ${number(item.total)} 条<br>未记录 ${number(item.missing)} 条<br><span style="color:#647082">点击查看记录</span>`;}},series:[{type:'bar',name:'已记录',barWidth:13,showBackground:true,backgroundStyle:{color:'#edf1f5',borderRadius:4},itemStyle:{borderRadius:[0,4,4,0]},emphasis:{itemStyle:{color:'#16807c'}},label:{show:true,position:'right',distance:9,color:'#1d2430',fontSize:11,formatter:p=>plottedSummary[p.dataIndex].rate.toFixed(1)+'%'},data:summary.map(item=>({value:item.rate,itemStyle:{color:palette[item.category]}}))}]},true);
   } else {
    const cells=matrixGroups.flatMap((g,x)=>summarize(g.rows,summary).map((item,y)=>({value:[x,y,item.rate],count:item.count,total:item.total,missing:item.missing,label:{color:item.rate>=60?'#fff':'#1d2430'}})));
    chart.setOption({...base,grid:{...base.grid,top:matrixGroups.length>8?46:26,bottom:76},dataZoom:[...base.dataZoom,...(matrixGroups.length>10?[{type:'slider',xAxisIndex:0,startValue:0,endValue:9,height:8,bottom:43,showDetail:false,handleSize:0,brushSelect:false}]:[])],xAxis:{type:'category',position:'top',data:matrixGroups.map(g=>g.label),axisLine:{show:false},axisTick:{show:false},axisLabel:{color:'#647082',fontSize:10,interval:0,rotate:matrixGroups.length>8?45:0}},tooltip:{...base.tooltip,formatter:p=>{const [x,y,rate]=p.value;return `<strong>${esc(plottedSummary[y].label)} · ${esc(plottedGroups[x].label)}</strong><div class="chart-tooltip-rate">${rate.toFixed(1)}%</div>已有值 ${number(p.data.count)} / ${number(p.data.total)} 条<br>分组内未记录 ${number(p.data.missing)} 条`; }},visualMap:{min:0,max:100,calculable:true,orient:'horizontal',left:'center',bottom:0,itemWidth:10,itemHeight:narrow?110:160,text:['100%','0%'],textStyle:{fontSize:10,color:'#647082'},inRange:{color:['#edf1f5','#cbddec','#71b4b0','#16807c','#1f5a8f']},outOfRange:{color:['#eef0f2']}},series:[{type:'heatmap',data:cells,itemStyle:{borderWidth:4,borderColor:'#fff',borderRadius:4},label:{show:matrixGroups.length<=10,formatter:p=>Math.round(p.value[2])+'%',fontSize:10},emphasis:{itemStyle:{borderColor:'#d98324',borderWidth:2}}}]},true);
   }
  }
  let context='';
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>chart?.resize()):null;observer?.observe(host);
  chart?.on('click',params=>{
   if(params.componentType==='yAxis') {const item=summary.find(item=>item.label===params.value);if(item)inspector(item);}
   else if(params.componentType==='series'&&view==='bar') inspector(summary[params.dataIndex]);
   else if(params.componentType==='series'&&view==='heatmap') {const [x,y]=params.value,g=matrixGroups[x],item=summarize(g.rows,[summary[y]])[0];inspector(item,{dimension,value:g.value,label:g.label});}
  });
  root.addEventListener('click',event=>{
   const viewButton=event.target.closest('[data-view]');if(viewButton) {view=viewButton.dataset.view;render(context);}
   const fieldButton=event.target.closest('[data-field]');if(fieldButton)inspector(summary.find(item=>item.key===fieldButton.dataset.field));
   const filterButton=event.target.closest('[data-presence]');if(filterButton&&selection)onFilter?.({...selection,presence:filterButton.dataset.presence});
   if(event.target.closest('[data-action="export"]')&&chart) {
    const uri=chart.getDataURL({type:'svg',backgroundColor:'#fff'}),comma=uri.indexOf(',');
    const svg=uri.slice(0,comma).includes(';base64')?atob(uri.slice(comma+1)):decodeURIComponent(uri.slice(comma+1));
    const annotated=svg.replace(/(<svg[^>]*>)/,opening=>opening+`<title>MOCR ${esc(names[table])}</title><desc>${esc(context)}; n=${rows.length}; non-empty field coverage</desc>`);
    const url=URL.createObjectURL(new Blob([annotated],{type:'image/svg+xml;charset=utf-8'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=`mocr_${table}_${view}_coverage.svg`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }
  });
  root.addEventListener('change',event=>{
   if(event.target.dataset.control==='fields')group=event.target.value;
   if(event.target.dataset.control==='sort')sort=event.target.value;
   if(event.target.dataset.control==='dimension')dimension=event.target.value;
   render(context);
  });
  return {update(input){
   rows=input.rows;context=input.context||'当前筛选';
   if(table!==input.table) {table=input.table;group='core';dimension=table==='records'?'exposure':table==='missing_fulltext'?'year':'scope';local('[data-control="fields"]').value=group;local('[data-control="dimension"]').value=dimension;}
   local('[data-control="fields"]').disabled=table!=='records';
   local('[data-control="fields"] option[value="core"]').textContent=table==='records'?'核心性能':'主要字段';
   local('[data-control="dimension"] option[value="exposure"]').disabled=table!=='records';
   render(context);
  },destroy(){observer?.disconnect();chart?.dispose();}};
 }
 function mountScope(root,papers,onScope) {
  const colors={direct_metal_oxo_resist:'#3f8f5c',related_resist:'#16807c',review:'#7a61a8',out_of_scope:'#d98324',uncertain:'#7e8790'};
  const items=Object.entries(scopeNames).map(([key,name])=>({key,name,value:papers.filter(p=>p.scope===key).length,itemStyle:{color:colors[key]}})).filter(item=>item.value);
  root.innerHTML=`<div class="scope-chart" aria-label="论文范围分布"></div><div class="scope-legend"><button type="button" data-scope="" aria-pressed="true"><span>全部论文</span><strong>${number(papers.length)}</strong></button>${items.map(item=>`<button type="button" data-scope="${item.key}" aria-pressed="false"><span><i style="background:${colors[item.key]}"></i>${item.name}</span><strong>${number(item.value)}<small>${(100*item.value/papers.length).toFixed(1)}%</small></strong></button>`).join('')}</div><p class="coverage-footnote">点击分类筛选覆盖分析。这里统计全部收录文献。</p>`;
  const host=root.querySelector('.scope-chart');
  const chart=typeof echarts!=='undefined'?echarts.init(host,null,{renderer:'svg'}):null;
  chart?.setOption({animation:!matchMedia('(prefers-reduced-motion: reduce)').matches,animationDuration:400,aria:{enabled:true},tooltip:{trigger:'item',confine:true,formatter:p=>`${esc(p.name)}<br><strong>${number(p.value)}</strong> 篇 · ${p.percent}%`,borderColor:'#dfe3ea'},graphic:[{type:'text',left:'center',top:'39%',style:{text:number(papers.length),font:'700 32px Arial',fill:'#1d2430'}},{type:'text',left:'center',top:'59%',style:{text:'收录文献',font:'12px Arial',fill:'#647082'}}],series:[{type:'pie',radius:['66%','88%'],center:['50%','50%'],padAngle:2,itemStyle:{borderRadius:4},label:{show:false},emphasis:{scaleSize:5},data:items}]});
  chart?.on('click',p=>onScope(p.data.key));
  root.addEventListener('click',event=>{const button=event.target.closest('[data-scope]');if(button)onScope(button.dataset.scope);});
  const observer=new ResizeObserver(()=>chart?.resize());observer.observe(host);
  return {select(scope){root.querySelectorAll('[data-scope]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scope===scope)));},destroy(){observer.disconnect();chart?.dispose();}};
 }
 return {mount,mountScope,fieldList,summarize,groupsFor,matches,present,get,names};
})();
if(typeof module!=='undefined')module.exports=MOCRCoverage;
