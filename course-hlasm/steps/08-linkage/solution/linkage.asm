*        ------------------------------------------------------------ *
*        LINKAGE  - Standard OS linkage convention exercise            *
*        ------------------------------------------------------------ *
LINKAGE  CSECT
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
*
*        ---- Entry sequence ----
         STM   R14,R12,12(R13)   Save caller's registers
         BALR  R12,0
         USING *,R12
         ST    R13,SAVEAREA+4    Backward chain: our +4 ← caller's R13
         LA    R13,SAVEAREA      R13 → our save area
*
*        ---- Program body ----
*        (this program returns immediately with RC=0)
*
*        ---- Exit sequence ----
         L     R13,SAVEAREA+4    Restore caller's save area pointer
         LM    R14,R12,12(R13)   Restore caller's registers
         SR    R15,R15           Return code = 0 (success)
         BR    R14               Return to caller
*
*        ---- Data section ----
SAVEAREA DS    18F               Standard 18-word (72-byte) save area
*
         END   LINKAGE
