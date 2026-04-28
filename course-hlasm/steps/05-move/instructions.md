# Moving Character Data

While registers hold integers and addresses, character data lives entirely in memory. HLASM has a family of **storage-to-storage** (SS format) instructions that operate directly on memory fields without going through registers.

## MVI — Move Immediate

Moves a single byte (an immediate constant) into a memory location.

```hlasm
         MVI   TARGET,C' '      Move space character into one byte of TARGET
         MVI   FLAG,X'01'       Move hex 01 into FLAG
         MVI   BUFFER,C'A'      Move letter A into first byte of BUFFER
```

MVI always moves exactly **one byte**. The immediate value is encoded in the instruction itself.

## MVC — Move Characters

Copies bytes from a source location to a target location. The number of bytes moved comes from the **first operand's defined length** (from its `DC` or `DS` definition), or you can override it with an explicit length.

```hlasm
         MVC   TARGET,SOURCE    Move len(TARGET) bytes from SOURCE to TARGET
         MVC   OUTBUF(80),BLANKS Move exactly 80 bytes
```

MVC moves **left to right, one byte at a time**. This means you can use it to propagate a byte:

```hlasm
*        Classic blank-fill: set first byte, then propagate it across the field
         MVI   BUFFER,C' '         Set byte 0 to space
         MVC   BUFFER+1(79),BUFFER Propagate: bytes 1-79 ← byte 0
```

This is the standard idiom for clearing a character field to spaces.

## CLC — Compare Logical Characters

Compares two character fields byte by byte and sets the condition code:
- CC=0: equal
- CC=1: first operand is lower
- CC=2: first operand is higher

```hlasm
         CLC   FIELD1,FIELD2    Compare FIELD1 to FIELD2
         BE    AREEQUAL         Branch if equal
```

## The SS instruction format

SS instructions encode the length in the instruction itself (not in a register). The assembler uses the length from the first operand's definition automatically:

```hlasm
MSG      DC    C'Hello'         5 bytes
TARGET   DS    CL5
         MVC   TARGET,MSG       Moves 5 bytes (from TARGET's DS CL5 length)
```

To move a different number of bytes, specify the length explicitly in parentheses after the first operand:

```hlasm
         MVC   TARGET(3),MSG    Move only 3 bytes
```

## The exercise

Open [move.asm](open:move.asm). The skeleton has `MSG`, `BUFFER`, and the code section stub. Add instructions to:

1. Blank-fill the entire 80-byte `BUFFER` using `MVI` + `MVC` (the propagation idiom)
2. Copy `MSG` into the start of `BUFFER` using `MVC`

Click **Check My Work** when done.
