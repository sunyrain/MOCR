"""Build small browser metadata from the public package; retain full JSONL rows."""
import json
from pathlib import Path
from collections import Counter


def build_meta(payload, output):
    meta = {
        'release': payload['release'],
        'counts': {k: len(v) for k, v in payload.items() if isinstance(v, list)},
        'paper_counts': {k: dict(Counter(r['paper_id'] for r in payload[k]))
                         for k in ('records', 'properties', 'materials')},
        'exposures': sorted({r['exposure'] for r in payload['records'] if r.get('exposure')}),
        'years': sorted({r['year'] for k in ('papers', 'missing_fulltext')
                         for r in payload[k] if r.get('year')}, reverse=True),
        'unit_reviews': sum(r.get('category') == 'unit_conflict' for r in payload['review_queue']),
        'excluded_non_articles': sum(bool(r.get('excluded_non_article')) for r in payload['missing_fulltext']),
    }
    (output / 'viewer-meta.json').write_text(json.dumps(meta, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    return meta


if __name__ == '__main__':
    output = Path(__file__).resolve().parents[1] / 'data'
    build_meta(json.loads((output / 'mocr.json').read_text(encoding='utf8')), output)
