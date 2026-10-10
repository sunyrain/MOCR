'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {labels}=require('../details.js');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/mocr.json'),'utf8'));
const dictionary=JSON.parse(fs.readFileSync(path.join(root,'data/dictionary.json'),'utf8'));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const present=v=>v!==null&&v!==undefined&&v!==''&&(typeof v!=='object'||Object.keys(v).length>0);
const tables={
 records:['光刻性能','一条文献提取的材料／条件／结果记录；部分记录仍包含多值或范围，尚不等于一个独立训练样本。'],
 properties:['材料性质','一条性质或表征结果，保留实验、计算及作者估算的区别。'],
 materials:['材料','论文内的材料条目；相同材料跨论文可能重复出现。'],
 papers:['论文','一篇已完成全文提取的论文及范围判定。'],
 missing_fulltext:['未获取全文','一条尚未获得全文的来源记录；包括 1 条无法唯一定位论文的丛书条目。'],
 record_materials:['性能—材料关联','把一条性能记录连接到一个或多个材料条目。'],
 property_materials:['性质—材料关联','把一条性质记录连接到一个或多个材料条目。'],
 evidence:['来源定位索引','论文编号与解析块编号的组合，不包含出版社原文。'],
 coverage_issues:['提取覆盖说明','提取中的缺失、不确定或尚未提取事项。'],
 review_queue:['待复核事项','需要回看原文的已知问题；不是完整的科学准确性审计。']
};
const notes={
 paper_id:'关联论文的稳定编号。',record_id:'光刻性能记录的唯一编号。',property_id:'性质记录的唯一编号。',material_id:'论文内材料的唯一编号。',row_index:'该论文原始提取结果中的条目序号，从 1 开始。',
 dose:'保留原文剂量和单位。施加剂量不自动等于灵敏度；必须结合剂量定义及曝光方式。',dose_kind:'区分 D50、dose-to-size、清除／凝胶化剂量、施加剂量与其他定义。',size:'保留尺寸原文；不自动视为材料的最小可分辨尺寸。',size_kind:'区分半间距、线宽、CD 和未明确的定义。',contrast:'原文报告的对比度；可能是数值、范围或描述。',LER:'线边缘粗糙度，需结合测量口径和图形条件。',LWR:'线宽粗糙度，不能直接当作 LER。',roughness_definition:'例如 3σ、是否去噪及原文中的其他定义。',
 film_thickness:'曝光／处理前的膜厚。',film_thickness_after:'处理后的膜厚，处理步骤需结合原文。',thickness_loss:'原文报告的膜厚损失。',tone:'正性、负性、双极性或未明确；不等于材料体系。',exposure:'EUV、EBL、DUV、UV 等曝光方式；不同方式需要分层比较。',exposure_conditions:'下列波长、束能、设备等子字段的集合。',formulation:'下列溶剂、浓度、添加剂和涂膜条件的集合。',
 data_origin:'区分本研究实验、引用文献对照和来源待确认。',basis:'实验测量、理论计算、作者估算或待确认。',source_blocks:'正文或补充材料的页码／解析块编号，通过论文编号连接来源索引。',block_id:'来源块编号，需与论文编号联合使用。',
 structure_status:'原子级解析、作者提出的结构、平均组成或未知；不把所有材料视作精确分子结构。',scope:'相对于金属氧簇专题的相关性，不能用作材料家族标签。',scope_note:'范围判定的解释。',screening_tier:'检索初筛分组，与最终范围判定分开保留。',review_status:'当前复核流程状态，不代表所有数值均经人工复核。',
 unit_review_required:'是否标记了剂量单位疑点。false 仅表示未标记；当前 true 为 1 条。',excluded_non_article:'是否作为不能唯一定位论文的非论文条目排除。',acquisition_status:'最后一次获取全文的状态，不表示永久不可获取。',
 field:'受覆盖限制影响的字段或内容。',reason:'未在已读来源报告、尚未提取或有歧义等原因。',note:'具体的覆盖限制说明。',issue:'已知问题。',action:'建议复核动作。',category:'问题类别。',
 authors:'论文作者列表。',conditions:'测量／计算时的条件。',method:'表征或计算方法。',metric:'性质名称。',value:'带原文单位的性质值。',notes:'原文上下文、特殊情况或提取备注。'
};
const extraLabels={block_id:'来源块编号',field:'检查项',reason:'原因',note:'说明',issue:'问题',action:'复核建议',category:'问题类别'};
const resolve=(row,key)=>key.split('.').reduce((v,k)=>v?.[k],row);
function tableSection(name) {
 const [title,description]=tables[name],rows=data[name];
 const fields=[...dictionary.tables[name].columns];
 if(name==='records') for(const parent of ['exposure_conditions','formulation']) {
  const keys=[...new Set(rows.flatMap(row=>Object.keys(row[parent]||{})))];
  fields.splice(fields.indexOf(parent)+1,0,...keys.map(key=>`${parent}.${key}`));
 }
 return `<section class="panel field-guide" id="${name}"><div class="panel-header"><h2 class="panel-title">${esc(title)}</h2><span class="pill">${rows.length.toLocaleString('en-US')} 条</span></div><div class="panel-body"><p class="detail-muted">${esc(description)}</p></div><div class="field-table-scroll"><table><thead><tr><th>字段</th><th>含义与使用说明</th><th>已有值／总条数</th><th>覆盖率</th></tr></thead><tbody>${fields.map(key=>{
  const leaf=key.split('.').at(-1),count=rows.filter(row=>present(resolve(row,key))).length;
  return `<tr><td>${esc(labels[leaf]||extraLabels[leaf]||leaf)}<br><code>${esc(key)}</code></td><td>${esc(notes[leaf]||labels[leaf]||extraLabels[leaf]||leaf)}</td><td class="num">${count.toLocaleString('en-US')} / ${rows.length.toLocaleString('en-US')}</td><td class="num">${(100*count/rows.length).toFixed(1)}%</td></tr>`;
 }).join('')}</tbody></table></div></section>`;
}
const html=`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MOCR 字段说明与覆盖情况</title><link rel="stylesheet" href="style.css?v=opv-20261010"><link rel="stylesheet" href="mocr.css?v=details-20261010"></head><body>
<header class="site-header"><div class="header-inner"><div><h1>MOCR 字段说明与覆盖情况</h1><p class="subtitle">每类条目包含什么、如何关联，以及目前有多少记录填有值。</p></div><div class="header-actions"><a class="btn" href="index.html">返回数据库</a><a class="btn" href="data/dictionary.json" download>下载数据字典</a></div></div></header>
<main class="wrap"><section class="release-strip"><div><div class="release-title">当前公开数据 · 2026.10.10</div><div class="release-note">覆盖率仅表示字段非空，包含 unknown、待确认和程序生成的字段；不代表正确率、信息已明确或可用于训练。空白不是零，也不证明原文未报告。</div></div></section>
<section class="panel"><div class="panel-body"><nav class="source-chips" aria-label="字段表目录">${Object.entries(tables).map(([key,[name]])=>`<a class="pill blue" href="#${key}">${name}</a>`).join('')}</nav></div></section>
${Object.keys(tables).map(tableSection).join('\n')}
</main><footer class="footer">由公开数据包自动统计。剂量、尺寸及其定义必须同时使用；训练前还需去重、单位核对和按论文分组验证。</footer></body></html>\n`;
fs.writeFileSync(path.join(root,'fields.html'),html,'utf8');
console.log('Built fields.html from all 10 public tables, including nested process fields.');
