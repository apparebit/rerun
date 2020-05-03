# ======================================== Helpers

init_init() {
  if [ -t 1 ]; then
    INFO_ON=$(printf '\033[36;1m')
    INFO_OFF=$(printf '\033[39;22m')
    ERROR_ON=$(printf '\033[97;41;1m')
    ERROR_OFF=$(printf '\033[39;49;22m')
  else
    INFO_ON=""
    INFO_OFF=""
    ERROR_ON=""
    ERROR_OFF=""
  fi
}

info() {
  echo ${INFO_ON}"INFO  $@"${INFO_OFF} >&2
}

error() {
  echo ${ERROR_ON}"ERROR $@"${ERROR_OFF} >&2
}

is_installed() {
  command -v "$@" >/dev/null 2>&1
}

init_init

# ======================================== Homebrew

is_installed brew || {
  error "Please install Homebrew first"
  echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"'
  exit 1
}

info "Upgrading Homebrew"
brew upgrade

# ======================================== JavaScript

info "Checking Node.js"
is_installed node || brew install node;

info "Checking Yarn"
is_installed yarn || brew install yarn;

# ======================================== WebAssembly

info "Checking WABT"
is_installed wat2wasm || brew install wabt;

info "Checking Binaryen"
is_installed wasm-opt || brew install binaryen;

# ======================================== Rust

info "Checking Rust"
is_installed rustup || {
  info "Installing Rust"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
}

info "Checking Rust WASM Target"
rustup target list --installed | grep -q wasm32-unknown-unknown || {
  rustup target add wasm32-unknown-unknown
}

# ======================================== Relib

info "Building Relib"
./build.sh

# ========== Et Voila!
info "Happy, happy, joy, joy!"
