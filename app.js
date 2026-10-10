'use strict';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scopes = {direct_metal_oxo_resist:'直接相关',related_resist:'相邻领域',review:'综述',out_of_scope:'范围外',uncertain:'待确认'};
const origins = {study_experiment:'本研究',literature_comparison:'文献对照',uncertain:'来源不明'};
const titles = {records:'光刻性能',properties:'材料性质',materials:'材料',papers:'论文',missing_fulltext:'未获取全文'};
const columns = {
 records:[['material','材料'],['exposure','曝光'],['dose','剂量'],['size','尺寸'],['LER','LER'],['LWR','LWR'],['contrast','对比度'],['data_origin','来源']],
 properties:[['material','材料'],['metric','性质'],['value','数值'],['basis','数据基础'],['data_origin','来源']],
 materials:[['name','材料'],['metal','金属'],['formula','化学式'],['ligands','配体'],['structure_status','结构确定性']],
 papers:[['title','论文'],['journal','期刊'],['scope','范围']],
 missing_fulltext:[['title','论文'],['screening_tier','初筛分组'],['acquisition_status','获取状态']]
};
let data, papers, materials, filtered = [], table = 'records', page = 1;
const PER_PAGE = 100;
let columnSort = null;
const scopeColors = {direct_metal_oxo_resist:'green',related_resist:'blue',review:'purple',out_of_scope:'amber',uncertain:'red'};
function pill(label, color='') { return `<span class="pill ${color}">${escapeHTML(label)}</span>`; }
function paperOf(row) { return papers[row.paper_id] || row; }
function references(row) {
 const key = table === 'records' ? 'record_id' : 'property_id';
 const links = table === 'records' ? data.record_materials : table === 'properties' ? data.property_materials : [];
 return links.filter(x => x[key] === row[key]).map(x => materials[x.material_id]);
}
function doiLink(doi) { return doi ? `<a href="https://doi.org/${encodeURI(doi)}" target="_blank" rel="noopener">${escapeHTML(doi)}</a>` : '—'; }
function valueHTML(key, value) {
 if (key === 'scope') return pill(scopes[value] || value || '待确认',scopeColors[value] || '');
 if (key === 'data_origin') return pill(origins[value] || value,value==='study_experiment'?'green':value==='literature_comparison'?'purple':'amber');
 return escapeHTML(value ?? '—');
}
function filterRows(resetPage = true) {
 if (!data) return;
 const query = $('search').value.trim().toLowerCase();
 filtered = data[table].filter(row => {
  const p = paperOf(row);
  return (!$('scope').value || p.scope === $('scope').value)
   && (!$('origin').value || row.data_origin === $('origin').value)
   && (!$('exposure').value || row.exposure === $('exposure').value)
   && (!$('year').value || String(p.year) === $('year').value)
   && (!query || [JSON.stringify(row), p.title, p.doi, JSON.stringify(references(row))].join(' ').toLowerCase().includes(query));
 });
 filtered.sort((a,b) => {
  if ($('sort').value==='column' && columnSort) {
   const get = r => ['scope','doi','year'].includes(columnSort.key) ? paperOf(r)[columnSort.key] : r[columnSort.key];
   return columnSort.direction * (columnSort.key==='year' ? (Number(get(a))||0)-(Number(get(b))||0) : String(get(a)??'').localeCompare(String(get(b)??'')));
  }
  return $('sort').value === 'title' ? String(paperOf(a).title).localeCompare(String(paperOf(b).title)) : ($('sort').value === 'year-asc' ? 1 : -1) * ((paperOf(a).year||0)-(paperOf(b).year||0));
 });
 if (resetPage) page = 1;
 render();
}
function render() {
 const count = filtered.length, totalPages = Math.max(1,Math.ceil(count/PER_PAGE));
 page = Math.min(page,totalPages);
 $('count').textContent = `${count.toLocaleString()} / ${data[table].length.toLocaleString()} 条 · ${new Set(filtered.map(r=>r.paper_id)).size} 篇论文`;
 $('tableTitle').textContent = titles[table];
 const displayColumns = [['scope','范围'],['doi','DOI'],['year','年份'],...columns[table].filter(([key])=>key!=='scope')];
 $('head').innerHTML = '<tr>'+displayColumns.map(([key,label])=>`<th data-sort="${key}" tabindex="0" title="按${label}排序；带单位的值按原文文本排序">${label}</th>`).join('')+'</tr>';
 const rows = filtered.slice((page-1)*PER_PAGE,page*PER_PAGE);
 $('rows').innerHTML = rows.length ? rows.map((row,index) => `<tr tabindex="0" aria-label="查看 ${escapeHTML(row.material||row.name||paperOf(row).title)} 的详情" data-index="${(page-1)*PER_PAGE+index}">`+displayColumns.map(([key])=>{
  const value=['scope','doi','year'].includes(key)?paperOf(row)[key]:row[key];
  const definition=key==='dose'?row.dose_kind:key==='size'?row.size_kind:null;
  const content=key==='doi'?doiLink(value):key==='scope'&&table==='missing_fulltext'?pill(row.excluded_non_article?'丛书条目':'全文待获取','amber'):valueHTML(key,value);
  return `<td class="${key==='doi'?'doi-cell':key==='scope'?'layer-cell':['year','dose','size','LER','LWR','contrast'].includes(key)?'num':''}" title="${escapeHTML(value??'—')}${definition?' · '+escapeHTML(definition):''}">${content}${key==='dose'&&row.unit_review_required?' '+pill('单位待核对','red'):''}</td>`;
 }).join('')+'</tr>').join('') : `<tr><td colspan="${displayColumns.length}" class="loading">没有匹配记录。可清除筛选后重试。</td></tr>`;
 $('pageStatus').textContent = `第 ${page} / ${totalPages} 页 · ${count?((page-1)*PER_PAGE+1):0}–${Math.min(page*PER_PAGE,count)} / ${count.toLocaleString()} 条`;
 const pager=(label,target,disabled=false,active=false)=>`<button type="button" data-page="${target}" ${disabled?'disabled':''} class="${active?'active':''}" ${active?'aria-current="page"':''}>${label}</button>`;
 $('pagination').innerHTML = pager('首页',1,page===1)+pager('上一页',page-1,page===1)
  +Array.from({length:Math.min(totalPages,page+2)-Math.max(1,page-2)+1},(_,i)=>{const n=Math.max(1,page-2)+i;return pager(n,n,false,n===page);}).join('')
  +pager('下一页',page+1,page===totalPages)+pager('末页',totalPages,page===totalPages);
 $('export').disabled = !count;
}
function showDetail(index) {
 const row = filtered[index], p = paperOf(row);
 $('detailTitle').textContent = row.material || row.name || p.title;
 const related = references(row);
 const warnings = data.review_queue.filter(x=>x.paper_id===row.paper_id && (!x.record_id || x.record_id===row.record_id));
 const issues = data.coverage_issues.filter(x=>x.paper_id===row.paper_id);
 $('detailBody').innerHTML = MOCRDetails.render({row,paper:p,table,related,warnings,issues,paperCounts:table==='papers'?{
  records:data.records.filter(r=>r.paper_id===row.paper_id).length,
  properties:data.properties.filter(r=>r.paper_id===row.paper_id).length,
  materials:data.materials.filter(r=>r.paper_id===row.paper_id).length
 }:{}});
 $('detail').showModal(); $('close').focus();
}
function setTable(next) {
 table = next;
 $('tableSelect').value=table;
 if ($('sort').value==='column') $('sort').value='year-desc';
 columnSort=null;$('sort').querySelector('[value="column"]')?.remove();
 for (const [id,enabled] of [['scope',table!=='missing_fulltext'],['origin',['records','properties'].includes(table)],['exposure',table==='records']]) {
  $(id).disabled=!enabled;if(!enabled)$(id).value='';
 }
 filterRows();
}
async function load() {
 try {
  const response = await fetch('data/mocr.json');if(!response.ok)throw new Error(`HTTP ${response.status}`);
  data=await response.json();papers=Object.fromEntries(data.papers.map(r=>[r.paper_id,r]));materials=Object.fromEntries(data.materials.map(r=>[r.material_id,r]));
  $('stats').innerHTML = [['已提取论文',data.papers.length,'全文来源','blue'],['直接相关论文',data.papers.filter(p=>p.scope==='direct_metal_oxo_resist').length,'模型范围分类','teal'],['性能记录',data.records.length,'曝光、剂量与图形化结果','green'],['性质记录',data.properties.length,'结构、物性与表征','purple'],['论文内材料条目',data.materials.length,'尚未跨论文去重','amber'],['待核对单位',data.review_queue.filter(r=>r.category==='unit_conflict').length,'保留原文冲突并标注','gray']].map(([label,n,sub,color])=>`<div class="stat ${color}"><div class="label">${label}</div><div class="value">${n.toLocaleString()}</div><div class="sub">${sub}</div></div>`).join('');
  const bar=(label,n,total,color='')=>`<div class="bar-row"><div class="bar-label">${label}</div><div class="bar-track"><div class="bar-fill ${color}" style="width:${total?n/total*100:0}%"></div></div><div class="bar-value">${n.toLocaleString()}</div></div>`;
  $('scopeBars').innerHTML=bar('全部提取论文',data.papers.length,data.papers.length)+Object.entries(scopes).map(([scope,label])=>bar(label,data.papers.filter(r=>r.scope===scope).length,data.papers.length,scopeColors[scope])).join('');
  $('qualityBars').innerHTML=[['dose','报告剂量','green'],['size','报告尺寸','teal'],['contrast','对比度','purple'],['LER','LER','amber'],['LWR','LWR','green'],['film_thickness','膜厚','teal']].map(([key,label,color])=>bar(label,data.records.filter(r=>r[key]).length,data.records.length,color)).join('');
  const excluded=data.missing_fulltext.filter(r=>r.excluded_non_article).length;
  $('quality').textContent=`另有 ${data.missing_fulltext.length} 条未获取全文，其中 ${excluded} 条为不可唯一识别的丛书条目。具体覆盖限制和单位疑点在记录详情中标注。`;
  $('exposure').innerHTML += [...new Set(data.records.map(r=>r.exposure))].sort().map(v=>`<option>${escapeHTML(v)}</option>`).join('');
  $('year').innerHTML += [...new Set([...data.papers,...data.missing_fulltext].map(r=>r.year).filter(Boolean))].sort((a,b)=>b-a).map(v=>`<option>${v}</option>`).join('');
  $('loadingPanel').hidden=true;$('app').hidden=false;filterRows();
 } catch(error) { $('loadingPanel').textContent=`数据加载失败：${error.message}。请刷新重试，或通过本地 HTTP 服务打开本站。`;$('loadingPanel').classList.add('error'); }
}
$('tableSelect').addEventListener('change',()=>setTable($('tableSelect').value));
for(const id of ['search','scope','origin','exposure','year','sort'])$(id).addEventListener(id==='search'?'input':'change',()=>filterRows());
$('reset').addEventListener('click',()=>{for(const id of ['search','scope','origin','exposure','year'])$(id).value='';filterRows();});
$('apply').addEventListener('click',()=>filterRows());
$('pagination').addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(button&&!button.disabled){page=Number(button.dataset.page);render();}});
function openRow(event) { if(event.target.closest('a'))return;const row=event.target.closest('[data-index]');if(row)showDetail(Number(row.dataset.index)); }
$('rows').addEventListener('click',openRow);
$('rows').addEventListener('keydown',event=>{if(!event.target.closest('a')&&['Enter',' '].includes(event.key)){event.preventDefault();openRow(event);}});
function sortColumn(event) {
 const heading=event.target.closest('[data-sort]');if(!heading)return;
 const key=heading.dataset.sort;columnSort={key,direction:columnSort?.key===key?-columnSort.direction:1};
 let option=$('sort').querySelector('[value="column"]');if(!option){option=document.createElement('option');option.value='column';$('sort').append(option);}
 option.textContent=heading.textContent+(columnSort.direction===1?' ↑':' ↓');$('sort').value='column';filterRows();
}
$('head').addEventListener('click',sortColumn);
$('head').addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();sortColumn(event);}});
$('close').addEventListener('click',()=>$('detail').close());
for (const [id,file] of [['downloadJson','mocr.json'],['downloadSqlite','mocr.sqlite']]) $(id).addEventListener('click',()=>{
 const a=document.createElement('a');a.href=`data/${file}`;a.download=file;a.click();
});
$('export').addEventListener('click',()=>{
 const ids=new Set(filtered.map(r=>r.paper_id));
 const output={release:data.release,table,filters:Object.fromEntries(['search','scope','origin','exposure','year'].map(id=>[id,$(id).value])),rows:filtered,papers:data.papers.filter(p=>ids.has(p.paper_id)),materials:data.materials.filter(p=>ids.has(p.paper_id)),coverage_issues:data.coverage_issues.filter(p=>ids.has(p.paper_id)),review_queue:data.review_queue.filter(p=>ids.has(p.paper_id))};
 const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=`mocr_${table}_filtered.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
load();
