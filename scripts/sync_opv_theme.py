"""Copy the OPV reference stylesheet verbatim, keeping MOCR visuals in sync."""
import argparse
from pathlib import Path
import re

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True, help='OPV browser index.html')
args = parser.parse_args()
match = re.search(r'<style>(.*?)</style>', args.source.read_text(encoding='utf8'), re.S)
if not match:
    raise SystemExit('No reference stylesheet found')
target = Path(__file__).resolve().parents[1] / 'style.css'
target.write_text(match.group(1).strip() + '\n', encoding='utf8')
print(f'Synced OPV stylesheet to {target.name}')
