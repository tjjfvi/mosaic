# `mosaic`

_An esoteric programming language centered on doing computations by creating beautiful mosaics_

Created for [langjam #2](https://github.com/langjam/jam0002).

Try it out at the [online interpreter](https://mosaic.t6.fyi/), featuring procedurally generated 3D mosaics!

## Installation

- Install the [Rustup toolchain](https://www.rust-lang.org/tools/install)
- `cargo run --release your/file.mosaic`

Expects input from stdin, writes output to stdout, and debug info to stderr.

To build the interactive interpreter (an online version is available at
https://mosaic.t6.fyi/):

- Install node.js (in addition to rust from earlier)
- `cd web && npm i && npm run serve`
- Open `localhost:8080`

## Documentation

### Starting Mosaic

The mosaic is an infinite grid of tiles. Each tile is represented by 2
characters; the first represents the color of the tile, and the second
respresents the symbol on the tile.

The program source code consists of a starting mosaic and a list of
instructions, the most important of which are replacement patterns.

The starting mosaic is defined using a grid of pairs of characters, separated by
spaces and newlines.

For examples, here is a 3x3 grid containing 5 non-blank tiles (non-trailing
blank tiles are represented by `..` (two periods)):

```
ab cd ef
.. 12
x#
```

The rest of the infinite mosaic is intialized with blank tiles.

Next follows a list of instructions. The most important kind of instruction is
the replacement pattern.

### Replacement Rules

Replacement rules are represented by two grids, separated by multiple spaces;
the left is the pattern and the right is the replacement. The special character
`_` acts as a wildcard.

Here is an example of a replacement pattern that operates on a 2x2 section of the mosaic:

```
a_ cd  aa ..
.. __  cd __
```

Applying this rule to the above starting mosaic would result in:

```
aa .. ef
cd 12
x#
```

If we tried to apply the rule again, it would not succeed, as there is no
section of the mosaic matching its pattern.

### Control Flow

Control flow in mosaic is accomplished through loops. Loops are opened and
closed with `[` and `]`, respectively, and their body consists of one or more statements.

When a loop is reached, it first runs all of the instructions in the body. If
any replacement patterns succeeded, it will run its body again. Once all of the
instructions in the body are run and no replacement patterns succeed, the loop
ends, and flow continues to the next instruction.

For example, given this program:

```
aa .. .. bb


[
  aa ..   .. aa
]
```

Execution would proceed as follows:

- The mosaic is initialized to `aa .. .. .. bb`.
- The loop is entered.
- The replacement pattern is successfully applied, changing the mosaic to `.. aa .. bb`.
- The end of the loop is reached. A replacement pattern was successfully applied,
  so we return to the start of the loop.
- The replacement pattern is successfully applied, changing the mosaic to `.. .. aa bb`.
- The end of the loop is reached. A replacement pattern was successfully applied,
  so we return to the start of the loop.
- The replacement pattern does not match, so we skip it.
- The end of the loop is reached. No replacement pattern was successfully applied,
  so we exit the loop.
- The end of the program is reached.

### Commands

The other type of instruction are the special commands. They should be written
on their own line.

- `.`: debug (in the command line version, prints a textual representation of
  the mosaic; in the visual interpreter, lingers on the frame)
- `

### I/O

I/O in mosaic is accomplished through four commands: `i`, `I`, `o` and `O`. `i`
and `I` both do input, and `o` and `O` both do output. `i` and `o` use a
character encoding, while `I` and `O` use a binary encoding (explained further
below).

#### `i`

The `i` command will read a byte from input and put it in the symbol position
(the second character) of the first tile matching the passed-in pattern.

For example, given:

```
aa ab

i a_
```

If the input is `X`, the mosaic will become:

```
aX ab
```

If the character is invalid (usually whitespace) or the input is empty, it will make no replacements.

If no tiles match the pattern, it will not consume any input.

#### `I`

Like `i`, `I` reads a byte from the input, but it uses a binary encoding. It
will replace the symbol position of the first 8 tiles matching the pattern with
either `0` or `1`.

For example, given:

```
aa ab ac ad
aa ab ac ad ae

I a_
```

If the input is `X` (`01011000` in binary), the mosaic will become:

```
a0 a1 a0 a1
a1 a0 a0 a0 ae
```

If the input is empty, no replacements will be made.

If fewer than 8 tiles match the pattern, no replacements will be made and no
input will be consumed.

#### `o`

`o` finds the first tile matching the pattern and outputs the character in the
symbol position (the second character).

For example, given:

```
aX aY

o a_

o _Y
```

The output will be `XY`.

If no tile matches the pattern, nothing will be ouptutted.

#### `O`

`O` finds the first 8 tiles matching the pattern and outputs the character
represented by the symbols of the tiles interpreted as binary (where `1` is `1`
and any other character is `0`).

For example, given:

```
a0 a1 az a1
a1 a0 a0 a0 ae

O a_
```

The output will be `X` (`01011000` in binary).

If there are fewer than 8 tiles matching the pattern, nothing will be outputted.

#### I/O Example

A simple `cat` program:

```
i. i. i. i. i. i. i. i.

[
  I i. # input into the 8 `i.` tiles

  [
    i.  .. # if any tiles are still `i.`, eof was reached, so replace each with `i.`
  ]

  O i_ # output the byte just inputted

  [ # return the bits to `i.` for the next iteration of the loop
    i0  i.

    i1  i.
  ]
]
```
