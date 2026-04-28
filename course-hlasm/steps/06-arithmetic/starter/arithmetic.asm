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
*
*        TODO 1: Load VALA into R2
*
*        TODO 2: Add VALB to R2 (A instruction)
*
*        TODO 3: Move R2 into R1 (odd register of pair R0-R1) using LR
*
*        TODO 4: Clear R0 (high register of pair) using SR R0,R0
*
*        TODO 5: Multiply R0-R1 pair by VALC using M R0,VALC
*
*        TODO 6: Store R1 (low 32 bits of product) into RESULT using ST
*
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
