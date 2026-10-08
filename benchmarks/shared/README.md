# Shared benchmark scripts

Every benchmark in this folder follows the same method: extract a draft Design DNA, project its dossier, generate the same app from different design inputs, render it, anonymize the results and review them blind. These scripts hold the parts that do not depend on the stack.

| Path                  | Role                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `lib.mjs`             | Argument parsing, hashing, prompt filling and JSON helpers                               |
| `run-arm.mjs`         | `runArm()`: runs one arm as a fresh `claude -p` session and records time, tokens, hashes |
| `boards.mjs`          | `composeBoards()`: anonymizes captured runs and composes one review board per screen     |
| `project-dossier.mjs` | Projects the Markdown dossier of a draft Design DNA, without accepting it                |
| `check-routing.mjs`   | Compares the routing an extraction wrote with the routing the operator expected          |
| `summarize.mjs`       | Prints the run table with wall time, tokens and list cost                                |

A benchmark folder supplies its brief, rubric, prompts, scaffold and renderer, and calls `runArm()` and `composeBoards()` from small wrappers in its own `scripts/`. Prompts may use `{{SOURCE_ROUTING}}`, filled from the file passed with `--routing`, to tell each arm which subjects each screenshot teaches.
