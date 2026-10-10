import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';
await build({entryPoints:['scripts/chart-entry.js'],bundle:true,minify:true,format:'iife',globalName:'echarts',outfile:'vendor/echarts/echarts.min.js',legalComments:'none',banner:{js:'/*! Apache ECharts 5.6.0 modular SVG build. See LICENSE, NOTICE, ZRENDER-LICENSE and TSLIB-LICENSE in this directory. */'}});
await copyFile('node_modules/zrender/LICENSE','vendor/echarts/ZRENDER-LICENSE');
await copyFile('node_modules/tslib/LICENSE.txt','vendor/echarts/TSLIB-LICENSE');
await copyFile('node_modules/tslib/CopyrightNotice.txt','vendor/echarts/TSLIB-COPYRIGHT');
