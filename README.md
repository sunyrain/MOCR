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

The results table fits its container: DOI, year and scope share a citation cell; exposure and origin sit under the material; LER and LWR remain separately labelled in one roughness cell. Long values wrap into previews, with the complete original value in the detail dialog. Narrow layouts use stacked record cards. Choose 25, 50 (default) or 100 records per page.

The coverage explorer offers ranked bars, a grouped heatmap and a keyboard-accessible data table. Select core performance, process or pattern fields; group the heatmap by exposure, scope or year. Hover for counts and denominators, click a field or cell to inspect it, then open its present or missing records. Charts follow the page filters; drilling into records keeps the chart's original denominator so the selection does not inflate coverage. Export the current chart as SVG. Coverage measures non-empty fields, not scientific accuracy or training readiness; missing fields may also be inapplicable. The complete field dictionary below the explorer describes the whole public package and does not change with chart filters.

SQLite views `direct_study_records` and `direct_study_properties` select original-study rows in model-classified direct-scope papers. They are not independently validated quantitative benchmarks. Keep dose definitions, size definitions, exposure conditions and units together. A flagged dose requires source review before numerical comparison. Materials have not been deduplicated across papers.

Records were extracted using GPT-6 Astra / medium and checked for schema, material references and source block identity. This is not an independent scientific accuracy assessment. Missing data do not necessarily mean the original paper did not report a value. Consult `coverage_issues` and `review_queue`.

## Public package

`data/dictionary.json` describes joins and missing-value conventions. Source identifiers are retained, but publisher full text, article PDFs, page images, local paths, browser profiles, credentials and model execution logs are **not** distributed here. Follow each DOI to its original source; original publications remain subject to their authors/publishers' rights. No new license for the underlying publications is asserted. Cite the original papers and state extraction and filtering methods when using these data.

## Run locally

```bash
python -m http.server 8000
```

Open http://localhost:8000/. No dependency installation or build step is required for the site.

## OPV visual theme

`style.css` is an unchanged copy of the style block in the reference `OPV/sites/performance-database/index.html`. Header, release banner, six colored statistic cards, filters, compact table and pagination use the same classes and layout. `mocr.css` adds grouped detail views, the field guide, native dialog and keyboard adaptations. `charts.css` styles the analysis entry, interactive charts and record drill-down using the same OPV colors and typography.

`table.css` adds fixed wrapping columns and responsive record cards without changing the shared OPV stylesheet.

Charts use locally bundled [Apache ECharts 5.6.0](https://echarts.apache.org/), served from `vendor/echarts/` without a CDN. Its Apache-2.0 [LICENSE](vendor/echarts/LICENSE) and [NOTICE](vendor/echarts/NOTICE) are included. The readable `coverage.js` component is shared by the browser and field guide; `fields-app.js` supplies the field guide filters.

The modular bundle includes only bar, pie and heatmap charts, SVG rendering, and the components used by the explorer. ZRender and tslib notices are retained beside the bundle. Rebuild it with `npm ci` and `npm run build:charts`; visitors need no package installation.

## Loading and performance

The browser loads `viewer-meta.json`, `papers.jsonl` and the selected table concurrently. Other tables load on selection; material links load for search or details; coverage notes load for details or export. Requests and search indexes are cached in memory. Search retains all original row and linked-material fields, with a 160 ms input debounce. The complete JSON and SQLite downloads are unchanged.

For the 2026-10-10 release, initial data decreased from 3,788,132 to 1,884,786 uncompressed bytes. The chart bundle decreased from 1,034,102 to about 564 KB and loads after the table's first render. A local network sample of the old deployment took 3.34 seconds for ECharts and 2.90 seconds for the full JSON; those requests were previously on a sequential blocking path. These are diagnostic samples, not universal page-load benchmarks. GitHub Pages network latency still varies by location and cache state.

Browser console entries `[MOCR] table-ready` and `[MOCR] charts-ready` report navigation and resource timings for verification. `npm test` checks complete row preservation, material-aware search, request caching, and detail/export context.

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

The exporter also regenerates `viewer-meta.json`. If updating the existing public package directly, run `python scripts/build_viewer_meta.py`. Regenerate the readable field guide with `node scripts/build_field_guide.js`. The published site remains static.
