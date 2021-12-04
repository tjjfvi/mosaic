use std::collections::HashMap;

type Pos = (isize, isize);
type Cell = (char, char);

const WILD: char = '_';
const BLANK: char = '.';

#[derive(Default, Debug)]
struct Grid {
  cells: HashMap<Pos, Cell>,
  region: Region,
}

#[derive(Default, Debug)]
struct Region {
  set: bool,
  x_min: isize,
  x_max: isize,
  y_min: isize,
  y_max: isize,
}

impl Region {
  pub fn expand_to(&mut self, pos: Pos) {
    if !self.set {
      self.x_min = pos.0;
      self.x_max = pos.0;
      self.y_min = pos.1;
      self.y_max = pos.1;
      self.set = true;
    } else {
      self.x_min = std::cmp::min(self.x_min, pos.0);
      self.x_max = std::cmp::max(self.x_max, pos.0);
      self.y_min = std::cmp::min(self.y_min, pos.1);
      self.y_max = std::cmp::max(self.y_max, pos.1);
    }
  }
}

fn match_pat(cell: Cell, pat: Cell) -> bool {
  (pat.0 == WILD || cell.0 == pat.0) && (pat.1 == WILD || cell.1 == pat.1)
}

fn apply_repl(cell: &mut Cell, repl: Cell) -> Cell {
  if repl.0 != WILD {
    cell.0 = repl.0
  }
  if repl.1 != WILD {
    cell.1 = repl.1
  }
  *cell
}

#[derive(Debug)]
struct Rule {
  pat: Grid,
  pat_init: Region,
  repl: Grid,
}

fn apply_rule(grid: &mut Grid, rule: &Rule) -> bool {
  for ox in grid.region.x_min - rule.pat_init.x_min..=grid.region.x_max - rule.pat_init.x_max {
    'search: for oy in
      grid.region.y_min - rule.pat_init.y_min..=grid.region.y_max - rule.pat_init.y_max
    {
      for (&(px, py), &pat) in &rule.pat.cells {
        if !match_pat(
          *grid
            .cells
            .get(&(px + ox, py + oy))
            .unwrap_or(&(BLANK, BLANK)),
          pat,
        ) {
          continue 'search;
        }
      }
      for (&(rx, ry), &repl) in &rule.repl.cells {
        let pos = (rx + ox, ry + oy);
        if apply_repl(grid.cells.entry(pos).or_insert((BLANK, BLANK)), repl) != (BLANK, BLANK) {
          grid.region.expand_to(pos);
        }
      }
      // print_grid(&grid);
      return true;
    }
  }
  false
}

#[derive(Debug)]
enum Statement {
  Rule(Rule),
  Loop(Vec<Statement>),
  Debug,
}

fn parse_program(input: &str) -> Result<(Grid, Vec<Statement>), &'static str> {
  let mut input = input.chars().peekable();
  while input.peek() == Some(&'\n') {
    input.next();
  }
  let mut initial_grid = Grid::default();

  'y: for y in 0.. {
    'x: for x in 0.. {
      if let Some('\n') | None = input.peek() {
        if x == 0 {
          break 'y;
        } else {
          break 'x;
        }
      }
      let a = input.next().ok_or("Expected cell")?;
      let b = input.next().ok_or("Expected cell")?;
      if a == ' ' || b == ' ' {
        return Err("Unexpected space");
      }
      let cell = (a, b);
      if (a, b) != (BLANK, BLANK) {
        initial_grid.cells.insert((x, y), cell);
        initial_grid.region.expand_to((x, y));
      }
      match input.next() {
        Some(' ') => {}
        Some('\n') => break 'x,
        None => break 'y,
        _ => return Err("Expected space or newline"),
      }
    }
  }
  let mut group_stack: Vec<Vec<Statement>> = vec![vec![]];
  while input.peek().is_some() {
    skip_whitespace(&mut input);
    if lookahead_command(&mut input) {
      match input.next().unwrap() {
        '.' => group_stack.last_mut().unwrap().push(Statement::Debug),
        '[' => group_stack.push(vec![]),
        ']' => {
          let statement = Statement::Loop(group_stack.pop().unwrap());
          if let Some(v) = group_stack.last_mut() {
            v.push(statement)
          } else {
            return Err("Unmatched ']'");
          }
        }
        _ => return Err("Unrecognized command"),
      }
    } else if input.peek() != None {
      parse_rule(&mut input, &mut group_stack)?;
    }
  }
  if group_stack.len() > 1 {
    return Err("Unmatched '['");
  }
  Ok((initial_grid, group_stack.pop().unwrap()))
}

fn parse_rule(
  input: &mut std::iter::Peekable<std::str::Chars>,
  group_stack: &mut Vec<Vec<Statement>>,
) -> Result<(), &'static str> {
  let mut pat = Grid::default();
  let mut pat_init = Region::default();
  let mut repl = Grid::default();
  let mut max_width = 0;
  let mut divider = None;
  'y: for y in 0.. {
    skip_single_line_whitespace(input);
    'x: for x in 0.. {
      let prev_max_width = max_width;
      max_width = std::cmp::max(max_width, x);
      if lookahead_command(input) {
        break 'y;
      }
      match input.next() {
        Some(' ') => {
          while input.peek() == Some(&' ') {
            input.next();
          }
          if divider.is_some() {
            if divider != Some(x) {
              return Err("Misaligned divider");
            }
          } else {
            if x <= prev_max_width {
              return Err("Misaligned divider");
            }
            divider = Some(x);
          }
        }
        Some('\n') => {
          if x == 0 {
            break 'y;
          }
          skip_single_line_whitespace(input);
          if lookahead_command(input) {
            break 'y;
          }
          break 'x;
        }
        None => break 'y,
        Some(a) => {
          let b = input.next().ok_or("Expected cell")?;
          if b == ' ' {
            return Err("Unexpected space");
          }
          if divider.map(|d| x > d) == Some(true) {
            if (a, b) != (WILD, WILD) {
              let pos = (x - divider.unwrap() - 1, y);
              repl.cells.insert(pos, (a, b));
              repl.region.expand_to(pos)
            }
          } else {
            let pos = (x, y);
            if (a, b) != (WILD, WILD) {
              pat.cells.insert(pos, (a, b));
              pat.region.expand_to(pos)
            }
            if !((a == WILD || a == BLANK) && (b == WILD || b == BLANK)) {
              pat_init.expand_to(pos)
            }
          }
          match input.next() {
            Some(' ') => {}
            Some('\n') => break 'x,
            None => break 'y,
            _ => return Err("Expected space or newline"),
          }
        }
      }
    }
  }
  if divider.is_none() {
    return Err("Missing divider");
  }
  Ok(group_stack.last_mut().unwrap().push(Statement::Rule(Rule {
    pat,
    pat_init,
    repl,
  })))
}

fn lookahead_command(input: &mut std::iter::Peekable<std::str::Chars>) -> bool {
  input.peek().cloned().map(char::is_whitespace) == Some(false)
    && input.clone().skip(1).next().map(char::is_whitespace) != Some(false)
}

fn skip_single_line_whitespace(input: &mut std::iter::Peekable<std::str::Chars>) {
  while input
    .peek()
    .copied()
    .map(|x| char::is_whitespace(x) && x != '\n')
    == Some(true)
  {
    input.next();
  }
}

fn skip_whitespace(input: &mut std::iter::Peekable<std::str::Chars>) {
  while input.peek().copied().map(char::is_whitespace) == Some(true) {
    input.next();
  }
}

fn exec(grid: &mut Grid, statements: &Vec<Statement>) -> bool {
  let mut cont = false;
  for statement in statements {
    match statement {
      Statement::Debug => print_grid(&grid),
      Statement::Loop(vec) => {
        while exec(grid, vec) {
          cont = true;
        }
      }
      Statement::Rule(rule) => cont = apply_rule(grid, rule) || cont,
    }
  }
  cont
}

fn print_grid(grid: &Grid) {
  for y in grid.region.y_min..=grid.region.y_max {
    for x in grid.region.x_min..=grid.region.x_max {
      let cell = grid.cells.get(&(x, y)).copied().unwrap_or((BLANK, BLANK));
      print!("{}{} ", cell.0, cell.1);
    }
    print!("\n")
  }
  print!("\n")
}

fn main() {
  let (mut grid, statements) = parse_program(include_str!("../../examples/cgol.quilt")).unwrap();
  print_grid(&grid);
  exec(&mut grid, &statements);
  print_grid(&grid);
}
