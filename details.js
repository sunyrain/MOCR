'use strict';

// Display source values as labelled scientific records; never serialize objects for readers.
const MOCRDetails = (() => {
 const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels = {
  material:'材料名称',name:'材料名称',metal:'金属元素',ligands:'配体与有机组分',formula:'化学式',structure_status:'结构确定性',
  dose:'曝光剂量',size:'图形尺寸',contrast:'对比度',LER:'线边缘粗糙度 · LER',LWR:'线宽粗糙度 · LWR',film_thickness:'初始膜厚',
  film_thickness_after:'处理后膜厚',thickness_loss:'膜厚损失',PAB:'涂膜后烘烤 · PAB',PEB:'曝光后烘烤 · PEB',developer:'显影条件',
  exposure:'曝光方式',tone:'显影极性',dose_kind:'剂量定义',size_kind:'尺寸定义',pattern_type:'图形类型',pattern_quality:'图形质量',
  substrate:'基底与表面处理',roughness_definition:'粗糙度定义',notes:'实验备注',data_origin:'数据来源',
  exposure_conditions:'曝光条件',wavelength:'曝光波长',beam_energy:'电子束能量',instrument:'曝光设备',illumination:'照明／束流条件',numerical_aperture:'数值孔径 · NA',
  formulation:'配方与成膜',solvent:'溶剂',concentration:'浓度',additives:'添加剂',coating:'涂膜条件',
  metric:'测量性质',value:'报告数值',conditions:'测量条件',basis:'数据基础',method:'表征／计算方法',
  authors:'作者',title:'论文标题',year:'发表年份',journal:'期刊',doi:'DOI',scope:'论文范围',scope_note:'范围判定说明',
  screening_tier:'初筛分组',review_status:'复核状态',acquisition_status:'全文获取状态',excluded_non_article:'是否为非论文条目',
  source_blocks:'来源位置',paper_id:'论文编号',record_id:'性能记录编号',property_id:'性质记录编号',material_id:'材料编号',row_index:'原提取条目序号',unit_review_required:'剂量单位检查'
 };
 const enums = {
  tone:{negative:'负性',positive:'正性',dual:'双极性',unknown:'未明确'},
  exposure:{EUV:'极紫外 · EUV',EBL:'电子束 · EBL',DUV:'深紫外 · DUV',UV:'紫外 · UV',other:'其他曝光方式',unknown:'未明确'},
  data_origin:{study_experiment:'本研究实验',literature_comparison:'引用文献对照',uncertain:'来源待确认'},
  scope:{direct_metal_oxo_resist:'直接相关',related_resist:'相邻领域',review:'综述',out_of_scope:'专题范围外',uncertain:'范围待确认'},
  structure_status:{atomically_resolved:'原子级结构已解析',proposed:'作者提出的结构',average_composition:'平均组成',unknown:'结构未明确'},
  basis:{measured:'实验测量',calculated:'理论计算',author_estimated:'作者估算',uncertain:'数据基础待确认'},
  dose_kind:{applied:'施加剂量',dose_to_size:'达到目标尺寸的剂量',D50:'D50（按原文定义）',onset:'起始剂量',dose_to_gel:'凝胶化剂量',dose_to_clear:'清除剂量',contrast_peak:'对比度峰值对应剂量',positive_tone_window:'正性成像剂量窗口',clearance_window:'清除剂量窗口',unspecified:'原文未明确剂量定义'},
  size_kind:{half_pitch:'半间距 · Half-pitch',linewidth:'线宽 · Linewidth',CD:'关键尺寸 · CD',unspecified:'原文未明确尺寸定义'}
 };
 const has = value => value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0) && (typeof value !== 'object' || Object.keys(value).length > 0);
 const label = key => labels[key] || key.replace(/_/g, ' ');
 function sourceValue(blocks) {
  return '<div class="source-chips">'+blocks.map(block => {
   const readable=String(block).replace(/^MAIN(?=:|$)/,'正文').replace(/^SI(?=:|$)/,'补充材料').replace(/:p(\d+)/g,' · 第 $1 页').replace(/:b(\d+)/g,' · 块 $1');
   return `<span class="pill" title="${esc(block)}">${esc(readable)}</span>`;
  }).join('')+'</div>';
 }
 function valueHTML(value,key='') {
  if(!has(value)) return '<span class="detail-muted">暂无数据</span>';
  if(key==='source_blocks' && Array.isArray(value)) return sourceValue(value);
  if(key==='unit_review_required') return value ? '<span class="pill red">需回看原文核对</span>' : '<span class="detail-muted">未标记单位冲突；不代表已完成科学复核</span>';
  if(typeof value==='boolean') return value?'是':'否';
  if(Array.isArray(value)) return '<ul class="detail-list">'+value.map(item=>`<li>${valueHTML(item)}</li>`).join('')+'</ul>';
  if(typeof value==='object') return fieldList(value,Object.keys(value));
  return esc(enums[key]?.[value] || value);
 }
 function fieldList(record,keys) {
  const present=keys.filter(key=>has(record[key]));
  return present.length?'<dl class="detail-facts">'+present.map(key=>`<div class="detail-fact"><dt>${esc(label(key))}</dt><dd>${valueHTML(record[key],key)}</dd></div>`).join('')+'</dl>':'<p class="detail-muted">本条记录暂无这些信息。</p>';
 }
 function section(title,body,note='') {
  return `<section class="record-section"><h4 class="record-section-title">${esc(title)}</h4>${note?`<p class="detail-muted section-note">${esc(note)}</p>`:''}${body}</section>`;
 }
 function metricCard(row,key,definition) {
  return `<div class="detail-card metric-card"><div class="detail-label">${esc(label(key))}</div><div class="detail-value metric-value">${valueHTML(row[key],key)}</div>${definition&&has(row[definition])?`<div class="metric-definition">${valueHTML(row[definition],definition)}</div>`:''}${key==='dose'&&row.unit_review_required?'<span class="pill red">单位待核对</span>':''}</div>`;
 }
 function materialCard(material) {
  return `<article class="material-card"><div class="material-card-heading"><h5>${esc(material.name || '材料')}</h5><span class="pill blue">${valueHTML(material.structure_status,'structure_status')}</span></div>${fieldList(material,['metal','formula','ligands'])}<details class="detail-disclosure"><summary>材料来源与编号</summary>${fieldList(material,['source_blocks','material_id','paper_id'])}</details></article>`;
 }
 function render({row,paper,table,related=[],warnings=[],issues=[],paperCounts={}}) {
  const used=new Set(['material','name','title','doi','year','journal','scope','source_blocks','paper_id','record_id','property_id','material_id','row_index','unit_review_required']);
  const group=(title,keys,note='')=>{keys.forEach(k=>used.add(k));return keys.some(k=>has(row[k]))?section(title,fieldList(row,keys),note):'';};
  const badgeKeys=table==='records'?['exposure','tone','data_origin']:table==='properties'?['basis','data_origin']:[];
  badgeKeys.forEach(k=>used.add(k));
  let html=`<div class="record-intro"><p class="record-paper-title">${esc(paper.title || '文献记录')}</p><div class="record-citation">${[paper.journal,paper.year].filter(Boolean).map(esc).join(' · ')}${paper.doi?` · <a href="https://doi.org/${encodeURIComponent(paper.doi)}" target="_blank" rel="noopener">${esc(paper.doi)} ↗</a>`:''}</div><div class="record-badges">${badgeKeys.filter(k=>has(row[k])).map(k=>`<span class="pill ${k==='data_origin'&&row[k]==='literature_comparison'?'purple':'blue'}">${valueHTML(row[k],k)}</span>`).join('')}${paper.scope?`<span class="pill">${valueHTML(paper.scope,'scope')}</span>`:''}</div></div>`;
  if(warnings.length) html+=`<aside class="record-warning"><strong>该条目需要原文复核</strong>${warnings.map(w=>`<p>${esc(w.issue)}<br>${esc(w.action)}</p>`).join('')}</aside>`;
  if(table==='records') {
   const metrics=['dose','size','contrast','LER','LWR','film_thickness'];
   metrics.concat(['dose_kind','size_kind']).forEach(k=>used.add(k));
   html+=section('光刻性能','<div class="detail-grid">'+metrics.map(k=>metricCard(row,k,k==='dose'?'dose_kind':k==='size'?'size_kind':null)).join('')+'</div>','保留原文数值与单位；暂无数据不等于论文未报告。不同剂量或尺寸定义不能直接比较。');
   html+=group('图形与薄膜',['pattern_type','pattern_quality','roughness_definition','film_thickness_after','thickness_loss']);
   used.add('exposure_conditions');used.add('formulation');
   if(has(row.exposure_conditions)) html+=section('曝光条件',valueHTML(row.exposure_conditions));
   if(has(row.formulation)) html+=section('配方与成膜',valueHTML(row.formulation));
   html+=group('工艺条件',['substrate','PAB','PEB','developer']);
   html+=group('实验备注',['notes']);
  } else if(table==='properties') {
   html+=group('性质与测量',['material','metric','value','conditions','method']);
  } else if(table==='materials') {
   ['metal','formula','ligands','structure_status'].forEach(k=>used.add(k));
   html+=section('材料信息',materialCard(row));
  } else if(table==='papers') {
   html+=section('已提取内容',`<div class="detail-grid">${[['性能记录',paperCounts.records],['性质记录',paperCounts.properties],['材料条目',paperCounts.materials]].map(([name,n])=>`<div class="detail-card"><div class="detail-label">${name}</div><div class="detail-value metric-value">${n??0}</div></div>`).join('')}</div>`);
   html+=group('作者与范围说明',['authors','scope_note','screening_tier','review_status']);
  } else if(table==='missing_fulltext') {
   html+=group('文献获取情况',['acquisition_status','screening_tier','excluded_non_article'],'这是最后一次获取尝试的记录，不代表文献永久无法获取。');
  }
  if(related.length) html+=section('关联材料',related.map(materialCard).join(''),'材料条目在论文内关联，尚未跨论文去重。');
  const remaining=Object.keys(row).filter(k=>!used.has(k));
  if(remaining.length) html+=section('补充信息',fieldList(row,remaining));
  html+=`<details class="detail-disclosure provenance-disclosure"><summary>来源与记录编号</summary><p class="detail-muted">正文与补充材料的页码／解析块编号用于定位原文；通过上方 DOI 访问论文核验。</p>${fieldList(row,['source_blocks','record_id','property_id','material_id','paper_id','row_index','unit_review_required'])}</details>`;
  if(issues.length) html+=`<details class="detail-disclosure"><summary>该论文的提取覆盖说明 · ${issues.length} 项</summary><div class="coverage-list">${issues.map(issue=>`<article><h5>${esc(label(issue.field))}</h5><p>${esc(issue.note||issue.reason)}</p>${issue.note?`<span class="detail-muted">${esc(issue.reason.replace(/_/g,' '))}</span>`:''}</article>`).join('')}</div></details>`;
  return html;
 }
 return {render,labels,valueHTML};
})();

if(typeof module!=='undefined') module.exports=MOCRDetails;
