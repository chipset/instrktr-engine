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
*
*        TODO 1: Load 1 into R2 as the loop counter using LA
*
*
*        TODO 2: Store R2 into COUNT using ST
*
*
*        TODO 3: Define the loop top label with DS 0H for alignment
*                Example: LOOPTOP  DS    0H
*
*
*        TODO 4: (inside the loop) Increment R2 by 1
*                LA    R2,1(R2)
*
*
*        TODO 5: Compare R2 to LIMIT using C
*
*
*        TODO 6: Branch back to loop top while R2 <= LIMIT using BNH
*
*
*        TODO 7: Define the loop exit label with DS 0H
*                Example: DONE     DS    0H
*
*
         B     BREND             Branch past data area
*
*        ---- Data section ----
LIMIT    DC    F'5'              Loop upper bound
COUNT    DS    F                 Loop counter storage
*
BREND    DS    0H
         END   BRANCH
