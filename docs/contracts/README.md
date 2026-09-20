# Behavioral Contracts

Contracts describe approved observable behavior without prescribing unnecessary
implementation details. Name contracts `CONTRACT-NNN-short-description.md` and
link them from related tasks and ADRs.

An approved contract is changed through explicit human review, not silently during
implementation.

## Retiring a contract

When an approved contract turns out to be materially wrong or incomplete — not a
small clarifying edit, but a real gap or defect discovered during implementation
or review — retire it rather than editing it in place. This mirrors this
project's ADR convention: a later decision supersedes an earlier one rather than
silently rewriting its history.

- Set the retired contract's `Status:` to `Retired — superseded by CONTRACT-NNN`
  and add a short note explaining what gap or defect made it insufficient. Leave
  the rest of the file intact as a historical record; do not delete it.
- Create a new contract with the next sequential number, carrying forward
  everything from the retired one that's still correct, with the fix folded in.
  Its own header links back to the contract it supersedes and states why.
- Retiring a contract does not retroactively invalidate tasks already completed
  under it. Check whether their acceptance criteria still hold in light of the
  fix; open a new task if they don't.
- Only the human approves a retirement, the same as any other contract change.
