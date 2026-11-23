"""Sinh lại phần import trong src/index.ts từ các file trong data/dialogues (chạy khi thêm file)."""
import glob, os, re

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
names = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(root, 'data', 'dialogues', '*.json')))
ident = lambda n: n.split('-')[0] + ''.join(p.capitalize() for p in n.split('-')[1:])
p = os.path.join(root, 'src', 'index.ts')
s = open(p, encoding='utf-8').read()
imports = ''.join(f"import {ident(n)} from '../data/dialogues/{n}.json';\n" for n in names)
s = re.sub(r"(import [a-zA-Z]+ from '\.\./data/(?:phrases|dialogues)/[^']+';\n)+", imports, s)
s = re.sub(r"export const dialogues = \[[^\]]*\] as DialogueContent\[\];",
           "export const dialogues = [\n" + ''.join(f"  ...{ident(n)},\n" for n in names) + "] as DialogueContent[];", s)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print(len(names), 'files')
