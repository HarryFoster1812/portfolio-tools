#!/usr/bin/env bash
set -euo pipefail

echo "Installing Rust"
curl https://sh.rustup.rs -sSf | sh -s -- -y
export PATH="$HOME/.cargo/bin:$PATH"

echo "Installing wasm target"
rustup target add wasm32-unknown-unknown

echo "Installing wasm-pack"
cargo install wasm-pack

echo "Fetching submodules"
git submodule update --init --recursive

echo "Building WASM crates"
for crate in modules/*; do
  if [ -f "$crate/Cargo.toml" ]; then
    name=$(basename "$crate")

    wasm-pack build \
      --target web \
      --release \
      --out-dir src/lib/wasm/$name/pkg \
      --out-name $name \
      "$crate"
  fi
done

echo "Installing JS deps"
npm install

echo "Building Vite"
vite build
