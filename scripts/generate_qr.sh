#!/bin/bash
# Generate QR code SVG for book entries

set -euo pipefail

cd "$(dirname "$0")"

# Generate QR codes for all book entries
qrencode -t SVG -l H -s 5 -o ../img/qr/rust-reviewing-rust.svg "https://andygauge.github.io/rust-reviewing-rust/"  # QR for Reviewing Rust

qrencode -t SVG -l H -s 5 -o ../img/qr/reducibility.svg "https://andygauge.github.io/reducibility/"  # QR for Reducibility

qrencode -t SVG -l H -s 5 -o ../img/qr/np-hard.svg "https://andygauge.github.io/np-hard/"  # QR for NP-Hard

qrencode -t SVG -l H -s 5 -o ../img/qr/krishnamurti.svg "https://andygauge.github.io/krishnamurti/"  # QR for JK

qrencode -t SVG -l H -s 5 -o ../img/qr/n-or-p.svg "https://andygauge.github.io/n-or-p/"  # QR for N or P

qrencode -t SVG -l H -s 5 -o ../img/qr/unitive.svg "https://andygauge.github.io/unitive/"  # QR for Unitive

# Generate QR codes for any missing entries
for file in ../img/qr/*.svg; do
  if [[ ! -f "$file" ]]; then
    echo "Generating QR code for missing file: $file"
    repo_name=$(basename "$file" .svg)
    url="https://andygauge.github.io/${repo_name}/"
    qrencode -t SVG -l H -s 5 -o "$file" "$url"
  fi
done