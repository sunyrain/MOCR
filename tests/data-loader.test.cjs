const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const full=JSON.parse(fs.readFileSync(path.join(root,'data/mocr.json'),'utf8'));
function loader(failOnce=''){
 const requests=[];
 const sandbox={fetch:async file=>{requests.push(file);if(file===failOnce){failOnce='';throw new Error('offline');}const text=fs.readFileSync(path.join(root,file),'utf8');return {ok:true,text:async()=>text,json:async()=>JSON.parse(text)};}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'data-loader.js'),'utf8')+'\nthis.loader=MOCRData;',sandbox);
 return {api:sandbox.loader,requests};
}
test('initial browser payload preserves all records without loading unrelated tables',async()=>{
 const {api,requests}=loader();
 const [meta]=await Promise.all([api.catalog(),api.table('papers'),api.table('records'),api.table('records')]);
 assert.deepEqual(JSON.parse(JSON.stringify(api.data.records)),full.records);
 assert.equal(meta.counts.properties,full.properties.length);
 assert.deepEqual(requests.sort(),['data/papers.jsonl','data/records.jsonl','data/viewer-meta.json']);
});
test('cached search includes original row fields and linked material fields',async()=>{
 const {api,requests}=loader();
 const paperMap=new Map(full.papers.map(r=>[r.paper_id,r]));
 const materials=new Map(full.materials.map(r=>[r.material_id,r]));
 for(const name of ['records','properties']){
  const index=await api.search(name),key=name==='records'?'record_id':'property_id';
  const links=full[name==='records'?'record_materials':'property_materials'];
  const original=full[name].map(row=>{const p=paperMap.get(row.paper_id);const related=links.filter(l=>l[key]===row[key]).map(l=>materials.get(l.material_id));return [row[key],[JSON.stringify(row),p.title,p.doi,JSON.stringify(related)].join(' ').toLowerCase()];});
  for(const query of ['methacrylate','10.1021','EUV','ligands','qa-empty-no-record-777']){
   const q=query.toLowerCase();
   assert.deepEqual(Array.from(index).filter(([,text])=>text.includes(q)).map(([row])=>row[key]),original.filter(([,text])=>text.includes(q)).map(([id])=>id));
  }
  const before=requests.length;assert.equal(await api.search(name),index);assert.equal(requests.length,before);
 }
 assert(!requests.some(p=>p.includes('coverage_issues')));
});
test('detail/export context is complete, cached and a failed request can retry',async()=>{
 const {api,requests}=loader('data/coverage_issues.jsonl');
 await assert.rejects(api.context('records'),/offline/);
 await api.context('records');await api.exportContext();
 for(const name of ['materials','coverage_issues','review_queue'])assert.deepEqual(JSON.parse(JSON.stringify(api.data[name])),full[name]);
 const row=full.records.find(r=>full.record_materials.some(l=>l.record_id===r.record_id));
 const expected=full.record_materials.filter(l=>l.record_id===row.record_id).map(l=>l.material_id);
 assert.deepEqual(Array.from(api.related(row,'records'),r=>r.material_id),expected);
 assert.equal(requests.filter(p=>p==='data/coverage_issues.jsonl').length,2);
 assert.equal(requests.filter(p=>p==='data/materials.jsonl').length,1);
});
