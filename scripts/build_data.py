"""Export a public MOCR viewer payload from the local curated JSONL tables.

Only explicit publication fields are copied. No publisher text, images,
credentials, browser state, or local file paths are included.
"""
import argparse
import datetime
import json
from pathlib import Path
import sqlite3
from build_viewer_meta import build_meta

FIELDS = {
    'papers': 'paper_id doi title year journal authors screening_tier scope scope_note review_status',
    'materials': 'material_id paper_id name metal ligands formula structure_status source_blocks',
    'records': 'record_id paper_id row_index material dose size contrast LER LWR film_thickness PAB PEB developer notes exposure tone dose_kind size_kind source_blocks pattern_type pattern_quality film_thickness_after thickness_loss substrate roughness_definition data_origin exposure_conditions formulation unit_review_required',
    'properties': 'property_id paper_id row_index material metric value conditions basis method source_blocks data_origin',
    'record_materials': 'record_id material_id',
    'property_materials': 'property_id material_id',
    'evidence': 'paper_id block_id',
    'coverage_issues': 'paper_id field reason note',
    'review_queue': 'paper_id record_id issue action category',
    'missing_fulltext': 'paper_id doi title year journal screening_tier acquisition_status excluded_non_article',
}


def build(source, output):
    output.mkdir(parents=True, exist_ok=True)
    payload={}
    dictionary={}
    for table, allowed in FIELDS.items():
        rows=[json.loads(line) for line in (source/(table+'.jsonl')).read_text(encoding='utf8').splitlines() if line.strip()]
        payload[table]=[{key:row[key] for key in allowed.split() if key in row} for row in rows]
        dictionary[table]={'rows':len(rows),'columns':allowed.split()}
        (output/(table+'.jsonl')).write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in payload[table]),encoding='utf8')
    payload['release']={'built_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'version':'2026-10-10', 'model':'GPT-6 Astra / medium',
        'notice':'Model-extracted data; not independently scientifically validated. Units and definitions remain as reported. Materials are not deduplicated across papers.',
        'evidence_policy':'Source block/page identifiers and DOI links are provided. Publisher full text and page images are not redistributed.'}
    (output/'mocr.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    build_meta(payload, output)
    (output/'dictionary.json').write_text(json.dumps({'tables':dictionary,
        'joins':'paper_id joins to papers. source_blocks join to evidence on paper_id + block_id. Material groups join through record_materials/property_materials.',
        'missing_values':'Missing fields are not zero and do not establish absence in the original paper. Read coverage_issues.',
        'row_index':'One-based position in the paper extraction.',
        'numbers':'Original strings retain units, dose_kind, size_kind and experimental conditions; no unit conversions.',
        'rights':'Original papers remain subject to their publishers/authors rights. Consult the linked DOI for the source. No new license for underlying source publications is asserted.'},ensure_ascii=False,indent=2),encoding='utf8')
    temp=output/'mocr.build.sqlite'
    if temp.exists():temp.unlink()
    db=sqlite3.connect(temp)
    for table, fields in FIELDS.items():
        cols=fields.split()
        db.execute(f'CREATE TABLE "{table}" ('+','.join(f'"{c}" '+('INTEGER' if c in ('year','row_index','unit_review_required','excluded_non_article') else 'TEXT') for c in cols)+')')
        def value(v):return json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v
        db.executemany(f'INSERT INTO "{table}" VALUES ('+','.join('?' for _ in cols)+')',[[value(r.get(c)) for c in cols] for r in payload[table]])
    db.execute("CREATE VIEW direct_study_records AS SELECT r.*,p.doi,p.title FROM records r JOIN papers p USING(paper_id) WHERE p.scope='direct_metal_oxo_resist' AND r.data_origin='study_experiment'")
    db.execute("CREATE VIEW direct_study_properties AS SELECT r.*,p.doi,p.title FROM properties r JOIN papers p USING(paper_id) WHERE p.scope='direct_metal_oxo_resist' AND r.data_origin='study_experiment'")
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    db.commit();db.close();temp.replace(output/'mocr.sqlite')
    print(json.dumps({k:len(payload[k]) for k in FIELDS}))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--dataset-dir',type=Path,required=True)
    parser.add_argument('--output-dir',type=Path,default=Path(__file__).resolve().parents[1]/'data')
    args=parser.parse_args();build(args.dataset_dir,args.output_dir)
