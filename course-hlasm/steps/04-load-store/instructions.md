# Loading and Storing Data

All computation in HLASM happens in **registers**. To work with a value in memory, you first load it into a register, operate on it, then store the result back.

## Load instructions

### L — Load (fullword)

Loads a 32-bit fullword from memory into a register.

```hlasm
         L     R1,MYVAL         R1 ← contents of MYVAL (4 bytes)
```

The memory location must be aligned on a 4-byte boundary. A `DC F` or `DS F` is automatically aligned.

### LR — Load Register

Copies the value of one register into another. No memory access.

```hlasm
         LR    R2,R1            R2 ← R1
```

### LA — Load Address

Loads an effective address or a small immediate value into a register. It **never reads memory** — it computes the address and puts that address in the register.

```hlasm
         LA    R3,BUFFER        R3 ← address of BUFFER
         LA    R4,0             R4 ← 0  (clear a register)
         LA    R5,1             R5 ← 1  (set a small constant)
```

### LH — Load Halfword

Loads a 16-bit halfword from memory, sign-extended to 32 bits.

```hlasm
         LH    R1,HWORD         R1 ← sign-extended halfword from HWORD
```

## Store instructions

### ST — Store (fullword)

Stores the 32-bit contents of a register into a fullword in memory.

```hlasm
         ST    R1,RESULT        RESULT ← R1
```

### STH — Store Halfword

Stores the low 16 bits of a register into a halfword in memory.

```hlasm
         STH   R1,HWORD         HWORD ← low 16 bits of R1
```

## Summary

| Instruction | Operation |
|---|---|
| `L  Rx,mem` | Load fullword from memory into Rx |
| `LR Rx,Ry` | Copy Ry into Rx (register to register) |
| `LA Rx,addr` | Load address or immediate into Rx |
| `ST Rx,mem` | Store Rx fullword to memory |
| `LH Rx,mem` | Load halfword (sign-extended) into Rx |
| `STH Rx,mem` | Store low halfword of Rx to memory |

## The exercise

Open [loadstore.asm](open:loadstore.asm). The program skeleton, base register setup, and data section are already written. In the code section, add instructions to:

1. Load `VALA` (value 25) into `R2` using `L`
2. Load `VALB` (value 17) into `R3` using `L`
3. Copy `R2` into `R4` using `LR`
4. Load the address of `RESULT` into `R5` using `LA`
5. Store `R4` into `RESULT` using `ST`

Click **Check My Work** when done.
