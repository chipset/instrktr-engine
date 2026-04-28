# Program Structure

HLASM source files follow a strict **fixed-column format**. The assembler interprets each line by position, not by delimiters.

## Column layout

```
Col 1–8    Name field       — labels and symbols (blank if no label)
Col 9      Separator        — must be a space
Col 10–14  Operation field  — the opcode or assembler directive
Col 15     Separator        — must be a space
Col 16–71  Operand field    — registers, addresses, constants
Col 72     Continuation     — non-space means the next line continues this one
Col 73–80  Sequence field   — optional line identification (usually ignored)
```

A line starting with `*` in column 1 is a **comment** — the entire line is ignored by the assembler.

## Required structure

Every HLASM program has three mandatory elements:

### 1. CSECT — Control Section

Marks the start of your program and gives it a name. The label in columns 1–8 becomes the program entry point.

```hlasm
HELLO    CSECT
```

### 2. PRINT NOGEN

Suppresses macro expansion lines from the listing — keeps the output readable when you use system macros later.

```hlasm
         PRINT NOGEN
```

### 3. END — End of Source

Terminates the source file. The operand tells the linker where program execution begins — it should match your CSECT label.

```hlasm
         END   HELLO
```

## A complete minimal program

```hlasm
*        ------------------------------------------------------------ *
*        HELLO    - Minimal HLASM program                             *
*        ------------------------------------------------------------ *
HELLO    CSECT
         PRINT NOGEN
*
*        (program instructions go here)
*
         END   HELLO
```

## The exercise

Open [hello.asm](open:hello.asm). The file has three TODO comments. Fill each one in:

1. Add `HELLO    CSECT` — the label `HELLO` starts in column 1, `CSECT` starts in column 10
2. Add `         PRINT NOGEN` — no label, `PRINT` in column 10, `NOGEN` in column 16
3. Add `         END   HELLO` at the bottom — no label, `END` in column 10, `HELLO` in column 16

Click **Check My Work** when done.
