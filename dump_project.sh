#!/usr/bin/env bash

output="dump_project.txt"

echo "Generating project dump to $output ..."
echo "======================================"

rm -f "$output"

find demo-vite-app \
  -type f \
  \( -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.css" \) \
  -and ! -path "*/node_modules/*" \
  -and ! -path "*/.git/*" \
  -and ! -path "*/.yarn/*" \
  -and ! -path "*/dist/*" \
  -and ! -path "*/build/*" \
| while read -r file; do
    echo "========== FILE: $file ==========" >> "$output"
    cat "$file" >> "$output"
    echo -e "\n\n" >> "$output"
done

echo "Done!"
echo "Output written to: $output"
