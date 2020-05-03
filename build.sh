# Invoke rustc directly instead of going through cargo or wasm-pack.
#   * LTO is critical for reducing binary size.
#   * So is stripping of debug information. Though for unknown reasons
#     rustc ignores the `debuginfo=0` option, hence the `--strip-debug`
#     option for `wasm-opt`.

RAW_RELIB="wasm/relib.0.wasm"
OPT_RELIB="wasm/relib.wasm"

rustc --edition 2018 \
    --target wasm32-unknown-unknown \
    -C debug-assertions=no \
    -C debuginfo=0 \
    -C lto=yes \
    -C opt-level=z \
    -C overflow-checks=no \
    -C panic=abort \
    --crate-type=cdylib \
    rust/relib.rs \
    -o "$RAW_RELIB"

# Binaryen's wasm-opt further shrinks binary.
wasm-opt -Oz --strip-debug "$RAW_RELIB" -o "$OPT_RELIB" && {
    rm "$RAW_RELIB"
}
