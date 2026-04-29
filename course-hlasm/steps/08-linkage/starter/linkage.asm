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
*
*        TODO 1: Save caller's registers into caller's save area
*                STM   R14,R12,12(R13)
*
*
*        TODO 2: Establish base register
*                BALR  R12,0
*                USING *,R12
*
*
*        TODO 3: Chain save areas
*                ST    R13,SAVEAREA+4    store caller's R13 at our +4
*                LA    R13,SAVEAREA      point R13 to our save area
*
*
*        ---- Program body ----
*        (nothing to do here — this program just returns immediately)
*
*
*        ---- Exit sequence ----
*
*        TODO 4: Restore caller's save area pointer
*                L     R13,SAVEAREA+4
*
*
*        TODO 5: Restore caller's registers
*                LM    R14,R12,12(R13)
*
*
*        TODO 6: Set return code to 0
*                SR    R15,R15
*
*
*        TODO 7: Return to caller
*                BR    R14
*
*
*        ---- Data section ----
SAVEAREA DS    18F               Standard 18-word (72-byte) save area
*
         END   LINKAGE
