include!("lib.rs");

pub fn main() {
  let path = std::env::args().skip(1).next().expect("Expected file");
  let content = std::fs::read_to_string(path).expect("Expected file");
  let (initial_grid, program) = parse_program(&content).unwrap();
  let mut program_state = init_program(initial_grid, &program);
  loop {
    match step_program(&mut program_state) {
      StepProgramResult::Debug => print_grid(&program_state.grid),
      StepProgramResult::End => break,
      _ => {}
    }
  }
}

pub fn print_grid(grid: &Grid) {
  for y in grid.region.y_min..=grid.region.y_max {
    for x in grid.region.x_min..=grid.region.x_max {
      let cell = grid.cells.get(&(x, y)).copied().unwrap_or((BLANK, BLANK));
      print!("{}{} ", cell.0, cell.1);
    }
    print!("\n")
  }
  print!("\n")
}
