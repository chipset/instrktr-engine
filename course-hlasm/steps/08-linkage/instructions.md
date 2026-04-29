# Standard OS Linkage Convention

The **OS/390 (z/OS) linkage convention** defines how programs call each other and pass control back to the caller. Every production HLASM program follows these rules — violating them causes crashes, corrupts the caller's registers, or produces wrong return codes.

## Register conventions on entry

When your program is called, the OS sets these registers before transferring control:

| Register | Contains |
|---|---|
| R1 | Address of the parameter list (or 0 if none) |
| R13 | Address of the **caller's 18-word save area** |
| R14 | **Return address** — where to branch on exit |
| R15 | **Entry point address** of your program |

Your first duty on entry is to save the caller's registers before you change any of them.

## The 18-word save area

The save area is 18 fullwords (72 bytes). Its layout is defined by IBM convention:

| Offset | Contents |
|---|---|
| +0 (word 1) | Reserved |
| +4 (word 2) | Address of the **previous** (caller's caller) save area |
| +8 (word 3) | Address of the **next** (callee's) save area |
| +12 (word 4) | Saved R14 |
| +16 (word 5) | Saved R15 |
| +20 (word 6) | Saved R0 |
| ... | ... |
| +68 (word 18) | Saved R12 |

## Entry sequence

```hlasm
MYPROG   CSECT
         STM   R14,R12,12(R13)   Save R14,R15,R0-R12 into caller's save area
         BALR  R12,0
         USING *,R12
         ST    R13,SAVEAREA+4    Store caller's save area addr at our +4
         LA    R13,SAVEAREA      R13 → our save area
```

**`STM R14,R12,12(R13)`** — Store Multiple Registers:
- Saves R14, R15, R0, R1, … R12 (15 registers) into the caller's save area starting at offset 12
- The wrap-around (R14 through R12) is intentional — R13 is not saved here

**Chaining save areas:**
- Store the caller's R13 at offset +4 of our save area (backward chain)
- Point R13 to our own save area so any routines we call can save into it

## Exit sequence

```hlasm
         L     R13,SAVEAREA+4    Restore caller's save area pointer
         LM    R14,R12,12(R13)   Restore all registers from caller's save area
         SR    R15,R15           Set return code to 0 (success)
         BR    R14               Return to caller
```

**`LM R14,R12,12(R13)`** — Load Multiple Registers:
- Restores R14 through R12 from the caller's save area

**`SR R15,R15`** — clears R15 to 0. The caller sees R15 as the return code. 0 = success.

**`BR R14`** — branch to the address in R14 (the return address the caller put there).

## Complete program template

```hlasm
MYPROG   CSECT
         PRINT NOGEN
R0       EQU   0
*        ... (R1-R15 equates)
*
*        Entry
         STM   R14,R12,12(R13)   Save caller's registers
         BALR  R12,0
         USING *,R12
         ST    R13,SAVEAREA+4    Backward chain
         LA    R13,SAVEAREA      Point R13 to our save area
*
*        ... program body ...
*
*        Exit
         L     R13,SAVEAREA+4    Restore caller's R13
         LM    R14,R12,12(R13)   Restore caller's registers
         SR    R15,R15           Return code = 0
         BR    R14               Return
*
SAVEAREA DS    18F               18-word save area
         END   MYPROG
```

## The exercise

Open [linkage.asm](open:linkage.asm). The CSECT label, register equates, and `SAVEAREA DS 18F` are provided. Fill in:

1. `STM R14,R12,12(R13)` — save registers on entry
2. `BALR R12,0` and `USING *,R12` — establish base register
3. `ST R13,SAVEAREA+4` and `LA R13,SAVEAREA` — chain save areas
4. `L R13,SAVEAREA+4` — restore caller's save area on exit
5. `LM R14,R12,12(R13)` — restore caller's registers
6. `SR R15,R15` — set return code to 0
7. `BR R14` — return to caller

Click **Check My Work** when done.
