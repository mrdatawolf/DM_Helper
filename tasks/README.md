# Tasks

Task files move through these directories as they progress; the directory a
task file lives in is its authoritative lifecycle state. See
`docs/workflow/lifecycle.md` for the full state machine and transition
authority.

```
proposed/      A plan exists, but implementation is not authorized.
approved/      The human approved the task; ready to be assigned.
in-progress/   An assigned specialist is actively working on it.
review/        Implementation and its handoff are ready for independent
               review and human acceptance.
completed/     The human accepted the work.
```

Only the human moves a task from `proposed/` into `approved/`. New task files
should follow `docs/templates/task.md` and be named `TASK-NNN-short-description.md`.
