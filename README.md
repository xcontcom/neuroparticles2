# Neuroparticles (v2.0)



This is a sequel to the original [Neuroparticles](https://github.com/xcontcom/neuroparticles), where particles were controlled by fully connected neural networks.
In this version, we've replaced those networks with compact cellular automata - making the system simpler, faster, and fully symbolic.

Each particle is powered by its own evolving automaton, acting as a kind of logic-driven movement engine.
Unlike traditional CA that updates a global field, here each agent uses CA to perceive its environment and decide how to move.

The result? A bunch of little critters that bump, group, chase, or dance across the grid - depending on what evolution teaches them.

## What? o_O
Seriously, just check this out.

We take a grid filled with particles.
Each particle is essentially a cellular automaton with 6 stages (for example).

We do this:

1. Take a 13×13 chunk of the grid around the particle.
2. Apply the particle's cellular automaton to that chunk.
3. Trim the outer border → now we have an 11×11 chunk.
4. Apply the automaton again.
5. Trim again → 9×9.
6. Repeat until we get a 3×3 block.
7. That final 3×3 is used as a movement vector.

This 3×3 becomes a movement vector.

Example:

```
100
010
000
```

The particle moves to the upper-left.

Or:

```
001
001
001
```

The particle moves right.

So our field is filled with particles.
Each particle is an entire cellular automaton.
All automata are different.
We evolve these automata using a genetic algorithm.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Author

Serhii Herasymov  

sergeygerasimofff@gmail.com  

https://github.com/xcontcom

---
