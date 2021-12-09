use mosaic::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Program {
  state: ProgramState<'static>,
  _program: Box<Vec<Statement>>,
}

#[wasm_bindgen]
impl Program {
  #[wasm_bindgen]
  pub fn new(string: &str) -> Result<Program, JsValue> {
    let (grid, program) = parse_program(string)?;
    let program = Box::new(program);
    let state = init_program(grid, unsafe { std::mem::transmute(&*program) });
    Ok(Program {
      state,
      _program: program,
    })
  }
  #[wasm_bindgen]
  pub fn step(&mut self) -> bool {
    step_program(&mut self.state)
  }
  #[wasm_bindgen]
  pub fn grid_min_x(&self) -> JsRegion {
    let Region {
      x_min,
      y_min,
      x_max,
      y_max,
      ..
    } = self.state.grid.region;
    JsRegion {
      x_min,
      y_min,
      x_max,
      y_max,
    }
  }
  #[wasm_bindgen]
  pub fn grid_get_0(&self, x: isize, y: isize) -> Option<JsCell> {
    self
      .state
      .grid
      .cells
      .get(&(x, y))
      .map(|&(color, symbol)| JsCell { color, symbol })
  }
}

#[wasm_bindgen]
pub struct JsCell {
  pub color: char,
  pub symbol: char,
}

#[wasm_bindgen]
pub struct JsRegion {
  pub x_min: isize,
  pub y_min: isize,
  pub x_max: isize,
  pub y_max: isize,
}

#[wasm_bindgen]
pub fn hi() -> String {
  "hi".to_string()
}
