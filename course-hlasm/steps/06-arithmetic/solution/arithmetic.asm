*        ------------------------------------------------------------ *
*        ARITHMETIC - Integer arithmetic exercise                      *
*        Compute (VALA + VALB) * VALC and store in RESULT             *
*        ------------------------------------------------------------ *
ARITH    CSECT
         PRINT NOGEN
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
         BALR  R12,0
         USING *,R12
*
*        ---- Code section ----
*        Compute (VALA + VALB) * VALC  →  (10 + 7) * 3  =  51
         L     R2,VALA           R2 ← 10
         A     R2,VALB           R2 ← 10 + 7 = 17
         LR    R1,R2             R1 ← 17 (odd register of pair)
         SR    R0,R0             R0 ← 0  (clear high register of pair)
         M     R0,VALC           R0-R1 ← 17 * 3 = 51 (product in R1)
         ST    R1,RESULT         RESULT ← 51
*
         B     AREND             Branch past data area
*
*        ---- Data section ----
VALA     DC    F'10'             First value
VALB     DC    F'7'              Second value
VALC     DC    F'3'              Multiplier
RESULT   DS    F                 Result storage
*
AREND    DS    0H
         END   ARITH
