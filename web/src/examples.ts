// @ts-nocheck

import bf from "../../examples/bf.mosaic"
import cgol from "../../examples/cgol.mosaic"
import fact from "../../examples/fact.mosaic"
import fib from "../../examples/fib.mosaic"
import logo from "../../examples/logo.mosaic"

const cgolInput = `
XXXXXX.XX
XXXXXX.XX
.......XX
XX.....XX
XX.....XX
XX.....XX
XX.......
XX.XXXXXX
XX.XXXXXX
`.trim()
export const examples: Record<string, [name: string, title: string, input?: string]> = {
  logo: ["Logo", logo],
  cgol: ["Conway's Game of Life", cgol, cgolInput],
  fact: ["Factorial Calculator", fact, "101"],
  fib: ["Fibonacci Sequence", fib],
  bf: ["BF Interpreter", bf, ">,[>,]<[.<]\nabc"],
}
