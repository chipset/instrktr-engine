*        ------------------------------------------------------------ *
*        MOVE     - Moving character data exercise                     *
*        ------------------------------------------------------------ *
MOVE     CSECT
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
*
*        Blank-fill BUFFER using the MVI + MVC propagation idiom
         MVI   BUFFER,C' '          Set first byte of BUFFER to space
         MVC   BUFFER+1(79),BUFFER  Propagate: bytes 1-79 ← byte 0
*
*        Copy MSG into the beginning of BUFFER
         MVC   BUFFER(12),MSG       Copy 12 bytes of MSG into BUFFER
*
         B     MOVEND            Branch past data area
*
*        ---- Data section ----
MSG      DC    C'Hello, HLASM'   Source message (12 bytes)
MSGLEN   EQU   *-MSG
BUFFER   DS    CL80              80-byte output buffer
*
MOVEND   DS    0H
         END   MOVE
