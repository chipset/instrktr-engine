# Data Validation

A validation program reads every record, applies a set of checks, and writes a detailed error report. This is one of Easytrieve's most common use cases — quickly auditing a file before it's loaded into a database or processed by a downstream job.

## Validation checklist

For the employee file, a thorough validation checks:

| Check | Easytrieve test |
|---|---|
| Employee ID is not blank | `IF EMP-ID EQ SPACES` |
| Name is not blank | `IF EMP-NAME EQ SPACES` |
| Department is not blank | `IF EMP-DEPT EQ SPACES` |
| Salary is numeric | `IF NOT EMP-SALARY NUMERIC` |
| Salary is greater than zero | `IF EMP-SALARY LE 0` |
| Status is a valid code | `IF EMP-STATUS NE 'A' AND EMP-STATUS NE 'T'` |

## Validation program structure

```
  P
  REPORT ERRLIST  PRINTER
    TITLE   'Employee File Validation Errors'
    HEADING 'ID'     'Field'    'Error Message'
    LINE    EMP-ID   ERR-FIELD  ERR-MSG

  * Initialise error flag for this record
  MOVE 'N' TO ERROR-FLAG

  * Check each field
  IF EMP-ID EQ SPACES
    MOVE 'EMP-ID'         TO ERR-FIELD
    MOVE 'ID is blank'    TO ERR-MSG
    PRINT ERRLIST
    COMPUTE ERROR-COUNT = ERROR-COUNT + 1
  END-IF

  IF NOT EMP-SALARY NUMERIC
    MOVE 'EMP-SALARY'       TO ERR-FIELD
    MOVE 'Salary not numeric' TO ERR-MSG
    PRINT ERRLIST
    COMPUTE ERROR-COUNT = ERROR-COUNT + 1
  END-IF

  * ... more checks ...

  LABEL EOF
  * Print summary
  PRINT SUMMARY
```

## Error summary

A good validation program reports both the individual errors and a final count:

```
  W
  ERROR-COUNT  N  6  VALUE 0
  ERR-FIELD    A  12
  ERR-MSG      A  40

  ...

  LABEL EOF
  IF ERROR-COUNT GT 0
    MOVE 'VALIDATION FAILED' TO RESULT-MSG
  ELSE
    MOVE 'VALIDATION PASSED' TO RESULT-MSG
  END-IF
  PRINT SUMMARY
```

## The exercise

Open [validate.ezt](open:validate.ezt). The FILE section and W section stubs are provided. Write a complete validation program in the `P` section that:

1. Defines an `ERRLIST` report with columns for `EMP-ID`, `ERR-FIELD`, and `ERR-MSG`
2. Checks all six fields listed in the table above
3. For each error: moves the field name to `ERR-FIELD`, moves a message to `ERR-MSG`, prints `ERRLIST`, and increments `ERROR-COUNT`
4. In `LABEL EOF`: sets `RESULT-MSG` to `'VALIDATION PASSED'` or `'VALIDATION FAILED'` based on `ERROR-COUNT`, then prints `SUMMARY`

Click **Check My Work** when done.
