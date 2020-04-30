# ========== Helper Functions ==========

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

# ========== Preliminaries: Internal State and Homebrew ==========
init_init
is_installed brew || {
  error "Please install Homebrew first"
  echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"'
  exit 1
}

info "Upgrading Homebrew"
brew upgrade

# ========== Make Sure Node.js, WABT, and Yarn Are Installed ==========

info "Checking Node.js"
is_installed node || brew install node;

info "Checking WABT"
is_installed wat2wasm || brew install wabt;

info "Checking Yarn"
is_installed yarn || brew install yarn;

info "Happy, happy, joy, joy!"
