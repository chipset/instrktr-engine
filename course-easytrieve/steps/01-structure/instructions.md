# Easytrieve Program Structure

Easytrieve Plus is a high-productivity report generator and data extraction language for z/OS. A single Easytrieve program can replace hundreds of lines of COBOL or PL/I for common reporting and validation tasks.

## The three sections

Every Easytrieve Plus program is divided into three sections, always in this order:

```
FILE    ← declare input and output files and their record layouts
W       ← working storage: variables your program uses at runtime
P       ← procedure: the logic that runs for each input record
```

Each section starts with its keyword (`FILE`, `W`, or `P`) on a line by itself.

## Comments

Any line whose first non-blank character is `*` is a comment:

```
* This is a comment
  * This is also a comment (leading spaces are OK)
```

Block comments use `/*` … `*/`:

```
/* -----------------------------------------------
   Employee Report — generates active headcount
   ----------------------------------------------- */
```

## Column rules

Easytrieve is **not** column-sensitive like HLASM. Statements can start anywhere from column 2 onward. Column 1 is reserved for labels and the continuation character (`-`).

## A minimal skeleton

```
* -----------------------------------------------
* EMPRPT  - Employee report skeleton
* -----------------------------------------------
  FILE EMPLOYEE EMPDD

  W
* (working storage fields go here)

  P
* (procedure logic goes here)
```

## The exercise

Open [employee.ezt](open:employee.ezt). Add the three section keywords in the right order to complete the program skeleton:

1. A `FILE` section header line (you can leave the file declaration blank for now — you'll fill it in the next step)
2. A `W` section header line
3. A `P` section header line

Each keyword goes on its own line. Add a comment block at the top identifying the program.

Click **Check My Work** when done.
