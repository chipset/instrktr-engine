# Arithmetic and Accumulators

Easytrieve provides the `COMPUTE` statement for all arithmetic and the `MOVE` statement for assignments. Report footings can also accumulate totals automatically.

## COMPUTE

```
  COMPUTE result-field = expression
```

Supported operators:

| Operator | Operation |
|---|---|
| `+` | Addition |
| `-` | Subtraction |
| `*` | Multiplication |
| `/` | Division |

Examples:

```
  COMPUTE TOTAL-SAL   = TOTAL-SAL + EMP-SALARY
  COMPUTE EMP-COUNT   = EMP-COUNT + 1
  COMPUTE AVG-SALARY  = TOTAL-SAL / EMP-COUNT
  COMPUTE GROSS-PAY   = BASE-PAY + OVERTIME * 1.5
```

All fields used in a `COMPUTE` must be defined — either as file fields or in the `W` section.

## MOVE

Assigns a literal or field value without arithmetic:

```
  MOVE 'Y'      TO ERROR-FLAG
  MOVE EMP-DEPT TO DEPT-SAVE
  MOVE ZEROS    TO TOTAL-SAL
  MOVE SPACES   TO WORK-FIELD
```

`ZEROS` and `SPACES` are Easytrieve built-in literals.

## Automatic report accumulators

Instead of writing `COMPUTE` statements, you can let Easytrieve accumulate totals for you directly in the REPORT definition. Add `SUM` or `COUNT` on the `LINE` or `FOOTING`:

```
  REPORT EMPRPT  PRINTER
    TITLE   'Employee Salary Report'
    HEADING 'ID'      'Name'     'Dept'   'Salary'
    LINE    EMP-ID    EMP-NAME   EMP-DEPT EMP-SALARY
    FOOTING 'Totals'             COUNT    SUM EMP-SALARY
```

- `COUNT` — automatically counts records printed on this report
- `SUM EMP-SALARY` — accumulates the salary field for all printed records

## End-of-file processing

Use the `EOF` label to write summary information after the last record:

```
  LABEL EOF
  COMPUTE AVG-SALARY = TOTAL-SAL / EMP-COUNT
  PRINT SUMMARY
```

`LABEL EOF` is a reserved label that Easytrieve calls automatically at end of input.

## The exercise

Open [arithmetic.ezt](open:arithmetic.ezt). Extend the report program to:

1. Add `AVG-SALARY  N  11  2  VALUE 0` to the W section
2. After the `PRINT EMPRPT` line, accumulate salary and count (if not already doing so)
3. After the main record loop, add a `LABEL EOF` block that:
   - Computes `AVG-SALARY = TOTAL-SAL / EMP-COUNT`
   - Prints the values using a `PRINT SUMMARY` call
4. Define a `REPORT SUMMARY PRINTER` with a FOOTING line showing `EMP-COUNT`, `TOTAL-SAL`, and `AVG-SALARY`

Click **Check My Work** when done.
