# `mosaic`

_An esoteric programming language centered on doing computations by creating beautiful mosaics_

Created for [langjam #2](https://github.com/langjam/jam0002).

Try it out at the [online interpreter](https://mosaic.t6.fyi/), featuring procedurally generated 3D mosaics!

---

To mosaic is an infinite grid of tiles.
Each tile is represented by 2 characters; the first represents the color of the
tile, and the second respresents the symbol of the tile.

The special blank tile is represented by `..` (two periods).

The program source code consists of a starting mosaic and a list of
instructions.

The starting mosaic should be structured as follows:

```
ab cd ef
gh ij kl
mn op qr
```

In mosaic, programs consist of rules to manipulate the mosaic.
