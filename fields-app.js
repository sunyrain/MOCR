'use strict';
(async()=>{
 const el=id=>document.getElementById(id);
 try {
  await Promise.all([MOCRData.table('papers'),MOCRData.table('records'),MOCRData.charts().catch(()=>{})]);
  const data=MOCRData.data,papers=Object.fromEntries(data.papers.map(row=>[row.paper_id,row]));
  const widget=MOCRCoverage.mount(el('fieldCoverageExplorer'),{papers,onFilter:selection=>{
   const params=new URLSearchParams({table:el('analysisTable').value,field:selection.key,presence:selection.presence});
   for(const [id,key] of [['analysisScope','scope'],['analysisOrigin','origin'],['analysisExposure','exposure']])if(el(id).value)params.set(key,el(id).value);
   if(selection.group){params.set('groupDimension',selection.group.dimension);params.set('groupValue',selection.group.value);}
   location.href=`index.html?${params}`;
  }});
  let updateEpoch=0;
  async function update() {
   const epoch=++updateEpoch;
   const table=el('analysisTable').value;
   el('fieldChartLoading').hidden=false;
   el('fieldChartLoading').textContent='正在加载所选数据…';
   try {await MOCRData.table(table);} catch(error){if(epoch===updateEpoch)el('fieldChartLoading').textContent=`数据加载失败：${error.message}。请重新选择数据表重试。`;return;}
   if(epoch!==updateEpoch)return;
   for(const [id,enabled] of [['analysisScope',table!=='missing_fulltext'],['analysisOrigin',['records','properties'].includes(table)],['analysisExposure',table==='records']]){el(id).disabled=!enabled;if(!enabled)el(id).value='';}
   const rows=data[table].filter(row=>{const paper=papers[row.paper_id]||row;return(!el('analysisScope').value||paper.scope===el('analysisScope').value)&&(!el('analysisOrigin').value||row.data_origin===el('analysisOrigin').value)&&(!el('analysisExposure').value||row.exposure===el('analysisExposure').value);});
   const context=['analysisScope','analysisOrigin','analysisExposure'].filter(id=>el(id).value).map(id=>el(id).selectedOptions[0].textContent).join(' · ')||'全部数据';
   widget.update({table,rows,context});
   el('fieldChartLoading').hidden=true;
  }
  for(const id of ['analysisTable','analysisScope','analysisOrigin','analysisExposure'])el(id).addEventListener('change',update);
  el('fieldChartLoading').hidden=true;update();
 }catch(error){el('fieldChartLoading').textContent=`交互图表暂未加载：${error.message}。下方字段字典仍可查看。`;}
})();
