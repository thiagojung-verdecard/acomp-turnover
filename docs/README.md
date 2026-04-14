# Project Documentation

## Contents

- `decisions/` — Architecture Decision Records (ADRs)

## Adding a New ADR

Use the `/write-docs` prompt in Copilot chat:

```
/write-docs adr: <your decision title>
```

Or create manually at `docs/decisions/ADR-NNNN-<slug>.md` following the template:

```markdown
# ADR-NNNN: <Title>

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-XXXX

## Context
<Why is this decision needed?>

## Decision
<What was decided?>

## Consequences
<What are the trade-offs and impacts?>
```
