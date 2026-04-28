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
*        TODO 1: Blank-fill BUFFER using MVI + MVC propagation idiom
*                Step a: MVI   BUFFER,C' '          set first byte to space
*                Step b: MVC   BUFFER+1(79),BUFFER  copy byte 0 to bytes 1-79
*
*
*        TODO 2: Copy MSG into the beginning of BUFFER using MVC
*                MVC   BUFFER(12),MSG
*
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
