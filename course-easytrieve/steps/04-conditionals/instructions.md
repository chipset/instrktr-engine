# Conditional Processing

The `P` section contains the logic that executes once for each record read from the primary input file. Conditional statements let you branch based on field values.

## IF / ELSE / END-IF

```
  IF condition
    statements
  ELSE
    statements
  END-IF
```

The `ELSE` clause is optional. `END-IF` terminates the block.

## Comparison operators

| Operator | Meaning |
|---|---|
| `EQ` | Equal |
| `NE` | Not equal |
| `GT` | Greater than |
| `LT` | Less than |
| `GE` | Greater than or equal |
| `LE` | Less than or equal |

## Combining conditions

```
  IF EMP-STATUS EQ 'A' AND EMP-DEPT EQ 'ENGR'
    ...
  END-IF

  IF EMP-SALARY LT 30000 OR EMP-SALARY GT 200000
    ...
  END-IF
```

## Testing for blank and numeric

```
  IF EMP-NAME EQ SPACES
    ...
  END-IF

  IF EMP-SALARY NUMERIC
    ...        (field contains only digits)
  END-IF

  IF NOT EMP-SALARY NUMERIC
    ...        (field contains non-numeric data)
  END-IF
```

## Nested IF

```
  IF EMP-STATUS EQ 'A'
    IF EMP-SALARY GT 0
      COMPUTE TOTAL-SAL = TOTAL-SAL + EMP-SALARY
    ELSE
      * salary is zero for active employee — flag it
      MOVE 'Y' TO ERROR-FLAG
    END-IF
  END-IF
```

## PERFORM

Use `PERFORM` to call a named subroutine defined later in the `P` section:

```
  IF NOT EMP-SALARY NUMERIC
    PERFORM CHECK-ERROR
  END-IF

CHECK-ERROR.
  COMPUTE ERROR-COUNT = ERROR-COUNT + 1
```

Subroutine labels end with a period (`.`).

## The exercise

Open [conditionals.ezt](open:conditionals.ezt). The FILE and W sections are complete. In the `P` section, write logic to:

1. Check if `EMP-STATUS` equals `'A'` (active)
2. If active, check if `EMP-SALARY` is `NUMERIC`
3. If salary is numeric, accumulate it into `TOTAL-SAL` and increment `EMP-COUNT`
4. If salary is not numeric, set `ERROR-FLAG` to `'Y'`

Click **Check My Work** when done.
