# JCL to Execute Easytrieve

Easytrieve Plus programs run as batch jobs on z/OS. You submit them with JCL that identifies the Easytrieve load module, defines the datasets, and provides your source code.

## The load module

The Easytrieve Plus load module is **`EZTPA00`**. Execute it with a standard EXEC statement:

```jcl
//STEP1    EXEC PGM=EZTPA00
```

## Required DD statements

| DD name | Purpose |
|---|---|
| `SYSPRINT` | Report output destination (usually `SYSOUT=*`) |
| `SYSIN` | Your Easytrieve source code |
| `EZTVARY` | Easytrieve system messages (optional but recommended) |

Every logical file name in your `FILE` statements needs a matching DD card. For the employee file:

```jcl
//EMPDD    DD  DSN=HR.EMPLOYEE.MASTER,DISP=SHR
```

## Inline source with DD *

You can embed the Easytrieve source directly in the JCL stream using `DD *`:

```jcl
//SYSIN    DD  *
  FILE EMPLOYEE EMPDD
  EMP-ID  1  9  A
  ...
  W
  ...
  P
  ...
/*
```

The `/*` delimiter ends the inline data stream.

## Source as a catalogued dataset

For production jobs, store the source in a PDS member and reference it:

```jcl
//SYSIN    DD  DSN=MY.EZTPA.SOURCE(EMPRPT),DISP=SHR
```

## Complete JCL example

```jcl
//EMPRPT   JOB  (ACCT),'EMPLOYEE RPT',CLASS=A,MSGCLASS=X
//*
//* Run Easytrieve employee salary report
//*
//STEP1    EXEC PGM=EZTPA00
//STEPLIB  DD  DSN=EZTPA.LOAD,DISP=SHR
//SYSPRINT DD  SYSOUT=*
//EZTVARY  DD  SYSOUT=*
//EMPDD    DD  DSN=HR.EMPLOYEE.MASTER,DISP=SHR
//SYSIN    DD  *
  FILE EMPLOYEE EMPDD
  EMP-ID       1   9  A
  EMP-NAME    10  30  A
  EMP-DEPT    40   4  A
  EMP-SALARY  44   7  N  2
  EMP-STATUS  51   1  A

  W
  TOTAL-SAL  N  11  2  VALUE 0
  EMP-COUNT  N   6     VALUE 0

  P
  REPORT EMPRPT  PRINTER
    TITLE   'Employee Salary Report'
    HEADING 'ID'    'Name'    'Dept'   'Salary'
    LINE    EMP-ID  EMP-NAME  EMP-DEPT EMP-SALARY

  IF EMP-STATUS EQ 'A'
    COMPUTE TOTAL-SAL = TOTAL-SAL + EMP-SALARY
    COMPUTE EMP-COUNT = EMP-COUNT + 1
    PRINT EMPRPT
  END-IF
/*
```

## Return codes

| Return code | Meaning |
|---|---|
| 0 | Successful completion |
| 4 | Warnings (e.g. no records selected) |
| 8 | Errors found during execution |
| 12 | Severe error — job likely abended |

## The exercise

Open [execute.jcl](open:execute.jcl). Write complete JCL to run the validation program from the previous step (`EMPVAL`). Your JCL must include:

1. A `JOB` card with a job name and description
2. `EXEC PGM=EZTPA00`
3. `SYSPRINT DD SYSOUT=*`
4. `EMPDD DD` pointing to `HR.EMPLOYEE.MASTER`
5. `SYSIN DD *` with the validation source code inline (you can reference the logic from Step 7 or write a simplified version)
6. `/*` to end the inline stream

Click **Check My Work** when done.
