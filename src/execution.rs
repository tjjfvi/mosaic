use crate::*;

pub struct ProgramState<'a> {
  pub grid: Grid,
  pub call_stack: Vec<ProgramCallStackEntry<'a>>,
}

pub struct ProgramCallStackEntry<'a> {
  pub cont: bool,
  pub i: usize,
  pub statements: &'a Vec<Statement>,
}

pub fn init_program(grid: Grid, program: &Vec<Statement>) -> ProgramState {
  ProgramState {
    grid,
    call_stack: vec![ProgramCallStackEntry {
      cont: false,
      i: 0,
      statements: program,
    }],
  }
}

#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub enum StepProgramResult {
  ReplaceSuccess,
  Debug,
  End,
}

pub fn step_program(state: &mut ProgramState, pause_on_replace: bool) -> StepProgramResult {
  while let Some(stack_top) = state.call_stack.last_mut() {
    if let Some(statement) = stack_top.statements.get(stack_top.i) {
      stack_top.i += 1;
      match statement {
        Statement::Debug => {
          if stack_top.i - 1 == 0 || stack_top.cont || state.call_stack.len() == 1 {
            return StepProgramResult::Debug;
          }
        }
        Statement::Loop(statements) => {
          state.call_stack.push(ProgramCallStackEntry {
            cont: false,
            i: 0,
            statements,
          });
        }
        Statement::Rule(rule) => {
          let success = apply_rule(&mut state.grid, rule);
          stack_top.cont = stack_top.cont || success;
          if success && pause_on_replace {
            return StepProgramResult::ReplaceSuccess;
          }
        }
      }
    } else {
      let cont = stack_top.cont;
      stack_top.cont = false;
      stack_top.i = 0;
      if state.call_stack.len() == 1 {
        state.call_stack.pop();
        break;
      } else if cont {
        let l = state.call_stack.len();
        state.call_stack[l - 2].cont = true;
      } else {
        state.call_stack.pop();
      }
    }
  }
  return StepProgramResult::End;
}
