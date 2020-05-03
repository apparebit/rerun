// A minimal, low-level implementation of rerun's standard library.

#[no_mangle]
pub extern "C" fn exponentiate(base: u32, exp: u32) -> u32 {
  base.pow(exp)
}
