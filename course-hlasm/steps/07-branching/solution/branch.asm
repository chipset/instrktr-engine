*        ------------------------------------------------------------ *
*        BRANCH   - Comparisons and branching exercise                 *
*        Count from 1 to 5 using a loop                               *
*        ------------------------------------------------------------ *
BRANCH   CSECT
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
         LA    R2,1              R2 ← 1 (loop counter starts at 1)
         ST    R2,COUNT          Store initial counter value
*
LOOPTOP  DS    0H                Loop top (halfword-aligned)
         LA    R2,1(R2)          R2 ← R2 + 1 (increment)
         ST    R2,COUNT          Update COUNT in memory
         C     R2,LIMIT          Compare counter to limit (5)
         BNH   LOOPTOP           Branch back if R2 <= 5
*
DONE     DS    0H                Loop exit point
*
         B     BREND             Branch past data area
*
*        ---- Data section ----
LIMIT    DC    F'5'              Loop upper bound
COUNT    DS    F                 Loop counter storage
*
BREND    DS    0H
         END   BRANCH
