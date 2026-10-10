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
const PER_PAGE = 50;
function paperOf(row) { return papers[row.paper_id] || row; }
function references(row) {
 const key = table === 'records' ? 'record_id' : 'property_id';
 const links = table === 'records' ? data.record_materials : table === 'properties' ? data.property_materials : [];
 return links.filter(x => x[key] === row[key]).map(x => materials[x.material_id]);
}
function doiLink(doi) { return doi ? `<a href="https://doi.org/${encodeURI(doi)}" target="_blank" rel="noopener">${escapeHTML(doi)}</a>` : '—'; }
function valueHTML(key, value) {
 if (key === 'scope') return escapeHTML(scopes[value] || value);
 if (key === 'data_origin') return escapeHTML(origins[value] || value);
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
 filtered.sort((a,b) => $('sort').value === 'title' ? String(paperOf(a).title).localeCompare(String(paperOf(b).title)) : ($('sort').value === 'year-asc' ? 1 : -1) * ((paperOf(a).year||0)-(paperOf(b).year||0)));
 if (resetPage) page = 1;
 render();
}
function render() {
 const count = filtered.length, totalPages = Math.max(1,Math.ceil(count/PER_PAGE));
 page = Math.min(page,totalPages);
 $('count').textContent = `${titles[table]} · ${count.toLocaleString()} / ${data[table].length.toLocaleString()} 条 · ${new Set(filtered.map(r=>r.paper_id)).size} 篇论文`;
 $('head').innerHTML = '<tr>'+columns[table].map(([,label])=>`<th>${label}</th>`).join('')+'<th>年份 / DOI</th><th>详情</th></tr>';
 const rows = filtered.slice((page-1)*PER_PAGE,page*PER_PAGE);
 $('rows').innerHTML = rows.length ? rows.map((row,index) => '<tr>'+columns[table].map(([key]) => `<td>${valueHTML(key,row[key])}${key==='dose'&&row.dose?`<small>${escapeHTML(row.dose_kind)}</small>`:''}${key==='size'&&row.size?`<small>${escapeHTML(row.size_kind)}</small>`:''}</td>`).join('')+`<td>${escapeHTML(paperOf(row).year || '—')}<small>${doiLink(paperOf(row).doi)}</small></td><td><button class="btn detail-button" data-index="${(page-1)*PER_PAGE+index}">详情${row.unit_review_required?' ⚠':''}</button></td></tr>`).join('') : `<tr><td colspan="${columns[table].length+2}" class="empty">没有匹配记录。可清除筛选后重试。</td></tr>`;
 $('page').textContent = `${page} / ${totalPages}`;
 $('prev').disabled = page <= 1; $('next').disabled = page >= totalPages;
 $('export').disabled = !count;
}
function showDetail(index) {
 const row = filtered[index], p = paperOf(row);
 $('detailTitle').textContent = row.material || row.name || p.title;
 const related = references(row);
 const warnings = data.review_queue.filter(x=>x.paper_id===row.paper_id && (!x.record_id || x.record_id===row.record_id));
 const issues = data.coverage_issues.filter(x=>x.paper_id===row.paper_id);
 $('detailBody').innerHTML = `<p><strong>${escapeHTML(p.title)}</strong><br>${doiLink(p.doi)} · ${escapeHTML(p.year || '')} · ${escapeHTML(scopes[p.scope] || '')}</p>`
  +(row.excluded_non_article?'<p class="warning">这是丛书级条目，不能定位具体论文，已从论文下载队列排除。</p>':'')
  +(table==='missing_fulltext'?'<p>这些是最后一次尝试的状态，不代表论文永久无法获取。</p>':'')
  +warnings.map(w=>`<p class="warning">${escapeHTML(w.issue)} · ${escapeHTML(w.action)}</p>`).join('')
  +'<h3>记录与实验条件</h3><dl>'+Object.entries(row).map(([key,value])=>`<dt>${escapeHTML(key)}</dt><dd>${escapeHTML(typeof value==='object'?JSON.stringify(value):value)}</dd>`).join('')+'</dl>'
  +(related.length?'<h3>关联材料</h3>'+related.map(m=>`<pre>${escapeHTML(JSON.stringify(m,null,2))}</pre>`).join(''):'')
  +(row.source_blocks?`<h3>来源定位</h3><p>${escapeHTML(row.source_blocks.join(' · '))}</p><p>MAIN 为正文，SI 为补充材料；p 为页码，b 为解析块编号。请通过 DOI 访问原文核验。</p>`:'')
  +`<details><summary>该论文的覆盖限制（${issues.length} 项）</summary><pre>${escapeHTML(JSON.stringify(issues.map(({paper_id,...rest})=>rest),null,2))}</pre></details>`;
 $('detail').showModal(); $('close').focus();
}
function setTable(next) {
 table = next;
 document.querySelectorAll('[data-table]').forEach(b=>{const on=b.dataset.table===table;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
 for (const [id,enabled] of [['scope',table!=='missing_fulltext'],['origin',['records','properties'].includes(table)],['exposure',table==='records']]) {
  $(id).disabled=!enabled;if(!enabled)$(id).value='';
 }
 filterRows();
}
async function load() {
 try {
  const response = await fetch('data/mocr.json');if(!response.ok)throw new Error(`HTTP ${response.status}`);
  data=await response.json();papers=Object.fromEntries(data.papers.map(r=>[r.paper_id,r]));materials=Object.fromEntries(data.materials.map(r=>[r.material_id,r]));
  $('stats').innerHTML = [['已提取论文',data.papers.length],['直接相关论文',data.papers.filter(p=>p.scope==='direct_metal_oxo_resist').length],['性能记录',data.records.length],['性质记录',data.properties.length],['论文内材料条目',data.materials.length],['待核对单位',data.review_queue.filter(r=>r.category==='unit_conflict').length]].map(([label,n])=>`<div class="stat-card"><div class="stat-value">${n.toLocaleString()}</div><div class="stat-label">${label}</div></div>`).join('');
  $('scopeBars').innerHTML=Object.entries(scopes).map(([scope,label])=>{const n=data.papers.filter(r=>r.scope===scope).length;return n?`<div class="bar-line"><span>${label}</span><div class="bar-track"><div style="width:${n/data.papers.length*100}%"></div></div><strong>${n}</strong></div>`:'';}).join('');
  const excluded=data.missing_fulltext.filter(r=>r.excluded_non_article).length;
  $('quality').textContent=`另有 ${data.missing_fulltext.length} 条未获取全文，其中 ${excluded} 条为不可唯一识别的丛书条目。具体覆盖限制和单位疑点在记录详情中标注。`;
  $('exposure').innerHTML += [...new Set(data.records.map(r=>r.exposure))].sort().map(v=>`<option>${escapeHTML(v)}</option>`).join('');
  $('year').innerHTML += [...new Set([...data.papers,...data.missing_fulltext].map(r=>r.year).filter(Boolean))].sort((a,b)=>b-a).map(v=>`<option>${v}</option>`).join('');
  filterRows();
 } catch(error) { $('count').textContent=`数据加载失败：${error.message}。请刷新重试，或通过本地 HTTP 服务打开本站。`;$('count').classList.add('error'); }
}
document.querySelectorAll('[data-table]').forEach(b=>b.addEventListener('click',()=>setTable(b.dataset.table)));
for(const id of ['search','scope','origin','exposure','year','sort'])$(id).addEventListener(id==='search'?'input':'change',()=>filterRows());
$('reset').addEventListener('click',()=>{for(const id of ['search','scope','origin','exposure','year'])$(id).value='';filterRows();});
$('prev').addEventListener('click',()=>{page--;render();});$('next').addEventListener('click',()=>{page++;render();});
$('rows').addEventListener('click',event=>{const button=event.target.closest('[data-index]');if(button)showDetail(Number(button.dataset.index));});
$('close').addEventListener('click',()=>$('detail').close());
$('export').addEventListener('click',()=>{
 const ids=new Set(filtered.map(r=>r.paper_id));
 const output={release:data.release,table,filters:Object.fromEntries(['search','scope','origin','exposure','year'].map(id=>[id,$(id).value])),rows:filtered,papers:data.papers.filter(p=>ids.has(p.paper_id)),materials:data.materials.filter(p=>ids.has(p.paper_id)),coverage_issues:data.coverage_issues.filter(p=>ids.has(p.paper_id)),review_queue:data.review_queue.filter(p=>ids.has(p.paper_id))};
 const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=`mocr_${table}_filtered.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
load();
