# Comparisons and Branching

HLASM programs change flow using **condition codes** (CC) set by arithmetic and compare instructions, combined with **branch** instructions that test those codes.

## The condition code

The condition code is a 2-bit value set by most arithmetic and all compare instructions:

| CC | Meaning (after compare) | Meaning (after arithmetic) |
|---|---|---|
| 0 | Equal | Zero result |
| 1 | First operand low | Negative result |
| 2 | First operand high | Positive result |
| 3 | — | Overflow |

## Compare instructions

### C — Compare (register vs. memory fullword)

```hlasm
         C     R1,LIMIT         Compare R1 to fullword LIMIT; sets CC
```

### CR — Compare Register

```hlasm
         CR    R1,R2            Compare R1 to R2; sets CC
```

### CLI — Compare Logical Immediate (one byte)

```hlasm
         CLI   FLAG,X'01'       Compare byte FLAG to immediate X'01'
```

### CLC — Compare Logical Characters (memory to memory)

```hlasm
         CLC   FIELD1,FIELD2    Compare FIELD1 to FIELD2 byte by byte
```

## Branch instructions

All branch instructions transfer control to a label if the condition is met; they fall through to the next instruction if not.

| Mnemonic | Condition tested | CC |
|---|---|---|
| `B label` | Always | any |
| `BE label` | Equal | CC=0 |
| `BL label` | Low (less than) | CC=1 |
| `BH label` | High (greater than) | CC=2 |
| `BNE label` | Not equal | CC≠0 |
| `BNL label` | Not low (≥) | CC≠1 |
| `BNH label` | Not high (≤) | CC≠2 |
| `BZ label` | Zero | CC=0 |
| `BNZ label` | Non-zero | CC≠0 |

The general form is `BC mask,label`. Mnemonics like `BE` and `BL` are just shorthand for specific mask values.

## Loop alignment with DS 0H

Branch targets must be on a **halfword boundary** (even address). Use `DS 0H` to force alignment without consuming storage:

```hlasm
LOOPTOP  DS    0H               Halfword-aligned label (no storage)
         ...
         B     LOOPTOP          Branch back to loop top
```

## A counting loop

```hlasm
         LA    R1,1             R1 ← 1 (loop counter)
LOOP     DS    0H
         ...                    loop body
         LA    R1,1(R1)         R1 ← R1 + 1
         C     R1,LIMIT         Compare counter to limit
         BNH   LOOP             Branch back while R1 ≤ LIMIT
DONE     DS    0H
```

## The exercise

Open [branch.asm](open:branch.asm). The data section has `LIMIT DC F'5'` and `COUNT DS F`. Write a loop in the code section that:

1. Loads `1` into `R2` using `LA`
2. Stores `R2` into `COUNT` using `ST`
3. Defines a halfword-aligned loop label with `DS 0H`
4. Compares `R2` to `LIMIT` using `C`
5. Branches back to the loop label while `R2` is less than or equal to `LIMIT` using `BNH` (or `BL`/`BE` with logic)
6. Increments `R2` by 1 with `LA R2,1(R2)` inside the loop
7. Falls through to `DONE DS 0H` when the loop ends

Click **Check My Work** when done.
