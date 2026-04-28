# File and Field Definitions

The `FILE` section is where you describe every input and output dataset your program uses, along with the layout of each record.

## The FILE statement

```
  FILE logical-name  dd-name  [RECORD-LENGTH nnn]  [VS]
```

- **logical-name** — the name your Easytrieve code uses to refer to this file
- **dd-name** — the JCL DD name that provides the actual dataset at runtime
- `RECORD-LENGTH` — required for variable-length records; omit for fixed-length sequential files
- `VS` — marks a VSAM file

Example:

```
  FILE EMPLOYEE EMPDD
```

This links the logical name `EMPLOYEE` to the JCL DD card `//EMPDD`.

## Field definitions

Immediately after the `FILE` statement, list the fields in the record. The format is:

```
  field-name  start-position  length  type  [decimals]
```

| Column | Meaning |
|---|---|
| field-name | Your symbolic name for the field |
| start-position | Byte offset within the record (1 = first byte) |
| length | Number of bytes |
| type | `A` = alphanumeric, `N` = numeric display, `P` = packed decimal |
| decimals | Number of implied decimal places (numeric fields only) |

## Example record layout

For an 80-byte employee record:

```
  FILE EMPLOYEE EMPDD
  EMP-ID       1   9  A          Employee ID
  EMP-NAME    10  30  A          Employee name
  EMP-DEPT    40   4  A          Department code
  EMP-SALARY  44   7  N  2       Salary (7 digits, 2 decimal places)
  EMP-STATUS  51   1  A          Status: A=active, T=terminated
```

## Multiple files

You can declare several files. Each `FILE` statement starts a new group. Easytrieve automatically reads the first (primary) file record by record; other files can be read on demand.

```
  FILE EMPLOYEE EMPDD
  ...field definitions...

  FILE ERRFILE ERRDD
  ...field definitions...
```

## The exercise

Open [filedef.ezt](open:filedef.ezt). The FILE keyword is already there. Add the field definitions for the EMPLOYEE file:

| Field | Position | Length | Type | Decimals |
|---|---|---|---|---|
| EMP-ID | 1 | 9 | A | — |
| EMP-NAME | 10 | 30 | A | — |
| EMP-DEPT | 40 | 4 | A | — |
| EMP-SALARY | 44 | 7 | N | 2 |
| EMP-STATUS | 51 | 1 | A | — |

Click **Check My Work** when done.
