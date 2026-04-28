# Working Storage

The `W` section declares the variables your procedure uses — counters, accumulators, work fields, and flags. These fields exist for the entire run of the program.

## Declaring a working storage field

```
  field-name  type  length  [decimals]  [VALUE literal]
```

| Part | Meaning |
|---|---|
| field-name | Your symbolic name |
| type | `A` = alphanumeric, `N` = numeric display, `P` = packed decimal |
| length | Storage length in bytes (for `N`, this is the number of digits) |
| decimals | Implied decimal places (numeric fields only) |
| VALUE | Initial value; defaults to 0 (numeric) or spaces (alphanumeric) |

## Examples

```
  W
  TOTAL-SAL    N  11  2             Salary accumulator (11 digits, 2 decimal)
  EMP-COUNT    N   6  VALUE 0       Record counter, initialised to 0
  DEPT-SAVE    A   4  VALUE SPACES  Previous department, initialised to spaces
  ERROR-FLAG   A   1  VALUE 'N'     Error flag, starts as 'N'
  WORK-AMT     N   9  2             General-purpose numeric work field
```

## Naming conventions

Working storage names can be up to 40 characters, using letters, digits, and hyphens. They must start with a letter. Choose names that describe the field's purpose — `TOTAL-SALARY` is clearer than `WORK1`.

## When to use each type

| Type | Use for |
|---|---|
| `N` | Dollar amounts, counts, codes that need arithmetic |
| `A` | Text, codes compared with string literals, mixed content |
| `P` | High-precision packed decimal arithmetic (e.g. very large amounts) |

## The exercise

Open [working.ezt](open:working.ezt). The FILE section and field definitions are already complete. Add these working storage fields to the `W` section:

| Field | Type | Length | Decimals | Initial value |
|---|---|---|---|---|
| TOTAL-SAL | N | 11 | 2 | 0 |
| EMP-COUNT | N | 6 | — | 0 |
| DEPT-SAVE | A | 4 | — | SPACES |
| ERROR-FLAG | A | 1 | — | `'N'` |

Click **Check My Work** when done.
