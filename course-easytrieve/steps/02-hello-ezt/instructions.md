# Hello World Easytrieve Program

Easytrieve programs describe files, jobs, and procedures. A tiny program is enough to exercise the editor and later execution.

## Sample from the workflow

A minimal Hello World style program looks like this (keywords may appear in different columns depending on your shop standards):

```easytrieve
DEFINE WDUMMY W 82 A VARYING VALUE ''
JOB INPUT NULL
DISPLAY 'HELLO WORLD'
STOP
```

- **DEFINE** — declares a work field (here a varying character field).
- **JOB INPUT NULL** — a job that reads no input file (dummy driver for a simple report).
- **DISPLAY** — writes a line to the report/SYSPRINT output.
- **STOP** — ends the program.

## The exercise

Open [hello.ezt](open:hello.ezt). The starter file has comments showing what to add.

Your finished program must:

1. Define `WDUMMY` as a varying character work field (you can match the sample `DEFINE` line).
2. Include `JOB INPUT NULL`.
3. Display the literal `HELLO WORLD` (quoted).
4. End with `STOP`.

Save the file and click **Check My Work**.
