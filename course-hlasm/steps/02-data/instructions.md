# Data Definitions: DC and DS

HLASM has two directives for allocating storage in your program. Both appear in the data area of your CSECT, usually after the executable instructions.

## DC — Define Constant

Allocates storage **and initialises it** with a value you specify.

```hlasm
MSG      DC    C'Hello, HLASM'   character string
LIMIT    DC    F'100'            fullword integer (4 bytes, value 100)
FLAG     DC    X'FF'             hexadecimal byte
MASK     DC    B'11110000'       binary byte
```

The general form is:

```
label    DC    <type><length>'<value>'
```

## DS — Define Storage

Allocates storage but **leaves the contents undefined** (uninitialised). Use this for working areas your program will write to at runtime.

```hlasm
COUNTER  DS    F                 one fullword (4 bytes), undefined
BUFFER   DS    CL80              80-byte character field
WORK     DS    XL4               4-byte hex working area
ALIGN    DS    0F                force fullword alignment (no storage)
```

The `0` length prefix (`DS 0F`) is a special form that forces alignment without consuming storage.

## Type codes

| Code | Type | Size |
|---|---|---|
| `C` | Character (EBCDIC) | 1 byte per character |
| `X` | Hexadecimal | 1 byte per 2 hex digits |
| `F` | Fullword integer | 4 bytes, aligned |
| `H` | Halfword integer | 2 bytes, aligned |
| `B` | Binary | 1 byte per 8 bits |
| `A` | Address constant | 4 bytes (address of a label) |

## Computing lengths with EQU

`EQU *-label` computes the length of a field at assembly time. The `*` means "current location counter":

```hlasm
MSG      DC    C'Hello, HLASM'
MSGLEN   EQU   *-MSG             MSGLEN = 12 (length of MSG)
```

This is safer than hard-coding `12` — if you change the message text, `MSGLEN` updates automatically.

## The exercise

Open [data.asm](open:data.asm). The CSECT, base register setup, and program skeleton are already written. In the data section, add:

1. `MSG` — a `DC C'Hello, HLASM'` character constant
2. `MSGLEN` — an `EQU *-MSG` length equate
3. `COUNTER` — a `DS F` fullword storage area
4. `BUFFER` — a `DS CL80` 80-byte character buffer

Click **Check My Work** when done.
