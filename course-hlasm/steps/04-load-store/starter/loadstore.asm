*        ------------------------------------------------------------ *
*        LOADSTORE - Loading and storing data exercise                 *
*        ------------------------------------------------------------ *
LDST     CSECT
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
*        TODO 1: Load VALA into R2
*                L     R2,VALA
*
*        TODO 2: Load VALB into R3
*
*        TODO 3: Copy R2 into R4 using LR
*
*        TODO 4: Load the address of RESULT into R5 using LA
*
*        TODO 5: Store R4 into RESULT using ST
*
*
         B     LSTEND            Branch past data area
*
*        ---- Data section ----
VALA     DC    F'25'             First value
VALB     DC    F'17'             Second value
RESULT   DS    F                 Storage for result
*
LSTEND   DS    0H
         END   LDST
