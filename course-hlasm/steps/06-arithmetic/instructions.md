# Integer Arithmetic

HLASM provides a full set of integer arithmetic instructions. All operate on **32-bit fullword** values in registers, with some requiring register pairs for multiply and divide.

## Addition

### A — Add (register + memory)

```hlasm
         L     R1,NUM1          R1 ← NUM1
         A     R1,NUM2          R1 ← R1 + NUM2 (fullword from memory)
```

### AR — Add Register (register + register)

```hlasm
         L     R1,NUM1
         L     R2,NUM2
         AR    R1,R2            R1 ← R1 + R2
```

## Subtraction

### S — Subtract / SR — Subtract Register

```hlasm
         L     R1,TOTAL
         S     R1,AMOUNT        R1 ← R1 - AMOUNT
         SR    R1,R2            R1 ← R1 - R2
```

## Multiplication

### M — Multiply

Multiply uses a **register pair**: the even register and the next odd register. You specify the even register. The multiplicand must be in the **odd** register; the 64-bit product lands in the even-odd pair.

```hlasm
         L     R1,MULTIPLIER    Load multiplicand into R1 (odd reg)
         M     R0,FACTOR        R0-R1 ← R0-R1 × FACTOR (R0 must be even)
*        R0 now holds the high 32 bits, R1 the low 32 bits
```

For small values where the result fits in 32 bits, use only R1.

### MR — Multiply Register

```hlasm
         MR    R0,R2            R0-R1 ← R0-R1 × R2
```

## Division

### D — Divide

Also uses a register pair. The 64-bit dividend is in the even-odd pair; you divide by a memory fullword:
- Even register → **remainder**
- Odd register → **quotient**

```hlasm
         SR    R0,R0            Clear R0 (high 32 bits of dividend)
         L     R1,DIVIDEND      Low 32 bits of dividend
         D     R0,DIVISOR       R0 ← remainder, R1 ← quotient
```

## The exercise

Open [arithmetic.asm](open:arithmetic.asm). The data section defines `VALA` (10), `VALB` (7), `VALC` (3), and `RESULT` (a fullword DS). In the code section, compute **(VALA + VALB) × VALC** and store the product in `RESULT`.

Steps:
1. `L R2,VALA` — load first value
2. `A R2,VALB` — add second value (R2 now holds 17)
3. `LR R1,R2` — move sum into the odd register of the pair (R0-R1)
4. `SR R0,R0` — clear the high register
5. `M R0,VALC` — multiply (R0-R1 × VALC; result in R1 for small products)
6. `ST R1,RESULT` — store the result

Click **Check My Work** when done.
