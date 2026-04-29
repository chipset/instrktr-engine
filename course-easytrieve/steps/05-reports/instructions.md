# Generating Reports

Easytrieve's built-in report engine formats and prints output automatically — you declare what you want and it handles pagination, headings, and page numbers.

## The REPORT block

A report is defined inside the `P` section with a `REPORT` statement followed by layout directives:

```
  REPORT report-name  PRINTER
    TITLE   'Report Title'
    HEADING 'Column 1'  'Column 2'  'Column 3'
    LINE    field1      field2      field3
```

- **PRINTER** — directs output to SYSPRINT (the default print DD)
- **TITLE** — appears at the top of every page
- **HEADING** — column headings printed once per page
- **LINE** — defines the data columns; each field name maps to a position

## Printing a line

To write a detail line, call `PRINT` in your procedure logic:

```
  PRINT EMPRPT
```

Easytrieve fills the LINE fields from the current record's values and writes the formatted line.

## Page and line control

| Directive | Effect |
|---|---|
| `LINESIZE nn` | Set page width (default 132) |
| `PAGESIZE nn` | Lines per page (default 60) |
| `SPACE n` | Insert n blank lines before this line |
| `SKIP` | Force a new page |

## Summary lines with FOOTING

Add a `FOOTING` to print totals at the end:

```
  REPORT EMPRPT  PRINTER
    TITLE   'Employee Salary Report'
    HEADING 'ID'         'Name'       'Dept'  'Salary'
    LINE    EMP-ID       EMP-NAME     EMP-DEPT EMP-SALARY
    FOOTING 'Total'                           TOTAL-SAL
```

The `FOOTING` prints when the report is closed (end of file or explicit `CLOSE`).

## The exercise

Open [report.ezt](open:report.ezt). The FILE and W sections are complete. In the `P` section:

1. Define a `REPORT` named `EMPRPT` with:
   - `TITLE 'Employee Salary Report'`
   - `HEADING` with columns for ID, Name, Dept, and Salary
   - `LINE` mapping `EMP-ID`, `EMP-NAME`, `EMP-DEPT`, `EMP-SALARY`
2. In the procedure logic, `IF EMP-STATUS EQ 'A'` then `PRINT EMPRPT`

Click **Check My Work** when done.
