# Registers and Base Addressing

## General-purpose registers

The z/Architecture has **16 general-purpose registers** numbered 0–15. They are 64-bit wide (32-bit in older 24/31-bit addressing modes) and are used for arithmetic, addressing, and parameter passing.

| Register | Conventional use |
|---|---|
| R0 | Work register; some instructions require it |
| R1 | Parameter pointer (on entry to a program) |
| R2–R11 | General purpose — yours to use freely |
| R12 | Base register (by convention) |
| R13 | Save area pointer (caller's save area on entry) |
| R14 | Return address |
| R15 | Entry point / return code |

## Register equates

The assembler treats `R0`–`R15` as just symbols. You must define them yourself with `EQU`:

```hlasm
R0       EQU   0
R1       EQU   1
R2       EQU   2
R3       EQU   3
R4       EQU   4
R5       EQU   5
R6       EQU   6
R7       EQU   7
R8       EQU   8
R9       EQU   9
R10      EQU   10
R11      EQU   11
R12      EQU   12
R13      EQU   13
R14      EQU   14
R15      EQU   15
```

Place these at the top of your CSECT so every instruction can use the symbolic names.

## Why base addressing?

HLASM instructions address memory using **base + displacement**. An instruction doesn't hold a full 31-bit address — it holds a 12-bit displacement (0–4095) relative to a base register. The assembler resolves all symbolic addresses into `base_reg + offset` automatically, but only if you tell it which register holds the base address.

## Setting up the base register

The standard two-line idiom:

```hlasm
         BALR  R12,0
         USING *,R12
```

**`BALR R12,0`** (Branch and Link Register):
- When the second operand is register 0, BALR does **not** branch
- It loads the address of the **next instruction** into R12
- After this executes, R12 contains the current program counter value

**`USING *,R12`**:
- `*` means "current location" — the address right after the BALR
- This tells the assembler: "R12 contains the address of `*`; use it as the base for all subsequent address calculations"
- This is an assembler pseudo-op — it generates no machine code

Together they establish R12 as the base register so the assembler can resolve all the labels in your program.

## The exercise

Open [registers.asm](open:registers.asm). The CSECT skeleton is there. Add:

1. The complete register equate block (R0 EQU 0 through R15 EQU 15)
2. The `BALR R12,0` instruction
3. The `USING *,R12` pseudo-op immediately after the BALR

Click **Check My Work** when done.
