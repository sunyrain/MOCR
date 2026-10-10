'use strict';
const $=id=>document.getElementById(id);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scopes={direct_metal_oxo_resist:'直接相关',related_resist:'相邻领域',review:'综述',out_of_scope:'范围外',uncertain:'待确认'};
const origins={study_experiment:'本研究',literature_comparison:'文献对照',uncertain:'来源不明'};
const titles={records:'光刻性能',properties:'材料性质',materials:'材料',papers:'论文',missing_fulltext:'未获取全文'};
// Column widths total 100%; grouped cells keep the scientific fields visible.
const columns={
 records:[['citation','文献',22,'year'],['material','材料 / 曝光',22,'material'],['dose','剂量',16,'dose'],['size','尺寸',14,'size'],['roughness','粗糙度',12,'LER'],['contrast','对比度',8,'contrast'],['actions','',6]],
 properties:[['citation','文献',23,'year'],['material','材料',23,'material'],['metric','性质',18,'metric'],['value','报告数值',21,'value'],['basis','数据基础',9,'basis'],['actions','',6]],
 materials:[['citation','文献',22,'year'],['name','材料',21,'name'],['metal','金属',8,'metal'],['formula','化学式',18,'formula'],['ligands','配体',17,'ligands'],['structure_status','结构确定性',8,'structure_status'],['actions','',6]],
 papers:[['citation','文献',24,'year'],['title','论文标题',45,'title'],['journal','期刊',25,'journal'],['actions','',6]],
 missing_fulltext:[['citation','文献',24,'year'],['title','论文标题',39,'title'],['screening_tier','初筛分组',12,'screening_tier'],['acquisition_status','获取状态',19,'acquisition_status'],['actions','',6]]
};
const data=MOCRData.data;
let meta,papers,filtered=[],table='records',page=1,columnSort=null;
let coverageWidget,scopeWidget,chartSelection=null,tableEpoch=0,filterEpoch=0,detailEpoch=0,loadingTable=false,searchTimer;
const scopeColors={direct_metal_oxo_resist:'green',related_resist:'blue',review:'purple',out_of_scope:'amber',uncertain:'red'};
function pill(label,color=''){return `<span class="pill ${color}">${escapeHTML(label)}</span>`;}
function paperOf(row){return papers[row.paper_id]||row;}
function doiLink(doi){return doi?`<a class="citation-doi" href="https://doi.org/${encodeURIComponent(doi)}" target="_blank" rel="noopener">${escapeHTML(doi)}</a>`:'<span class="detail-muted">暂无 DOI</span>';}
function plain(value){return value===null||value===undefined||value===''?'—':Array.isArray(value)?value.join(' · '):String(value);}
function cellValue(value,extra=''){return `<span class="cell-value ${extra}">${escapeHTML(plain(value))}</span>`;}
function message(text=''){$('tableMessage').textContent=text;$('tableMessage').hidden=!text;}
function logReady(stage){performance.mark(`mocr-${stage}`);console.info(`[MOCR] ${stage}`,JSON.stringify({navigation_ms:Math.round(performance.now()),resources:performance.getEntriesByType('resource').filter(r=>/\.jsonl|viewer-meta|echarts/.test(r.name)).map(r=>({file:r.name.split('/').pop(),duration_ms:Math.round(r.duration),transfer_bytes:r.transferSize}))}));}
async function filterRows(resetPage=true,updateCharts=true){
 const epoch=++filterEpoch;
 if(loadingTable||!data[table])return;
 const activeTable=table,query=$('search').value.trim().toLowerCase();
 let index;
 try{
  if(query){message('正在搜索…');index=await MOCRData.search(activeTable);}
  if(epoch!==filterEpoch||activeTable!==table)return;
  message();
  const candidates=data[table].filter(row=>{const p=paperOf(row);return (!$('scope').value||p.scope===$('scope').value)&&(!$('origin').value||row.data_origin===$('origin').value)&&(!$('exposure').value||row.exposure===$('exposure').value)&&(!$('year').value||String(p.year)===$('year').value)&&(!query||index.get(row).includes(query));});
  if(updateCharts){const filters=['scope','origin','exposure','year'].filter(id=>$(id).value).map(id=>$(id).selectedOptions[0].textContent);if(query)filters.push('关键词筛选');coverageWidget?.update({table,rows:candidates,context:filters.join(' · ')||'全部数据'});}
  scopeWidget?.select($('scope').value);
  filtered=chartSelection?candidates.filter(row=>MOCRCoverage.matches(row,chartSelection,papers)):candidates;
  $('coverageFilter').hidden=!chartSelection;
  if(chartSelection)$('coverageFilterLabel').textContent=`${chartSelection.label} · ${chartSelection.presence==='missing'?'未记录':'已有值'}${chartSelection.group?' · '+chartSelection.group.label:''} · 图表分母仍为筛选前的 ${candidates.length.toLocaleString()} 条`;
  filtered.sort((a,b)=>{
   if($('sort').value==='column'&&columnSort){const get=r=>['scope','doi','year'].includes(columnSort.key)?paperOf(r)[columnSort.key]:r[columnSort.key];return columnSort.direction*(columnSort.key==='year'?(Number(get(a))||0)-(Number(get(b))||0):String(get(a)??'').localeCompare(String(get(b)??'')));}
   return $('sort').value==='title'?String(paperOf(a).title).localeCompare(String(paperOf(b).title)):($('sort').value==='year-asc'?1:-1)*((paperOf(a).year||0)-(paperOf(b).year||0));
  });
  if(resetPage)page=1;render();
 }catch(error){if(epoch===filterEpoch)message(`搜索未完成：${error.message}。请点击“应用”重试。`);}
}
function cellHTML(row,key){
 const p=paperOf(row);
 if(key==='citation')return doiLink(p.doi)+`<div class="cell-meta"><span>${escapeHTML(p.year||'年份未知')}</span>${table==='missing_fulltext'?pill(row.excluded_non_article?'丛书条目':'全文待获取','amber'):pill(scopes[p.scope]||'待确认',scopeColors[p.scope])}</div>`;
 if(key==='actions')return '<button type="button" class="record-open" aria-label="查看完整记录">详情 ↗</button>';
 if(key==='material')return cellValue(row.material,'material-value')+`<div class="cell-meta">${row.exposure?pill(row.exposure==='unknown'?'曝光未明确':row.exposure,'blue'):''}${pill(origins[row.data_origin]||row.data_origin||'来源不明',row.data_origin==='study_experiment'?'green':'purple')}</div>`;
 if(key==='roughness')return ['LER','LWR'].map(k=>`<div class="roughness-value"><small>${k}</small>${cellValue(row[k])}</div>`).join('');
 let html=['basis','structure_status'].includes(key)?`<span class="cell-value">${MOCRDetails.valueHTML(row[key],key)}</span>`:cellValue(row[key],key==='name'?'material-value':'');
 const kind=key==='dose'?'dose_kind':key==='size'?'size_kind':null;
 if(kind&&row[kind]&&row[kind]!=='unspecified')html+=`<span class="cell-definition">${MOCRDetails.valueHTML(row[kind],kind)}</span>`;
 if(key==='dose'&&row.unit_review_required)html+=pill('单位待核对','red');
 return html;
}
function render(){
 const perPage=Number($('pageSize').value),count=filtered.length,totalPages=Math.max(1,Math.ceil(count/perPage));page=Math.min(page,totalPages);
 $('count').textContent=`${count.toLocaleString()} / ${data[table].length.toLocaleString()} 条 · ${new Set(filtered.map(r=>r.paper_id)).size} 篇论文`;
 $('tableTitle').textContent=titles[table];const display=columns[table];
 $('columnWidths').innerHTML=display.map(([, ,width])=>`<col style="width:${width}%">`).join('');
 $('head').innerHTML='<tr>'+display.map(([,label,,sort])=>`<th scope="col"${sort?` data-sort="${sort}" tabindex="0" aria-sort="${columnSort?.key===sort?(columnSort.direction===1?'ascending':'descending'):'none'}" title="按${sort==='year'?'年份':sort==='LER'?'LER':label}排序；带单位的数值按原文文本排序"`:''}>${label||'<span class="sr-only">查看</span>'}</th>`).join('')+'</tr>';
 const rows=filtered.slice((page-1)*perPage,page*perPage);
 $('rows').innerHTML=rows.length?rows.map((row,i)=>`<tr tabindex="0" aria-label="查看 ${escapeHTML(row.material||row.name||paperOf(row).title)} 的详情" data-index="${(page-1)*perPage+i}">`+display.map(([key,label])=>`<td data-cell="${key}" data-label="${label}" title="${key==='roughness'?escapeHTML('LER: '+plain(row.LER)+'; LWR: '+plain(row.LWR)):key==='actions'||key==='citation'?'':escapeHTML(plain(row[key]))}">${cellHTML(row,key)}</td>`).join('')+'</tr>').join(''):`<tr><td colspan="${display.length}" class="empty-records">没有匹配记录。可清除筛选后重试。</td></tr>`;
 $('pageStatus').textContent=`第 ${page} / ${totalPages} 页 · ${count?(page-1)*perPage+1:0}–${Math.min(page*perPage,count)} / ${count.toLocaleString()} 条`;
 const pager=(label,target,disabled=false,active=false)=>`<button type="button" data-page="${target}" ${disabled?'disabled':''} class="${active?'active':''}" ${active?'aria-current="page"':''}>${label}</button>`;
 $('pagination').innerHTML=pager('首页',1,page===1)+pager('上一页',page-1,page===1)+Array.from({length:Math.min(totalPages,page+2)-Math.max(1,page-2)+1},(_,i)=>{const n=Math.max(1,page-2)+i;return pager(n,n,false,n===page);}).join('')+pager('下一页',page+1,page===totalPages)+pager('末页',totalPages,page===totalPages);
 $('export').disabled=!count;
}
async function showDetail(index){
 if(loadingTable)return;
 const row=filtered[index],p=paperOf(row),activeTable=table,epoch=++detailEpoch;
 $('detailTitle').textContent=row.material||row.name||p.title;$('detailBody').innerHTML='<p class="detail-muted" role="status">正在加载关联材料与来源说明…</p>';$('detail').showModal();$('close').focus();
 try{await MOCRData.context(activeTable);if(epoch!==detailEpoch||!$('detail').open)return;
  $('detailBody').innerHTML=MOCRDetails.render({row,paper:p,table:activeTable,related:MOCRData.related(row,activeTable),warnings:data.review_queue.filter(x=>x.paper_id===row.paper_id&&(!x.record_id||x.record_id===row.record_id)),issues:data.coverage_issues.filter(x=>x.paper_id===row.paper_id),paperCounts:activeTable==='papers'?Object.fromEntries(['records','properties','materials'].map(k=>[k,meta.paper_counts[k][row.paper_id]||0])):{}});
 }catch(error){if(epoch===detailEpoch)$('detailBody').innerHTML=`<p class="error">详情加载失败：${escapeHTML(error.message)}。关闭后重新打开可重试。</p>`;}
}
async function setTable(next){
 const epoch=++tableEpoch;filterEpoch++;table=next;loadingTable=true;chartSelection=null;filtered=[];$('rows').innerHTML='';$('tableTitle').textContent=titles[next];$('count').textContent='正在加载…';$('tableSelect').value=table;$('export').disabled=true;$('recordTable').setAttribute('aria-busy','true');message(`正在加载${titles[next]}…`);
 if($('sort').value==='column')$('sort').value='year-desc';columnSort=null;$('sort').querySelector('[value="column"]')?.remove();
 for(const [id,enabled] of [['scope',table!=='missing_fulltext'],['origin',['records','properties'].includes(table)],['exposure',table==='records']]){$(id).disabled=!enabled;if(!enabled)$(id).value='';}
 try{await MOCRData.table(next);if(epoch!==tableEpoch)return;loadingTable=false;$('recordTable').removeAttribute('aria-busy');await filterRows();}
 catch(error){if(epoch===tableEpoch){loadingTable=false;$('recordTable').removeAttribute('aria-busy');message(`加载失败：${error.message}。点击“应用”重试。`);}}
}
async function initCharts(){
 try{await MOCRData.charts();}catch(error){console.warn('[MOCR]',error.message);}
 coverageWidget=MOCRCoverage.mount($('coverageExplorer'),{papers,onFilter:selection=>{chartSelection=selection;filterRows(true,false);$('tableTitle').scrollIntoView({behavior:'smooth',block:'start'});}});
 scopeWidget=MOCRCoverage.mountScope($('scopeOverview'),data.papers,async scope=>{if(table==='missing_fulltext')await setTable('papers');$('scope').value=scope;chartSelection=null;filterRows();});
 await filterRows(false);logReady('charts-ready');
}
async function load(){
 try{
  const params=new URLSearchParams(location.search),initial=Object.hasOwn(titles,params.get('table'))?params.get('table'):'records';
  [meta]=await Promise.all([MOCRData.catalog(),MOCRData.table('papers'),MOCRData.table(initial)]);papers=Object.fromEntries(data.papers.map(r=>[r.paper_id,r]));
  $('stats').innerHTML=[['已提取论文',meta.counts.papers,'全文来源','blue'],['直接相关论文',data.papers.filter(p=>p.scope==='direct_metal_oxo_resist').length,'模型范围分类','teal'],['性能记录',meta.counts.records,'曝光、剂量与图形化结果','green'],['性质记录',meta.counts.properties,'结构、物性与表征','purple'],['论文内材料条目',meta.counts.materials,'尚未跨论文去重','amber'],['待核对单位',meta.unit_reviews,'保留原文冲突并标注','gray']].map(([label,n,sub,color])=>`<div class="stat ${color}"><div class="label">${label}</div><div class="value">${n.toLocaleString()}</div><div class="sub">${sub}</div></div>`).join('');
  $('quality').textContent=`另有 ${meta.counts.missing_fulltext} 条未获取全文，其中 ${meta.excluded_non_articles} 条为不可唯一识别的丛书条目。具体覆盖限制和单位疑点在记录详情中标注。`;
  $('exposure').innerHTML+=meta.exposures.map(v=>`<option>${escapeHTML(v)}</option>`).join('');$('year').innerHTML+=meta.years.map(v=>`<option>${v}</option>`).join('');
  for(const id of ['scope','origin','exposure','year'])if([...$(id).options].some(o=>o.value===params.get(id)))$(id).value=params.get(id);
  if(params.has('search'))$('search').value=params.get('search');$('loadingPanel').hidden=true;$('app').hidden=false;
  await setTable(initial);
  const field=MOCRCoverage.fieldList(table,'all').find(f=>f.key===params.get('field'));
  if(field){const dimension=params.get('groupDimension'),value=params.get('groupValue');chartSelection={...field,presence:params.get('presence')==='missing'?'missing':'present',group:['exposure','scope','year'].includes(dimension)&&value?{dimension,value,label:scopes[value]||value}:null};await filterRows();$('tableTitle').scrollIntoView({block:'start'});}
  logReady('table-ready');requestAnimationFrame(()=>requestAnimationFrame(initCharts));
 }catch(error){$('loadingPanel').hidden=false;$('loadingPanel').textContent=`数据加载失败：${error.message}。请刷新重试。`;$('loadingPanel').classList.add('error');}
}
$('tableSelect').addEventListener('change',()=>setTable($('tableSelect').value));
$('search').addEventListener('input',()=>{clearTimeout(searchTimer);filterEpoch++;searchTimer=setTimeout(()=>filterRows(),160);});
for(const id of ['scope','origin','exposure','year'])$(id).addEventListener('change',()=>filterRows());
$('sort').addEventListener('change',()=>filterRows(true,false));
$('reset').addEventListener('click',()=>{clearTimeout(searchTimer);for(const id of ['search','scope','origin','exposure','year'])$(id).value='';chartSelection=null;filterRows();});
$('clearCoverageFilter').addEventListener('click',()=>{chartSelection=null;filterRows(true,false);});
$('apply').addEventListener('click',()=>{clearTimeout(searchTimer);data[table]?filterRows():setTable(table);});
$('pageSize').addEventListener('change',()=>{if(!loadingTable){page=1;render();}});
$('pagination').addEventListener('click',event=>{const b=event.target.closest('[data-page]');if(b&&!b.disabled&&!loadingTable){page=Number(b.dataset.page);render();$('recordTable').parentElement.scrollTop=0;}});
function openRow(event){if(event.target.closest('a'))return;const row=event.target.closest('[data-index]');if(row)showDetail(Number(row.dataset.index));}
$('rows').addEventListener('click',openRow);
$('rows').addEventListener('keydown',event=>{if(!event.target.closest('a,button')&&['Enter',' '].includes(event.key)){event.preventDefault();openRow(event);}});
function sortColumn(event){const h=event.target.closest('[data-sort]');if(!h)return;const key=h.dataset.sort;columnSort={key,direction:columnSort?.key===key?-columnSort.direction:1};let o=$('sort').querySelector('[value="column"]');if(!o){o=document.createElement('option');o.value='column';$('sort').append(o);}o.textContent=(key==='year'?'年份':key==='LER'?'LER':h.textContent)+(columnSort.direction===1?' ↑':' ↓');$('sort').value='column';filterRows(true,false);}
$('head').addEventListener('click',sortColumn);$('head').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();sortColumn(e);}});
$('close').addEventListener('click',()=>$('detail').close());
for(const [id,file] of [['downloadJson','mocr.json'],['downloadSqlite','mocr.sqlite']])$(id).addEventListener('click',()=>{const a=document.createElement('a');a.href=`data/${file}`;a.download=file;a.click();});
$('export').addEventListener('click',async()=>{
 const rows=[...filtered],activeTable=table,selection=chartSelection,filters=Object.fromEntries(['search','scope','origin','exposure','year'].map(id=>[id,$(id).value]));$('export').disabled=true;$('export').textContent='准备导出…';
 try{await MOCRData.exportContext();const ids=new Set(rows.map(r=>r.paper_id));const output={release:data.release,table:activeTable,filters:{...filters,coverage:selection?{field:selection.key,presence:selection.presence,group:selection.group}:null},rows,papers:data.papers.filter(p=>ids.has(p.paper_id)),materials:data.materials.filter(p=>ids.has(p.paper_id)),coverage_issues:data.coverage_issues.filter(p=>ids.has(p.paper_id)),review_queue:data.review_queue.filter(p=>ids.has(p.paper_id))};const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`mocr_${activeTable}_filtered.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){message(`导出失败：${error.message}。请重试。`);}finally{$('export').textContent='筛选结果 JSON';$('export').disabled=!filtered.length;}
});
load();
