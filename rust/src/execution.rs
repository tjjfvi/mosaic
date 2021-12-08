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

pub enum StepProgramResult {
  End,
  Debug,
  ReplaceSuccess,
  ReplaceFail,
  LoopStart,
  LoopEnd,
  LoopContinue,
}

pub fn step_program(state: &mut ProgramState) -> StepProgramResult {
  if let Some(stack_top) = state.call_stack.last_mut() {
    if let Some(statement) = stack_top.statements.get(stack_top.i) {
      stack_top.i += 1;
      match statement {
        Statement::Debug => StepProgramResult::Debug,
        Statement::Loop(statements) => {
          state.call_stack.push(ProgramCallStackEntry {
            cont: false,
            i: 0,
            statements,
          });
          StepProgramResult::LoopStart
        }
        Statement::Rule(rule) => {
          let success = apply_rule(&mut state.grid, rule);
          stack_top.cont = stack_top.cont || success;
          if success {
            StepProgramResult::ReplaceSuccess
          } else {
            StepProgramResult::ReplaceFail
          }
        }
      }
    } else {
      let cont = stack_top.cont;
      stack_top.cont = false;
      stack_top.i = 0;
      if state.call_stack.len() == 1 {
        state.call_stack.pop();
        StepProgramResult::End
      } else if cont {
        let l = state.call_stack.len();
        state.call_stack[l - 2].cont = true;
        StepProgramResult::LoopContinue
      } else {
        state.call_stack.pop();
        StepProgramResult::LoopEnd
      }
    }
  } else {
    StepProgramResult::End
  }
}
