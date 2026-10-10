'use strict';

const MOCRData = (() => {
 const tables=new Set(['papers','records','properties','materials','record_materials','property_materials','coverage_issues','review_queue','missing_fulltext']);
 const data={},pending=new Map(),relationIndexes=new Map(),searchIndexes=new Map();
 function once(key,load) {
  if(!pending.has(key))pending.set(key,load().catch(error=>{pending.delete(key);throw error;}));
  return pending.get(key);
 }
 async function response(path) {const r=await fetch(path);if(!r.ok)throw new Error(`HTTP ${r.status}`);return r;}
 function catalog() {return once('meta',async()=>{const meta=await (await response('data/viewer-meta.json')).json();data.release=meta.release;return meta;});}
 function table(name) {
  if(!tables.has(name))throw new Error('Unknown data table');
  return once(name,async()=>{const text=await (await response(`data/${name}.jsonl`)).text();return data[name]=text.split(/\r?\n/).filter(line=>line.trim()).map(line=>JSON.parse(line));});
 }
 async function relations(name) {
  if(!['records','properties'].includes(name))return;
  const key=name==='records'?'record_id':'property_id',linkTable=name==='records'?'record_materials':'property_materials';
  await once(`relations:${name}`,async()=>{
   const [materials,links]=await Promise.all([table('materials'),table(linkTable)]);
   const materialMap=new Map(materials.map(row=>[row.material_id,row])),index=new Map();
   for(const link of links){if(!index.has(link[key]))index.set(link[key],[]);const material=materialMap.get(link.material_id);if(material)index.get(link[key]).push(material);}
   relationIndexes.set(name,index);
  });
 }
 function related(row,name) {return relationIndexes.get(name)?.get(row[name==='records'?'record_id':'property_id'])||[];}
 async function search(name) {
  await Promise.all([table(name),table('papers'),relations(name)]);
  if(!searchIndexes.has(name)) {
   const papers=new Map(data.papers.map(p=>[p.paper_id,p]));
   searchIndexes.set(name,new Map(data[name].map(row=>{const p=papers.get(row.paper_id)||row;return [row,[JSON.stringify(row),p.title,p.doi,JSON.stringify(related(row,name))].join(' ').toLowerCase()];})));
  }
  return searchIndexes.get(name);
 }
 function context(name) {return Promise.all([relations(name),table('coverage_issues'),table('review_queue')]);}
 function exportContext() {return Promise.all([table('materials'),table('coverage_issues'),table('review_queue')]);}
 let chartRequest;
 function charts() {
  if(!chartRequest)chartRequest=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='vendor/echarts/echarts.min.js?v=modular-20261010';script.onload=resolve;script.onerror=()=>{chartRequest=null;script.remove();reject(new Error('图表组件加载失败'));};document.head.append(script);
  });
  return chartRequest;
 }
 return {data,catalog,table,relations,related,search,context,exportContext,charts};
})();
