use wasm_bindgen::prelude::*;
use ccsrs::ccs::{Program, Process, Action, Transition, FoldOptions, Dict, DisplayCompressed};
use ccsrs::parser::Parser;
use std::sync::Arc;

#[wasm_bindgen]
pub struct JSCCSProgram {
    program: Program<usize>,
    init: Arc<Process<usize>>,
    dict: Dict
}

#[wasm_bindgen]
impl JSCCSProgram {
    #[wasm_bindgen]
    pub fn get_process(&self) -> JSCCSProcess {
        JSCCSProcess(Arc::clone(&self.init))
    }
}

#[wasm_bindgen]
pub struct JSCCSAction(Action<usize>);

#[wasm_bindgen]
impl JSCCSAction {
    #[wasm_bindgen]
    pub fn is_internal(&self) -> bool {
        match &self.0 {
            Action::Tau | Action::Delta =>
                true,
            _ =>
                false
        }
    }

    #[wasm_bindgen]
    pub fn to_string(&self, program: &JSCCSProgram) -> String {
        format!("{}", DisplayCompressed(&self.0, &program.dict))
    }
}

#[wasm_bindgen]
pub struct JSCCSProcess(Arc<Process<usize>>);

#[wasm_bindgen]
impl JSCCSProcess {
    #[wasm_bindgen]
    pub fn clone(&self) -> JSCCSProcess {
        JSCCSProcess(Arc::clone(&self.0))
    }

    #[wasm_bindgen]
    pub fn get_transitions(&self, program: &JSCCSProgram) -> Result<JSCCSTransitions, JsValue> {
        let fold = FoldOptions {
            fold_exp: true
        };
        match self.0.get_transitions(&program.program, &fold) {
            Ok(trans) => {
                let mut trans: Vec<_> = trans.into_iter().collect();
                trans.sort();
                Ok(JSCCSTransitions(trans))
            },
            Err(err) =>
                Err(JsValue::from(format!("{}", DisplayCompressed(&err, &program.dict))))
        }
    }

    #[wasm_bindgen]
    pub fn to_string(&self, program: &JSCCSProgram) -> String {
        format!("{}", DisplayCompressed(self.0.as_ref(), &program.dict))
    }
}

#[wasm_bindgen]
pub struct JSCCSTransition(Transition<usize>);

#[wasm_bindgen]
impl JSCCSTransition {
    #[wasm_bindgen]
    pub fn get_action(&self) -> JSCCSAction {
        JSCCSAction(self.0.act.clone())
    }

    #[wasm_bindgen]
    pub fn is_sync(&self) -> bool {
        self.0.sync.is_some()
    }

    #[wasm_bindgen]
    pub fn get_sync(&self) -> JSCCSAction {
        JSCCSAction(self.0.sync.as_ref().unwrap().clone())
    }

    #[wasm_bindgen]
    pub fn get_to(&self) -> JSCCSProcess {
        JSCCSProcess(Arc::clone(&self.0.to))
    }
}

#[wasm_bindgen]
pub struct JSCCSTransitions(Vec<Transition<usize>>);

#[wasm_bindgen]
impl JSCCSTransitions {
    #[wasm_bindgen]
    pub fn len(&self) -> usize {
        self.0.len()
    }

    #[wasm_bindgen]
    pub fn get(&self, i: usize) -> JSCCSTransition {
        JSCCSTransition(self.0[i].clone())
    }
}

#[wasm_bindgen]
pub fn parse_program(s: &str) -> Result<JSCCSProgram, JsValue> {
    match Parser::new(s.bytes().map(|b| Ok(b))).parse_program() {
        Ok(program) => {
            let mut dict = Dict::new();
            let program = program.compress(&mut dict);
            let init = Arc::new(program.process().unwrap().clone());
            Ok(JSCCSProgram { program, init, dict })
        },
        Err(err) =>
            Err(JsValue::from(format!("{}", err)))
    }
}
