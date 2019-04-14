#/bin/sh
mkdir -p wasm
cargo build --release --target wasm32-unknown-unknown || exit 1
wasm-bindgen target/wasm32-unknown-unknown/release/ccsrs_wasm.wasm --no-modules --no-typescript --out-dir wasm
