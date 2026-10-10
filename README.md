# MOCR — Metal-Oxo Cluster Photoresist Database

Browse: **https://sunyrain.github.io/MOCR/**

MOCR organizes literature-derived materials, lithography performance, properties and source references. The static interface uses the OPV-DB browser's original stylesheet and component layout, with fields specific to metal-oxo cluster and organic-ligand photoresists.

## Release: 2026-10-10

| Content | Count |
|---|---:|
| Extracted papers | 231 |
| Directly related papers, model-classified | 135 |
| Lithography records | 2,180 |
| Property records | 1,571 |
| Paper-local material entries | 965 |

The paper set also contains 20 related papers, 15 reviews and 61 out-of-scope papers. They remain available for transparent screening. Another 43 source records lack full text, including one generic proceedings-series entry excluded from the article download queue. Failure to acquire a paper does not establish permanent unavailability.

## Using the data

Use the search, scope, origin, exposure and year filters; select a record to inspect grouped performance cards, labelled process conditions and associated material cards. Source block/page identifiers and coverage limitations are available in expandable sections. The detail view preserves original scientific values without displaying serialized JSON. [Field guide and coverage](https://sunyrain.github.io/MOCR/fields.html) describes every public table and nested process field. Download the filtered JSON, the full `data/mocr.json`, individual JSONL tables or `data/mocr.sqlite`.

SQLite views `direct_study_records` and `direct_study_properties` select original-study rows in model-classified direct-scope papers. They are not independently validated quantitative benchmarks. Keep dose definitions, size definitions, exposure conditions and units together. A flagged dose requires source review before numerical comparison. Materials have not been deduplicated across papers.

Records were extracted using GPT-6 Astra / medium and checked for schema, material references and source block identity. This is not an independent scientific accuracy assessment. Missing data do not necessarily mean the original paper did not report a value. Consult `coverage_issues` and `review_queue`.

## Public package

`data/dictionary.json` describes joins and missing-value conventions. Source identifiers are retained, but publisher full text, article PDFs, page images, local paths, browser profiles, credentials and model execution logs are **not** distributed here. Follow each DOI to its original source; original publications remain subject to their authors/publishers' rights. No new license for the underlying publications is asserted. Cite the original papers and state extraction and filtering methods when using these data.

## Run locally

```bash
python -m http.server 8000
```

Open http://localhost:8000/. No dependencies or build step are required for the site.

## OPV visual theme

`style.css` is an unchanged copy of the style block in the reference `OPV/sites/performance-database/index.html`. Header, release banner, six colored statistic cards, filters, summary bars, compact table and pagination use the same classes and layout. `mocr.css` adds grouped detail views, the field guide, native dialog and keyboard adaptations using the same theme variables.

To synchronize from the local OPV reference, run from this repository:

```bash
python scripts/sync_opv_theme.py --source ../../OPV/sites/performance-database/index.html
```

## Rebuild data

To rebuild the public payload from a local curated MOCR export:

```bash
python scripts/build_data.py --dataset-dir /path/to/MOCR/data/exports/final_dataset
```

The exporter uses explicit field allowlists. The source dataset is not included in this repository. GitHub Pages serves the root of the `main` branch.

After updating the public data, regenerate the readable field guide with `node scripts/build_field_guide.js`. Node is only required for this optional generation step; the published site remains static.
